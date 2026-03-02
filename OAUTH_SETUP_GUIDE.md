# OAuth Provider Setup Guide (Google, GitHub, Facebook)

This guide explains how to configure Google, GitHub, and Facebook sign-in for the SkILA exam portal using Supabase Auth.

## Prerequisites

- A Supabase project ([supabase.com](https://supabase.com))
- Admin access to your Supabase Dashboard

## 1. Configure Redirect URLs in Supabase

Before testing OAuth, add your app URLs to Supabase's allowed redirect list:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project
2. Navigate to **Authentication** → **URL Configuration**
3. Set **Site URL** to your production URL (e.g. `https://sk-ila.vercel.app` or `https://exam.globaloneservices.com`)
4. Under **Redirect URLs**, add:
   - `http://localhost:5173/login` (for local development with Vite)
   - `https://your-production-domain.com/login` (your production URL)

---

## 2. Google Sign-In Setup

### Step 1: Create OAuth Credentials in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. If prompted, configure the **OAuth consent screen**:
   - Add your app name, logo, and support email
   - Add scopes: `email`, `profile`, `openid` (these are usually added by default)
6. For **Application type**, select **Web application**
7. Add **Authorized JavaScript origins**:
   - `http://localhost:5173` (local dev)
   - `https://your-production-domain.com`
8. Add **Authorized redirect URIs**:
   - `https://hnrrruofqimutiqipqfh.supabase.co/auth/v1/callback`
   - (Use your project's Supabase URL from the dashboard)
9. Copy the **Client ID** and **Client Secret**

### Step 2: Configure in Supabase

1. Supabase Dashboard → **Authentication** → **Providers**
2. Find **Google** and enable it
3. Paste your **Client ID** and **Client Secret**
4. Save

---

## 3. GitHub Sign-In Setup

### Step 1: Create OAuth App in GitHub

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in:
   - **Application name**: SkILA Exam Portal (or your app name)
   - **Homepage URL**: `https://your-production-domain.com` or `http://localhost:5173`
   - **Authorization callback URL**: `https://hnrrruofqimutiqipqfh.supabase.co/auth/v1/callback`
4. Register the application
5. Generate a **Client Secret** (click "Generate a new client secret")
6. Copy the **Client ID** and **Client Secret**

### Step 2: Configure in Supabase

1. Supabase Dashboard → **Authentication** → **Providers**
2. Find **GitHub** and enable it
3. Paste your **Client ID** and **Client Secret**
4. Save

---

## 4. Facebook Sign-In Setup

### Step 1: Create Facebook App

1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app or select existing one
3. Add the **Facebook Login** product
4. Choose **Web** as platform
5. Go to **Facebook Login** → **Settings**
6. Add **Valid OAuth Redirect URIs**:
   - `https://hnrrruofqimutiqipqfh.supabase.co/auth/v1/callback`
7. Save changes
8. Go to **Settings** → **Basic** to get:
   - **App ID** (Client ID)
   - **App Secret** (Client Secret)
9. Ensure your app is in **Live** mode for production, or add yourself as a test user for development

### Step 2: Configure in Supabase

1. Supabase Dashboard → **Authentication** → **Providers**
2. Find **Facebook** and enable it
3. Paste your **Client ID** (App ID) and **Client Secret** (App Secret)
4. Save

---

## 5. Apply Database Migration (OAuth Profile Data)

For OAuth users, profile names are read from provider metadata. Apply the migration:

```bash
# If using Supabase CLI locally
supabase db push

# Or run the migration SQL manually in Supabase SQL Editor:
# See: supabase/migrations/20250302000000_update_handle_new_user_for_oauth.sql
```

---

## 6. Testing

1. Start your dev server: `npm run dev`
2. Go to the login page
3. Click "Continue with Google", "Continue with GitHub", or "Continue with Facebook"
4. Complete the OAuth flow
5. You should be redirected back and signed in

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Redirect URL not allowed" | Add the exact URL to Supabase → Auth → URL Configuration → Redirect URLs |
| "Invalid OAuth client" | Verify Client ID and Secret in Supabase match the provider's credentials |
| "Provider not enabled" | Enable the provider in Supabase → Authentication → Providers |
| Profile has wrong name | Ensure migration `20250302000000_update_handle_new_user_for_oauth.sql` is applied |
| Facebook "App Not Setup" | Add the Facebook Login product and configure redirect URI |

---

## Security Notes

- Never commit Client Secrets to version control
- Use different OAuth apps for development and production when possible
- Rotate secrets if they are ever exposed
