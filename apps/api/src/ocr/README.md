# Beezly Receipt OCR Service

This service provides OCR (Optical Character Recognition) functionality for processing receipt images in the Beezly application. It converts receipt images into structured data for price tracking and comparison.

## Features

- 🚀 **Azure Form Recognizer v4.0** - High accuracy receipt parsing with structured data extraction
- 📸 **Multiple Image Formats** - Support for PNG, JPG, JPEG, BMP, TIFF, WebP, HEIC, HEIF formats
- 💰 **Financial Breakdown** - Automatic extraction of subtotal, tax, and total amounts
- 📝 **Line-by-Line Item Parsing** - Detailed item extraction with prices and quantities
- 🗜️ **Intelligent Image Processing** - Automatic image compression to meet Azure size limits
- 🔧 **Fallback Support** - Text parsing as backup when structured data unavailable  
- 🎯 **Confidence Scoring** - Azure provides confidence scores for reliability
- 💾 **Asynchronous Storage** - Receipt images are uploaded to Supabase storage asynchronously for improved performance
- 🔐 **Secure Storage** - Uses service role key for server-side uploads, bypassing RLS policies
- 🎨 **WebP Conversion** - All images are automatically converted to WebP format for optimal web performance
- 🍎 **HEIC Support** - Apple HEIC/HEIF images are automatically converted via two-step process (HEIC→JPEG→WebP)

## API Endpoints

### POST /ocr/process-receipt

Process a receipt image and extract structured data for Beezly's price tracking system.

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (required): Receipt image file
  - `user_id` (optional): User ID for file organization (defaults to 'default_user')
  - `store_id` (optional): Store ID for file organization (defaults to 'default_store')

**Prerequisites:**
- `AZURE_FORM_RECOGNIZER_ENDPOINT` environment variable must be set
- `AZURE_FORM_RECOGNIZER_API_KEY` environment variable must be set
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` environment variables must be set for storage

**Response:**
```json
{
  "success": true,
  "data": {
    "merchant": "Store Name",
    "store_address": "123 Main St, New York, NY 10001",
    "date": "2023-12-01",
    "time": "14:30:00",
    "total": "$25.99",
    "subtotal": "$24.00",
    "tax": "$1.99",
    "items": [
      {
        "name": "Product Name",
        "price": "$12.99",
        "quantity": "1",
        "unit_price": "$12.99"
      }
    ],
    "raw_text": "Raw OCR text...",
    "azure_confidence": 0.95,
    "engine_used": "Azure Form Recognizer v4.0"
  }
}
```

**Note:** The `uploaded_file_path` field has been removed from the response as image upload now happens asynchronously in the background for improved performance. The OCR results are returned immediately without waiting for the upload to complete.

### POST /ocr/health

Check the health status of the OCR service.

**Request:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "message": "OCR service is running",
  "azure_configured": true
}
```

Where:
- `azure_configured`: True if Azure credentials are properly configured via environment variables

## Usage Examples

### Using cURL

```bash
# Process receipt (uploads to default_user/default_store)
curl -X POST http://localhost:3000/ocr/process-receipt \
  -F "file=@receipt.jpg"

# Process receipt with custom user and store organization
curl -X POST http://localhost:3000/ocr/process-receipt \
  -F "file=@receipt.jpg" \
  -F "user_id=user_123" \
  -F "store_id=store_456"

# Check service health
curl -X POST http://localhost:3000/ocr/health
```

### Using JavaScript/TypeScript

```typescript
// Process receipt (uploads to default_user/default_store)
const formData = new FormData();
formData.append('file', file);

const response = await fetch('/ocr/process-receipt', {
  method: 'POST',
  body: formData,
});

const result = await response.json();
console.log(result.data);
// Note: uploaded_file_path is no longer included in the response
// Image upload happens asynchronously in the background

// Process receipt with custom user and store organization
const formDataWithCustom = new FormData();
formDataWithCustom.append('file', file);
formDataWithCustom.append('user_id', 'user_123');
formDataWithCustom.append('store_id', 'store_456');

const responseWithCustom = await fetch('/ocr/process-receipt', {
  method: 'POST',
  body: formDataWithCustom,
});

const resultWithCustom = await responseWithCustom.json();
// Note: uploaded_file_path is no longer included in the response
// Image upload happens asynchronously in the background

// Check service health
const healthResponse = await fetch('/ocr/health', {
  method: 'POST',
});

const healthResult = await healthResponse.json();
console.log(healthResult.azure_configured); // Should be true if env vars are set
```

## Configuration

### Azure Form Recognizer Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a "Form Recognizer" resource
3. Get your endpoint URL and API key
4. Configure them using environment variables

### Supabase Storage Setup

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to Settings → API
3. Copy your project URL and service role key
4. Create a storage bucket named `receipt` (if not already created)
5. Configure environment variables

### Environment Variables

Add these variables to your `.env` file:

```bash
# Required for Azure Form Recognizer
AZURE_FORM_RECOGNIZER_ENDPOINT=https://your-resource.cognitiveservices.azure.com
AZURE_FORM_RECOGNIZER_API_KEY=your-azure-api-key

# Required for Supabase Storage (for file upload functionality)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Anonymous key (for client-side operations)
SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Storage Security

The service uses **service role key** authentication for secure server-side uploads:

- **Service Role Key**: Used by the backend to bypass RLS policies
- **Secure**: Never exposed to client-side code
- **Bypasses RLS**: Allows server to upload files regardless of user authentication
- **Recommended**: For API endpoints and server-side operations

**Alternative RLS Policy** (for client-side uploads):
If you want to allow authenticated users to upload from the client, you can set up RLS policies:

```sql
-- Policy for authenticated user uploads
CREATE POLICY "Allow uploads by authenticated users" ON storage.objects
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for public read access (optional)
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (true);
```

### Configuration Requirements

The service requires Azure Form Recognizer credentials to be configured via environment variables:

**Required Environment Variables:**
- `AZURE_FORM_RECOGNIZER_ENDPOINT` - Your Azure Form Recognizer endpoint URL
- `AZURE_FORM_RECOGNIZER_API_KEY` - Your Azure Form Recognizer API key
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for secure uploads)

**Security Benefits:**
- Credentials are stored securely in environment variables
- No risk of credentials being exposed in API requests
- Centralized configuration management
- Follows security best practices for production deployments

### Supported File Formats

- **PNG** - Directly supported
- **JPG/JPEG** - Directly supported
- **BMP** - Directly supported
- **TIFF** - Directly supported
- **WebP** - Directly supported by Azure (converted to JPEG for OCR processing)
- **HEIC** - Automatically converted to JPEG for Azure compatibility (Apple's High Efficiency Image Format)
- **HEIF** - Directly supported by Azure (High Efficiency Image Format)

### Size Limits

- Maximum file size: 50MB
- Images are automatically compressed to meet Azure's limits while maintaining OCR quality
- Large images are resized to optimal dimensions (max 2048px)

### HEIC/HEIF Support

HEIC (High Efficiency Image Codec) and HEIF (High Efficiency Image Format) are modern image formats used by Apple devices:

**OCR Processing:**
- **HEIC Conversion**: HEIC files are automatically converted to JPEG for Azure Document Intelligence compatibility
- **HEIF Support**: HEIF files are directly supported by Azure (no conversion needed)
- **Quality Preservation**: Conversion maintains high quality suitable for OCR processing
- **Seamless Processing**: No additional steps required - upload HEIC/HEIF files directly

**Storage Optimization:**
- **WebP Conversion**: All images (including HEIC) are converted to WebP format for storage
- **Two-Step Process**: HEIC files undergo HEIC→JPEG→WebP conversion for optimal compatibility
- **Performance**: WebP format provides smaller file sizes and faster loading times
- **Device Compatibility**: Perfect for images taken with modern iPhones and iPads

## Service Architecture

### OcrService

The main service class that handles:
- Image format conversion and compression
- Azure Form Recognizer API integration
- Text parsing and item extraction
- Fallback text processing

### OcrController

Handles HTTP requests and responses for the OCR endpoints.

## Troubleshooting

### Common Issues

**1. "new row violates row-level security policy"**
- **Cause**: Using anonymous key instead of service role key
- **Solution**: Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in environment variables

**2. "Azure Form Recognizer not configured"**
- **Cause**: Missing Azure credentials
- **Solution**: Set `AZURE_FORM_RECOGNIZER_ENDPOINT` and `AZURE_FORM_RECOGNIZER_API_KEY`

**3. "File too large"**
- **Cause**: Image exceeds Azure's size limits
- **Solution**: Images are automatically compressed, but ensure original file is under 50MB

**4. "Unsupported file format"**
- **Cause**: File format not supported
- **Solution**: Convert to supported format or use automatic conversion (HEIC/HEIF)

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` in your environment variables.

## Integration with Beezly

This OCR service is designed to work seamlessly with Beezly's price tracking system:

1. **Receipt Upload**: Users upload receipt images through the mobile app or web interface
2. **Data Extraction**: The service extracts structured data including items, prices, and store information
3. **Storage**: Receipt images are securely stored in Supabase storage
4. **Price Tracking**: Extracted data is used for price comparison and tracking
5. **User Organization**: Files are organized by user and store for easy management

## Performance

- **Processing Time**: Typically 2-5 seconds per receipt
- **Accuracy**: 95%+ accuracy with Azure Form Recognizer v4.0
- **Concurrent Requests**: Supports multiple simultaneous uploads
- **Error Handling**: Graceful fallback to text parsing if structured data fails
- **Asynchronous Upload**: OCR results are returned immediately while image upload happens in the background
- **Optimized Storage**: All images are converted to WebP format for faster loading and reduced storage costs
