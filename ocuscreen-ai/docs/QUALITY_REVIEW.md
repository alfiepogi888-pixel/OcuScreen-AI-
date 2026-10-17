# Quality review — 18 September 2026

## Source and scope

The source ZIP in Drive/Product was downloaded and compared byte-for-byte by MD5
with the starting archive: b0887251049905e819bff570eaf4f814.
Changes preserve the existing API endpoints, image preprocessing, model labels,
risk rules, warning behavior and symptom-only fallback. No disease rules changed.

## Improvements

- Extracted file input, drag/drop and preview ownership into `frontend/js/upload.js`.
  The native input and submitted file stay synchronized. Dropping multiple files
  selects only the first. Cancelling the picker preserves the current selection.
  Replacing, resetting or failing a preview releases its object URL.
- Added accent-insensitive Vietnamese symptom search. Filtering hides labels without
  rebuilding inputs, retaining all selections and warnings across searches.
- Consolidated repeated desktop CSS selectors and reused color tokens. Kept mobile
  layouts; added search styling, touch targets, disabled dropzone feedback, keyboard
  focus feedback and a reduced-motion-aware loading indicator.
- Added photo/search descriptions for assistive technology and a no-JavaScript notice.
- Reject oversized declared uploads before reading their bodies. Streaming size and
  timeout limits remain active for chunked requests. Reject duplicate symptom fields
  to avoid ambiguous multipart input. Admission slots still release after errors.
- Included the original `converted_keras/keras_model.h5` unchanged: 2,459,408 bytes,
  HDF5 signature checked. The model is not publicly served by the static mount.

## Verification

- Baseline: 25 Python tests and 3 JavaScript tests passed.
- After multipart changes: 27 Python tests passed, covering preprocessing, label
  mapping, risk rules, API fallback, malformed input, size limits and slot release.
- Final JavaScript suite: 5 tests passed, including accent-free search and upload
  cancellation, multi-file drop, image decode failure and preview cleanup.
- JavaScript syntax and Python compilation checked.
- Python test execution used the available Python 3.12 environment, not the target
  Python 3.11/TensorFlow Docker runtime. That test environment was unavailable after
  the session runtime changed. A final small Content-Length parsing guard prevents
  enormous numeric headers from reaching Python's integer conversion limit.
- Browser visual/end-to-end verification was attempted but could not run: no browser
  executable was installed and downloading Chromium timed out. No screenshot or
  browser-validation claim is made.
- TensorFlow is unavailable here. Real H5 loading, prediction quality and runtime
  latency are unverified. No measured speedup is claimed; the early upload rejection
  avoids buffering work for requests whose declared size is already too large.

## Before deploying

Run `python -m pytest -q` and `npm test` in the target environment. Start the Docker
app, confirm `/api/health` returns 200, and test a known eye image with the real H5.
Check upload → symptoms → result → reset at desktop/mobile widths, keyboard focus,
search with hidden selected items and unavailable-model fallback. Website hosting
has not been changed by this source-code update.

## Follow-up verification

A Python 3.11 virtual environment with the pinned production requirements was
installed. All 27 Python tests passed. The original H5 loaded successfully with
input (None,224,224,3) and output (None,12). A synthetic white-image inference
completed; this is an execution smoke check, not an accuracy benchmark. It returned
Normal at about 0.74, demonstrating that the classifier is not a validated
eye-presence check. Model weights and risk thresholds remain unchanged.

The live Sites application uses a separate repository and TensorFlow.js. Its
model, Grad-CAM and symptom-search flow were exercised through browser preview.
That browser result does not validate the FastAPI frontend's visual layout.
