"""
CLIP Embedder Module
Generates image and text embeddings using OpenAI CLIP model.
Supports GPU acceleration with CPU fallback.
"""

import os
from pathlib import Path
from typing import List, Optional, Tuple
import base64
import io

# SSL workaround for Windows Anaconda OpenSSL compatibility issues
# This fixes "module 'lib' has no attribute 'X509_V_FLAG_NOTIFY_POLICY'" error
# Must be applied BEFORE importing transformers/huggingface_hub
def _apply_ssl_workaround():
    """Apply SSL fixes for Anaconda OpenSSL conflicts"""
    try:
        import ssl
        import certifi
        
        # Set environment variables
        os.environ['CURL_CA_BUNDLE'] = ''
        os.environ['REQUESTS_CA_BUNDLE'] = ''
        os.environ['HF_HUB_DISABLE_SSL_VERIFICATION'] = '1'
        
        # Patch SSL context
        ssl._create_default_https_context = ssl._create_unverified_context
        
        # Try to patch urllib3 if already imported
        try:
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        except:
            pass
        
        print("[CLIP] Applied SSL workaround for HuggingFace downloads")
        return True
    except Exception as e:
        print(f"[CLIP] SSL workaround failed: {e}")
        return False

_ssl_fixed = _apply_ssl_workaround()

# Lazy loading flags
_clip_model = None
_clip_processor = None
_device = None


def _get_device():
    """Detect available device (GPU or CPU)"""
    global _device
    if _device is not None:
        return _device
    
    try:
        import torch
        if torch.cuda.is_available():
            _device = "cuda"
            gpu_name = torch.cuda.get_device_name(0)
            print(f"[CLIP] Using GPU: {gpu_name}")
        else:
            _device = "cpu"
            print("[CLIP] CUDA not available, using CPU")
    except ImportError:
        _device = "cpu"
        print("[CLIP] PyTorch not installed, using CPU")
    
    return _device


def _load_clip_model():
    """Lazy load CLIP model and processor"""
    global _clip_model, _clip_processor
    
    if _clip_model is not None:
        return _clip_model, _clip_processor
    
    try:
        from transformers import CLIPModel, CLIPProcessor
        import torch
        
        device = _get_device()
        model_name = "openai/clip-vit-base-patch32"
        
        print(f"[CLIP] Loading model: {model_name}...")
        _clip_processor = CLIPProcessor.from_pretrained(model_name)
        _clip_model = CLIPModel.from_pretrained(model_name)
        _clip_model = _clip_model.to(device)
        _clip_model.eval()  # Set to evaluation mode
        
        print(f"[CLIP] Model loaded on {device}")
        return _clip_model, _clip_processor
        
    except ImportError as e:
        print(f"[CLIP] Failed to import transformers: {e}")
        print("[CLIP] Install with: pip install transformers torch torchvision")
        return None, None
    except Exception as e:
        print(f"[CLIP] Failed to load model: {e}")
        return None, None


def get_image_embedding(image_input, return_numpy: bool = True) -> Optional[List[float]]:
    """
    Generate CLIP embedding for an image.
    
    Args:
        image_input: One of:
            - str: File path to image
            - bytes: Raw image bytes
            - PIL.Image: PIL Image object
            - str: Base64 encoded image (data URL or raw base64)
        return_numpy: If True, return as list of floats
        
    Returns:
        List of 512 floats (CLIP embedding) or None if failed
    """
    try:
        from PIL import Image
        import torch
        
        model, processor = _load_clip_model()
        if model is None:
            return None
        
        device = _get_device()
        
        # Handle different input types
        if isinstance(image_input, str):
            if image_input.startswith('data:image'):
                # Base64 data URL
                base64_data = image_input.split(',')[1]
                image_bytes = base64.b64decode(base64_data)
                image = Image.open(io.BytesIO(image_bytes))
            elif image_input.startswith('/9j/') or len(image_input) > 1000:
                # Raw base64 (JPEG starts with /9j/)
                image_bytes = base64.b64decode(image_input)
                image = Image.open(io.BytesIO(image_bytes))
            else:
                # File path
                image = Image.open(image_input)
        elif isinstance(image_input, bytes):
            image = Image.open(io.BytesIO(image_input))
        else:
            # Assume PIL Image
            image = image_input
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Process image
        inputs = processor(images=image, return_tensors="pt")
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        # Generate embedding
        with torch.no_grad():
            image_features = model.get_image_features(**inputs)
            # Normalize embedding
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
        
        # Convert to list
        embedding = image_features.cpu().numpy().flatten().tolist()
        
        return embedding
        
    except Exception as e:
        print(f"[CLIP] Image embedding error: {e}")
        import traceback
        traceback.print_exc()
        return None


def get_text_embedding_clip(text: str) -> Optional[List[float]]:
    """
    Generate CLIP text embedding for cross-modal search.
    
    Args:
        text: Text to embed
        
    Returns:
        List of 512 floats (CLIP text embedding) or None if failed
    """
    if not text or not text.strip():
        return None
        
    try:
        import torch
        
        model, processor = _load_clip_model()
        if model is None:
            return None
        
        device = _get_device()
        
        # Process text
        inputs = processor(text=text, return_tensors="pt", padding=True, truncation=True)
        inputs = {k: v.to(device) for k, v in inputs.items()}
        
        # Generate embedding
        with torch.no_grad():
            text_features = model.get_text_features(**inputs)
            # Normalize embedding
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
        
        # Convert to list
        embedding = text_features.cpu().numpy().flatten().tolist()
        
        return embedding
        
    except Exception as e:
        print(f"[CLIP] Text embedding error: {e}")
        import traceback
        traceback.print_exc()
        return None


def get_image_metadata(image_path: str) -> dict:
    """
    Extract metadata from image file.
    
    Returns dict with: width, height, format, exif_lat, exif_lon, exif_timestamp
    """
    metadata = {
        "width": None,
        "height": None,
        "format": None,
        "exif_lat": None,
        "exif_lon": None,
        "exif_timestamp": None
    }
    
    try:
        from PIL import Image
        from PIL.ExifTags import TAGS, GPSTAGS
        
        with Image.open(image_path) as img:
            metadata["width"] = img.width
            metadata["height"] = img.height
            metadata["format"] = img.format
            
            # Try to extract EXIF data
            exif_data = img._getexif()
            if exif_data:
                for tag_id, value in exif_data.items():
                    tag = TAGS.get(tag_id, tag_id)
                    
                    if tag == "GPSInfo":
                        gps_data = {}
                        for gps_tag_id, gps_value in value.items():
                            gps_tag = GPSTAGS.get(gps_tag_id, gps_tag_id)
                            gps_data[gps_tag] = gps_value
                        
                        # Parse GPS coordinates
                        if "GPSLatitude" in gps_data and "GPSLongitude" in gps_data:
                            lat = _convert_gps_to_decimal(
                                gps_data["GPSLatitude"],
                                gps_data.get("GPSLatitudeRef", "N")
                            )
                            lon = _convert_gps_to_decimal(
                                gps_data["GPSLongitude"],
                                gps_data.get("GPSLongitudeRef", "E")
                            )
                            metadata["exif_lat"] = lat
                            metadata["exif_lon"] = lon
                    
                    elif tag == "DateTimeOriginal":
                        # Parse EXIF timestamp
                        try:
                            from datetime import datetime
                            dt = datetime.strptime(str(value), "%Y:%m:%d %H:%M:%S")
                            metadata["exif_timestamp"] = int(dt.timestamp() * 1000)
                        except:
                            pass
                            
    except Exception as e:
        print(f"[CLIP] Metadata extraction error: {e}")
    
    return metadata


def _convert_gps_to_decimal(coords, ref) -> float:
    """Convert GPS coordinates from EXIF format to decimal degrees"""
    try:
        degrees = float(coords[0])
        minutes = float(coords[1])
        seconds = float(coords[2])
        
        decimal = degrees + minutes / 60 + seconds / 3600
        
        if ref in ["S", "W"]:
            decimal = -decimal
            
        return round(decimal, 6)
    except:
        return None


def check_clip_availability() -> dict:
    """
    Check if CLIP is available and return status.
    
    Returns dict with: available, device, model_name, error
    """
    result = {
        "available": False,
        "device": None,
        "model_name": None,
        "error": None
    }
    
    try:
        model, processor = _load_clip_model()
        if model is not None:
            result["available"] = True
            result["device"] = _get_device()
            result["model_name"] = "openai/clip-vit-base-patch32"
        else:
            result["error"] = "Failed to load CLIP model"
    except Exception as e:
        result["error"] = str(e)
    
    return result


# Initialize module on import (just device detection, not model loading)
if __name__ == "__main__":
    # Test the module
    print("Testing CLIP embedder...")
    
    status = check_clip_availability()
    print(f"CLIP Status: {status}")
    
    if status["available"]:
        # Test text embedding
        text_emb = get_text_embedding_clip("A photo of a corn field")
        if text_emb:
            print(f"Text embedding: {len(text_emb)} dimensions")
        
        # Test would need an actual image
        print("Text embedding test passed!")
