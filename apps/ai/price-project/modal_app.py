import io
import modal
import logging
from PIL import Image
from fastapi import FastAPI, HTTPException, Body, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import os
from pathlib import Path
import requests
import uuid
import torch

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("price-tag-ocr")

# --- Modal App Setup ---
app = modal.App("price-tag-ocr")
huggingface_secret = modal.Secret.from_name("huggingface-secret")
image_queue = modal.Queue.from_name("image-processing-queue", create_if_missing=True)
job_statuses = modal.Dict.from_name("job-statuses", create_if_missing=True)

# --- Image Definition and Dependencies ---
volume = modal.Volume.from_name("price-tag-models", create_if_missing=True)
MODEL_DIR = "/root/models"

# Function to download models to the volume during the image build process
def download_models_to_volume(cache_buster=None):
    """Download models to the Modal volume."""
    # --- Open Prices Detection Model ---
    model_dir = Path(MODEL_DIR) / "open-prices"
    if (model_dir / "best.pt").exists():
        print("✅ Open Prices detection model already exists in volume.")
    else:
        print("📥 Downloading Open Prices detection model...")
        model_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            from huggingface_hub import hf_hub_download
            import os
            
            hf_token = os.environ.get("HF_TOKEN")
            
            # Download the model file
            model_path = hf_hub_download(
                repo_id="openfoodfacts/open-prices",
                filename="best.pt",
                subfolder="weights",
                local_dir=str(model_dir),
                token=hf_token
            )
            print(f"✅ Model downloaded to {model_path}")
        except Exception as e:
            print(f"⚠️ Error downloading model: {e}")
            # Create a placeholder file so we know to use a fallback in load_models
            with open(model_dir / "DOWNLOAD_FAILED", "w") as f:
                f.write(f"Download failed with error: {str(e)}")

    # --- Nanonets OCR Model ---
    print("📥 Pre-downloading Nanonets OCR model...")
    try:
        from transformers import AutoProcessor, AutoModelForImageTextToText
        import os
        
        hf_token = os.environ.get("HF_TOKEN")
        
        # Download processor and model
        AutoProcessor.from_pretrained("nanonets/Nanonets-OCR-s", token=hf_token, cache_dir=MODEL_DIR)
        AutoModelForImageTextToText.from_pretrained("nanonets/Nanonets-OCR-s", token=hf_token, cache_dir=MODEL_DIR)
        print("✅ OCR Model downloaded and cached.")
    except Exception as e:
        print(f"⚠️ Error downloading OCR model: {e}")
        print("OCR model will be downloaded at runtime if not cached.")

# Define the image with all necessary dependencies
image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install(
        "git", 
        "git-lfs",
        "libgl1-mesa-glx",  # Required for OpenCV
        "libglib2.0-0",     # Required for OpenCV
        "libsm6",           # Required for OpenCV
        "libxext6",         # Required for OpenCV
        "libxrender-dev"    # Required for OpenCV
    )
    .pip_install("uv")
    .run_commands(
        "uv pip install --system Pillow>=10.0.0 fastapi>=0.95.0 uvicorn>=0.22.0 "
        "python-multipart>=0.0.6 numpy torch transformers ultralytics opencv-python-headless "
        "huggingface_hub requests python-dotenv"
    )
    .run_commands("git lfs install")
    .run_function(
        download_models_to_volume, 
        kwargs={"cache_buster": "v1"},  # Increment to trigger a rebuild
        volumes={MODEL_DIR: volume},
        secrets=[huggingface_secret]
    )
)

# --- OCR Model Class ---
class NanonetsOCR:
    def __init__(self):
        self.processor = None
        self.model = None
        self._is_loaded = False
        
    def load(self, hf_token=None):
        """Load the OCR model."""
        from transformers import AutoProcessor, AutoModelForImageTextToText
        
        # Use device with CUDA if available
        device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"Using device: {device}")
        
        self.processor = AutoProcessor.from_pretrained(
            "nanonets/Nanonets-OCR-s", 
            token=hf_token,
            use_fast=True
        )
        
        self.model = AutoModelForImageTextToText.from_pretrained(
            "nanonets/Nanonets-OCR-s", 
            token=hf_token,
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            device_map="auto"
        )
        self.model.eval()
        self._is_loaded = True

    def extract_text(self, image):
        """Extract text from an image using Nanonets OCR."""
        if not self._is_loaded:
            self.load()
            
        if isinstance(image, np.ndarray):
            image = Image.fromarray(image)
            
        # Resize image if too large to prevent memory issues
        max_size = 1024
        if max(image.size) > max_size:
            scale = max_size / max(image.size)
            new_size = (int(image.size[0] * scale), int(image.size[1] * scale))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
            
        # Prepare the prompt for OCR
        prompt = "Extract all text from this price tag image, including prices, product names, product IDs, barcodes, weights, and any other relevant information."
        
        # Prepare messages for the model
        messages = [
            {"role": "system", "content": "You are a specialized OCR system that extracts text from price tags accurately."},
            {"role": "user", "content": [
                {"type": "image", "image": image},
                {"type": "text", "text": prompt}
            ]}
        ]
        
        # Process the input
        text = self.processor.apply_chat_template(
            messages, 
            tokenize=False, 
            add_generation_prompt=True
        )
        
        # Generate the output
        inputs = self.processor(
            text=[text], 
            images=[image], 
            padding=True, 
            return_tensors="pt"
        ).to(self.model.device)
        
        # Generate text with a reasonable token limit
        with torch.no_grad():  # No need to track gradients for inference
            output_ids = self.model.generate(
                **inputs, 
                max_new_tokens=256,
                do_sample=False,
                num_beams=2  # Simple beam search for better quality
            )
        
        # Decode and clean up the output
        generated_text = self.processor.batch_decode(
            output_ids, 
            skip_special_tokens=True, 
            clean_up_tokenization_spaces=True
        )
        
        return generated_text[0].strip()

# --- Main Application Class ---
@app.cls(
    secrets=[huggingface_secret],
    gpu="T4",
    image=image,
    volumes={MODEL_DIR: volume},
    timeout=600,
    max_containers=3,  # Using max_containers instead of concurrency_limit
)
class PriceTagReader:
    detector_model = None
    nanonets_ocr = None

    @staticmethod
    def _pad_to_square(pil_img, background_color=(255, 255, 255)):
        """Pads a PIL image to a square aspect ratio."""
        width, height = pil_img.size
        if width == height:
            return pil_img
        
        size = max(width, height)
        result = Image.new(pil_img.mode, (size, size), background_color)
        result.paste(pil_img, ((size - width) // 2, (size - height) // 2))
        return result

    @modal.enter()
    def load_models(self):
        """This method is called once when a container starts."""
        from ultralytics import YOLO
        import os
        import sys

        logger.info("Loading models into memory...")
        hf_token = os.environ.get("HF_TOKEN")
        if not hf_token:
            logger.error("HF_TOKEN environment variable not set. Aborting deployment.")
            sys.exit(1)

        # 1. Load Open Prices Detection Model
        model_path = Path(MODEL_DIR) / "open-prices" / "best.pt"
        
        try:
            if model_path.exists():
                self.detector_model = YOLO(str(model_path))
                logger.info("✅ Loaded Open Prices detector model from volume.")
            else:
                logger.warning("Model not found in volume, trying to download from Hugging Face Hub.")
                from huggingface_hub import hf_hub_download
                model_file = hf_hub_download(
                    repo_id="openfoodfacts/open-prices",
                    filename="best.pt",
                    subfolder="weights",
                    local_dir=str(model_path.parent),
                    token=hf_token
                )
                self.detector_model = YOLO(model_file)
                logger.info(f"✅ Downloaded and loaded Open Prices model from Hugging Face Hub.")
        except Exception as e:
            logger.error(f"❌ Fatal Error loading detector model: {e}")
            logger.error("Aborting deployment as required detector model could not be loaded.")
            sys.exit(1)

        # 2. Load Nanonets OCR Model
        try:
            self.nanonets_ocr = NanonetsOCR()
            self.nanonets_ocr.load(hf_token)
            logger.info("✅ Loaded Nanonets OCR model.")
        except Exception as e:
            logger.error(f"❌ Fatal Error loading OCR model: {e}")
            logger.error("Aborting deployment as required OCR model could not be loaded.")
            sys.exit(1)

    def _detect_and_extract(self, image):
        """Detect price tags in an image and extract text from them."""
        # Convert input to PIL Image if needed
        if isinstance(image, bytes):
            image = Image.open(io.BytesIO(image)).convert("RGB")
        elif isinstance(image, np.ndarray):
            image = Image.fromarray(image).convert("RGB")
        elif not isinstance(image, Image.Image):
            raise ValueError("Input must be bytes, numpy array, or a PIL Image")
        
        # Run detection with improved confidence threshold
        results = self.detector_model.predict(image, conf=0.25)  # Increased confidence threshold
        
        price_tags = []
        
        for res in results:
            boxes = res.boxes
            logger.info(f"Detected {len(boxes)} price tags")
            
            for i, box in enumerate(boxes):
                try:
                    # Get bounding box coordinates
                    xyxy = box.xyxy[0].cpu().numpy().astype(int)
                    
                    # Ensure box coordinates are valid
                    x1, y1, x2, y2 = xyxy
                    x1, y1 = max(0, x1), max(0, y1)
                    x2, y2 = min(image.width, x2), min(image.height, y2)
                    
                    # Skip invalid boxes
                    if x2 <= x1 or y2 <= y1:
                        logger.warning(f"Skipping invalid box: {xyxy}")
                        continue
                    
                    # Crop the detected price tag
                    cropped_img = image.crop((x1, y1, x2, y2))
                    
                    # Pad to square for better OCR
                    padded_img = self._pad_to_square(cropped_img)
                    
                    # Get confidence and class name
                    confidence = float(box.conf[0].cpu().numpy())
                    class_id = int(box.cls[0].cpu().numpy())
                    class_name = self.detector_model.names.get(class_id, "price_tag")
                    
                    logger.info(f"Processing price tag {i+1}: class={class_name}, confidence={confidence:.2f}")
                    
                    # Extract text using OCR
                    text = self.nanonets_ocr.extract_text(padded_img)
                    
                    price_tags.append({
                        "bbox": [int(x) for x in xyxy],
                        "text": text,
                        "confidence": round(confidence, 3),
                        "class": class_name
                    })
                except Exception as e:
                    logger.error(f"Error processing detection {i}: {e}")
                    # Continue with next detection
        
        result = {
            "count": len(price_tags),
            "price_tags": price_tags
        }
        
        logger.info(f"Processed {len(price_tags)} price tags")
        return result

    @modal.method()
    def process_queue(self):
        """Processes images from the queue until it's empty."""
        logger.info("🚀 Starting queue processor...")
        for url in image_queue.iterate():
            try:
                logger.info(f"Processing image from URL: {url}")
                response = requests.get(url, timeout=10)
                response.raise_for_status()
                image = Image.open(io.BytesIO(response.content)).convert("RGB")
                result = self._detect_and_extract(image)
                logger.info(f"📄 Result for {url}: {len(result['price_tags'])} price tags found")
            except Exception as e:
                logger.error(f"❌ Error processing {url}: {e}")
        logger.info("✅ Queue processing finished.")

# --- Data Pipeline & Web Functions ---
@app.function(image=image, timeout=300)
def feed_queue(urls: list[str]):
    """Puts a list of image URLs into the processing queue."""
    logger.info(f"📥 Adding {len(urls)} URLs to the queue...")
    for url in urls:
        image_queue.put(url)
    logger.info(f"✅ Done feeding the queue.")

# Create FastAPI app
web_app = FastAPI(
    title="Price Tag OCR API",
    description="API for detecting price tags and extracting text using Open Prices and Nanonets OCR",
    version="1.0.0"
)

# Add CORS middleware
web_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.function(image=image, gpu="T4", secrets=[huggingface_secret], timeout=300)
async def process_url_job(job_id: str, url: str):
    """Processes an image URL for an async job."""
    try:
        logger.info(f"Processing job {job_id} for URL: {url}")
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        image = Image.open(io.BytesIO(response.content)).convert("RGB")
        result = PriceTagReader()._detect_and_extract(image)
        job_statuses[job_id] = {"status": "completed", "result": result}
        logger.info(f"Job {job_id} completed successfully")
    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}")
        job_statuses[job_id] = {"status": "failed", "error": str(e)}

@app.function(image=image, gpu="T4", secrets=[huggingface_secret], timeout=300)
async def process_file_job(job_id: str, file_data: bytes):
    """Processes an uploaded file for an async job."""
    try:
        logger.info(f"Processing job {job_id} for uploaded file")
        image = Image.open(io.BytesIO(file_data)).convert("RGB")
        result = PriceTagReader()._detect_and_extract(image)
        job_statuses[job_id] = {"status": "completed", "result": result}
        logger.info(f"Job {job_id} completed successfully")
    except Exception as e:
        logger.error(f"Job {job_id} failed: {e}")
        job_statuses[job_id] = {"status": "failed", "error": str(e)}

@app.function(image=image, secrets=[huggingface_secret], timeout=300)
@modal.asgi_app(label="price-tag-ocr")
def fastapi_app():
    return web_app

@web_app.post("/process_image_url")
async def process_image_url(url: str = Body(..., embed=True)):
    """Process an image from a URL synchronously."""
    try:
        logger.info(f"Processing image from URL: {url}")
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        image = Image.open(io.BytesIO(response.content)).convert("RGB")
        return PriceTagReader()._detect_and_extract(image)
    except requests.RequestException as e:
        logger.error(f"Error downloading image: {e}")
        raise HTTPException(status_code=400, detail=f"Error downloading image: {str(e)}")
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@web_app.post("/process_image")
async def process_image(file: UploadFile = File(...)):
    """Process an uploaded image synchronously."""
    try:
        logger.info(f"Processing uploaded image: {file.filename}")
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        return PriceTagReader()._detect_and_extract(image)
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@web_app.post("/submit_job_url")
async def submit_job_url(request: dict = Body(...)):
    """Submit an image processing job asynchronously from a URL."""
    url = request.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")
    
    job_id = f"job_{uuid.uuid4().hex[:8]}"
    job_statuses[job_id] = {"status": "submitted", "result": None}
    process_url_job.spawn(job_id, url)
    logger.info(f"Job {job_id} submitted for URL: {url}")
    return {"job_id": job_id, "status": "submitted"}

@web_app.post("/submit_job")
async def submit_job(file: UploadFile = File(...)):
    """Submit an image processing job asynchronously from an uploaded file."""
    try:
        contents = await file.read()
        job_id = f"job_{uuid.uuid4().hex[:8]}"
        job_statuses[job_id] = {"status": "submitted", "result": None}
        process_file_job.spawn(job_id, contents)
        logger.info(f"Job {job_id} submitted for file: {file.filename}")
        return {"job_id": job_id, "status": "submitted"}
    except Exception as e:
        logger.error(f"Error submitting job: {e}")
        raise HTTPException(status_code=500, detail=f"Error submitting job: {str(e)}")

@web_app.get("/job_status/{job_id}")
async def job_status(job_id: str):
    """Check the status of an asynchronous job."""
    if job_id not in job_statuses:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return job_statuses[job_id]

@web_app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

@app.local_entrypoint()
def main(web: bool = False):
    """This function runs when you execute `modal run modal_app.py`."""
    if web:
        logger.info("🌐 Starting web server mode...")
        logger.info(f"API will be available at: https://[username]--price-tag-ocr-fastapi-app.modal.run")
        # In web mode, we don't need to do anything else as Modal will start the web server
    else:
        # Pipeline mode - process sample URLs
        sample_urls = [
            "https://gphxnnwzuolhgfxrfhzn.supabase.co/storage/v1/object/public/mock-images-receipts//Google_Shoppers_pricetag01.jpg",
        ]
        logger.info("🚀 Starting price tag OCR data pipeline...")
        feed_queue.remote(sample_urls)
        logger.info("⚙️ Starting queue processor...")
        PriceTagReader().process_queue.remote()
        logger.info("✅ Pipeline started! To run the web server, use `modal run modal_app.py --web`")
