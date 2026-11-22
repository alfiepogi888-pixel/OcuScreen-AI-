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
from backend.risk_engine import assess_risk, symptoms_payload

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


# Define API routes that should NOT receive aggressive cache control
API_ROUTES = frozenset(["/api/health", "/api/symptoms", "/api/screen"])

@app.middleware("http")
async def headers(request: Request, call_next):
    response = await call_next(request)
    
    # Determine if this is a static asset or API route
    path = str(request.url.path)
    is_static = path.startswith(("/css/", "/js/"))
    is_api = any(path.startswith(route) for route in API_ROUTES)
    
    # Apply appropriate cache control
    if is_static:
        # Static assets - safe to cache with revalidation
        response.headers["Cache-Control"] = "public, max-age=3600, must-revalidate"
    elif is_api:
        # API endpoints - never cache, but allow some stale responses during inference load
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    
    # Security headers apply to all responses
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    
    return response


@app.get("/api/health")
def health():
    ready = getattr(app.state, "ready", False)
    return JSONResponse({"ready": ready}, status_code=200 if ready else 503)


def get_lang(request: Request) -> str:
    """Language of user-facing text: ?lang=en for English, anything else is Vietnamese."""
    return "en" if request.query_params.get("lang") == "en" else "vi"


def pick(lang: str, vi: str, en: str) -> str:
    return en if lang == "en" else vi


@app.get("/api/symptoms")
def symptoms(request: Request):
    return symptoms_payload(get_lang(request))


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
    lang = get_lang(request)
    # No await between checking and acquiring this single-worker admission slot.
    # Acquire before reading the body to bound simultaneous upload memory.
    if getattr(app.state, "busy", False):
        raise HTTPException(
            429,
            pick(
                lang,
                "Máy chủ đang phân tích ảnh khác. Vui lòng thử lại sau vài giây.",
                "The server is analyzing another image. Please try again in a few seconds.",
            ),
            headers={"Retry-After": "3"},
        )
    app.state.busy = True
    try:
        await buffer_upload(request)
        async with request.form(max_files=1, max_fields=2) as form:
            if len(form.getlist("image")) != 1 or len(form.getlist("symptoms")) > 1:
                raise HTTPException(
                    422,
                    pick(
                        lang,
                        "Chỉ gửi một ảnh và một danh sách triệu chứng.",
                        "Send only one image and one symptom list.",
                    ),
                )
            file = form.get("image")
            if file is None or not hasattr(file, "read"):
                raise HTTPException(
                    422,
                    pick(lang, "Thiếu ảnh ở trường image.", "Missing image in the 'image' field."),
                )
            ids = parse_symptoms(form.get("symptoms", "[]"))
            image_bytes = await file.read(MAX_BYTES + 1)
            try:
                prediction = await run_in_threadpool(predict_image, image_bytes)
            except InvalidImage as exc:
                prediction = failed_prediction("invalid", str(exc))
            except ModelUnavailable:
                log.exception("Inference unavailable")
                prediction = failed_prediction(
                    "unavailable",
                    pick(
                        lang,
                        "Model chưa sẵn sàng. Chỉ đánh giá triệu chứng; "
                        "quản trị viên cần kiểm tra máy chủ.",
                        "The model is not ready. Only symptoms were assessed; "
                        "an administrator needs to check the server.",
                    ),
                )
            result = {"image": prediction, "risk": assess_risk(prediction, ids, lang)}
            status_code = 503 if prediction["status"] == "unavailable" else 200
            return JSONResponse(result, status_code=status_code)
    finally:
        app.state.busy = False


# Mount last so API routes are not shadowed. Model/data are never static-served.
app.mount("/", StaticFiles(directory=ROOT / "frontend", html=True), name="frontend")