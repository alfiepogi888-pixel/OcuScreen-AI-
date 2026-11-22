import { fetchSymptoms, screenImage } from './api.js';
import { byId as $, renderSymptoms, renderResult, filterSymptoms } from './components.js';
import { hasUrgentSymptoms } from './validation.js';
import { createUpload } from './upload.js';

const state = { file: null, loaded: false, busy: false, urgent: [], combinations: [] };
const selected = () => [...$('checks').querySelectorAll('input:checked')].map(input => input.value);

function status(message, error = false) {
  $('status').textContent = message;
  $('status').dataset.error = String(error);
}
function updateControls() {
  $('submit').disabled = state.busy || !state.loaded || !state.file;
  $('submit').textContent = state.busy ? 'Đang phân tích…' : 'Phân tích sàng lọc';
  $('screenForm').setAttribute('aria-busy', String(state.busy));
  $('image').disabled = state.busy;
  $('dropzone').classList.toggle('disabled', state.busy);
  $('symptomSearch').disabled = state.busy || !state.loaded;
  $('symptomField').disabled = state.busy || !state.loaded;
  $('screenForm').querySelector('[type=reset]').disabled = state.busy;
  $('selectedCount').textContent = `${selected().length} đã chọn`;
  const active = !$('result').hidden ? 'stepResult' : state.file ? 'stepSymptoms' : 'stepImage';
  for (const id of ['stepImage', 'stepSymptoms', 'stepResult']) {
    if (id === active) $(id).setAttribute('aria-current', 'step');
    else $(id).removeAttribute('aria-current');
  }
}
function clearResult() { $('result').hidden = true; }
function updateUrgent() {
  $('urgentHint').hidden = !hasUrgentSymptoms(selected(), state.urgent, state.combinations);
}

/* Light / dark theme: saved choice first, otherwise follow the system setting. */
function applyTheme(theme) {
  const dark = theme === 'dark';
  document.documentElement.dataset.theme = theme;
  $('themeToggle').textContent = dark ? '☀️ Sáng' : '🌙 Tối';
  $('themeToggle').setAttribute('aria-pressed', String(dark));
}
function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('theme'); } catch { /* storage blocked */ }
  applyTheme(saved === 'dark' || saved === 'light' ? saved
    : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  $('themeToggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('theme', next); } catch { /* storage blocked */ }
  });
}

/* Stop the browser from opening a file that is dropped outside the dropzone. */
for (const type of ['dragover', 'drop']) {
  window.addEventListener(type, event => {
    if (event.dataTransfer?.types?.includes('Files')) event.preventDefault();
  });
}

/* upload.js owns the file input, preview and drag-and-drop. */
const upload = createUpload({
  input: $('image'), dropzone: $('dropzone'), preview: $('preview'), meta: $('fileMeta'),
  isBusy: () => state.busy,
  onError: message => status(message, true),
  onChange: file => {
    state.file = file;
    clearResult();
    status(file ? 'Ảnh đã sẵn sàng. Kiểm tra triệu chứng rồi phân tích.' : 'Chọn ảnh mắt để bắt đầu.');
    updateControls();
  },
});

function updateSearch() {
  $('emptySearch').hidden = filterSymptoms($('checks'), $('symptomSearch').value) > 0;
}
$('symptomSearch').addEventListener('input', updateSearch);

async function init() {
  $('retry').hidden = true;
  status('Đang tải danh sách triệu chứng…');
  try {
    const { data } = await fetchSymptoms();
    state.urgent = data.urgent_symptoms || [];
    state.combinations = data.urgent_combinations || [];
    renderSymptoms(data.symptoms || [], $('checks'));
    updateSearch();
    state.loaded = true;
    status(state.file ? 'Sẵn sàng phân tích.' : 'Chọn ảnh mắt để bắt đầu.');
  } catch (error) {
    status(error.message, true);
    $('retry').hidden = false;
  }
  updateControls();
}
$('retry').addEventListener('click', init);

$('checks').addEventListener('change', () => {
  clearResult();
  updateUrgent();
  updateControls();
});
$('screenForm').addEventListener('reset', () => {
  clearResult();
  upload.clear();
  state.file = null;
  status(state.loaded ? 'Chọn ảnh mắt để bắt đầu.' : 'Hãy tải lại danh sách triệu chứng.');
  // The browser clears the checkboxes after this event, so refresh the UI on the next tick.
  setTimeout(() => { updateSearch(); updateUrgent(); updateControls(); }, 0);
});
$('printResult').addEventListener('click', () => window.print());

$('screenForm').addEventListener('submit', async event => {
  event.preventDefault();
  if (state.busy || !state.loaded || !state.file) return;
  const ids = selected();
  state.busy = true;
  clearResult();
  updateControls();
  status('Đang phân tích ảnh và triệu chứng…');
  try {
    const { data, ok } = await screenImage(state.file, ids);
    renderResult(data);
    status(ok ? 'Đã phân tích.' : 'Chỉ có kết quả triệu chứng; model chưa sẵn sàng.');
  } catch (error) {
    status(error.message, true);
  } finally {
    state.busy = false;
    updateControls();
  }
});

initTheme();
updateControls();
init();