import { validateFile } from './validation.js';

/** Own the native input and preview URL together; release URLs on replacement/reset. */
export function createUpload({ input, dropzone, preview, meta, onChange, onError, isBusy }) {
  let file = null;
  let url = null;
  function clear() {
    if (url) URL.revokeObjectURL(url);
    url = null;
    file = null;
    input.value = '';
    preview.hidden = true;
    preview.removeAttribute('src');
    meta.textContent = '';
    dropzone.classList.remove('dragging');
  }
  function syncInput() {
    const transfer = new DataTransfer();
    if (file) transfer.items.add(file);
    input.files = transfer.files;
  }
  function choose(next) {
    if (isBusy()) return;
    if (!next) { syncInput(); return; } // Preserve the existing file when the picker is cancelled.
    const error = validateFile(next);
    clear();
    if (error) {
      onChange(null);
      onError(error);
      return;
    }
    file = next;
    syncInput();
    url = URL.createObjectURL(file);
    preview.src = url;
    preview.hidden = false;
    meta.textContent = `${file.name} · ${(file.size / 1024).toFixed(0)} KB`;
    onChange(file);
  }
  input.addEventListener('change', () => choose(input.files[0]));
  preview.addEventListener('error', () => {
    if (!file) return;
    clear();
    onChange(null);
    onError('Không đọc được ảnh. Hãy chọn ảnh khác.');
  });
  for (const type of ['dragover', 'dragleave', 'drop']) {
    dropzone.addEventListener(type, event => {
      event.preventDefault();
      dropzone.classList.toggle('dragging', type === 'dragover' && !isBusy());
      if (type === 'drop' && !isBusy()) choose(event.dataTransfer.files[0]);
    });
  }
  window.addEventListener('pagehide', event => {
    if (!event.persisted && url) URL.revokeObjectURL(url);
  });
  return { clear };
}
