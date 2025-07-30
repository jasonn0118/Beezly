# Price Tag OCR

A powerful AI-powered application for detecting price tags in images and extracting text information using computer vision and OCR.

## 🎯 Objectives

- Detect price tags in images using YOLO object detection
- Extract text from price tags using advanced OCR
- Process images both synchronously and asynchronously
- Support both file uploads and URL-based image processing
- Provide a scalable, production-ready API for integration with other services

## 🏗️ Architecture

The application is built using [Modal](https://modal.com/), a cloud platform for running AI workloads, and consists of:

1. **Object Detection**: Uses YOLO from Ultralytics to detect price tags in images
2. **OCR Processing**: Uses Nanonets OCR model to extract text from detected price tags
3. **FastAPI Web Interface**: Provides REST API endpoints for image processing
4. **Asynchronous Job Queue**: Handles background processing for better user experience

## 🛠️ Tech Stack

- **Modal**: Cloud platform for running AI workloads
- **FastAPI**: Web framework for building APIs
- **YOLO (Ultralytics)**: Object detection for price tags
- **Nanonets OCR**: Text extraction from price tags
- **Hugging Face**: Model hosting and distribution
- **PyTorch**: Deep learning framework
- **Pillow**: Image processing

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Modal CLI
- Hugging Face account and API token

### Environment Setup

1. Clone the repository
2. Create a `.env` file with your Hugging Face API token:
   ```
   HF_TOKEN=your_huggingface_token
   ```
3. Install Modal CLI:
   ```
   pip install modal
   ```
4. Log in to Modal:
   ```
   modal token new
   ```

### Running Locally

To run the FastAPI server locally:

```bash
python main.py
```

This will start a server at `http://localhost:8000`.

### Deploying to Modal

To deploy the application to Modal:

```bash
# Run in pipeline mode (default)
modal run modal_app.py

# Run in web API mode
modal run modal_app.py --web

# Deploy as a persistent app
modal deploy modal_app.py
```

The deployed app will be available at: `https://[username]--price-tag-ocr-fastapi-app.modal.run/`

## 📚 API Endpoints

### Synchronous Processing

- **POST /process_image**: Process an uploaded image file
  - Input: Form data with file upload
  - Output: JSON with detected price tags and extracted text

- **POST /process_image_url**: Process an image from a URL
  - Input: JSON with `url` field
  - Output: JSON with detected price tags and extracted text

### Asynchronous Processing

- **POST /submit_job**: Submit an asynchronous job with file upload
  - Input: Form data with file upload
  - Output: Job ID for status checking

- **POST /submit_job_url**: Submit an asynchronous job with image URL
  - Input: JSON with `url` field
  - Output: Job ID for status checking

- **GET /job_status/{job_id}**: Check status of an asynchronous job
  - Input: Job ID in path
  - Output: Job status and results if completed

### Utility

- **GET /health**: Health check endpoint
  - Output: Status of the service and model loading

## 🔍 Example Usage

### Processing an Image URL

```python
import requests

# Synchronous processing
response = requests.post(
    "https://[username]--price-tag-ocr-fastapi-app.modal.run/process_image_url",
    json={"url": "https://example.com/image.jpg"}
)
results = response.json()
print(f"Found {results['count']} price tags")

# Asynchronous processing
job_response = requests.post(
    "https://[username]--price-tag-ocr-fastapi-app.modal.run/submit_job_url",
    json={"url": "https://example.com/image.jpg"}
)
job_id = job_response.json()["job_id"]

# Check job status
status_response = requests.get(
    f"https://[username]--price-tag-ocr-fastapi-app.modal.run/job_status/{job_id}"
)
status = status_response.json()
```

## ⚠️ Known Issues

- The `concurrency_limit` parameter is deprecated in Modal; use `max_containers` instead
- State management across distributed functions requires Modal's shared Dict
- When using the URL endpoints, ensure the client sends a JSON object with a "url" key

## 🔮 Future Improvements

- Add support for batch processing multiple images
- Implement price extraction and structured data output
- Add authentication and rate limiting
- Improve detection accuracy with model fine-tuning
- Add support for different languages and currencies

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.