# Python API Setup and Run Guide

This Python API handles ML model inference for insurance claim processing.

## Prerequisites

1. **Python Version Requirements:**
   - **Python 3.9-3.11** (Recommended) - Full TensorFlow support
   - **Python 3.12+** - Requires TensorFlow 2.16+ (may have limited support)
   - **Python 3.8** - Older, may have compatibility issues
   
   **Check your Python version:**
   ```bash
   python --version
   ```
   
   **If you have Python 3.12+, you have two options:**
   - Option 1: Use Python 3.11 (recommended) - Create a new venv with Python 3.11
   - Option 2: Use TensorFlow 2.16+ (edit requirements.txt)
2. **Tesseract OCR** (for PDF text extraction)
   - Windows: Download from [GitHub](https://github.com/UB-Mannheim/tesseract/wiki) and install
   - The path is configured in `api.py` as: `C:\Program Files\Tesseract-OCR\tesseract.exe`
   - Update the path in `api.py` if installed elsewhere
3. **CUDA** (optional, for GPU acceleration with PyTorch/TensorFlow)
   - Only needed if you want GPU support
   - CPU mode works fine for development

## Installation Steps

### 1. Navigate to the pythonApi directory

```bash
cd pythonApi
```

### 2. Create a virtual environment (Recommended)

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Upgrade pip, setuptools, and wheel first

```bash
python -m pip install --upgrade pip setuptools wheel
```

### 4. Install dependencies

**Option A: Install all at once (recommended)**
```bash
pip install -r requirements.txt
```

**Option B: Install in stages (if Option A fails)**

```bash
# Step 1: Install core dependencies first
pip install flask flask-cors werkzeug requests python-dotenv

# Step 2: Install image processing libraries
pip install Pillow opencv-python numpy

# Step 3: Install PyTorch (CPU version - adjust if you have GPU)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Step 4: Install TensorFlow
pip install tensorflow

# Step 5: Install ML libraries
pip install timm scikit-learn ultralytics

# Step 6: Install PDF/OCR libraries
pip install pytesseract pypdfium2 PyMuPDF PyPDF2 pdfplumber pandas

# Step 7: Install AI and cloud services
pip install google-generativeai cloudinary retrying
```

**Note:** 
- If you get setuptools errors, run: `pip install --upgrade setuptools wheel`
- **Python Version Issue:** If you get "Could not find a version that satisfies tensorflow", check your Python version:
  - Python 3.9-3.11: TensorFlow 2.15 works fine
  - Python 3.12+: You need TensorFlow 2.16+ (edit requirements.txt line for TensorFlow)
  - **Solution:** Either downgrade to Python 3.11 or upgrade TensorFlow version in requirements.txt
- For TensorFlow: You may need to install separately if there are conflicts
- For PyTorch GPU: Visit [PyTorch](https://pytorch.org/) to get the correct command for your CUDA version
- For GPU support: Install CUDA-enabled versions from [PyTorch](https://pytorch.org/) and [TensorFlow](https://www.tensorflow.org/install)

### 4. Install Tesseract OCR

**Windows:**
- Download installer from: https://github.com/UB-Mannheim/tesseract/wiki
- Install to default location: `C:\Program Files\Tesseract-OCR\`
- Or update the path in `api.py` line 52 if installed elsewhere

**Linux:**
```bash
sudo apt-get install tesseract-ocr
```

**Mac:**
```bash
brew install tesseract
```

### 5. Create .env file

Create a `.env` file in the `pythonApi` directory with:

```env
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
GEMINI_API_KEY=your_gemini_api_key
FLASK_API=http://localhost:5000
```

**Note:** Ensure `GEMINI_API_KEY` is set; Gemini features are disabled if it is missing.

## Required Model Files

Make sure the life insurance ML model file is present:

1. `life_insurance_fraud_model.pkl` - Trained model for life insurance fraud prediction

## Running the API

### Option 1: Using Python directly

```bash
python api.py
```

### Option 2: Using Flask CLI

```bash
flask run --host=0.0.0.0 --port=5000
```

### Option 3: Using Gunicorn (Production)

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 api:app
```

## Default Configuration

- **Host:** `0.0.0.0` (listens on all interfaces)
- **Port:** `5000` (default Flask port)
- **CORS:** Enabled for all origins (configure in `api.py` for production)

## API Endpoints

The API provides the following endpoints (current implementation):

- `POST /lifeinsurance/predict` - Predict life insurance fraud (expects JSON payload with model features)
- `GET /` - Health-check endpoint (returns status and model_loaded flag)

Other endpoints mentioned previously (vehicle/health processing) are not implemented in the current version and may be added in future iterations.

## Troubleshooting

### Common Issues

1. **Tesseract not found:**
   - Update the path in `api.py` line 52 to match your Tesseract installation

2. **Model files not found:**
   - Ensure all model files (`.pt`, `.h5`) are in the `pythonApi` directory
   - Check file names match exactly

3. **CUDA/GPU errors:**
   - The code automatically falls back to CPU if GPU is unavailable
   - Install CPU-only versions if you don't have a GPU

4. **Import errors:**
   - Make sure virtual environment is activated
   - Reinstall dependencies: `pip install -r requirements.txt --force-reinstall`

5. **Port already in use:**
   - Change the port in the run command or kill the process using port 5000

## Development Mode

For development with auto-reload:

```bash
export FLASK_ENV=development  # Linux/Mac
set FLASK_ENV=development     # Windows
python api.py
```

Or use:
```bash
flask run --debug
```

