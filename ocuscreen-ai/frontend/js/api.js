/** JSON transport, including symptom-only results returned with HTTP 503. */
export async function requestJSON(url, options = {}, timeout = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => null);
    if (!data || (!response.ok && !data.risk)) {
      throw new Error(typeof data?.detail === 'string' ? data.detail :
        'Máy chủ chưa trả được kết quả. Vui lòng thử lại.');
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
  return requestJSON('/api/screen', { method: 'POST', body });
}
