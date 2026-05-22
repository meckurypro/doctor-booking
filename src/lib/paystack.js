// ============================================================
// PAYSTACK PAYMENT INTEGRATION
// Client-side: opens payment popup
// Server-side verification: via Supabase Edge Function
// ============================================================

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY
const SUPABASE_URL        = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY   = import.meta.env.VITE_SUPABASE_ANON_KEY

// ── Load Paystack script dynamically ──────────────────────

const loadPaystackScript = () => {
  return new Promise((resolve) => {
    if (window.PaystackPop) { resolve(); return }
    const script    = document.createElement('script')
    script.src      = 'https://js.paystack.co/v1/inline.js'
    script.onload   = resolve
    document.head.appendChild(script)
  })
}

// ── Initialize Paystack popup ─────────────────────────────

export const initializePayment = async ({
  email,
  amountNgn,
  userId,
  packageSlug,
  credits,
  bonusCredits,
  onSuccess,
  onClose,
}) => {
  await loadPaystackScript()

  const amountKobo = Math.round(amountNgn * 100) // Paystack uses kobo
  const reference  = `MECKURY_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`

  const handler = window.PaystackPop.setup({
    key:      PAYSTACK_PUBLIC_KEY,
    email,
    amount:   amountKobo,
    currency: 'NGN',
    ref:      reference,
    metadata: {
      custom_fields: [
        { display_name: 'User ID',      variable_name: 'user_id',      value: userId },
        { display_name: 'Package',      variable_name: 'package_slug', value: packageSlug },
        { display_name: 'Credits',      variable_name: 'credits',      value: credits },
        { display_name: 'Bonus',        variable_name: 'bonus_credits', value: bonusCredits },
      ],
    },
    callback: async (response) => {
      // Verify server-side before crediting
      const result = await verifyPayment({
        reference: response.reference,
        userId,
        packageSlug,
      })

      if (result.success) {
        onSuccess?.({
          reference:    response.reference,
          creditsAdded: result.credits_added,
          balanceAfter: result.balance_after,
        })
      } else {
        console.error('Payment verification failed:', result.error)
        onSuccess?.({ error: result.error })
      }
    },
    onClose: () => onClose?.(),
  })

  handler.openIframe()
}

// ── Server-side verification via Supabase Edge Function ───

export const verifyPayment = async ({ reference, userId, packageSlug }) => {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/verify-payment`,
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ reference, userId, packageSlug }),
      }
    )

    const data = await response.json()
    return data

  } catch (error) {
    console.error('Verification request failed:', error)
    return { success: false, error: 'Network error during verification' }
  }
}
