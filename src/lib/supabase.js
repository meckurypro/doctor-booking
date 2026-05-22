import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// ============================================================
// AUTH HELPERS
// ============================================================

export const auth = {
  // Sign up with email — sends OTP
  signUpWithEmail: async (email) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { data, error }
  },

  // Verify OTP
  verifyOTP: async (email, token) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })
    return { data, error }
  },

  // Sign in with email + password
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  },

  // Sign in with Google
  signInWithGoogle: async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    return { data, error }
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Send password reset email
  resetPassword: async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    return { data, error }
  },

  // Update password (after reset or from settings)
  updatePassword: async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    return { data, error }
  },

  // Get current session
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // Get current user
  getUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },
}

// ============================================================
// PROFILE HELPERS
// ============================================================

export const profiles = {
  // Get profile by user ID
  getById: async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return { data, error }
  },

  // Get profile by username
  getByUsername: async (username) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, tier, total_generations, created_at')
      .eq('username', username)
      .single()
    return { data, error }
  },

  // Update profile
  update: async (userId, updates) => {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    return { data, error }
  },

  // Check username availability
  checkUsername: async (username) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle()
    return { available: !data && !error, error }
  },

  // Complete onboarding (set username + display name)
  completeOnboarding: async (userId, { username, displayName }) => {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        username,
        display_name: displayName,
        onboarding_completed: true,
      })
      .eq('id', userId)
      .select()
      .single()
    return { data, error }
  },
}

// ============================================================
// TEMPLATES HELPERS
// ============================================================

export const templates = {
  // Get all active templates
  getAll: async () => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    return { data, error }
  },

  // Get template by slug
  getBySlug: async (slug) => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()
    return { data, error }
  },

  // Get featured templates
  getFeatured: async () => {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('sort_order', { ascending: true })
    return { data, error }
  },
}

// ============================================================
// GENERATIONS HELPERS
// ============================================================

export const generations = {
  // Create generation record
  create: async (generationData) => {
    const { data, error } = await supabase
      .from('generations')
      .insert(generationData)
      .select()
      .single()
    return { data, error }
  },

  // Update generation
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('generations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },

  // Get user generations
  getUserGenerations: async (userId, { limit = 20, offset = 0 } = {}) => {
    const { data, error, count } = await supabase
      .from('generations')
      .select('*, templates(name, slug, thumbnail_url)', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    return { data, error, count }
  },

  // Get single generation
  getById: async (id) => {
    const { data, error } = await supabase
      .from('generations')
      .select('*, templates(name, slug)')
      .eq('id', id)
      .single()
    return { data, error }
  },

  // Deduct credits via RPC
  deductCredits: async (userId, amount, generationId) => {
    const { data, error } = await supabase.rpc('deduct_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_generation_id: generationId,
    })
    return { data, error }
  },
}

// ============================================================
// FEED HELPERS
// ============================================================

export const feed = {
  // Get approved feed posts
  getPosts: async ({ limit = 20, offset = 0, templateId = null } = {}) => {
    let query = supabase
      .from('feed_posts')
      .select(`
        *,
        profiles(username, display_name, avatar_url),
        templates(name, slug)
      `, { count: 'exact' })
      .eq('status', 'approved')
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (templateId) {
      query = query.eq('template_id', templateId)
    }

    const { data, error, count } = await query
    return { data, error, count }
  },

  // Submit generation to feed
  submit: async (postData) => {
    const { data, error } = await supabase
      .from('feed_posts')
      .insert(postData)
      .select()
      .single()
    return { data, error }
  },

  // Toggle like
  toggleLike: async (userId, postId) => {
    const { data, error } = await supabase.rpc('toggle_feed_like', {
      p_user_id: userId,
      p_post_id: postId,
    })
    return { data, error }
  },

  // Get user liked posts
  getUserLikes: async (userId) => {
    const { data, error } = await supabase
      .from('feed_likes')
      .select('post_id')
      .eq('user_id', userId)
    return { data: data?.map(l => l.post_id) || [], error }
  },
}

// ============================================================
// CREDITS HELPERS
// ============================================================

export const credits = {
  // Get credit packages
  getPackages: async () => {
    const { data, error } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    return { data, error }
  },

  // Get transaction history
  getTransactions: async (userId, { limit = 20, offset = 0 } = {}) => {
    const { data, error, count } = await supabase
      .from('credit_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    return { data, error, count }
  },

  // Add credits after payment
  addCredits: async ({ userId, amount, bonusAmount, paymentRef, amountNgn }) => {
    const { data, error } = await supabase.rpc('add_credits', {
      p_user_id: userId,
      p_amount: amount,
      p_bonus_amount: bonusAmount || 0,
      p_payment_reference: paymentRef,
      p_payment_provider: 'paystack',
      p_amount_ngn: amountNgn,
      p_description: 'Credit pack purchase',
    })
    return { data, error }
  },
}

// ============================================================
// NOTIFICATIONS HELPERS
// ============================================================

export const notifications = {
  // Get user notifications
  getAll: async (userId, { limit = 30 } = {}) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data, error }
  },

  // Mark as read
  markRead: async (notificationId) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
    return { error }
  },

  // Mark all as read
  markAllRead: async (userId) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    return { error }
  },

  // Get unread count
  getUnreadCount: async (userId) => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    return { count, error }
  },
}
