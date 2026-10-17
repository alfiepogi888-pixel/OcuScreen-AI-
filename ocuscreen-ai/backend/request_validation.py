"""Bound upload memory and validate multipart fields before inference."""

import asyncio
import json

from fastapi import HTTPException, Request

from backend.image_predictor import MAX_BYTES
from backend.risk_engine import SYMPTOMS

MAX_REQUEST_BYTES = MAX_BYTES + 65536
UPLOAD_TIMEOUT_SECONDS = 30


async def buffer_upload(request: Request) -> None:
    """Bound chunked requests too; Content-Length alone is not trustworthy."""
    media_type = (
        request.headers.get("content-type", "").split(";", 1)[0].strip().lower()
    )
    if media_type != "multipart/form-data":
        raise HTTPException(415, "Yêu cầu phải là multipart/form-data.")
    content_length = request.headers.get("content-length")
    if content_length is not None:
        if not content_length.isascii() or not content_length.isdecimal():
            raise HTTPException(400, "Content-Length không hợp lệ.")
        digits = content_length.lstrip("0") or "0"
        if len(digits) > len(str(MAX_REQUEST_BYTES)) or int(digits) > MAX_REQUEST_BYTES:
            raise HTTPException(413, "Ảnh vượt quá giới hạn 5 MB.")
    chunks, size = [], 0
    try:
        async with asyncio.timeout(UPLOAD_TIMEOUT_SECONDS):
            async for chunk in request.stream():
                size += len(chunk)
                if size > MAX_REQUEST_BYTES:
                    raise HTTPException(413, "Ảnh vượt quá giới hạn 5 MB.")
                chunks.append(chunk)
    except TimeoutError as exc:
        raise HTTPException(408, "Upload quá lâu. Vui lòng thử lại.") from exc
    # Starlette's form parser consumes this bounded body through request.stream().
    request._body = b"".join(chunks)


def parse_symptoms(raw: str) -> list[str]:
    try:
        ids = json.loads(raw)
    except (ValueError, TypeError) as exc:
        raise HTTPException(422, "symptoms phải là chuỗi JSON dạng danh sách.") from exc
    if (
        not isinstance(ids, list)
        or len(ids) > len(SYMPTOMS)
        or any(not isinstance(item, str) or item not in SYMPTOMS for item in ids)
    ):
        raise HTTPException(422, "Danh sách triệu chứng không hợp lệ.")
    return list(dict.fromkeys(ids))
