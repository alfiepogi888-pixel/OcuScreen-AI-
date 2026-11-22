export const MAX_BYTES = 5 * 1024 * 1024;
export function validateFile(file) {
  if (!file || !file.size) return 'Hãy chọn một ảnh mắt.';
  if (file.size > MAX_BYTES) return 'Ảnh lớn hơn 5 MB. Hãy chọn ảnh nhỏ hơn.';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Chỉ nhận ảnh JPEG, PNG hoặc WebP.';
  return null;
}

/** Only image-independent warning rules can be evaluated before inference. */
export function hasUrgentSymptoms(ids, urgentIds, combinations) {
  const selected = new Set(ids);
  return (urgentIds || []).some(id => selected.has(id)) || (combinations || []).some(rule =>
    !(rule.image_signs || []).length && (rule.all_symptoms || []).length > 0 &&
    rule.all_symptoms.every(id => selected.has(id)));
}

/** Enhanced error messages with actionable steps */
export function getActionableError(error) {
  if (!error) return null;
  
  const errorMessages = {
    'Không kết nối được máy chủ': {
      message: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra:',
      steps: [
        'Kết nối internet hoạt động',
        'Firewall không chặn port 8000/7860',
        'Thử lại sau vài giây'
      ]
    },
    'Máy chủ phản hồi quá lâu': {
      message: 'Yêu cầu vượt quá thời gian chờ. Vui lòng:',
      steps: [
        'Đợi 3-5 giây rồi thử lại',
        'Kiểm tra tải máy chủ',
        'Sử dụng ảnh nhỏ hơn để xử lý nhanh hơn'
      ]
    },
    'Không đọc được ảnh': {
      message: 'Không thể đọc file ảnh. Vui lòng:',
      steps: [
        'Đảm bảo file không bị hỏng',
        'Thử chụp lại với ánh sáng tốt hơn',
        'Sử dụng định dạng JPEG, PNG hoặc WebP'
      ]
    },
    'Ảnh vượt quá giới hạn': {
      message: 'File ảnh quá lớn. Vui lòng:',
      steps: [
        'Nén ảnh trước khi upload',
        'Cắt nhỏ ảnh thành nhiều phần',
        'Sử dụng ảnh chất lượng thấp hơn'
      ]
    }
  };
  
  const matched = Object.keys(errorMessages).find(key => error.includes(key));
  return matched ? errorMessages[matched] : null;
}

/** Validate symptom IDs before submission */
export function validateSymptomIds(ids) {
  if (!Array.isArray(ids)) {
    return { valid: false, message: 'Danh sách triệu chứng phải là mảng.' };
  }
  
  const invalidIds = ids.filter(id => !id || typeof id !== 'string');
  if (invalidIds.length > 0) {
    return { 
      valid: false, 
      message: `Triệu chứng không hợp lệ: ${invalidIds.join(', ')}` 
    };
  }
  
  return { valid: true };
}

/** Get recommended image settings */
export function getImageRecommendations() {
  return {
    minResolution: '64x64 pixels',
    maxResolution: '12 megapixels',
    formats: ['JPEG', 'PNG', 'WebP'],
    lighting: 'Ánh sáng đều, không bóng đổ mạnh',
    positioning: 'Mắt ở giữa khung hình',
    focus: 'Tập trung rõ nét vào mắt'
  };
}