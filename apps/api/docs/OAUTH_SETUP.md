# OAuth Setup Guide

Comprehensive guide for setting up Google OAuth with Supabase Auth integration.

## Google OAuth Setup

### 1. Google Console Configuration

**Create OAuth Application:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable Google+ API or People API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"

**Configure OAuth Application:**
```
Application type: Web application
Name: Beezly App

Authorized JavaScript origins:
- http://localhost:3006 (API)
- http://localhost:3000 (Web app)

Authorized redirect URIs:
- https://[your-supabase-project].supabase.co/auth/v1/callback
- http://localhost:3000/auth/callback (for testing)
```

**Get Credentials:**
- Copy `Client ID` and `Client Secret`
- **Important**: For mobile apps, you'll also need to add your Android/iOS client IDs

### 2. Supabase Configuration

**Enable Google Provider:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Enter Google `Client ID` and `Client Secret`
4. Set redirect URL: `https://[your-project].supabase.co/auth/v1/callback`

**Configure Redirect URLs:**
```
Site URL: http://localhost:3000
Additional redirect URLs:
- http://localhost:3000/auth/callback  # Web app
- http://localhost:3001/auth/callback  # Web app (alternate port)
- beezly://auth/callback              # Mobile app (Expo)
```

## Frontend Integration

### React/Next.js Implementation

**Install Dependencies:**
```bash
npm install @supabase/supabase-js
```

**OAuth Hook:**
```typescript
// hooks/useOAuth.ts
import { useState } from 'react';

export const useGoogleOAuth = () => {
  const [loading, setLoading] = useState(false);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      // Step 1: Get OAuth URL
      const response = await fetch('/api/auth/oauth/google/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redirectUrl: `${window.location.origin}/auth/callback`
        })
      });
      
      const { url } = await response.json();
      
      // Step 2: Redirect to Google
      window.location.href = url;
    } catch (error) {
      console.error('OAuth error:', error);
    } finally {
      setLoading(false);
    }
  };

  return { signInWithGoogle, loading };
};
```

**OAuth Callback Page:**
```typescript
// pages/auth/callback.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      // Get tokens from URL hash (Supabase format)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken) {
        try {
          // Exchange OAuth tokens for app JWT
          const response = await fetch('/api/auth/oauth/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: accessToken,
              refresh_token: refreshToken
            })
          });

          const authData = await response.json();
          
          // Store JWT token
          localStorage.setItem('token', authData.accessToken);
          
          // Redirect to dashboard
          router.push('/dashboard');
        } catch (error) {
          console.error('Callback error:', error);
          router.push('/signin?error=oauth_failed');
        }
      } else {
        router.push('/signin?error=oauth_cancelled');
      }
    };

    handleCallback();
  }, [router]);

  return <div>Processing OAuth callback...</div>;
}
```

**Login Button:**
```typescript
// components/GoogleSignInButton.tsx
import { useGoogleOAuth } from '../hooks/useOAuth';

export const GoogleSignInButton = () => {
  const { signInWithGoogle, loading } = useGoogleOAuth();

  return (
    <button 
      onClick={signInWithGoogle} 
      disabled={loading}
      className="bg-white border border-gray-300 rounded-lg px-4 py-2 flex items-center"
    >
      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
        {/* Google logo SVG */}
      </svg>
      {loading ? 'Signing in...' : 'Sign in with Google'}
    </button>
  );
};
```

## Mobile App Integration

### React Native / Expo

**Install Dependencies:**
```bash
cd apps/mobile
npx expo install expo-auth-session expo-crypto
```

**OAuth Service Implementation:**
```typescript
// services/googleOAuthService.ts
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabaseClient } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export class GoogleOAuthService {
  async signInWithGoogle() {
    try {
      const redirectUrl = makeRedirectUri({
        scheme: 'beezly',
        path: '/auth/callback',
      });

      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1));
        
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken) {
          // Exchange tokens with backend
          const response = await fetch(`${API_BASE_URL}/auth/oauth/callback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: accessToken,
              refresh_token: refreshToken,
            }),
          });

          const authData = await response.json();
          return authData;
        }
      }

      throw new Error('OAuth flow was cancelled or failed');
    } catch (error) {
      throw error;
    }
  }
}
```

**Google Sign-In Button:**
```typescript
// components/GoogleSignInButton.tsx
import React from 'react';
import { TouchableOpacity, Text, View, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export const GoogleSignInButton = () => {
  const { signInWithGoogle, loading } = useAuth();

  return (
    <TouchableOpacity
      onPress={signInWithGoogle}
      disabled={loading}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginVertical: 8,
      }}
    >
      {/* Google logo would go here */}
      <View style={{ marginLeft: 8 }}>
        {loading ? (
          <ActivityIndicator size="small" color="#4285F4" />
        ) : (
          <Text style={{ color: '#333', fontSize: 16 }}>
            Continue with Google
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};
```

## Testing OAuth Flow

### 1. Test OAuth URL Generation
```bash
curl -X POST http://localhost:3006/auth/oauth/google/url \
  -H "Content-Type: application/json" \
  -d '{"redirectUrl": "http://localhost:3000/auth/callback"}'
```

### 2. Test OAuth Callback
```bash
curl -X POST http://localhost:3006/auth/oauth/callback \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "oauth_access_token_from_google",
    "refresh_token": "oauth_refresh_token_from_google"
  }'
```

### 3. Verify User Creation
After OAuth login, check that:
- User record created in Supabase Auth
- Local PostgreSQL user record created
- JWT token returned with user info

## Troubleshooting

### Common Issues

**1. "Invalid redirect URI"**
- Ensure redirect URIs match exactly in Google Console and Supabase
- Check for trailing slashes or HTTP vs HTTPS

**2. "OAuth flow failed"**
- Check Supabase logs for detailed error messages
- Verify Google Client ID/Secret are correct
- Ensure Google APIs are enabled

**3. "User not created locally"**
- Check API logs for local database connection errors
- Verify UserService.createUserWithSupabaseId is working

**4. "CORS errors"**
- Add your frontend domain to CORS_ORIGINS in .env
- Ensure Supabase site URL is configured correctly

### Debug Steps

**1. Check Supabase Configuration:**
```sql
-- In Supabase SQL editor
SELECT * FROM auth.users WHERE email = 'test@gmail.com';
```

**2. Check Local Database:**
```sql
-- In local PostgreSQL
SELECT * FROM "User" WHERE email = 'test@gmail.com';
```

**3. Enable Debug Logging:**
```bash
# In .env.local
LOG_LEVEL=debug
DB_LOGGING=true
```

## Security Considerations

### Production Setup

**Environment Variables:**
```bash
# Required for OAuth
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth (configured in Supabase Dashboard)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

**Security Best Practices:**
- Use HTTPS in production
- Validate all OAuth tokens server-side
- Implement rate limiting on OAuth endpoints
- Store sensitive credentials in secure environment variables
- Regular security audits of OAuth flow

---

[← Back to Main README](../README.md)