# Refactor review — 2026-09-18

## Scope

Updated the standalone FastAPI source archive. The separately hosted Sites app is not part of this archive and was not modified or deployed. The archive contains no trained H5, camera implementation, or Grad-CAM endpoint; this refactor does not claim to implement those features.

## Findings and changes

| Finding | Change |
| --- | --- |
| One compressed HTML file mixed networking, rendering, styling, and state | Split into readable HTML, CSS, and ES modules for API transport, components, validation, and form state |
| Warning conditions were duplicated in browser code | Expose existing urgent combinations through `/api/symptoms`; browser evaluates image-independent rules from the same knowledge source |
| Submit could appear enabled without an image; reset and error states were inconsistent | Centralize button, busy, selected-count, and progress states |
| No retry after symptom-loading failure | Add an explicit retry action and preserve a selected image |
| Unhelpful errors for non-JSON gateway responses | Add shared JSON handling, network messages, and request timeouts; retain symptom-only HTTP 503 results |
| Upload offered only native file selection | Add drag-and-drop, file type/size checks, filename/size feedback, preview decode errors, and object-URL cleanup |
| Long form lacked orientation cues | Add progress indicators, selected-symptom count, result focus/scroll, keyboard skip link, and reduced-motion support |
| CSS/JS embedded in every document response | Separate assets with revalidation/ETag support; API responses remain no-store |
| Risk engine rebuilt fixed sets each request | Precompute immutable symptom sets while preserving scoring and ordering |
| Upload validation obscured endpoint responsibilities | Move body-size/time limits and symptom parsing into `backend/request_validation.py` |
| Repeated error-prediction payloads | Centralize their construction while retaining existing field names |

## Compatibility

Existing endpoint paths, multipart field names, 12-class order, image normalization, 0.60 confidence threshold, response fields, fallback behavior, risk levels, candidate weights, and single-worker admission policy are retained. `/api/symptoms` gains the additive `urgent_combinations` field. Repeated symptom IDs are deduplicated; original risk scoring already used a set.

No new frontend runtime dependency or build step is required. Serve through FastAPI, not by opening index.html directly. Modern browsers load native ES modules. Node is needed only for frontend unit tests.

## Verification

- Baseline: 22 existing Python tests passed.
- Final: 25 Python tests passed, including static assets/cache policy, malformed multipart, and admission-slot release after a rejected request.
- Final: 3 Node tests passed for upload validation, knowledge-based warnings, and symptom-only/non-JSON responses.
- 1,000 deterministic generated inputs produced exactly the same complete risk results as the original engine (seed 42; varying labels, status, and symptom subsets).
- Python compile checks, JavaScript syntax checks, and Black formatting checks passed.
- A dependency deprecation warning remains in Starlette's test client; it does not fail tests.

Performance changes remove repeated set creation and enable asset revalidation. No measured inference-speed or throughput improvement is claimed.

## Validation limits

The trained `model/keras_model.h5` is absent, so real TensorFlow inference and end-to-end clinical behavior were not verified. Python tests use mocked model predictions. Validation ran on Python 3.12; deployment remains the existing Python 3.11 Docker image with its original pinned model dependencies. Docker was not built here.

Browser rendering and interactive end-to-end checks could not run: Chromium was absent and its download repeatedly timed out. The mobile CSS, drag-and-drop, reset, focus, and progress behavior need a real-browser smoke test before production deployment. No visual screenshot approval is claimed.

## Run checks from the project root

```bash
# Python 3.11 environment with requirements.txt already installed:
python -m pip install -r requirements-dev.txt
python -m pytest -q

# Node 18+; no npm install needed:
npm test
```

## Browser smoke checklist before deployment

1. At desktop and 390 px mobile widths, confirm no horizontal overflow.
2. Confirm submit is disabled until symptoms load and an image is selected.
3. Select and drag in JPEG/PNG/WebP; verify preview, filename, and replacement.
4. Try an oversized or unsupported file; confirm a readable error and disabled submit.
5. Select an urgent symptom; confirm its warning appears before submission.
6. Submit and confirm result focus, progress state, and fallback on missing model.
7. Reset; confirm image, selection count, warnings, and result are cleared.
8. Simulate a failed `/api/symptoms` call; retry and confirm no duplicate checkboxes.
