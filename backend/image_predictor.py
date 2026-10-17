"""CPU inference for the trusted, locally supplied 12-class Keras artifact."""

import os

os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")
os.environ.setdefault("TF_NUM_INTRAOP_THREADS", "2")
os.environ.setdefault("TF_NUM_INTEROP_THREADS", "1")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
from pathlib import Path
from io import BytesIO
from threading import RLock
import warnings
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = Path(os.getenv("MODEL_PATH", str(ROOT / "model/keras_model.h5")))
LABELS_PATH = ROOT / "model/labels.txt"
MAX_BYTES = 5 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 12_000_000
EXPECTED = [
    "Normal",
    "Redness",
    "Blood Patch",
    "Swelling",
    "Discharge",
    "Watery",
    "Cornea Abnormal",
    "Eyelid Abnormal",
    "Yellow Eye",
    "Bulging Eye",
    "Pale Inner Eyelid",
    "Back Ground",
]
_lock = RLock()
_model = None
_labels = None


class ModelUnavailable(RuntimeError):
    pass


class InvalidImage(ValueError):
    pass


def read_labels(path=LABELS_PATH):
    labels = []
    for line in Path(path).read_text(encoding="utf-8-sig").splitlines():
        if not line.strip():
            continue
        parts = line.strip().split(" ", 1)
        if len(parts) != 2 or not parts[0].isdigit() or not parts[1].strip():
            raise ValueError("labels.txt phải có dạng: 10 Pale Inner Eyelid")
        labels.append((int(parts[0]), parts[1].strip()))
    if labels != list(enumerate(EXPECTED)):
        raise ValueError("labels.txt phải đúng thứ tự và tên của 12 class đã công bố.")
    return labels


def load_artifacts():
    global _model, _labels
    with _lock:
        if _model is not None:
            return _model, _labels
        try:
            labels = read_labels()
            if not MODEL_PATH.is_file():
                raise FileNotFoundError("Thiếu model/keras_model.h5")
            import tensorflow as tf

            model = tf.keras.models.load_model(MODEL_PATH, compile=False)
            if tuple(model.input_shape) != (None, 224, 224, 3):
                raise ValueError("Model phải có input (None, 224, 224, 3).")
            if tuple(model.output_shape) != (None, 12):
                raise ValueError("Model phải có output (None, 12).")
            _model, _labels = model, labels
            return _model, _labels
        except Exception as exc:
            raise ModelUnavailable(
                "Không nạp được model. Kiểm tra file H5, labels và phiên bản Keras trong log máy chủ."
            ) from exc


def preprocess(image_bytes):
    if not image_bytes or len(image_bytes) > MAX_BYTES:
        raise InvalidImage("Ảnh phải có dung lượng từ 1 byte đến 5 MB.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(image_bytes)) as original:
                if original.format not in {"JPEG", "PNG", "WEBP"}:
                    raise InvalidImage("Chỉ nhận ảnh JPEG, PNG hoặc WebP.")
                if getattr(original, "n_frames", 1) != 1:
                    raise InvalidImage("Vui lòng dùng ảnh tĩnh.")
                if (
                    min(original.size) < 64
                    or original.width * original.height > 12_000_000
                ):
                    raise InvalidImage(
                        "Ảnh cần ít nhất 64×64 và không quá 12 megapixel."
                    )
                image = ImageOps.exif_transpose(original).convert("RGB")
                image = ImageOps.fit(image, (224, 224), Image.Resampling.LANCZOS)
                return ((np.asarray(image, dtype=np.float32) / 127.5) - 1.0)[None, ...]
    except InvalidImage:
        raise
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ) as exc:
        raise InvalidImage("Không đọc được ảnh. Hãy chọn ảnh mắt rõ nét khác.") from exc


def predict_image(image_bytes):
    batch = preprocess(image_bytes)
    with _lock:
        model, labels = load_artifacts()
        try:
            scores = np.asarray(model(batch, training=False), dtype=np.float32)
        except Exception as exc:
            raise ModelUnavailable("Không thể chạy model ảnh.") from exc
    if scores.shape != (1, 12) or not np.isfinite(scores).all():
        raise ModelUnavailable("Đầu ra model không hợp lệ.")
    # This artifact contract is multiclass probabilities, not multilabel sigmoid or logits.
    if (
        np.any(scores < 0)
        or np.any(scores > 1)
        or not np.isclose(scores.sum(), 1, atol=0.01)
    ):
        raise ModelUnavailable("Cần model đa lớp có đầu ra softmax gồm 12 giá trị.")
    index = int(np.argmax(scores[0]))
    class_id, label = labels[index]
    confidence = float(scores[0, index])
    status = (
        "invalid" if class_id == 11 else ("uncertain" if confidence < 0.60 else "valid")
    )
    messages = {
        "invalid": "Ảnh được nhận diện là Back Ground. Hãy chụp lại cận cảnh mắt, đủ sáng, mắt nằm giữa ảnh.",
        "uncertain": "Model chưa đủ chắc chắn. Hãy chụp lại ảnh; cảnh báo triệu chứng bên dưới vẫn có giá trị.",
        "valid": "Đã phân tích ảnh. Điểm model không phải xác suất mắc bệnh.",
    }
    return {
        "class_id": class_id,
        "label": label,
        "confidence": confidence,
        "status": status,
        "message": messages[status],
    }
