import { t, getLang } from './i18n.js';

/** JSON transport, including symptom-only results returned with HTTP 503. */
export async function requestJSON(url, options = {}, timeout = 90000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    let data = null;
    try { data = await response.json(); } catch { /* body is not JSON */ }
    if (response.ok) {
      if (!data) throw new Error(t('err.badData'));
      return { data, ok: true };
    }
    // Model unavailable: the server still returns a symptom-only result with a `risk` field.
    if (data?.risk) return { data, ok: false };
    throw new Error(typeof data?.detail === 'string' ? data.detail
      : t('err.server'));
  } catch (error) {
    if (error.name === 'AbortError') throw new Error(t('err.timeout'));
    if (error instanceof TypeError) throw new Error(t('err.network'));
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function fetchSymptoms() {
  return requestJSON('/api/symptoms?lang=' + getLang(), {}, 15000);
}

export function screenImage(file, symptoms) {
  const body = new FormData();
  body.append('image', file);
  body.append('symptoms', JSON.stringify(symptoms));
  return requestJSON('/api/screen?lang=' + getLang(), { method: 'POST', body }, 120000);
}