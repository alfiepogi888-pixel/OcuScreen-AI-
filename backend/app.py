"""HTTP endpoints and static frontend for OcuScreen AI."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool

from backend.image_predictor import (
    MAX_BYTES,
    ROOT,
    InvalidImage,
    ModelUnavailable,
    load_artifacts,
    predict_image,
)
from backend.request_validation import buffer_upload, parse_symptoms
from backend.risk_engine import KB, assess_risk

log = logging.getLogger("ocuscreen")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.ready = False
    app.state.busy = False
    try:
        await run_in_threadpool(load_artifacts)
        app.state.ready = True
    except ModelUnavailable:
        log.exception("Model startup failed")
    yield


app = FastAPI(title="OcuScreen AI", lifespan=lifespan)


@app.middleware("http")
async def headers(request: Request, call_next):
    response = await call_next(request)
    # Revalidate reusable assets; never cache screening responses.
    response.headers["Cache-Control"] = (
        "public, max-age=0, must-revalidate"
        if request.url.path.startswith(("/css/", "/js/"))
        else "no-store"
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


@app.get("/api/health")
def health():
    ready = getattr(app.state, "ready", False)
    return JSONResponse({"ready": ready}, status_code=200 if ready else 503)


@app.get("/api/symptoms")
def symptoms():
    return {
        "symptoms": KB["symptoms"],
        "urgent_symptoms": KB["urgent_symptoms"],
        "urgent_combinations": KB["urgent_combinations"],
        "disclaimer": KB["disclaimer"],
    }


def failed_prediction(status: str, message: str) -> dict:
    """Keep invalid-image and unavailable-model response shapes identical."""
    return {
        "status": status,
        "label": None,
        "class_id": None,
        "confidence": None,
        "message": message,
    }


@app.post("/api/screen")
async def screen(request: Request):
    # No await between checking and acquiring this single-worker admission slot.
    # Acquire before reading the body to bound simultaneous upload memory.
    if getattr(app.state, "busy", False):
        raise HTTPException(
            429,
            "Máy chủ đang phân tích ảnh khác. Vui lòng thử lại sau vài giây.",
            headers={"Retry-After": "3"},
        )
    app.state.busy = True
    try:
        await buffer_upload(request)
        async with request.form(max_files=1, max_fields=2) as form:
            if len(form.getlist("image")) != 1 or len(form.getlist("symptoms")) > 1:
                raise HTTPException(422, "Chỉ gửi một ảnh và một danh sách triệu chứng.")
            file = form.get("image")
            if file is None or not hasattr(file, "read"):
                raise HTTPException(422, "Thiếu ảnh ở trường image.")
            ids = parse_symptoms(form.get("symptoms", "[]"))
            image_bytes = await file.read(MAX_BYTES + 1)
            try:
                prediction = await run_in_threadpool(predict_image, image_bytes)
                app.state.ready = True
            except InvalidImage as exc:
                prediction = failed_prediction("invalid", str(exc))
            except ModelUnavailable:
                log.exception("Inference unavailable")
                app.state.ready = False
                prediction = failed_prediction(
                    "unavailable",
                    "Model chưa sẵn sàng. Chỉ đánh giá triệu chứng; "
                    "quản trị viên cần kiểm tra máy chủ.",
                )
            result = {"image": prediction, "risk": assess_risk(prediction, ids)}
            status_code = 503 if prediction["status"] == "unavailable" else 200
            return JSONResponse(result, status_code=status_code)
    finally:
        app.state.busy = False


# Mount last so API routes are not shadowed. Model/data are never static-served.
app.mount("/", StaticFiles(directory=ROOT / "frontend", html=True), name="frontend")
