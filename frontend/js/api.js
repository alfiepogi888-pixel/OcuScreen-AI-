/** JSON transport, including symptom-only results returned with HTTP 503. */
export async function requestJSON(url, options = {}, timeout = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    let data = null;
    if (response.ok) {
      try {
        data = await response.json();
      } catch (e) {
        // Non-JSON response - treat as error
        throw new Error('Máy chủ trả về dữ liệu không hợp lệ.');
      }
    }
    
    // Check for error responses with detail field
    if (!data && !response.ok) {
      throw new Error(typeof data?.detail === 'string' ? data.detail :
        'Máy chủ chưa trả được kết quả. Vui lòng thử lại.');
    }
    
    // For 503 responses, accept them even without risk field (symptom-only results)
    if (!response.ok && !data?.risk) {
      throw new Error('Model chưa sẵn sàng. Chỉ có kết quả triệu chứng.');
    }
    
    return { data, ok: response.ok };
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Máy chủ phản hồi quá lâu. Vui lòng thử lại.');
    if (error instanceof TypeError) throw new Error('Không kết nối được máy chủ. Kiểm tra kết nối rồi thử lại.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function fetchSymptoms() {
  return requestJSON('/api/symptoms', {}, 15000);
}

export function screenImage(file, symptoms) {
  const body = new FormData();
  body.append('image', file);
  body.append('symptoms', JSON.stringify(symptoms));
  return requestJSON('/api/screen', { method: 'POST', body }, 120000);
}
