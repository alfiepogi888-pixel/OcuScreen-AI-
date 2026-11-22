/** Interface texts (VI/EN). Texts that come from the backend are shown as the server sends them. */
const dict = {
  vi: {
    title: 'OcuScreen AI · Sàng lọc mắt', skip: 'Chuyển đến biểu mẫu',
    noscript: 'Vui lòng bật JavaScript để tải ảnh và sử dụng sàng lọc.',
    tag: 'BẢN THỬ NGHIỆM', 'theme.dark': '🌙 Tối', 'theme.light': '☀️ Sáng', 'theme.aria': 'Chuyển giao diện sáng/tối',
    'lang.btn': 'EN', 'lang.aria': 'Switch to English',
    eyebrow: 'SÀNG LỌC SƠ BỘ · HAI TẦNG', h1a: 'Hiểu dấu hiệu mắt.', h1b: 'Chủ động bước tiếp theo.',
    intro: 'Kết hợp ảnh mắt và triệu chứng bạn cung cấp để gợi ý mức độ ưu tiên đi khám. Kết quả mang tính tham khảo, chưa được thẩm định lâm sàng.',
    warn: 'Nếu đau mắt dữ dội, giảm thị lực đột ngột hoặc hóa chất vào mắt, hãy đi khám ngay. Đừng chờ kết quả AI.',
    'stepper.aria': 'Tiến trình sàng lọc', step1: '01 · Chọn ảnh', step2: '02 · Triệu chứng', step3: '03 · Kết quả',
    card1: 'Chọn ảnh mắt', drop: 'Chọn hoặc kéo thả ảnh mắt', dropHint: 'JPEG, PNG, WebP · tối đa 5 MB',
    remove: 'Xóa ảnh', previewAlt: 'Ảnh mắt đã chọn',
    photoGuide: 'Chụp đủ sáng, giữ mắt ở giữa ảnh. Không dùng bộ lọc màu. Ảnh cần ít nhất 64×64 và không quá 12 megapixel.',
    privacy: 'Ảnh được gửi đến máy chủ để xử lý. Ứng dụng không lưu ảnh hoặc checklist thành hồ sơ; không nhập thông tin định danh.',
    card2: 'Triệu chứng của bạn', selected: '{n} đã chọn', pickHint: 'Chọn tất cả mục phù hợp. Nếu không có triệu chứng, để trống.',
    urgentTitle: 'Có dấu hiệu cần khám ngay.', urgentWait: 'Đừng chờ phân tích ảnh để tìm trợ giúp y tế.',
    searchLabel: 'Tìm triệu chứng', searchPh: 'Ví dụ: đỏ mắt, ngứa, chảy nước mắt',
    searchHint: 'Tìm có dấu hoặc không dấu. Các mục đã chọn vẫn được giữ lại.', legend: 'Triệu chứng hiện tại',
    emptySearch: 'Không tìm thấy triệu chứng. Thử từ khóa khác.',
    submit: 'Phân tích sàng lọc', submitBusy: 'Đang phân tích…', reset: 'Làm lại', retry: 'Tải lại triệu chứng',
    resultTitle: 'Kết quả sàng lọc sơ bộ', print: 'In / lưu thành PDF',
    footer: 'OcuScreen AI · Ảnh → Dấu hiệu → Triệu chứng → Gợi ý đi khám', footerLink: 'Tham khảo dấu hiệu cần khám mắt',
    'status.loading': 'Đang tải danh sách triệu chứng…', 'status.pick': 'Chọn ảnh mắt để bắt đầu.',
    'status.imageReady': 'Ảnh đã sẵn sàng. Kiểm tra triệu chứng rồi phân tích.', 'status.ready': 'Sẵn sàng phân tích.',
    'status.running': 'Đang phân tích ảnh và triệu chứng…', 'status.done': 'Đã phân tích.',
    'status.symptomOnly': 'Chỉ có kết quả triệu chứng; model chưa sẵn sàng.',
    'status.reload': 'Hãy tải lại danh sách triệu chứng.', 'status.removed': 'Đã xóa ảnh. Chọn ảnh khác để tiếp tục.',
    'err.badData': 'Máy chủ trả về dữ liệu không hợp lệ.', 'err.server': 'Máy chủ chưa trả được kết quả. Vui lòng thử lại.',
    'err.timeout': 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.', 'err.network': 'Không kết nối được máy chủ. Kiểm tra kết nối rồi thử lại.',
    'err.noFile': 'Không nhận được tệp ảnh. Hãy kéo ảnh từ thư mục trên máy tính của bạn.',
    'err.unreadable': 'Không đọc được ảnh. Hãy chọn ảnh khác.', 'err.pickImage': 'Hãy chọn một ảnh mắt.',
    'err.size': 'Ảnh lớn hơn 5 MB. Hãy chọn ảnh nhỏ hơn.', 'err.type': 'Chỉ nhận ảnh JPEG, PNG hoặc WebP.',
    'res.level': 'Mức ưu tiên: ', 'res.imageLabel': 'Nhãn ảnh: {label} · Điểm model: {score}%', 'res.noLabel': 'Chưa có nhãn ảnh hợp lệ',
    'res.group': 'Nhóm biểu hiện có điểm tương đồng', 'res.groupNote': 'Danh sách tham khảo; thứ tự theo điểm khớp, không phải xác suất bệnh.',
    'res.matches': 'Thông tin khớp: ', 'lvl.high': 'Cao', 'lvl.medium': 'Vừa', 'lvl.low': 'Thấp',
  },
  en: {
    title: 'OcuScreen AI · Eye screening', skip: 'Skip to form',
    noscript: 'Please enable JavaScript to upload a photo and use the screening.',
    tag: 'BETA', 'theme.dark': '🌙 Dark', 'theme.light': '☀️ Light', 'theme.aria': 'Switch light/dark theme',
    'lang.btn': 'VI', 'lang.aria': 'Chuyển sang tiếng Việt',
    eyebrow: 'PRELIMINARY SCREENING · TWO STAGES', h1a: 'Understand your eye symptoms.', h1b: 'Take the next step.',
    intro: 'Combines your eye photo and the symptoms you report to suggest how urgently to see a doctor. Results are for reference only and have not been clinically validated.',
    warn: 'If you have severe eye pain, sudden vision loss, or chemicals in your eye, see a doctor immediately. Do not wait for the AI result.',
    'stepper.aria': 'Screening progress', step1: '01 · Choose photo', step2: '02 · Symptoms', step3: '03 · Result',
    card1: 'Choose an eye photo', drop: 'Choose or drag and drop an eye photo', dropHint: 'JPEG, PNG, WebP · max 5 MB',
    remove: 'Remove photo', previewAlt: 'Selected eye photo',
    photoGuide: 'Use good lighting and keep the eye centered. Do not use color filters. The image must be at least 64×64 and no more than 12 megapixels.',
    privacy: 'The photo is sent to the server for processing. The app does not store photos or checklists as records; do not enter identifying information.',
    card2: 'Your symptoms', selected: '{n} selected', pickHint: 'Select everything that applies. If you have no symptoms, leave it empty.',
    urgentTitle: 'Signs that need urgent care.', urgentWait: 'Do not wait for the image analysis to seek medical help.',
    searchLabel: 'Search symptoms', searchPh: 'For example: red eye, itching, watery eyes',
    searchHint: 'Search ignores accents. Selected items are kept.', legend: 'Current symptoms',
    emptySearch: 'No symptoms found. Try another keyword.',
    submit: 'Run screening', submitBusy: 'Analyzing…', reset: 'Start over', retry: 'Reload symptoms',
    resultTitle: 'Preliminary screening result', print: 'Print / save as PDF',
    footer: 'OcuScreen AI · Photo → Signs → Symptoms → Advice on seeing a doctor', footerLink: 'When to see a doctor about eye problems',
    'status.loading': 'Loading the symptom list…', 'status.pick': 'Choose an eye photo to begin.',
    'status.imageReady': 'Photo ready. Check your symptoms, then run the screening.', 'status.ready': 'Ready to analyze.',
    'status.running': 'Analyzing the photo and symptoms…', 'status.done': 'Analysis complete.',
    'status.symptomOnly': 'Symptom-only result; the model is not ready.',
    'status.reload': 'Please reload the symptom list.', 'status.removed': 'Photo removed. Choose another photo to continue.',
    'err.badData': 'The server returned invalid data.', 'err.server': 'The server could not return a result. Please try again.',
    'err.timeout': 'The server took too long to respond. Please try again.', 'err.network': 'Could not reach the server. Check your connection and try again.',
    'err.noFile': 'No image file received. Drag an image from a folder on your computer.',
    'err.unreadable': 'Could not read the image. Please choose another one.', 'err.pickImage': 'Please choose an eye photo.',
    'err.size': 'The image is larger than 5 MB. Choose a smaller one.', 'err.type': 'Only JPEG, PNG or WebP images are accepted.',
    'res.level': 'Priority: ', 'res.imageLabel': 'Image label: {label} · Model score: {score}%', 'res.noLabel': 'No valid image label yet',
    'res.group': 'Presentations with similar features', 'res.groupNote': 'For reference only; ordered by match score, not disease probability.',
    'res.matches': 'Matching information: ', 'lvl.high': 'High', 'lvl.medium': 'Medium', 'lvl.low': 'Low',
  },
};
let lang = 'vi';
export const getLang = () => lang;
export function t(key, vars = {}) {
  const text = dict[lang][key] ?? dict.vi[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? '');
}
/** Switches language and rewrites every element marked data-i18n / data-i18n-attr. */
export function setLang(next) {
  lang = dict[next] ? next : 'vi';
  document.documentElement.lang = lang;
  document.title = t('title');
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr, t(key));
    }
  }
}