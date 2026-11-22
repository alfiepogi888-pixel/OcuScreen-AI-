import { validateFile } from './validation.js';
import { t } from './i18n.js';

const EXT_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
/** Some systems report an empty MIME type; infer it from the extension so the file is not rejected. */
function normalize(file) {
  if (file.type) return file;
  const type = EXT_TYPES[file.name.split('.').pop().toLowerCase()];
  return type ? new File([file], file.name, { type }) : file;
}

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
    next = normalize(next);
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
    onError(t('err.unreadable'));
  });
  for (const type of ['dragenter', 'dragover', 'dragleave', 'drop']) {
    dropzone.addEventListener(type, event => {
      event.preventDefault();
      const over = type === 'dragenter' || type === 'dragover';
      if (over && event.dataTransfer) event.dataTransfer.dropEffect = isBusy() ? 'none' : 'copy';
      dropzone.classList.toggle('dragging', over && !isBusy());
      if (type === 'drop' && !isBusy()) {
        const dropped = event.dataTransfer?.files?.[0];
        if (dropped) choose(dropped);
        else onError(t('err.noFile'));
      }
    });
  }
  window.addEventListener('pagehide', event => {
    if (!event.persisted && url) URL.revokeObjectURL(url);
  });
  return { clear };
}