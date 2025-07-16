# download_models.py
import os
from pathlib import Path
from dotenv import load_dotenv
from huggingface_hub import hf_hub_download
from transformers import AutoProcessor, AutoModelForVision2Seq

# Define the local directory to store models
MODEL_DIR = Path("./models")
DETECTION_MODEL_DIR = MODEL_DIR / "price-tag-detection"

def download_models():
    """Downloads the necessary models from Hugging Face Hub."""
    load_dotenv()
    hf_token = os.environ.get("HF_TOKEN")

    if not hf_token:
        print("❌ Hugging Face token not found. Please add it to your .env file.")
        return

    print("--- Starting Model Download ---")

    # 1. Download Price Tag Detection Model (YOLO)
    print("\n📥 Downloading price tag detection model...")
    try:
        DETECTION_MODEL_DIR.mkdir(parents=True, exist_ok=True)
        hf_hub_download(
            repo_id="openfoodfacts/price-tag-detection",
            filename="best.pt",
            subfolder="weights",
            local_dir=str(DETECTION_MODEL_DIR),
            token=hf_token
        )
        print("✅ Price tag detection model downloaded successfully.")
    except Exception as e:
        print(f"⚠️ Error downloading detection model: {e}")

    # 2. Download Nanonets OCR Model
    print("\n📥 Downloading Nanonets OCR model...")
    try:
        # This will download and cache the model files into the specified directory
        AutoProcessor.from_pretrained("nanonets/Nanonets-OCR-s", token=hf_token, cache_dir=str(MODEL_DIR))
        AutoModelForVision2Seq.from_pretrained("nanonets/Nanonets-OCR-s", token=hf_token, cache_dir=str(MODEL_DIR))
        print("✅ OCR Model downloaded successfully.")
    except Exception as e:
        print(f"⚠️ Error downloading OCR model: {e}")

    print("\n--- Model download process finished. ---")


if __name__ == "__main__":
    download_models()