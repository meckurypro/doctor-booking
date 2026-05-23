# Meckury — AI Content Creation Platform

A cinematic AI video and image generation web app built for African creators.

---

## Tech Stack

| Layer          | Technology                                              |
|----------------|---------------------------------------------------------|
| Frontend       | React 18 + Vite                                         |
| Styling        | Tailwind CSS + CSS Variables                            |
| Animation      | Framer Motion                                           |
| Backend        | Supabase (Auth + PostgreSQL + RLS)                      |
| AI Video       | WaveSpeed (primary) · fal.ai (fallback) — admin toggle  |
| AI Image       | fal.ai (primary) · WaveSpeed (fallback) — admin toggle  |
| Prompt AI      | WaveSpeed → Claude Sonnet (primary) · Direct Anthropic (fallback) |
| Payments       | Paystack (NGN)                                          |
| Deployment     | Vercel (Serverless Functions)                           |
| PWA            | Service Worker + Web Manifest                           |

---

## AI Provider Architecture

Meckury uses a **hybrid dual-provider** system. The active provider is stored in Supabase and toggled at runtime from the Admin Panel — no redeployment needed.

```
WaveSpeed (primary)
  └── Video generation: Seedance 2.0, Kling 2.5/3.0, Wan
  └── LLM/Prompt AI:   Claude Sonnet via WaveSpeed gateway
  └── Image generation: Nano Banana Pro / Nano Banana 2

fal.ai (fallback / specific models)
  └── Video: Seedance 2.0, Kling 3.0 Pro, Veo 3.1
  └── Image: Imagen 3, Nano Banana 2, Flux i2i
  └── Audio: Lyria 3
```

All API keys live server-side only. The client never touches them — all generation calls are proxied through `/api/generate` (Vercel Serverless Function).

---

## Project Structure

```
meckury/
├── api/
│   ├── generate.js            # Unified AI proxy — fal.ai + WaveSpeed with fallback
│   └── upload.js              # Image upload to Supabase Storage
│
├── supabase/
│   ├── 01_schema.sql          # All tables, enums, indexes, seed data
│   ├── 02_functions.sql       # DB functions (credits, prompts, stats)
│   ├── 03_triggers.sql        # Auto-refund, notifications, counters
│   ├── 04_rls.sql             # Row Level Security policies
│   ├── 05_app_settings.sql    # Runtime config table (provider, model toggles)
│   └── functions/
│       └── verify-payment/
│           └── index.ts       # Edge Function: Paystack verification
│
├── src/
│   ├── lib/
│   │   ├── supabase.js        # Supabase client + all DB helpers
│   │   ├── fal.js             # Generation client — proxies to /api/generate
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
│   │   ├── admin/
│   │   │   └── ProviderSettings.jsx  # Admin toggle: provider + model selection
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
│       └── AdminPage.jsx      # Dashboard, prompts, feed, users, provider settings
│
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker
│   └── icons/                 # icon.png in sizes: 72,96,128,144,152,192,384,512
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

**Client-side** (prefixed `VITE_` — safe to expose):

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_PAYSTACK_PUBLIC_KEY=pk_live_...
```

**Server-side only** (Vercel Serverless Functions — never in client bundle):

```env
FAL_KEY=fal-...
WAVESPEED_KEY=your-wavespeed-api-key
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> **Note:** `VITE_ANTHROPIC_KEY` is no longer needed. Claude Sonnet is accessed through WaveSpeed using `WAVESPEED_KEY`, which also covers all video and image models. Only add a direct `ANTHROPIC_KEY` server-side if you need to bypass WaveSpeed for LLM calls.

### 3. Supabase setup

1. Create project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run files in order:
   ```
   supabase/01_schema.sql
   supabase/02_functions.sql
   supabase/03_triggers.sql
   supabase/04_rls.sql
   supabase/05_app_settings.sql
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
```

Add these in **Vercel Dashboard → Project → Settings → Environment Variables**:

```
FAL_KEY
WAVESPEED_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_PAYSTACK_PUBLIC_KEY
```

---

## Provider Toggle (Admin)

After deploying, visit `/admin` → **Provider Settings** tab to:

- Switch active provider between **WaveSpeed** and **fal.ai** instantly
- Select preferred Kling model (2.5 Pro / 3.0 Pro)
- Select preferred Seedance model (1.5 Pro / 2.0)
- Select preferred image model (Nano Banana 2 / Nano Banana Pro)

Changes take effect immediately for all new generations — no redeployment needed. If a generation fails on the active provider, the system automatically falls back to the other provider.

### app_settings table

| key               | default           | options                                   |
|-------------------|-------------------|-------------------------------------------|
| `active_provider` | `"fal"`           | `"fal"` · `"wavespeed"`                   |
| `model_kling`     | `"kling_2_5"`     | `"kling_2_5"` · `"kling_3_0"`             |
| `model_seedance`  | `"seedance_2_0"`  | `"seedance_1_5"` · `"seedance_2_0"`       |
| `model_image`     | `"imagen_3_fast"` | `"imagen_3_fast"` · `"imagen_3"`          |

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

## Model Reference

### WaveSpeed model IDs (used in `api/generate.js`)

| Key              | Model ID                                          |
|------------------|---------------------------------------------------|
| `kling_2_5`      | `wavespeed-ai/kling-v2.6-pro/image-to-video`      |
| `kling_2_5_t2v`  | `wavespeed-ai/kling-v2.6-pro/text-to-video`       |
| `kling_3_0`      | `wavespeed-ai/kling-v3.0-pro/image-to-video`      |
| `seedance_1_5`   | `wavespeed-ai/seedance-v1.5-pro/image-to-video`   |
| `seedance_2_0`   | `bytedance/seedance-2.0/image-to-video`           |
| `imagen_3_fast`  | `wavespeed-ai/google/nano-banana-2/text-to-image` |
| `imagen_3`       | `wavespeed-ai/google/nano-banana-pro/text-to-image`|
| `flux_i2i`       | `wavespeed-ai/flux-kontext-dev/multi`             |

### fal.ai model IDs

| Key              | Model ID                                          |
|------------------|---------------------------------------------------|
| `kling_2_5`      | `fal-ai/kling-video/v2.5/pro/image-to-video`      |
| `kling_2_5_t2v`  | `fal-ai/kling-video/v2.5/pro/text-to-video`       |
| `kling_3_0`      | `fal-ai/kling-video/v3.0/pro/image-to-video`      |
| `seedance_1_5`   | `fal-ai/seedance-1-5-pro`                         |
| `seedance_2_0`   | `fal-ai/seedance-2.0`                             |
| `imagen_3_fast`  | `fal-ai/imagen3/fast`                             |
| `imagen_3`       | `fal-ai/imagen3`                                  |
| `flux_i2i`       | `fal-ai/flux/dev/image-to-image`                  |

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
- **Provider Settings** — live toggle between WaveSpeed and fal.ai, model selection

---

## Adding a New Template

1. Insert into `templates` table in Supabase
2. Insert initial prompt into `template_prompts` table
3. Update prompt anytime from Admin Panel → Prompts tab

No redeployment needed.

---

## Built by

[LinkAI](https://linkai.africa) · A Meckury production
