# Meckury — AI Content Creation Platform

A cinematic AI video and image generation web app built for African creators.

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | React 18 + Vite                     |
| Styling     | Tailwind CSS + CSS Variables        |
| Animation   | Framer Motion                       |
| Backend     | Supabase (Auth + PostgreSQL + RLS)  |
| AI Video    | fal.ai (Kling 2.5, Seedance 1.5)   |
| AI Image    | fal.ai (Imagen 3 / Nano Banana)     |
| Prompt AI   | Anthropic Claude Sonnet             |
| Payments    | Paystack (NGN)                      |
| Deployment  | Vercel                              |
| PWA         | Service Worker + Web Manifest       |

---

## Project Structure

```
meckury/
├── supabase/
│   ├── 01_schema.sql          # All tables, enums, indexes, seed data
│   ├── 02_functions.sql       # DB functions (credits, prompts, stats)
│   ├── 03_triggers.sql        # Auto-refund, notifications, counters
│   ├── 04_rls.sql             # Row Level Security policies
│   └── functions/
│       └── verify-payment/
│           └── index.ts       # Edge Function: Paystack verification
│
├── src/
│   ├── lib/
│   │   ├── supabase.js        # Supabase client + all DB helpers
│   │   ├── fal.js             # fal.ai client + generation functions
│   │   ├── anthropic.js       # Claude prompt enhancement
│   │   └── paystack.js        # Paystack popup + verification
│   │
│   ├── context/
│   │   ├── AuthContext.jsx    # Auth state, profile, credits
│   │   └── ThemeContext.jsx   # Dark/light/system theme
│   │
│   ├── hooks/
│   │   ├── useAuth.js         # Re-export from AuthContext
│   │   ├── useTheme.js        # Re-export from ThemeContext
│   │   ├── useCredits.js      # Credit balance + transactions
│   │   └── useGenerate.js     # Full generation pipeline
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.jsx     # Primary, secondary, ghost, danger
│   │   │   ├── Input.jsx      # Input, OTPInput, Textarea
│   │   │   ├── Modal.jsx      # Modal, Loader, Skeleton, CreditBadge, EmptyState
│   │   │   └── ImageUpload.jsx # Single + multi image upload
│   │   └── layout/
│   │       ├── BottomNav.jsx  # 4-tab bottom navigation
│   │       ├── TopBar.jsx     # Fixed top header with credits
│   │       └── PageWrapper.jsx # Animated page container
│   │
│   └── pages/
│       ├── LandingPage.jsx    # Public marketing page
│       ├── AuthPage.jsx       # Login, signup, OTP, password, profile
│       ├── ResetPasswordPage.jsx
│       ├── CreatePage.jsx     # Templates + tools hub
│       ├── GeneratePage.jsx   # Active generation screen
│       ├── ResultPage.jsx     # Download + publish to feed
│       ├── FeedPage.jsx       # Community feed
│       ├── HistoryPage.jsx    # User's generation history
│       ├── ProfilePage.jsx    # Credits, stats, purchases
│       ├── SettingsPage.jsx   # Theme, password, profile edit
│       └── AdminPage.jsx      # Dashboard, prompts, feed, users
│
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker
│   └── icons/                 # Add icon.png in sizes: 72,96,128,144,152,192,384,512
│
├── index.html
├── vite.config.js
├── tailwind.config.js
├── vercel.json                # SPA routing + security headers
├── .env.example               # Copy to .env and fill in keys
└── package.json
```

---

## Setup Guide

### 1. Clone and install

```bash
git clone https://github.com/yourusername/meckury.git
cd meckury
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_FAL_KEY=fal-...
VITE_ANTHROPIC_KEY=sk-ant-...
VITE_PAYSTACK_PUBLIC_KEY=pk_live_...
```

### 3. Supabase setup

1. Create project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run files in order:
   ```
   supabase/01_schema.sql
   supabase/02_functions.sql
   supabase/03_triggers.sql
   supabase/04_rls.sql
   ```
3. Enable **Google OAuth** in Authentication → Providers
4. Set Site URL and Redirect URLs in Authentication → URL Configuration

### 4. Deploy Edge Function

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Set Paystack secret
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxxx

# Deploy
supabase functions deploy verify-payment
```

### 5. Set yourself as admin

After signing up, run this in Supabase SQL Editor:

```sql
UPDATE profiles
SET role = 'admin'
WHERE username = 'your_username';
```

### 6. Run locally

```bash
npm run dev
```

### 7. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Project → Settings → Environment Variables
```

---

## Credit System

| Generation Type      | 5s | 8s | 10s |
|----------------------|----|----|-----|
| Text/Image to Image  | 1  | —  | —   |
| Image to Video       | 2  | 4  | 5   |
| Start + End Frame    | 2  | 4  | 5   |
| Text to Video        | 3  | 4  | 5   |
| Office Handover      | 2  | —  | —   |
| Memory Lane          | 1 per photo | — | — |

| Package  | Credits | Price    |
|----------|---------|----------|
| Starter  | 10      | ₦4,500   |
| Standard | 35      | ₦13,000  |
| Pro      | 100     | ₦32,000  |
| Creator  | 260     | ₦72,000  |

New users receive **5 free credits** on signup. Credits never expire.

---

## Icons Required

Place these files in `/public/icons/` before deploying:

```
icon-72.png
icon-96.png
icon-128.png
icon-144.png
icon-152.png
icon-192.png   ← also used as apple-touch-icon
icon-384.png
icon-512.png
```

Recommended tool: [realfavicongenerator.net](https://realfavicongenerator.net)

---

## Admin Access

Visit `/admin` after setting your role to `admin` in the database.

Admin panel includes:
- Dashboard stats (users, generations, revenue, success rate)
- Prompt version manager with rollback
- Feed moderation (approve/reject)
- User management

---

## Adding a New Template

1. Insert into `templates` table in Supabase
2. Insert initial prompt into `template_prompts` table
3. Update prompt anytime from Admin Panel → Prompts tab

No redeployment needed.

---

## Built by

[LinkAI](https://linkai.africa) · A Meckury production
