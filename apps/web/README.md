# 🌐 Beezly Web App

> **Next.js 15 frontend** for Beezly's receipt feedback platform and viral microsite experience.

---

## 📋 Table of Contents

- [⚡ Quick Start](#-quick-start)
- [🎯 Purpose & Features](#-purpose--features)  
- [🛠️ Technology Stack](#️-technology-stack)
- [💻 Development](#-development)
- [🏗️ Architecture](#️-architecture)

---

## ⚡ Quick Start

### 🚀 **Get Running in 30 Seconds**

```bash
# From project root
pnpm install

# Start web app
pnpm dev --filter=web
```

**Access your app**: http://localhost:3001

<details>
<summary>📚 Manual Setup</summary>

```bash
# Navigate to web app
cd apps/web

# Install dependencies
pnpm install  

# Start development server
pnpm dev
```

</details>

---

## 🎯 Purpose & Features

### 🧠 **What This Web App Does**

The Beezly web application serves as the **user-facing frontend** for receipt feedback and community engagement:

| **Feature** | **Purpose** | **User Benefit** |
|-------------|-------------|------------------|
| **📋 Receipt Feedback** | Users review and improve receipt processing results | Higher accuracy, personalized experience |
| **🌟 Viral Microsite** | Share receipt insights and price discoveries | Community engagement, social proof |
| **📊 Analytics Dashboard** | Track personal savings and price trends | Data-driven shopping decisions |
| **🎯 Community Features** | Leaderboards, badges, social sharing | Gamification, user retention |

### ✨ **Key Capabilities**

- **📱 Responsive Design**: Optimized for desktop, tablet, and mobile
- **⚡ Fast Performance**: Next.js 15 App Router with streaming
- **🔐 Authentication**: JWT-based auth with Supabase integration
- **📊 Real-time Updates**: Live data from NestJS API
- **🎨 Modern UI**: Clean, accessible interface design

---

## 🛠️ Technology Stack

### 📦 **Core Technologies**

| **Layer** | **Technology** | **Purpose** |
|-----------|----------------|-------------|
| **Framework** | Next.js 15 | React framework with App Router |
| **Styling** | CSS Modules | Component-scoped styling |
| **TypeScript** | Latest | Type safety and developer experience |
| **API Integration** | Fetch API | Communication with NestJS backend |
| **Authentication** | JWT + Cookies | Secure user sessions |

### 🔧 **Dependencies**

```json
{
  "next": "15.x",
  "react": "19.x", 
  "typescript": "5.x"
}
```

---

## 💻 Development

### 🧪 **Available Commands**

```bash
# 🚀 Development
pnpm dev          # Start development server (http://localhost:3001)
pnpm dev:debug    # Start with debugging enabled

# 🏗️ Building
pnpm build        # Build for production
pnpm start        # Start production server

# 🧪 Quality Assurance
pnpm lint         # Lint code with ESLint
pnpm type-check   # TypeScript validation
```

### 🔧 **Development Workflow**

1. **Start the API**: Ensure the NestJS backend is running on port 3006
2. **Run the web app**: `pnpm dev --filter=web` 
3. **Make changes**: Edit files in `src/` and see live updates
4. **Test integration**: Verify API calls work with the backend

### 📁 **Project Structure**

```
apps/web/
├── app/                     # Next.js 15 App Router
│   ├── page.tsx            # Home page
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles
├── src/
│   └── services/           # API integration services
│       ├── api.ts          # Base API client
│       ├── authService.ts  # Authentication
│       ├── productService.ts # Product data
│       └── receiptService.ts # Receipt processing
├── public/                 # Static assets
└── next.config.ts          # Next.js configuration
```

---

## 🏗️ Architecture

### 🔌 **API Integration**

The web app integrates with the NestJS backend for all data operations:

```typescript
// Example API service usage
import { receiptService } from '@/services';

const processReceipt = async (receiptData: FormData) => {
  const result = await receiptService.processReceipt(receiptData);
  return result;
};
```

### 🔐 **Authentication Flow**

```typescript
// Authentication integration
import { authService } from '@/services';

const handleLogin = async (email: string, password: string) => {
  const { accessToken, user } = await authService.signIn(email, password);
  // Store token and redirect user
};
```

### 📊 **Data Flow**

1. **User Interaction** → Web UI components
2. **API Calls** → Service layer → NestJS backend
3. **Data Processing** → Backend services → Database
4. **Response** → Service layer → UI update

### 🎨 **Styling Architecture**

- **CSS Modules**: Component-scoped styles
- **Global Styles**: Shared design tokens and utilities
- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG 2.1 compliance

---

## 🤝 Contributing

### ✅ **Quality Checklist**

Before submitting changes:

- [ ] **🧪 App builds successfully**: `pnpm build`
- [ ] **📏 Linting clean**: `pnpm lint`
- [ ] **🔍 Types valid**: `pnpm type-check`
- [ ] **🔗 API integration tested**: Verify backend connectivity
- [ ] **📱 Responsive design**: Test on different screen sizes

### 🌟 **Best Practices**

1. **🎯 Component Structure**: Use functional components with hooks
2. **📝 TypeScript**: Proper typing for all props and API responses
3. **♿ Accessibility**: Include proper ARIA labels and semantic HTML
4. **⚡ Performance**: Optimize images and use Next.js features
5. **🔒 Security**: Never expose sensitive data in client-side code

---

## 📄 License

This project is part of the Beezly application ecosystem.

---

📖 **[← Back to Main README](../../README.md)** | **[📚 All Documentation](../../README.md#-app-specific-documentation)**