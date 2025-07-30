import io
import modal
from PIL import Image
from fastapi import FastAPI, HTTPException, Body
import numpy as np
import os
from pathlib import Path
import requests
import uuid

# --- Modal App Setup ---
# Define secrets and shared resources
app = modal.App("price-tag-pipeline") # Renamed app for clarity
huggingface_secret = modal.Secret.from_name("huggingface-secret")
image_queue = modal.Queue.from_name("image-processing-queue", create_if_missing=True)
job_statuses = modal.Dict.from_name("job-statuses", create_if_missing=True)

# --- Image Definition and Dependencies ---

# Create a volume to store model files, persisting them across runs.
volume = modal.Volume.from_name("price-tag-models", create_if_missing=True)

MODEL_DIR = "/root/models"

# Function to download models to the volume during the image build process.
def download_models_to_volume(cache_buster=None):
    # --- Price Tag Detection Model ---
    model_dir = Path(MODEL_DIR) / "price-tag-detection"
    if (model_dir / "best.pt").exists():
        print("✅ Price tag detection model already exists in volume.")
    else:
        print("📥 Downloading price tag detection model...")
        model_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            from huggingface_hub import hf_hub_download
            import os
            
            hf_token = os.environ.get("HF_TOKEN")
            
            # Download the model file directly, specifying the correct subfolder.
            print("Downloading 'best.pt' from the 'weights' subfolder...")
            model_path = hf_hub_download(
                repo_id="openfoodfacts/price-tag-detection",
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

    # --- OCR Model ---
    print("📥 Pre-downloading OCR model...")
    try:
        from transformers import AutoProcessor, AutoModelForVision2Seq
        import os
        
        hf_token = os.environ.get("HF_TOKEN")
        
        # Use the token, cache_dir, and explicitly set use_fast=True to silence the warning.
        AutoProcessor.from_pretrained("nanonets/Nanonets-OCR-s", token=hf_token, cache_dir=MODEL_DIR, use_fast=True)
        AutoModelForVision2Seq.from_pretrained("nanonets/Nanonets-OCR-s", token=hf_token, cache_dir=MODEL_DIR)
        print("✅ OCR Model downloaded and cached.")
    except Exception as e:
        print(f"⚠️ Error downloading OCR model: {e}")
        print("OCR model will be downloaded at runtime if not cached.")

# Define the image with all necessary dependencies.
image = (
    modal.Image.debian_slim(python_version="3.10")
    .apt_install(
        "git",
        "git-lfs",
        "libgl1-mesa-glx",
        "libglib2.0-0",
        "libsm6",
        "libxext6",
        "libxrender-dev"
    )
    .pip_install("uv")
    .run_commands(
        "uv pip install --system Pillow>=10.0.0 fastapi>=0.95.0 uvicorn>=0.22.0 python-multipart>=0.0.6 numpy torch transformers ultralytics opencv-python-headless huggingface_hub requests"
    )
    .run_commands("git lfs install")
    .run_function(
        download_models_to_volume,
        kwargs={"cache_buster": "v12"}, # Incremented to trigger a rebuild
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
        from transformers import AutoProcessor, AutoModelForVision2Seq
        
        self.processor = AutoProcessor.from_pretrained("nanonets/Nanonets-OCR-s", token=hf_token, use_fast=True)
        self.model = AutoModelForVision2Seq.from_pretrained("nanonets/Nanonets-OCR-s", token=hf_token)
        self._is_loaded = True

    def extract_text(self, image):
        if not self._is_loaded:
            self.load()
            
        if isinstance(image, np.ndarray):
            image = Image.fromarray(image)
        inputs = self.processor(images=image, return_tensors="pt")
        generated_ids = self.model.generate(**inputs)
        return self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0].strip()

# --- Main Application Class ---

@app.cls(
    secrets=[huggingface_secret],
    gpu="T4",
    image=image,
    volumes={MODEL_DIR: volume},
    timeout=600,
    max_containers=3,
)
class PriceTagReader:
    detector_model = None
    nanonets_ocr = None

    @staticmethod
    def _pad_to_square(pil_img, background_color):
        """Pads a PIL image to a square aspect ratio."""
        width, height = pil_img.size
        if width == height:
            return pil_img
        elif width > height:
            result = Image.new(pil_img.mode, (width, width), background_color)
            result.paste(pil_img, (0, (width - height) // 2))
            return result
        else:
            result = Image.new(pil_img.mode, (height, height), background_color)
            result.paste(pil_img, ((height - width) // 2, 0))
            return result

    @modal.enter()
    def load_models(self):
        """This method is called once when a container starts."""
        from ultralytics import YOLO
        import os
        import sys

        print("Loading models into memory...")
        hf_token = os.environ.get("HF_TOKEN")
        if not hf_token:
            print("❌ HF_TOKEN environment variable not set. Aborting deployment.")
            sys.exit(1)

        # 1. Load Price Tag Detection Model
        model_path = Path(MODEL_DIR) / "price-tag-detection" / "best.pt"
        
        try:
            if model_path.exists():
                self.detector_model = YOLO(str(model_path))
                print("✅ Loaded detector model from volume.")
            else:
                print("⚠️ Model not found in volume, trying to download from Hugging Face Hub.")
                from huggingface_hub import hf_hub_download
                
                model_file = hf_hub_download(
                    repo_id="openfoodfacts/price-tag-detection",
                    filename="best.pt",
                    subfolder="weights",
                    local_dir=str(model_path.parent),
                    token=hf_token
                )
                self.detector_model = YOLO(model_file)
                print(f"✅ Downloaded and loaded detector model from Hugging Face Hub.")
        except Exception as e:
            print(f"❌ Fatal Error loading detector model: {e}")
            print("Aborting deployment as required detector model could not be loaded.")
            sys.exit(1)

        # 2. Load Nanonets OCR Model
        try:
            from transformers import AutoProcessor, AutoModelForVision2Seq
            processor = AutoProcessor.from_pretrained("nanonets/Nanonets-OCR-s", token=hf_token, cache_dir=MODEL_DIR, use_fast=True)
            model = AutoModelForVision2Seq.from_pretrained("nanonets/Nanonets-OCR-s", token=hf_token, cache_dir=MODEL_DIR)
            self.nanonets_ocr = NanonetsOCR()
            self.nanonets_ocr.processor = processor
            self.nanonets_ocr.model = model
            self.nanonets_ocr._is_loaded = True
            print("✅ Loaded OCR model.")
        except Exception as e:
            print(f"❌ Fatal Error loading OCR model: {e}")
            print("Aborting deployment as required OCR model could not be loaded.")
            sys.exit(1)

    @modal.method()
    def _detect_and_extract(self, image: Image.Image):
        """
        Detects price tags in an image, crops them in memory, and extracts text.
        """
        if not isinstance(image, Image.Image):
            raise ValueError("Input must be a PIL Image")

        # Run detection on the image
        results = self.detector_model.predict(image, conf=0.1)

        price_tags = []
        # The result object contains the bounding box detections
        for res in results:
            for box in res.boxes:
                # Get bounding box coordinates
                xyxy = box.xyxy[0].cpu().numpy().astype(int)
                # Crop the original image
                cropped_img = image.crop(xyxy)

                # Get confidence and class name
                confidence = float(box.conf[0].cpu().numpy())
                class_name = self.detector_model.names[int(box.cls[0].cpu().numpy())]

                # Pad to square for stable OCR processing
                padded_img = self._pad_to_square(cropped_img, (255, 255, 255))
                MAX_SIZE = (1024, 1024)
                padded_img.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)

                # Extract text using OCR
                try:
                    text = self.nanonets_ocr.extract_text(padded_img)
                    price_tags.append({
                        "bbox": xyxy.tolist(),
                        "text": text,
                        "confidence": confidence,
                        "class": class_name
                    })
                except Exception as e:
                    print(f"Error extracting text from a crop: {e}")
                    price_tags.append({
                        "bbox": xyxy.tolist(),
                        "text": "",
                        "confidence": confidence,
                        "class": class_name,
                        "error": str(e)
                    })

        return {"count": len(price_tags), "price_tags": price_tags}

    @modal.method()
    def process_queue(self):
        """Processes images from the queue until it's empty."""
        print("🚀 Starting queue processor...")
        while not image_queue.is_empty():
            try:
                url = image_queue.get()
                print(f"Processing image from URL: {url}")
                response = requests.get(url)
                response.raise_for_status()
                image = Image.open(io.BytesIO(response.content)).convert("RGB")
                result = self._detect_and_extract(image)
                print(f"📄 Result for {url}: {result}")
            except Exception as e:
                print(f"❌ Error processing {url}: {e}")
        print("✅ Queue processing finished.")

# --- Data Pipeline & Web Functions ---

@app.function(image=image, timeout=300)
def feed_queue(urls: list[str]):
    """Puts a list of image URLs into the processing queue."""
    print(f"📥 Adding {len(urls)} URLs to the queue...")
    for url in urls:
        image_queue.put(url)
    print(f"✅ Done feeding the queue.")

web_app = FastAPI(title="Price Tag OCR API")

@app.function(image=image, gpu="T4", secrets=[huggingface_secret], timeout=300)
@modal.asgi_app(label="price-tag-ocr")
def fastapi_app():
    price_tag_reader = PriceTagReader()

    @web_app.post("/process_image_url")
    async def process_image_url(url: str = Body(..., embed=True)):
        """Process an image from a URL synchronously."""
        try:
            response = requests.get(url)
            response.raise_for_status()
            image = Image.open(io.BytesIO(response.content)).convert("RGB")
            return price_tag_reader._detect_and_extract(image)
        except requests.RequestException as e:
            raise HTTPException(status_code=400, detail=f"Error downloading image: {str(e)}")
        except Exception as e:
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
        return {"job_id": job_id, "status": "submitted"}

    @web_app.get("/job_status/{job_id}")
    async def job_status(job_id: str):
        """Check the status of an asynchronous job."""
        if job_id not in job_statuses:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        return job_statuses[job_id]
        
    return web_app

@app.function(image=image, gpu="T4", secrets=[huggingface_secret], timeout=300)
async def process_url_job(job_id: str, url: str):
    """Processes an image URL for an async job."""
    try:
        price_tag_reader = PriceTagReader()
        response = requests.get(url)
        response.raise_for_status()
        image = Image.open(io.BytesIO(response.content)).convert("RGB")
        result = price_tag_reader._detect_and_extract(image)
        job_statuses[job_id] = {"status": "completed", "result": result}
    except Exception as e:
        job_statuses[job_id] = {"status": "failed", "error": str(e)}

@app.local_entrypoint()
def main():
    """This function runs when you execute `modal run ...`."""
    sample_urls = [
        "https://gphxnnwzuolhgfxrfhzn.supabase.co/storage/v1/object/public/mock-images-receipts//Google_Shoppers_pricetag01.jpg",
    ]
    print("🚀 Starting price tag OCR data pipeline...")
    feed_queue.remote(sample_urls)
    print("⚙️ Starting queue processor...")
    PriceTagReader().process_queue.remote()
    print("✅ Pipeline started! To run the web server, use `modal serve ...`")