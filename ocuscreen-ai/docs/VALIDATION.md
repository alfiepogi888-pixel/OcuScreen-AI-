# Kiểm tra ngày 11/09/2026

- 21 tests đạt bằng `python -m pytest -q tests` tại gốc repo.
- Bao phủ: nhãn 10/11; float32, shape, chuẩn hóa trắng=1/đen=-1; byte ảnh hỏng; output Background bằng model giả; Normal kèm triệu chứng; ảnh chưa chắc chắn; API; sai JSON/ID; giới hạn dung lượng; server bận; model lỗi vẫn giữ cảnh báo.
- Đã kiểm tra cú pháp JavaScript bằng `node --check`.
- Đã chạy Uvicorn thực tế và xác nhận app khởi động được ở chế độ thiếu model; health báo chưa sẵn sàng.
- Test API dùng model giả để kiểm tra tích hợp logic, không đo độ chính xác model.
- Môi trường test Python 3.12 với các thư viện sẵn có, chưa phải môi trường ghim Python 3.11 / TF 2.15.1 trong Docker.
- Chưa chạy H5 gốc: connector Drive tìm thấy file 2.459.408 byte nhưng tham chiếu nhị phân chưa tải được thành file local.
- Chưa build Docker: môi trường không có Docker executable.
- Chưa kiểm thử UI trực quan: Playwright có thư viện nhưng thiếu Chromium executable. Không coi JavaScript syntax check là browser test.
- Chưa deploy lên tài khoản hosting, chưa có URL public thực tế.

Sau khi thêm H5: build Docker, kiểm tra health ready=true, chạy ảnh thật của cả 12 nhãn, kiểm tra ảnh nền, ảnh điện thoại xoay và Normal kèm triệu chứng cảnh báo. So sánh output với main.py gốc trên ảnh cố định để xác nhận tương thích model. Bộ quy tắc chưa được bác sĩ hoặc nghiên cứu đánh giá hiệu quả lâm sàng.

## Cập nhật kiểm tra refactor (2026-09-18)

25 kiểm thử Python và 3 kiểm thử JavaScript đạt. Đối chiếu 1.000 tổ hợp đầu vào cho kết quả risk giống mã gốc. Xem `REFACTOR.md` để biết thay đổi và phạm vi kiểm tra. Chưa kiểm tra inference H5 thật, Docker hoặc trình duyệt; chưa triển khai website trực tuyến.
