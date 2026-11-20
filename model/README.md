# Model Setup Guide for OcuScreen AI

## 📦 Installation & Requirements

### Prerequisites
- Python 3.8+ and FastAPI backend environment
- TensorFlow/Keras 2.x with pre-trained eye classification model

### Step 1: Verify Model Files Exist

The following files must exist in this directory:

**Required files:**
- `keras_model.h5` - Pre-trained Keras model (required)
- `labels.txt` - Class labels for the model (required)

**Current status:**
```
✓ keras_model.h5 (2.4 MB) - Present
✓ labels.txt (176 bytes) - Present
```

### Step 2: Backend Startup Process

When you start the FastAPI backend server, it will automatically:

1. Load `keras_model.h5` from this directory
2. Initialize model weights and architecture
3. Set `app.state.ready = True` if successful
4. Return HTTP 503 if loading fails (check logs for errors)

**Expected behavior:**
- ✅ First startup: Model loads, shows "ready": true
- ❌ Network issues: Shows error in terminal/console
- ⚠️ Corrupt model file: Returns partial results with status="unavailable"

### Step 3: Test Model Loading

Run these commands after starting the server:

```bash
# Check health endpoint
curl http://localhost:8000/api/health

# Expected output when model is ready:
# {"ready": true}

# When unavailable (normal during first startup):
# {"ready": false}
```

### Troubleshooting

**Error: "Model chưa sẵn sàng"**
- Check if `keras_model.h5` exists and is not corrupt (2.4 MB expected)
- View backend terminal/console for loading errors
- Restart FastAPI server after placing model file

**File Permissions Issue**
Ensure the web server has read permissions:
```bash
# On Windows, typically no action needed
# On Linux/Mac:
chmod 644 /path/to/model/keras_model.h5
```

## 📝 Model Architecture Details

This pre-trained model includes:
- **12 eye condition classes** for screening purposes
- Pre-trained weights from transfer learning
- Optimized for edge computing and low-latency inference

**Classes detected:**
1. Normal eyes
2. Redness (red eye)
3. Blood patches
4. Swelling/edema
5. Discharge (pus, discharge)
6. Watery eyes
7. Cornea abnormalities
8. Eyelid issues
9. Yellow tint (jaundice)
10. Bulging appearance
11. Pale inner eyelid
12. Background/noise

## ⚠️ Important Usage Notes

- **NOT A DIAGNOSTIC DEVICE**: This is a reference screening tool only
- Results should be verified by healthcare professionals
- Model accuracy depends on image quality and lighting conditions
- Regular model updates require proper versioning in changelog

---
*OcuScreen AI Development Team*
