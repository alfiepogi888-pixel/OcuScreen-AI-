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
  $('selectedCount').textContent = `${selected().length} đã chọn`;
  const active = !$('result').hidden ? 'stepResult' : state.file ? 'stepSymptoms' : 'stepImage';
  for (const id of ['stepImage', 'stepSymptoms', 'stepResult']) {
    if (id === active) $(id).setAttribute('aria-current', 'step');
    else $(id).removeAttribute('aria-current');
  }
}
function clearResult() { $('result').hidden = true; }

// Dark mode toggle functionality
const darkModeToggle = byId('darkModeToggle');
const body = document.body;
let isDarkMode = false;

if (darkModeToggle) {
  // Check for saved preference or system preference
  const savedTheme = localStorage.getItem('theme') || 'auto';
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    isDarkMode = true;
    body.classList.add('dark');
  } else {
    body.classList.remove('dark');
  }

  // Toggle function
  const toggleDarkMode = () => {
    isDarkMode = !isDarkMode;
    if (isDarkMode) {
      body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  darkModeToggle.addEventListener('change', toggleDarkMode);
}

// Drag and drop functionality for upload area
const dropzone = $('dropzone');
const imageInput = $('image');

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  
  // Remove drag classes
  dropzone.classList.remove('dragging');
  
  // Get files from data transfer
  const files = e.dataTransfer.files;
  
  if (files.length > 0) {
    // Trigger the upload change handler with the first file
    const firstFile = files[0];
    
    // Validate the file first
    const validationError = validateFile(firstFile);
    if (validationError) {
      status(validationError, true);
      return;
    }
    
    // Clear previous upload and set new file
    upload.clear();
    state.file = firstFile;
    clearResult();
    status(firstFile ? 'Ảnh đã sẵn sàng. Kiểm tra triệu chứng rồi phân tích.' : 'Chọn ảnh mắt để bắt đầu.');
    updateControls();
  }
}

function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  dropzone.classList.add('dragging');
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  dropzone.classList.remove('dragging');
}

// Attach drag and drop event listeners
dropzone.addEventListener('dragover', handleDragOver);
dropzone.addEventListener('dragleave', handleDragLeave);
dropzone.addEventListener('drop', handleDrop);

// Hide browse button (if it exists) - FIXED: Check both possible locations
const browseButton = $('browseImage');
if (!browseButton) {
  // Try to find the file input inside the image element's parent
  const parentContainer = $('image').closest('.file-input-container') || $('image').parentElement;
  if (parentContainer) {
    const hiddenInput = parentContainer.querySelector('input[type="file"]');
    if (hiddenInput && hiddenInput !== imageInput) {
      browseButton = hiddenInput;
    }
  }
}

// Only hide the browse button if it's a different element than the main image input
if (browseButton && browseButton !== imageInput) {
  browseButton.style.display = 'none';
}

function validateFile(file) {
  if (!file || !file.size) return 'Hãy chọn một ảnh mắt.';
  const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_BYTES) return 'Ảnh lớn hơn 5 MB. Hãy chọn ảnh nhỏ hơn.';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Chỉ nhận ảnh JPEG, PNG hoặc WebP.';
  return null;
}

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
  
  // Add loading spinner class to submit button
  $('submit').classList.add('loading');
  
  try {
    const { data, ok } = await screenImage(state.file, ids);
    renderResult(data);
    status(ok ? 'Đã phân tích.' : 'Chỉ có kết quả triệu chứng; model chưa sẵn sàng.');
  } catch (error) {
    status(error.message, true);
  } finally {
    state.busy = false;
    $('submit').classList.remove('loading');
    updateControls();
  }
});
updateControls();
init();
