# 🚀 Beezly API

> **High-performance NestJS backend** powering Beezly's AI-driven receipt processing and price intelligence platform.

---

## 📋 Table of Contents

- [⚡ Quick Start](#-quick-start)
- [🤖 What This API Does](#-what-this-api-does)
- [🔧 Core Services](#-core-services)
- [💻 Development Guide](#-development-guide)
- [🏗️ Architecture](#️-architecture)

## 📚 Documentation

| Guide | Purpose |
|-------|---------|
| **[Setup Guides](./docs/README.md)** | Database, authentication, and environment setup |
| **[Database Guide](./docs/DATABASE.md)** | PostgreSQL setup, migrations, schema management |
| **[Authentication Guide](./docs/AUTHENTICATION.md)** | Supabase JWT setup, API testing |
| **[OAuth Setup Guide](./docs/OAUTH_SETUP.md)** | Google OAuth integration with Supabase |
| **[Configuration Guide](./src/config/README.md)** | Service configuration and environment variables |

---

## ⚡ Quick Start

### 🚀 **Get Running in 30 Seconds**

```bash
# 1. Install dependencies
pnpm install

# 2. Start with auto database setup
pnpm run dev
```

**That's it!** 🎉 The API automatically:
- ✅ Connects to PostgreSQL (creates database if needed)
- ✅ Runs all migrations and seeds data
- ✅ Starts the development server on http://localhost:3006

> 🔗 **API Documentation**: http://localhost:3006/api (Swagger UI)

<details>
<summary>📚 Manual Database Setup</summary>

```bash
# Set up database manually
pnpm run dev:setup

# Or run individual commands
pnpm run migration:run --filter=api
```

📖 **[Complete Setup Guide](./docs/DATABASE.md)**
</details>

---

## 🤖 What This API Does

### 🎯 **The Problem We Solve**

Traditional receipt processing is:
- ❌ **Slow**: 15+ seconds per receipt
- ❌ **Expensive**: Costly AI API calls for every item
- ❌ **Confusing**: Users overwhelmed with irrelevant product matches
- ❌ **Error-Prone**: No learning from previous receipts

### ✅ **Our Solution: AI-Powered Intelligence**

Beezly API transforms receipt processing into a **lightning-fast, cost-efficient, learning system**:

| **Feature** | **Traditional** | **Beezly API** |
|-------------|-----------------|----------------|
| **Speed** | 15+ seconds | ⚡ **2-3 seconds** |
| **Cost** | High API usage | 💰 **95% cost reduction** |
| **Accuracy** | Generic matching | 🎯 **90%+ brand accuracy** |
| **Learning** | No memory | 🧠 **Store-specific vocabularies** |
| **UX** | Endless scrolling | 👤 **70% fewer irrelevant options** |

### 🚀 **4-Stage Intelligence Pipeline**

```mermaid
graph LR
    A[📷 Upload] --> B[🔍 AI Processing] --> C[✅ User Review] --> D[🔗 Smart Linking]
    
    style A fill:#e1f5fe
    style B fill:#f3e5f5  
    style C fill:#e8f5e8
    style D fill:#fff3e0
```

---

## 🔧 Core Services

### 📄 **1. Receipt Processing Engine**

**🧠 Embedding-Based Learning System**
- **Azure Form Recognizer v4.0**: High-accuracy OCR
- **OpenAI Embeddings**: Smart similarity matching with 95% cost reduction
- **Store-Specific Learning**: Builds vocabulary for each merchant
- **Multiple Formats**: PNG, JPG, JPEG, BMP, TIFF, WebP, HEIC, HEIF

### ✅ **2. User Confirmation & Review**
- **Receipt-Scoped Operations**: No cross-receipt contamination
- **Real-Time Editing**: User edits boost confidence scores (+0.1)
- **Comprehensive Summaries**: Complete linking statistics

### 🎯 **3. Smart Product Selection**
- **Enhanced Brand Matching**: Fuzzy logic (Kirkland ↔ Kirkland Signature) 
- **Brand-Filtered Results**: Only relevant products shown
- **Empty Selection Support**: "No good match found" handling

### 🔗 **4. Product Linking & Analytics**
- **Automatic Catalog Linking**: High-confidence matches
- **Unprocessed Queue**: Manual review for new products
- **Price Synchronization**: Historical tracking and analytics

📖 **[Detailed OCR Documentation](./src/ocr/README.md)**

### 🔐 **5. Authentication System**

**🛡️ JWT-Based Security with Supabase Integration**
- **Default Protection**: All API routes protected by default (JWT required)
- **Public Routes**: Must use `@Public()` decorator to bypass authentication
- **Role-Based Access**: Admin/user roles with fine-grained permissions
- **OAuth Support**: Google OAuth integration with mobile app support
- **Session Management**: Secure token validation and refresh handling

**📋 Authentication Endpoints**
```bash
# Public endpoints (no auth required)
POST /auth/signin              # Email/password login
POST /auth/signup              # User registration
POST /auth/oauth/google/url    # Get Google OAuth URL
POST /auth/oauth/callback      # Handle OAuth callback
POST /auth/reset-password      # Password reset

# Protected endpoints (JWT required)
GET /auth/me                   # Current user info
PUT /auth/profile              # Update profile
POST /auth/signout             # Sign out
PUT /auth/password             # Change password

# Admin endpoints (admin role required)
GET /auth/users                # List all users
GET /auth/users/:id            # Get user by ID
PUT /auth/users/:id            # Update user
DELETE /auth/users/:id         # Delete user
```

📖 **[Complete Authentication Guide](./docs/AUTH_USAGE_GUIDE.md)** | **[OAuth Setup Guide](./docs/OAUTH_SETUP.md)**

### 🏪 **6. Additional Services**

| **Service** | **Purpose** | **Key Features** |
|-------------|-------------|------------------|
| **👥 User** | Profile management | User data, preferences, history |
| **🏪 Store** | Store information | Location data, merchant details |
| **📦 Product** | Catalog management | Product database, CRUD operations |
| **🧾 Receipt** | Receipt data | Storage, metadata, relationships |
| **📊 Category** | Product categorization | Taxonomy, classification |

---

## 💻 Development Guide

### 🧠 **Complete Receipt Processing Workflow**

The API provides a comprehensive 4-stage workflow with these endpoint use cases:

#### **🔄 End-to-End Workflow Example**

**Scenario**: User uploads a Costco receipt with 5 items

```bash
# 1️⃣ UPLOAD RECEIPT
curl -X POST http://localhost:3006/ocr/process-receipt-enhanced \
  -F "image=@costco-receipt.jpg" \
  -F "endpoint=your_azure_endpoint" \
  -F "apiKey=your_azure_key"

# Response: Normalized items with embedding matches
# - 3 items auto-normalized via embeddings (fast)
# - 2 items normalized via AI (new products)
# - receiptId: "receipt-123"

# 2️⃣ USER REVIEWS & CONFIRMS ITEMS
curl -X POST http://localhost:3006/products/receipt/process-confirmations \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"normalizedProductSk": "norm-1", "isConfirmed": true},
      {"normalizedProductSk": "norm-2", "normalizedName": "Corrected Name", "isConfirmed": true}
    ],
    "receiptId": "receipt-123"
  }'

# Response: 
# - 3 items auto-linked to catalog products
# - 2 items require user selection (multiple matches found)

# 3️⃣ HANDLE MULTIPLE MATCHES
curl -X GET http://localhost:3006/products/receipt/receipt-123/pending-selections

# Response: Shows 2 items with multiple catalog product options
# User selects best matches or indicates "no match"

curl -X POST http://localhost:3006/products/receipt/process-selections \
  -H "Content-Type: application/json" \
  -d '{
    "selections": [
      {"normalizedProductSk": "norm-4", "selectedProductSk": "prod-456"},
      {"normalizedProductSk": "norm-5", "selectedProductSk": null}
    ],
    "receiptId": "receipt-123"
  }'

# Response:
# - 1 item linked to selected product
# - 1 item moved to unprocessed queue for admin review

# 4️⃣ FINAL RESULT
# ✅ 4 items successfully linked to catalog products
# 📝 1 item in unprocessed queue for new product creation
# 💰 Price sync automatically triggered for linked products
```

#### **⚡ Common Workflow Patterns**

<details>
<summary><strong>Quick Processing (High Confidence Items)</strong></summary>

```bash
# Scenario: Most items have high embedding matches
# 1. Upload receipt
POST /ocr/process-receipt-enhanced

# 2. Batch confirm all high-confidence items
POST /products/receipt/process-confirmations
# Result: 90% of items auto-linked, minimal user intervention needed
```

</details>

<details>
<summary><strong>New Store/Products (Low Embedding Coverage)</strong></summary>

```bash
# Scenario: New merchant or many unknown products
# 1. Upload receipt
POST /ocr/process-receipt-enhanced

# 2. Confirm items (many will need user review)
POST /products/receipt/process-confirmations

# 3. Handle many pending selections
GET /products/receipt/{receiptId}/pending-selections
POST /products/receipt/process-selections

# 4. Review unprocessed items for new product creation
GET /products/unprocessed/review?status=pending_review
POST /products/unprocessed/{id}/create-product
```

</details>

<details>
<summary><strong>Admin Review & Management</strong></summary>

```bash
# Monitor system health and coverage
GET /products/embeddings/stats
GET /products/linking/stats
GET /products/unprocessed/stats

# Batch process unprocessed items
GET /products/unprocessed/high-priority
POST /products/unprocessed/bulk-review

# Update embeddings for better future matching
POST /products/embeddings/update?batchSize=100
```

</details>

### 🔧 **Complete API Examples**

<details>
<summary>📋 <strong>Stage 1: Enhanced Receipt Processing</strong></summary>

**🧠 AI-Powered OCR with Embedding Learning**

```bash
# Enhanced Receipt Processing with AI Learning
curl -X POST http://localhost:3006/ocr/process-receipt-enhanced \
  -F "image=@receipt.jpg" \
  -F "endpoint=your_azure_endpoint" \
  -F "apiKey=your_azure_key"
```

**Response includes embedding lookups and normalized products:**

```json
{
  "items": [
    {
      "name": "ORGN FUJI APPLE",
      "normalized_name": "Organic Fuji Apples",
      "brand": "Organic Farms",
      "category": "Produce",
      "confidence_score": 0.95,
      "normalization_method": "embedding_lookup",
      "embedding_lookup": {
        "found": true,
        "similarity_score": 0.92,
        "method": "embedding_match"
      }
    }
  ],
  "normalization_summary": {
    "total_items": 25,
    "product_items": 20,
    "discount_items": 3,
    "average_confidence": 0.87
  }
}
```

**⚡ Performance Benefits:**
- **Speed**: 2-3 seconds (was 15+ seconds)
- **Cost**: 95% fewer API calls through embedding reuse
- **Accuracy**: 90%+ brand matching for store brands

</details>

<details>
<summary>✅ <strong>Stage 2: User Confirmation & Review</strong></summary>

**📝 Process User Confirmations and Edits**

```bash
curl -X POST http://localhost:3006/products/receipt/process-confirmations \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "normalizedProductSk": "123e4567-e89b-12d3-a456-426614174000",
        "normalizedName": "Organic Fuji Apples",
        "brand": "Green Valley Farms", 
        "isConfirmed": true
      }
    ],
    "userId": "user-uuid",
    "receiptId": "receipt-uuid"
  }'
```

**📊 Enhanced Confirmation Response:**

```json
{
  "success": true,
  "processed": 20,
  "linked": 15,
  "unprocessed": 2,
  "linkedProducts": [
    {
      "normalizedProductSk": "123e4567-e89b-12d3-a456-426614174000",
      "linkedProductSk": "456e7890-e89b-12d3-a456-426614174001",
      "linkingMethod": "embedding_similarity_brand_match",
      "linkingConfidence": 0.92
    }
  ],
  "pendingSelectionProducts": [
    {
      "normalizedProduct": {
        "normalizedProductSk": "789e0123-e89b-12d3-a456-426614174002",
        "normalizedName": "Kirkland Signature Apples",
        "brand": "Kirkland",
        "category": "Produce"
      },
      "matchCount": 3,
      "topMatches": [
        {
          "productSk": "product-1",
          "name": "Kirkland Signature Gala Apples",
          "brandName": "Kirkland Signature",
          "score": 0.95,
          "method": "embedding_similarity_brand_match"
        }
      ]
    }
  ],
  "receiptSummary": {
    "totalReceiptItems": 25,
    "confirmedItems": 20,
    "successfullyLinked": 15,
    "requiresUserSelection": 3,
    "movedToUnprocessed": 2
  }
}
```

**🎯 Key Features:**
- **Receipt-Scoped**: No cross-receipt contamination
- **User Edit Boost**: Confidence scores +0.1 for user edits
- **Comprehensive Summary**: Complete linking statistics

</details>

<details>
<summary>🎯 <strong>Stage 3: Smart Product Selection</strong></summary>

**🔍 Get Receipt-Scoped Pending Selections (Automatic)**

```bash
# Automatically finds all pending items from specific receipt
curl -X GET http://localhost:3006/products/receipt/{receiptId}/pending-selections
```

**Response with Brand-Filtered Matches:**

```json
{
  "pendingSelections": [
    {
      "normalizedProduct": {
        "normalizedProductSk": "789e0123-e89b-12d3-a456-426614174002",
        "rawName": "KIRKLAND APPLE",
        "normalizedName": "Kirkland Signature Apples",
        "brand": "Kirkland"
      },
      "matchCount": 3,
      "topMatches": [
        {
          "productSk": "product-1",
          "name": "Kirkland Signature Gala Apples",
          "brandName": "Kirkland Signature",
          "score": 0.95,
          "method": "embedding_similarity_brand_match"
        }
      ]
    }
  ]
}
```

**👆 Process User Product Selections**

```bash
curl -X POST http://localhost:3006/products/receipt/process-selections \
  -H "Content-Type: application/json" \
  -d '{
    "selections": [
      {
        "normalizedProductSk": "789e0123-e89b-12d3-a456-426614174002",
        "selectedProductSk": "product-1",
        "selectionReason": "Selected best match"
      },
      {
        "normalizedProductSk": "another-product-sk",
        "selectedProductSk": null,
        "selectionReason": "No suitable product found"
      }
    ],
    "receiptId": "receipt-uuid"
  }'
```

**🏷️ Enhanced Brand Matching:**
- **Brand Compatibility**: Kirkland ↔ Kirkland Signature fuzzy matching
- **Brand Filtering**: Mismatched brands filtered out entirely
- **Empty Selection Support**: Users can indicate "no good match"

</details>

<details>
<summary>🔗 <strong>Stage 4: Analytics & Management</strong></summary>

**🔍 Advanced Search & Analytics**

```bash
# Search Similar Products by Embedding
curl -X POST http://localhost:3006/products/search/embedding \
  -H "Content-Type: application/json" \
  -d '{"query":"apple juice","merchant":"WALMART","limit":3}'

# Check Embedding Coverage Statistics
curl http://localhost:3006/products/embeddings/stats

# Get Unprocessed Products for Review
curl http://localhost:3006/products/unprocessed/review?status=pending_review&limit=50

# Sync Receipt Prices to Historical Tracking
curl -X POST http://localhost:3006/products/sync-receipt-prices
```

**📊 Batch Operations for Efficiency**

```bash
# Batch Embedding Search (for entire receipts)
curl -X POST http://localhost:3006/products/search/embedding/batch \
  -H "Content-Type: application/json" \
  -d '{
    "queries": ["ORGN APPLE", "2% MILK", "WHEAT BREAD"],
    "merchant": "TRADER JOES",
    "limitPerQuery": 3
  }'

# Update Missing Embeddings
curl -X POST http://localhost:3006/products/embeddings/update?batchSize=50

# Bulk Unprocessed Product Review
curl -X POST http://localhost:3006/products/unprocessed/bulk-review \
  -H "Content-Type: application/json" \
  -d '{
    "unprocessedProductSks": ["uuid1", "uuid2"],
    "action": "approve",
    "reviewerId": "reviewer-uuid"
  }'
```

**📈 Performance Metrics:**
- **Processing Speed**: 2-3 seconds average
- **Brand Accuracy**: 90%+ for store brands
- **Cost Optimization**: 95% fewer OpenAI calls
- **User Efficiency**: 70% fewer irrelevant options

</details>

### 🏗️ **Key Architecture Components**

<details>
<summary>🔧 <strong>Core Services & Technical Implementation</strong></summary>

#### **📄 OCR Service** (`src/ocr/ocr.service.ts`)
- **Azure Form Recognizer v4.0**: High-accuracy receipt text extraction
- **Batch Embedding Lookups**: Process multiple items simultaneously 
- **Smart Format Detection**: HEIC/HEIF conversion for compatibility
- **Enhanced Performance**: 80% faster processing (15s → 2-3s)
- **Endpoint**: `POST /ocr/process-receipt-enhanced`

#### **🧠 Vector Embedding Service** (`src/product/vector-embedding.service.ts`)
- **OpenAI text-embedding-3-small**: 1536-dimensional vectors
- **PostgreSQL pgvector**: Efficient similarity search with HNSW indexing
- **Batch Processing**: Single API call for multiple products
- **Cosine Distance**: Similarity scoring with configurable thresholds

#### **⚡ Product Normalization Service** (`src/product/product-normalization.service.ts`)
- **AI-Powered Normalization**: GPT-4 product name standardization
- **Duplicate Prevention**: Comprehensive detection algorithm
- **Confidence-Based Selection**: Choose between embedding matches vs AI results
- **Async Embedding Generation**: Background processing for fast responses

#### **✅ Product Confirmation Service** (`src/product/product-confirmation.service.ts`)
- **Receipt-Scoped Operations**: Isolated workflow per receipt
- **User Edit Integration**: Confidence score boosting (+0.1)
- **Smart Linking**: Automatic product catalog matching
- **Comprehensive Summaries**: Complete processing statistics

#### **🎯 Product Selection Service** (`src/product/product-selection.service.ts`)
- **Enhanced Brand Matching**: Fuzzy logic (Kirkland ↔ Kirkland Signature)
- **Brand Filtering**: Remove mismatched brand candidates
- **Similarity Scoring**: Multiple matching algorithms with confidence scores
- **Empty Selection Support**: Handle "no good match" scenarios

#### **🔗 Receipt Price Integration** (`src/product/receipt-price-integration.service.ts`)
- **Historical Price Tracking**: Create Price entities from receipt data
- **Discount Processing**: Link discounts to products automatically
- **Async Price Sync**: Background processing after product linking
- **Analytics Integration**: Support for price trend analysis

</details>

<details>
<summary>⚡ <strong>Performance Optimizations</strong></summary>

#### **🚀 Batch Processing Architecture**
```typescript
// BEFORE: 20 sequential API calls (15+ seconds)
for (const item of receiptItems) {
  await openai.createEmbedding(item.name);
}

// AFTER: 1 batch API call (2-3 seconds)
const embeddings = await openai.createEmbeddings(uniqueItemNames);
```

#### **🔄 Asynchronous Processing**
```typescript
// Save product immediately for fast response
const savedProduct = await repository.save(product);
// Generate embedding in background
this.generateEmbeddingAsync(savedProduct);
return savedProduct; // User gets immediate response
```

#### **🎯 Smart Duplicate Prevention**
```typescript
// Comprehensive duplicate detection
if (
  candidate.normalizedName === result.normalizedName &&
  candidate.brand === result.brand &&
  candidate.category === result.category &&
  Math.abs(candidate.confidenceScore - result.confidenceScore) < 0.001
) {
  return existingProduct; // Reuse existing
}
```

#### **📊 Performance Gains**
- **Response Time**: 15+ seconds → 2-3 seconds (80% faster)
- **API Costs**: 20x sequential → 1x batch (95% reduction)
- **User Experience**: Dramatic improvement in responsiveness
- **Embedding Coverage**: 85%+ after initial processing
- **Store Learning**: Builds merchant-specific vocabularies

</details>

### ⚙️ **Environment Setup**

📖 **[Complete Environment Guide](./docs/AUTHENTICATION.md#environment-configuration)** - Detailed .env setup with all required variables

### 📦 **Development Commands**

```bash
# 🚀 Development
pnpm run start:dev     # Start with hot reload
pnpm run dev          # Same as above (alias)

# 🏗️ Production
pnpm run build        # Build for production
pnpm run start:prod   # Start production server

# 🧪 Quality & Testing
pnpm run lint         # Lint code
pnpm run test         # Run unit tests
pnpm run test:e2e     # Run end-to-end tests
pnpm run test:cov     # Test coverage report
```

---

## 🏗️ Architecture

### 📊 **API Documentation**

Once running, access interactive documentation:
- **🔗 Swagger UI**: http://localhost:3006/api
- **📖 OpenAPI Spec**: Comprehensive API documentation with examples

### 🗃️ **Database Management**

<details>
<summary>🔧 <strong>Migration Commands</strong></summary>

```bash
# 📊 Check Migration Status
pnpm run migration:show    # Show applied migrations
pnpm run migration:check   # Check pending migrations

# 🚀 Apply Migrations
pnpm run migration:run     # Apply pending migrations

# 📝 Create New Migrations
pnpm run migration:generate -- src/migrations/DescriptiveName
pnpm run migration:create -- src/migrations/EmptyMigration

# ⏪ Rollback
pnpm run migration:revert  # Rollback last migration
```

**🛡️ Safe Migration Workflow:**
1. **Make entity changes** → Modify TypeORM entities
2. **Generate migration** → `pnpm run migration:generate -- src/migrations/AddColumn`
3. **Review generated SQL** → Check `src/migrations/` directory
4. **Apply migration** → `pnpm run migration:run`
5. **Test changes** → `pnpm test`

</details>

<details>
<summary>⚠️ <strong>Database Safety Rules</strong></summary>

**🚨 CRITICAL: Never use these commands on production:**

```bash
# ❌ DANGEROUS - Drops all tables and data
dataSource.synchronize()
synchronize: true
pnpm run schema:sync
```

**✅ Safe Production Workflow:**
1. **Always backup** database before schema changes
2. **Use migrations only** (`synchronize: false`)
3. **Test on staging** with production data copy
4. **Apply migrations safely** in production

**🆘 Emergency Recovery:**
1. **Restore from backup** immediately
2. **Mark baseline**: `pnpm run migration:mark-baseline --filter=api`
3. **Apply new migrations**: `pnpm run migration:run --filter=api`

</details>

### 🏛️ **Architecture Patterns**

The API follows **Clean Architecture** principles:

| **Layer** | **Responsibility** | **Components** |
|-----------|-------------------|----------------|
| **🌐 Presentation** | HTTP handling | Controllers, DTOs, Guards |
| **💼 Business** | Core logic | Services, Use Cases |
| **🗄️ Data** | Persistence | Entities, Repositories |
| **🔧 Infrastructure** | External services | OCR, AI, File storage |

### 🎯 **Key Design Patterns**

- **📦 Dependency Injection**: NestJS IoC container
- **🎭 Repository Pattern**: Data access abstraction
- **📝 DTO Pattern**: Request/response validation
- **🛡️ Guard Pattern**: Authentication and authorization
- **🔄 Interceptor Pattern**: Cross-cutting concerns (logging, caching)
- **📊 Observer Pattern**: Event-driven processing

### 🧪 **Testing Strategy**

```bash
# 🧪 Unit Tests
pnpm run test          # Run all unit tests
pnpm run test:watch    # Watch mode for development
pnpm run test:cov      # Coverage report

# 🔗 Integration Tests  
pnpm run test:e2e      # End-to-end API testing

# 📊 Test Coverage Goals
# - Unit Tests: >80% coverage
# - Integration Tests: >70% coverage
# - Critical Paths: 100% coverage
```

---

## 🤝 Contributing

### ✅ **Quality Checklist**

Before submitting changes:

- [ ] **🧪 Tests Pass**: `pnpm test && pnpm run test:e2e`
- [ ] **📏 Linting Clean**: `pnpm run lint`
- [ ] **🔍 Types Valid**: `pnpm run type-check`
- [ ] **🏗️ Builds Successfully**: `pnpm run build`
- [ ] **📊 Migration Generated**: For entity changes
- [ ] **📖 API Docs Updated**: For new endpoints

### 🌟 **Best Practices**

1. **🎯 Single Responsibility**: One feature per PR
2. **📝 Clear Descriptions**: Explain the why, not just the what
3. **🧪 Test Coverage**: Include tests for new functionality
4. **📚 Documentation**: Update Swagger/OpenAPI specs
5. **🔒 Security**: Never expose sensitive data in logs

---

## 📄 License

This project is part of the Beezly application ecosystem.
