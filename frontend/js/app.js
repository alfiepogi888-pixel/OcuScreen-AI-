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
  $('image').disabled = state.busy;
  $('dropzone').classList.toggle('disabled', state.busy);
  $('symptomSearch').disabled = state.busy || !state.loaded;
  $('symptomField').disabled = state.busy || !state.loaded;
  $('screenForm').querySelector('[type=reset]').disabled = state.busy;
  $('screenForm').setAttribute('aria-busy', String(state.busy));
  $('selectedCount').textContent = `${selected().length} đã chọn`;
  const active = !$('result').hidden ? 'stepResult' : state.file ? 'stepSymptoms' : 'stepImage';
  for (const id of ['stepImage', 'stepSymptoms', 'stepResult']) {
    if (id === active) $(id).setAttribute('aria-current', 'step');
    else $(id).removeAttribute('aria-current');
  }
}
function clearResult() { $('result').hidden = true; }
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
  const visible = filterSymptoms($('checks'), $('symptomSearch').value);
  $('emptySearch').hidden = visible > 0;
}
$('symptomSearch').addEventListener('input', updateSearch);
async function init() {
  $('retry').hidden = true;
  status('Đang tải danh sách triệu chứng…');
  try {
    const { data } = await fetchSymptoms();
    state.urgent = data.urgent_symptoms;
    state.combinations = data.urgent_combinations || [];
    renderSymptoms(data.symptoms, $('checks'));
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
  $('urgentHint').hidden = !hasUrgentSymptoms(selected(), state.urgent, state.combinations);
  updateControls();
});
$('screenForm').addEventListener('reset', () => {
  clearResult();
  upload.clear();
  state.file = null;
  $('fileMeta').textContent = '';
  $('urgentHint').hidden = true;
  status(state.loaded ? 'Chọn ảnh mắt để bắt đầu.' : 'Hãy tải lại danh sách triệu chứng.');
  queueMicrotask(() => { updateSearch(); updateControls(); });
});
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
updateControls();
init();
