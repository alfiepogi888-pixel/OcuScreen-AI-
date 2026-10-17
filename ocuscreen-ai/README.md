---
title: OcuScreen AI
emoji: 👁️
colorFrom: teal
colorTo: blue
sdk: docker
app_port: 7860
---

# OcuScreen AI

Web app sàng lọc sơ bộ hai tầng: model ảnh Keras → bộ quy tắc JSON kết hợp triệu chứng → mức ưu tiên khám. Đây là prototype chưa thẩm định lâm sàng, không phải thiết bị chẩn đoán.

## 1. Cấu trúc repo

| Đường dẫn | Vai trò |
|---|---|
| `model/keras_model.h5` | Model gốc của nhóm, đã bổ sung từ Drive; chưa chạy kiểm chứng bằng TensorFlow trong phiên này |
| `model/labels.txt` | Đủ 12 class theo đúng thứ tự đã đối chiếu trên Drive |
| `backend/image_predictor.py` | Nạp model một lần, xử lý ảnh, suy luận CPU |
| `backend/risk_engine.py` | Kết hợp dấu hiệu ảnh và triệu chứng bằng JSON |
| `backend/app.py` | FastAPI và static frontend |
| `backend/__init__.py` | Package Python |
| `data/disease_knowledge.json` | 11 nhãn mắt (gồm Normal), 26 mục checklist, 9 nhóm biểu hiện |
| `frontend/index.html` | Khung giao diện semantic, tiến trình, preview, checklist, kết quả |
| `frontend/css/styles.css` | Kiểu giao diện responsive và trạng thái tương tác |
| `frontend/js/app.js` | Điều phối trạng thái upload, checklist và submit |
| `frontend/js/upload.js` | Quản lý file input, kéo thả và vòng đời preview URL |
| `frontend/js/api.js` | Gọi API, timeout và xử lý lỗi |
| `frontend/js/components.js` | Thành phần checklist và kết quả tái sử dụng |
| `frontend/js/validation.js` | Kiểm tra file và cảnh báo từ knowledge base |
| `backend/request_validation.py` | Giới hạn upload và xác thực triệu chứng |
| `tests/frontend.test.js` | Kiểm thử JavaScript bằng Node, không cần thư viện ngoài |
| `requirements-dev.txt` | Dependency kiểm thử Python |
| `docs/REFACTOR.md` | Ghi chú review, thay đổi và giới hạn kiểm thử |
| `requirements.txt` | Các dependency được ghim phiên bản |
| `Dockerfile` | Python 3.11, CPU, UID 1000, port 7860 |
| `main.py` | CLI tùy chọn, không dùng input() |
| `tests/test_app.py` | Kiểm thử quy tắc, ảnh và API |
| `docs/VALIDATION.md` | Phạm vi đã kiểm thử và giới hạn |

Không đưa `.venv311`, ảnh người dùng, dataset hoặc bí mật vào repository. File H5 gốc trong Drive: https://drive.google.com/file/d/10mt0wgyArY4zrOc53fuQjLfW3ykJNFyI/view . Tải bằng trình duyệt, giữ tên `keras_model.h5`, đặt trong `model/`. Gói đã kèm bản H5 gốc tải từ Drive, giữ nguyên byte. Chữ ký HDF5 đã được kiểm tra; khả năng nạp model và chất lượng dự đoán cần kiểm chứng trong môi trường TensorFlow theo Dockerfile.

## 2. Các quyết định chống lỗi

- Đọc nhãn với `line.strip().split(' ', 1)`, tách ID nguyên và tên. Kiểm tra đủ thứ tự 0–11 để tránh gán nhầm đầu ra.
- Giữ cách tiền xử lý trong main.py gốc: EXIF orientation → RGB → resize/crop giữa bằng `ImageOps.fit(..., (224,224), LANCZOS)` → float32 → `(img / 127.5) - 1.0`.
- Contract hiện tại là đa lớp softmax `(None,12)`, chọn argmax. Có 12 class không đồng nghĩa multi-label. Nếu model thực tế dùng sigmoid hoặc logits, API báo lỗi contract; cần xác nhận output trước khi đổi thuật toán.
- Class 11 luôn yêu cầu chụp lại, không dùng để suy luận bệnh. Điểm model dưới 0.60 được xem là chưa chắc chắn. Ngưỡng này là giả định prototype cần hiệu chuẩn.
- `Normal` không xóa triệu chứng. Ảnh không hợp lệ và không có triệu chứng trả `Chưa đánh giá`, không trả Thấp. Cảnh báo triệu chứng vẫn hiện khi model không nạp được.
- Tầng 2 không train từ JSON. Nó đọc quy tắc, xếp nhóm biểu hiện bằng 2 điểm ảnh khớp + 1 điểm mỗi triệu chứng; không đổi điểm thành % bệnh. Mức Cao/Vừa/Thấp là ưu tiên khám theo quy tắc độc lập với xếp hạng nhóm.
- Một worker, một model, một lượt upload/suy luận tại một thời điểm; lượt khác nhận 429. Đây là giới hạn tài nguyên cho demo ít người, không phải giải pháp chống DDoS hoàn chỉnh.
- Giới hạn 5 MB/ảnh, 12 megapixel, định dạng JPEG/PNG/WebP, không nhận ảnh động. Đường dẫn dựa trên vị trí module, không phụ thuộc nơi chạy lệnh.
- `tensorflow-cpu` giảm dependency CUDA; vẫn có thể hết RAM nếu host quá nhỏ. Docker dùng TF 2.15.1 / Keras 2.15.0 để tương thích các export H5 cũ. Chưa xác nhận phiên bản xuất thực tế của H5 này.
- Ứng dụng không tạo hồ sơ, không ghi ảnh hoặc checklist vào DB. Parser multipart có thể dùng file tạm rồi đóng; hạ tầng hosting có thể có log truy cập riêng. Chỉ thư mục frontend được public qua static route.

## 3. Chạy local bằng Docker (Windows Docker Desktop hoặc WSL)

Đặt H5 vào đúng thư mục trước, mở terminal tại thư mục có Dockerfile:

```bash
docker build -t ocuscreen-ai .
docker run --rm -p 7860:7860 ocuscreen-ai
```

Mở http://localhost:7860 . Kiểm tra http://localhost:7860/api/health phải trả `{"ready":true}`. Nếu muốn port 8000:

```bash
docker run --rm -e PORT=8000 -p 8000:8000 ocuscreen-ai
```

Chạy trực tiếp trong Python 3.11 (Linux/WSL):

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn backend.app:app --host 0.0.0.0 --port 7860 --workers 1
```

Windows PowerShell dùng `py -3.11 -m venv .venv`, sau đó `.venv\Scripts\Activate.ps1`; các lệnh pip và uvicorn giữ nguyên. Docker Linux là môi trường triển khai chuẩn.

## 4. Đưa lên Hugging Face Spaces từng bước

**Điều kiện chi phí được đối chiếu ngày 11/09/2026:** tài liệu hiện tại ghi Docker/Gradio Space chạy compute cần gói trả phí để tạo; CPU Basic không có phí theo giờ. Không thể cam kết Docker Spaces hoàn toàn miễn phí cho tài khoản Free. Kiểm tra điều kiện hiển thị trong tài khoản trước khi tạo. Nguồn: https://huggingface.co/docs/hub/spaces-overview .

1. Giải nén gói và đặt H5 gốc vào `model/keras_model.h5`. Không đổi tên labels.
2. Đăng nhập https://huggingface.co và mở https://huggingface.co/new-space .
3. Chọn tên `ocuscreen-ai`, SDK **Docker**, mẫu **Blank** nếu có. Chọn **Public** để người ngoài truy cập. Chọn CPU Basic nếu tài khoản cho phép.
4. Lưu ý Public công khai cả mã và model trong repo, không chỉ trang web. Chỉ upload tài nguyên nhóm được quyền chia sẻ; không upload ảnh kiểm thử của người khác.
5. Tạo Space. Trong tab **Files**, upload các thư mục `backend`, `data`, `frontend`, `model` cùng `requirements.txt`, `Dockerfile`, `README.md` tại gốc repo. Giữ nguyên cấu trúc đường dẫn. Không upload ZIP làm file ứng dụng: HF không tự giải nén ZIP để build.
6. Giữ YAML đầu README gồm `sdk: docker` và `app_port: 7860`. Commit thay đổi. Space tự build và chạy.
7. Nếu UI upload thư mục bất tiện, dùng CLI ở máy bạn. Thay `YOUR_USERNAME` bằng tài khoản của bạn; chạy trong thư mục repo vừa giải nén:

```bash
python -m pip install huggingface_hub
hf auth login
hf upload YOUR_USERNAME/ocuscreen-ai . . --repo-type space
```

8. Mở tab **Logs**. Đợi build hoàn tất và trạng thái **Running**. Nếu thiếu H5 hoặc model không tương thích, giao diện vẫn tải nhưng `/api/health` trả 503; chưa coi là deploy thành công.
9. Trong tab **App**, dùng tùy chọn mở app trực tiếp để sao chép URL `.hf.space` thực tế. Có thể chia sẻ URL trang Space lấy từ thanh địa chỉ. Không đoán subdomain.
10. Mở link trong cửa sổ ẩn danh, kiểm tra upload ảnh, checklist, kết quả. Thử `Normal` kèm giảm thị lực: phải còn cảnh báo Cao; thử ảnh nền: phải yêu cầu chụp lại. Việc xác nhận nhãn phải dùng ảnh test thực sự, không giả định model luôn đúng.

Docker Spaces yêu cầu app lắng nghe `0.0.0.0` và port trong README; cấu hình đã có sẵn. Nguồn: https://huggingface.co/docs/hub/spaces-sdks-docker . CLI: https://huggingface.co/docs/huggingface_hub/guides/cli .

## 5. Phương án Render

1. Tạo repo GitHub, upload cấu trúc đã giải nén cùng H5. Có thể dùng repo private nếu kết nối Render được cấp quyền đọc.
2. Trong Render Dashboard chọn **New → Web Service**, kết nối repo.
3. Chọn runtime **Docker**, đường dẫn Dockerfile là `./Dockerfile`, root là thư mục chứa file đó.
4. Chọn instance phù hợp. Free có giới hạn tài nguyên; TensorFlow có thể không vừa RAM. Nếu OOM phải tăng RAM hoặc chuyển runtime/model nhẹ hơn, không tăng worker.
5. Đặt biến `PORT=7860` nếu cần. Dockerfile cũng nhận giá trị PORT do nền tảng cấp. Đặt Health Check Path là `/api/health`.
6. Deploy, kiểm tra log và trạng thái health, rồi sao chép URL public do Render cấp.
7. Render Free có thể ngủ sau 15 phút không có request và cần khởi động lại khi có truy cập. Không dùng Free để cam kết dịch vụ luôn sẵn sàng. Nguồn: https://render.com/docs/free .

## 6. API contract

- `GET /api/symptoms`: danh sách ID, nhãn tiếng Việt và các triệu chứng ưu tiên.
- `POST /api/screen`: multipart gồm `image` (file) và `symptoms` (chuỗi JSON danh sách ID).
- `GET /api/health`: 200 nếu model sẵn sàng, 503 nếu chưa nạp được.
- `/`: frontend; `/docs`: OpenAPI.

```bash
curl -X POST http://localhost:7860/api/screen -F 'image=@eye.jpg' -F 'symptoms=["itch","gritty"]'
```

Response gồm `image` (class_id, label, confidence, status, message), `risk` (level, label, urgent, reasons, recommendation, candidates, image_used, knowledge_version, disclaimer). Ảnh đọc lỗi hoặc Back Ground trả 200 với trạng thái invalid và cảnh báo triệu chứng nếu có. Model lỗi trả 503 kèm phần risk từ triệu chứng. Sai input trả 422; quá dung lượng request 413; đang bận 429. `confidence` chỉ là điểm output của model.

## 7. Kiểm thử và xử lý lỗi

```bash
python -m pip install pytest httpx
python -m pytest -q tests
```

- **FileNotFoundError / health 503:** kiểm tra `model/keras_model.h5` đúng tên, có byte thực chứ không phải shortcut/LFS pointer.
- **Unrecognized keyword / DepthwiseConv2D groups:** kiểm tra đang dùng dependency trong Docker; lấy phiên bản TensorFlow/Keras từ môi trường export gốc. Không sửa JSON cấu hình H5 hoặc xóa thuộc tính layer mù quáng. Re-export bằng môi trường đúng và so sánh đầu ra trên ảnh cố định trước khi thay model.
- **Sai shape / output:** artifact hiện phải có input `(None,224,224,3)`, output softmax `(None,12)`. Không tự suy đoán sigmoid thành softmax.
- **OOM / exit 137:** giữ `--workers 1`, không dùng reload trên cloud, giảm kích thước ảnh hoặc tăng RAM host. CPU package không bảo đảm hết OOM.
- **404 API:** giữ mount frontend ở cuối app.py và upload đủ thư mục.
- **CORS:** frontend gọi đường dẫn tương đối cùng domain, không cần wildcard CORS.
- **Ảnh điện thoại bị từ chối:** xuất JPEG/PNG/WebP, giảm dưới 12 megapixel; HEIC chưa hỗ trợ.

## 8. Phạm vi tri thức

Nguồn tham khảo trong JSON gồm NHS về đỏ mắt, vàng da, mắt lồi và thiếu máu. Các nguồn hỗ trợ mô tả biểu hiện chung; không xác thực trọng số hay hiệu năng của app. Cần chuyên gia rà soát quy tắc, dữ liệu kiểm thử độc lập, calibration và đánh giá sai âm trước khi dùng ngoài demo. Ảnh ngoài mắt không xác định được tăng nhãn áp, bệnh võng mạc hoặc nguyên nhân đục vùng mắt. Không suy ra bệnh cụ thể từ riêng nhãn Normal/Cornea Abnormal.

## Kiểm thử sau refactor

Chạy từ thư mục gốc dự án, sau khi cài dependency ứng dụng:

```bash
python -m pip install -r requirements-dev.txt
python -m pytest -q
npm test
```

`npm test` cần Node 18+ nhưng không cần `npm install`. Frontend dùng ES modules và được FastAPI phục vụ; không mở trực tiếp file HTML. Xem `docs/REFACTOR.md` cho kết quả kiểm tra và checklist trước khi triển khai.

Xem `docs/QUALITY_REVIEW.md` cho đợt cải thiện tiếp theo: tìm triệu chứng không dấu, module upload, CSS và kiểm tra multipart.
