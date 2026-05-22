// ============================================================
// SUPABASE EDGE FUNCTION: verify-payment
// Verifies Paystack payment server-side before crediting user
//
// Deploy with:
//   supabase functions deploy verify-payment
//
// Set secrets:
//   supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxxx
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── 1. Parse request ──────────────────────────────────
    const { reference, userId, packageSlug } = await req.json()

    if (!reference || !userId || !packageSlug) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 2. Verify with Paystack API ───────────────────────
    const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!paystackSecret) {
      throw new Error('Paystack secret key not configured')
    }

    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const paystackData = await paystackResponse.json()

    if (!paystackData.status || paystackData.data?.status !== 'success') {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const transaction = paystackData.data
    const amountNgn   = transaction.amount / 100 // Paystack uses kobo

    // ── 3. Check for duplicate (idempotency) ─────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: existing } = await supabase
      .from('credit_transactions')
      .select('id')
      .eq('payment_reference', reference)
      .maybeSingle()

    if (existing) {
      return new Response(
        JSON.stringify({ success: false, error: 'Payment already processed' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 4. Get package details ────────────────────────────
    const { data: pkg, error: pkgError } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('slug', packageSlug)
      .eq('is_active', true)
      .single()

    if (pkgError || !pkg) {
      return new Response(
        JSON.stringify({ success: false, error: 'Package not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 5. Validate amount matches package price ──────────
    // Allow 1% tolerance for rounding
    const expectedAmount = pkg.price_ngn
    const tolerance      = expectedAmount * 0.01
    const amountValid    = Math.abs(amountNgn - expectedAmount) <= tolerance

    if (!amountValid) {
      console.error(`Amount mismatch: paid ${amountNgn}, expected ${expectedAmount}`)
      return new Response(
        JSON.stringify({ success: false, error: 'Payment amount mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 6. Credit the user ────────────────────────────────
    const { data: creditResult, error: creditError } = await supabase.rpc('add_credits', {
      p_user_id:          userId,
      p_amount:           pkg.credits,
      p_bonus_amount:     pkg.bonus_credits || 0,
      p_payment_reference: reference,
      p_payment_provider: 'paystack',
      p_amount_ngn:       amountNgn,
      p_description:      `${pkg.name} pack — ${pkg.credits + (pkg.bonus_credits || 0)} credits`,
    })

    if (creditError || !creditResult?.success) {
      console.error('Credit error:', creditError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to credit account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 7. Return success ─────────────────────────────────
    return new Response(
      JSON.stringify({
        success:       true,
        credits_added: pkg.credits + (pkg.bonus_credits || 0),
        balance_after: creditResult.balance_after,
        reference,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
