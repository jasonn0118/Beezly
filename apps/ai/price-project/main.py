import io
import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, Union
from dotenv import load_dotenv

import torch
import requests
import uvicorn
import numpy as np
from PIL import Image

from fastapi import FastAPI, HTTPException, Body, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoProcessor, AutoModelForImageTextToText
from ultralytics import YOLO

# --- Configuration ---
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("price-tag-ocr")

# Model paths
MODEL_DIR = Path("./models")
DETECTION_MODEL_PATH = MODEL_DIR / "price-tag-detection" / "weights" / "best.pt"

# Confidence threshold for detection
DETECTION_CONF_THRESHOLD = 0.25  # Increased from 0.1 for better precision

class PriceTagReader:
    """
    A class to detect price tags in images and extract text using OCR.
    Uses Open Prices YOLOv11x for detection and Nanonets OCR for text extraction.
    """
    def __init__(self):
        self.detector_model = None
        self.ocr_processor = None
        self.ocr_model = None
        self._load_models()

    def _load_models(self):
        """Loads the detection and OCR models into memory."""
        logger.info("Loading models...")
        hf_token = os.environ.get("HF_TOKEN")
        
        if not hf_token:
            logger.error("HF_TOKEN environment variable not set")
            raise ValueError("HF_TOKEN environment variable not set")

        # 1. Load Open Prices Detection Model
        try:
            if DETECTION_MODEL_PATH.exists():
                self.detector_model = YOLO(str(DETECTION_MODEL_PATH))
                logger.info("✅ Loaded Open Prices detector model.")
            else:
                logger.warning(f"Model not found at {DETECTION_MODEL_PATH}, attempting to download...")
                
                # Create parent directories if they don't exist
                DETECTION_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
                
                # Try to download from Hugging Face Hub
                try:
                    from huggingface_hub import hf_hub_download
                    
                    model_file = hf_hub_download(
                        repo_id="openfoodfacts/open-prices",
                        filename="best.pt",
                        token=hf_token,
                        local_dir=str(DETECTION_MODEL_PATH.parent)
                    )
                    self.detector_model = YOLO(model_file)
                    logger.info(f"✅ Downloaded and loaded Open Prices model from Hugging Face Hub.")
                except Exception as e:
                    logger.error(f"Failed to download model: {e}")
                    raise FileNotFoundError(
                        f"Detector model not found at {DETECTION_MODEL_PATH} and download failed. "
                        f"Error: {str(e)}"
                    )
        except Exception as e:
            logger.error(f"Error loading detector model: {e}")
            raise RuntimeError(f"Failed to load detector model: {str(e)}")

        # 2. Load Nanonets OCR Model
        try:
            # Use device with CUDA if available
            device = "cuda" if torch.cuda.is_available() else "cpu"
            logger.info(f"Using device: {device}")
            
            self.ocr_processor = AutoProcessor.from_pretrained(
                "nanonets/Nanonets-OCR-s",
                token=hf_token,
                cache_dir=str(MODEL_DIR)
            )
            
            self.ocr_model = AutoModelForImageTextToText.from_pretrained(
                "nanonets/Nanonets-OCR-s",
                token=hf_token,
                cache_dir=str(MODEL_DIR),
                torch_dtype=torch.float16 if device == "cuda" else torch.float32,
                device_map="auto"
            )
            self.ocr_model.eval()
            logger.info("✅ Loaded Nanonets OCR model.")
        except Exception as e:
            logger.error(f"Error loading OCR model: {e}")
            raise RuntimeError(f"Failed to load OCR model: {str(e)}")

    @staticmethod
    def _pad_to_square(pil_img: Image.Image, background_color=(255, 255, 255)) -> Image.Image:
        """
        Pads a PIL image to a square aspect ratio.
        
        Args:
            pil_img: Input PIL image
            background_color: Background color for padding
            
        Returns:
            Padded square image
        """
        width, height = pil_img.size
        if width == height:
            return pil_img
        
        size = max(width, height)
        result = Image.new(pil_img.mode, (size, size), background_color)
        result.paste(pil_img, ((size - width) // 2, (size - height) // 2))
        return result

    def _extract_text(self, image: Image.Image) -> str:
        """
        Extracts text from an image using Nanonets OCR.
        
        Args:
            image: PIL Image containing text to extract
            
        Returns:
            Extracted text string
        """
        try:
            # Resize image if too large to prevent memory issues
            max_size = 1024
            if max(image.size) > max_size:
                scale = max_size / max(image.size)
                new_size = (int(image.size[0] * scale), int(image.size[1] * scale))
                image = image.resize(new_size, Image.Resampling.LANCZOS)
            
            # Prepare the prompt for OCR
            prompt = "Extract all text from this price tag image, including prices, product names, weights, and any other relevant information. Format prices with currency symbols if present."
            
            # Prepare messages for the model
            messages = [
                {"role": "system", "content": "You are a specialized OCR system that extracts text from price tags accurately."},
                {"role": "user", "content": [
                    {"type": "image", "image": image},
                    {"type": "text", "text": prompt}
                ]}
            ]
            
            # Process the input
            text = self.ocr_processor.apply_chat_template(
                messages, 
                tokenize=False, 
                add_generation_prompt=True
            )
            
            # Generate the output
            inputs = self.ocr_processor(
                text=[text], 
                images=[image], 
                padding=True, 
                return_tensors="pt"
            ).to(self.ocr_model.device)
            
            # Generate text with a reasonable token limit
            with torch.no_grad():  # No need to track gradients for inference
                output_ids = self.ocr_model.generate(
                    **inputs, 
                    max_new_tokens=256,  # Reasonable limit for price tags
                    do_sample=False,
                    num_beams=2  # Simple beam search for better quality
                )
            
            # Decode and clean up the output
            generated_text = self.ocr_processor.batch_decode(
                output_ids, 
                skip_special_tokens=True, 
                clean_up_tokenization_spaces=True
            )
            
            return generated_text[0].strip()
            
        except Exception as e:
            logger.error(f"Error in OCR processing: {e}")
            return ""

    def detect_and_extract(self, image: Union[Image.Image, np.ndarray, bytes]) -> Dict[str, Any]:
        """
        Detects price tags in an image and extracts text from them.
        
        Args:
            image: Image as PIL Image, numpy array, or bytes
            
        Returns:
            dict: Contains count of price tags found and list of price tag details
        """
        # Convert input to PIL Image if needed
        if isinstance(image, bytes):
            image = Image.open(io.BytesIO(image)).convert('RGB')
        elif isinstance(image, np.ndarray):
            image = Image.fromarray(image).convert('RGB')
        elif not isinstance(image, Image.Image):
            raise ValueError("Input must be a PIL Image, numpy array, or bytes")
            
        # Ensure image is RGB
        if image.mode != 'RGB':
            image = image.convert('RGB')
            
        logger.info(f"Processing image of size {image.size}")
        
        # Run detection with improved confidence threshold
        results = self.detector_model.predict(image, conf=DETECTION_CONF_THRESHOLD)
        
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
                    text = self._extract_text(padded_img)
                    
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


# --- FastAPI Web Server ---
app = FastAPI(
    title="Price Tag OCR API",
    description="API for detecting price tags and extracting text using Open Prices and Nanonets OCR",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Initialize the model reader when the server starts
price_tag_reader = None

@app.on_event("startup")
async def startup_event():
    """Initialize models on server startup"""
    global price_tag_reader
    price_tag_reader = PriceTagReader()
    logger.info("Server started and models loaded")

@app.post("/process_image_url")
async def process_image_url(url: str = Body(..., embed=True)):
    """
    Process an image from a URL to detect price tags and extract text.
    
    Args:
        url (str): URL of the image to process
        
    Returns:
        dict: Detection and OCR results
    """
    try:
        logger.info(f"Processing image from URL: {url}")
        
        # Download the image with timeout
        response = requests.get(url, stream=True, timeout=10)
        response.raise_for_status()
        
        # Open and validate the image
        image = Image.open(io.BytesIO(response.content)).convert('RGB')
        
        # Process the image
        result = price_tag_reader.detect_and_extract(image)
        return result
        
    except requests.RequestException as e:
        logger.error(f"Error downloading image: {e}")
        raise HTTPException(
            status_code=400, 
            detail=f"Error downloading image: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error processing image: {str(e)}"
        )

@app.post("/process_image")
async def process_image(file: UploadFile = File(...)):
    """
    Process an uploaded image to detect price tags and extract text.
    
    Args:
        file: Uploaded image file
        
    Returns:
        dict: Detection and OCR results
    """
    try:
        logger.info(f"Processing uploaded image: {file.filename}")
        
        # Read and validate the image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        
        # Process the image
        result = price_tag_reader.detect_and_extract(image)
        return result
        
    except Exception as e:
        logger.error(f"Error processing uploaded image: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error processing image: {str(e)}"
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "models_loaded": price_tag_reader is not None}


if __name__ == "__main__":
    print("Starting FastAPI server...")
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True
    )