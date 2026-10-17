import io
import json
import numpy as np
import pytest
from PIL import Image
from fastapi.testclient import TestClient
import backend.app as api
import backend.image_predictor as ip
from backend.risk_engine import assess_risk


def prediction(label="Normal", status="valid"):
    return {
        "label": label,
        "status": status,
        "class_id": ip.EXPECTED.index(label),
        "confidence": 0.9,
        "message": "Test",
    }


def photo(color="white"):
    b = io.BytesIO()
    Image.new("RGB", (300, 240), color).save(b, format="PNG")
    return b.getvalue()


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(api, "load_artifacts", lambda: None)
    monkeypatch.setattr(api, "predict_image", lambda b: prediction())
    with TestClient(api.app) as c:
        yield c


@pytest.mark.parametrize(
    "label,status,symptoms,level",
    [
        ("Normal", "valid", [], "Thấp"),
        ("Normal", "valid", ["itch"], "Vừa"),
        ("Normal", "valid", ["vision_loss"], "Cao"),
        ("Normal", "valid", ["contacts", "red_eye"], "Cao"),
        ("Back Ground", "invalid", [], None),
        ("Back Ground", "invalid", ["severe_pain"], "Cao"),
        ("Redness", "uncertain", [], None),
        ("Redness", "valid", [], "Vừa"),
        ("Yellow Eye", "valid", [], "Cao"),
        ("Normal", "valid", ["yellow_skin"], "Cao"),
    ],
)
def test_risk(label, status, symptoms, level):
    assert assess_risk(prediction(label, status), symptoms)["level"] == level


def test_labels():
    labels = ip.read_labels()
    assert labels[10] == (10, "Pale Inner Eyelid")
    assert labels[11] == (11, "Back Ground")


def test_preprocess():
    a = ip.preprocess(photo())
    assert a.shape == (1, 224, 224, 3) and a.dtype == np.float32
    assert np.all(a == 1)
    assert np.all(ip.preprocess(photo("black")) == -1)
    with pytest.raises(ip.InvalidImage):
        ip.preprocess(b"not an image")


def test_predict_background(monkeypatch):
    class Model:
        def __call__(self, batch, training=False):
            a = np.zeros((1, 12))
            a[0, 11] = 1
            return a

    monkeypatch.setattr(ip, "load_artifacts", lambda: (Model(), ip.read_labels()))
    assert ip.predict_image(photo())["status"] == "invalid"


def test_routes(client):
    assert client.get("/").status_code == 200
    assert len(client.get("/api/symptoms").json()["symptoms"]) == 26
    assert client.get("/model/labels.txt").status_code == 404
    r = client.post(
        "/api/screen",
        files={"image": ("eye.png", photo(), "image/png")},
        data={"symptoms": '["vision_loss"]'},
    )
    assert r.status_code == 200 and r.json()["risk"]["level"] == "Cao"


@pytest.mark.parametrize("symptoms", ["not-json", "{}", '["fake"]', "[1]"])
def test_bad_symptoms(client, symptoms):
    assert (
        client.post(
            "/api/screen",
            files={"image": ("e.png", photo())},
            data={"symptoms": symptoms},
        ).status_code
        == 422
    )


def test_invalid_preserves_warning(client, monkeypatch):
    def invalid(b):
        raise ip.InvalidImage("Ảnh không hợp lệ")

    monkeypatch.setattr(api, "predict_image", invalid)
    r = client.post(
        "/api/screen",
        files={"image": ("e.png", b"bad")},
        data={"symptoms": '["vision_loss"]'},
    )
    assert r.json()["risk"]["level"] == "Cao"
    assert r.json()["image"]["status"] == "invalid"


def test_missing_model_preserves_warning(client, monkeypatch):
    def missing(b):
        raise ip.ModelUnavailable("missing")

    monkeypatch.setattr(api, "predict_image", missing)
    r = client.post(
        "/api/screen",
        files={"image": ("e.png", photo())},
        data={"symptoms": '["vision_loss"]'},
    )
    assert r.status_code == 503 and r.json()["risk"]["level"] == "Cao"


def test_limits(client):
    assert (
        client.post(
            "/api/screen",
            content=b"x" * (ip.MAX_BYTES + 65537),
            headers={"Content-Type": "multipart/form-data; boundary=test"},
        ).status_code
        == 413
    )
    api.app.state.busy = True
    assert client.post("/api/screen").status_code == 429
    api.app.state.busy = False


def test_inference_failure_is_model_unavailable(monkeypatch):
    class BrokenModel:
        def __call__(self, batch, training=False):
            raise RuntimeError("device unavailable")

    monkeypatch.setattr(ip, "load_artifacts", lambda: (BrokenModel(), ip.read_labels()))
    with pytest.raises(ip.ModelUnavailable):
        ip.predict_image(photo())


def test_frontend_assets_and_cache_policy(client):
    for path in [
        "/js/app.js",
        "/js/components.js",
        "/js/api.js",
        "/js/validation.js",
        "/css/styles.css",
    ]:
        response = client.get(path)
        assert response.status_code == 200
        assert "must-revalidate" in response.headers["cache-control"]
    assert client.get("/api/symptoms").headers["cache-control"] == "no-store"
    assert (
        client.get("/api/symptoms").json()["urgent_combinations"]
        == api.KB["urgent_combinations"]
    )


def test_rejected_request_releases_inference_slot(client):
    response = client.post(
        "/api/screen", content=b"bad", headers={"Content-Type": "text/plain"}
    )
    assert response.status_code == 415
    assert not api.app.state.busy
    response = client.post("/api/screen", files={"image": ("eye.png", photo())})
    assert response.status_code == 200


def test_malformed_multipart_releases_slot(client):
    response = client.post(
        "/api/screen", content=b"bad", headers={"Content-Type": "multipart/form-data"}
    )
    assert response.status_code == 400
    assert not api.app.state.busy


def test_duplicate_symptom_fields_rejected(client):
    response = client.post('/api/screen', files=[
        ('image', ('eye.png', photo(), 'image/png')),
        ('symptoms', (None, '["itch"]')),
        ('symptoms', (None, '[]')),
    ])
    assert response.status_code == 422
    assert not api.app.state.busy


def test_declared_oversize_rejected_before_body(client):
    response = client.post('/api/screen', content=b'partial', headers={
        'Content-Type': 'multipart/form-data; boundary=test',
        'Content-Length': str(ip.MAX_BYTES + 65537),
    })
    assert response.status_code == 413
    assert not api.app.state.busy
