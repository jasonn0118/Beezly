# Mobile Authentication Implementation

This document describes the mobile authentication system implementation for the Beezly app.

## Overview

The mobile authentication system supports:
- ✅ Email/password authentication
- ✅ Google OAuth integration
- ✅ JWT token management
- ✅ Persistent authentication state
- ✅ Protected routes
- ✅ Password reset functionality
- ✅ Mobile-optimized UI with accessibility features

## Architecture

### Components Structure

```
src/
├── contexts/
│   └── AuthContext.tsx          # Authentication state management
├── services/
│   ├── authService.ts           # Authentication API calls
│   └── api.ts                   # HTTP client with auth interceptors
├── components/
│   └── AuthGuard.tsx            # Protected route component
└── app/
    ├── login.tsx                # Login screen
    └── signup.tsx               # Signup screen
```

### Key Features

#### 1. AuthService
- **Email/Password Auth**: `signIn()`, `signUp()`
- **Google OAuth**: `getGoogleOAuthUrl()`, `handleOAuthCallback()`
- **Token Management**: `storeAuthData()`, `getAuthToken()`, `clearAuthData()`
- **Profile Management**: `updateProfile()`, `changePassword()`, `resetPassword()`

#### 2. AuthContext
- **Global State**: `isAuthenticated`, `isLoading`, `user`
- **Auth Actions**: `signIn()`, `signUp()`, `signOut()`
- **Profile Actions**: `updateProfile()`, `refreshUser()`
- **OAuth Actions**: `signInWithGoogle()`, `handleOAuthCallback()`

#### 3. UI Components
- **Mobile-Optimized**: Responsive design for various screen sizes
- **Accessibility**: Screen reader support, keyboard navigation
- **User Experience**: Loading states, error handling, validation
- **Modern Design**: Dark theme, consistent with Beezly brand colors

## API Integration

### Backend Endpoints Used

```
POST /auth/signin                 # Email/password login
POST /auth/signup                 # Email/password registration
POST /auth/signout                # User logout
GET  /auth/me                     # Get current user profile
PUT  /auth/profile                # Update user profile
PUT  /auth/password               # Change password
POST /auth/reset-password         # Request password reset

# Google OAuth
POST /auth/oauth/google/url       # Get Google OAuth URL
POST /auth/oauth/callback         # Handle OAuth callback
```

### Data Flow

1. **Authentication Request** → AuthService → API
2. **Success Response** → Store token + user data → Update AuthContext
3. **API Client** → Auto-attach JWT token to requests
4. **Token Expiry** → Auto-logout → Redirect to login

## Usage Examples

### Basic Setup

```tsx
// App.tsx - Wrap your app with AuthProvider
import { AuthProvider } from './src/contexts/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <YourAppContent />
    </AuthProvider>
  );
}
```

### Using Authentication in Components

```tsx
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { isAuthenticated, user, signOut } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginPrompt />;
  }
  
  return (
    <View>
      <Text>Welcome, {user?.firstName}!</Text>
      <Button title="Logout" onPress={signOut} />
    </View>
  );
}
```

### Protected Routes

```tsx
import AuthGuard from '../components/AuthGuard';

function ProtectedScreen() {
  return (
    <AuthGuard>
      <YourProtectedContent />
    </AuthGuard>
  );
}

// Or using HOC
export default withAuthGuard(ProtectedScreen);
```

### Manual Authentication Calls

```tsx
import { AuthService } from '../services/authService';

// Direct service usage (not recommended, use AuthContext instead)
const handleLogin = async () => {
  try {
    const response = await AuthService.signIn('email@example.com', 'password');
    console.log('Logged in:', response.user);
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

## Google OAuth Setup

### Required Dependencies

```json
{
  "expo-web-browser": "~14.1.6",
  "expo-linking": "~7.1.7"
}
```

### Backend Configuration

Ensure your backend has Google OAuth configured:
1. Google Cloud Console setup with OAuth credentials
2. Supabase Google provider configuration
3. Correct redirect URLs configured

### Mobile OAuth Flow

1. User taps "Continue with Google"
2. App opens `expo-web-browser` with Google OAuth URL
3. User authenticates with Google
4. Google redirects back to app with tokens
5. App extracts tokens and calls backend `/auth/oauth/callback`
6. Backend validates tokens and returns JWT
7. App stores JWT and updates authentication state

## Security Features

### Token Storage
- Uses `@react-native-async-storage/async-storage` for secure local storage
- Tokens are encrypted at rest on device
- Automatic token cleanup on logout

### API Security
- JWT tokens automatically attached to API requests
- Token expiry handling with automatic logout
- Request/response interceptors for error handling

### Input Validation
- Client-side form validation
- Email format validation
- Password strength requirements
- XSS protection through proper input sanitization

## Error Handling

### Network Errors
- Graceful handling of network failures
- User-friendly error messages
- Retry mechanisms where appropriate

### Authentication Errors
- Invalid credentials handling
- Token expiry detection
- Automatic logout on 401 responses

### Form Validation
- Real-time field validation
- Comprehensive error messaging
- Accessibility-compliant error announcements

## Accessibility Features

### Screen Reader Support
- Proper ARIA labels and hints
- Semantic form structure
- Error announcements

### Keyboard Navigation
- Tab order optimization
- Focus management
- Keyboard shortcuts support

### Visual Accessibility
- High contrast color scheme
- Readable font sizes
- Touch target sizing (minimum 44px)

## Testing Recommendations

### Unit Tests
```bash
# Test authentication service
npm test authService.test.ts

# Test authentication context
npm test AuthContext.test.tsx
```

### Integration Tests
```bash
# Test complete authentication flows
npm test auth.integration.test.ts
```

### Manual Testing Checklist

- [ ] Email/password login works correctly
- [ ] Email/password signup creates new accounts
- [ ] Google OAuth flow completes successfully
- [ ] Password reset sends email and works
- [ ] Authentication state persists across app restarts
- [ ] Protected routes redirect unauthenticated users
- [ ] Logout clears all authentication data
- [ ] Error handling displays appropriate messages
- [ ] Loading states show during async operations
- [ ] Form validation prevents invalid submissions
- [ ] Accessibility features work with screen readers

## Environment Configuration

### Required Environment Variables

```bash
# .env or app.config.js
EXPO_PUBLIC_API_URL=http://localhost:3006  # Your API base URL
EXPO_PUBLIC_API_TIMEOUT=10000              # API timeout in milliseconds
```

### Backend Environment Variables

Ensure your backend has these configured:
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

## Troubleshooting

### Common Issues

1. **Google OAuth not working**
   - Check redirect URLs in Google Console
   - Verify Supabase Google provider setup
   - Ensure `expo-web-browser` is installed

2. **Token not persisting**
   - Check AsyncStorage permissions
   - Verify `initializeAuth()` is called on app start
   - Check for storage quota limits

3. **API calls failing**
   - Verify API base URL configuration
   - Check network connectivity
   - Validate JWT token format

4. **Authentication state not updating**
   - Ensure AuthProvider wraps entire app
   - Check for multiple AuthContext instances
   - Verify useAuth() is called within AuthProvider

### Debug Logging

Enable debug logging in development:

```tsx
// In AuthService
console.log('Auth operation:', { operation, success: true });

// In AuthContext
console.log('Auth state changed:', { isAuthenticated, user: user?.email });
```

## Performance Considerations

### Optimization Strategies
- Lazy load authentication screens
- Cache user data locally
- Minimize API calls with optimistic updates
- Use React.memo for expensive components

### Bundle Size
- Tree-shake unused authentication features
- Optimize image assets for different screen densities
- Use appropriate dependencies (avoid heavy libraries)

## Migration Guide

### From Legacy AuthService

If upgrading from an older authentication system:

1. **Update API endpoints** to match new backend structure
2. **Replace direct AuthService calls** with useAuth() hook
3. **Wrap app with AuthProvider**
4. **Update token storage** to use new keys
5. **Test all authentication flows** thoroughly

### Breaking Changes
- `login()` → `signIn()`
- `register()` → `signUp()`
- Token storage keys changed
- User data structure updated

## Maintenance

### Regular Tasks
- Update dependencies quarterly
- Review and rotate API keys annually
- Monitor authentication metrics
- Update security practices as needed

### Monitoring
- Track authentication success/failure rates
- Monitor token expiry patterns
- Log security-related events
- Alert on unusual authentication patterns