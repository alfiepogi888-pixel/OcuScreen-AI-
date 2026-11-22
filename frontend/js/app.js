import { fetchSymptoms, screenImage } from './api.js';
import { byId as $, renderSymptoms, renderResult, filterSymptoms } from './components.js';
import { hasUrgentSymptoms } from './validation.js';
import { createUpload } from './upload.js';
import { t, getLang, setLang } from './i18n.js';

const state = { file: null, loaded: false, busy: false, urgent: [], combinations: [], result: null };
const selected = () => [...$('checks').querySelectorAll('input:checked')].map(input => input.value);
const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage blocked */ } },
};

/* Status line: keeps the message key so it can be re-translated when the language changes. */
let lastStatus = { text: 'status.loading', error: false, raw: false };
function renderStatus() {
  $('status').textContent = lastStatus.raw ? lastStatus.text : t(lastStatus.text);
  $('status').dataset.error = String(lastStatus.error);
}
function status(text, error = false, raw = false) {
  lastStatus = { text, error, raw };
  renderStatus();
}
function resetFileMeta() {
  $('fileMeta').textContent = '';
  $('fileMeta').dataset.error = 'false';
}

function updateControls() {
  $('submit').disabled = state.busy || !state.loaded || !state.file;
  $('submit').textContent = t(state.busy ? 'submitBusy' : 'submit');
  $('screenForm').setAttribute('aria-busy', String(state.busy));
  $('image').disabled = state.busy;
  $('removeImage').hidden = !state.file;
  $('removeImage').disabled = state.busy;
  $('dropzone').classList.toggle('disabled', state.busy);
  $('symptomSearch').disabled = state.busy || !state.loaded;
  $('symptomField').disabled = state.busy || !state.loaded;
  $('screenForm').querySelector('[type=reset]').disabled = state.busy;
  $('selectedCount').textContent = t('selected', { n: selected().length });
  const active = !$('result').hidden ? 'stepResult' : state.file ? 'stepSymptoms' : 'stepImage';
  for (const id of ['stepImage', 'stepSymptoms', 'stepResult']) {
    if (id === active) $(id).setAttribute('aria-current', 'step');
    else $(id).removeAttribute('aria-current');
  }
}
function clearResult() { $('result').hidden = true; state.result = null; }
function updateUrgent() {
  $('urgentHint').hidden = !hasUrgentSymptoms(selected(), state.urgent, state.combinations);
}

/* Light / dark theme: saved choice first, otherwise follow the system setting. */
function applyTheme(theme) {
  const dark = theme === 'dark';
  document.documentElement.dataset.theme = theme;
  $('themeToggle').textContent = t(dark ? 'theme.light' : 'theme.dark');
  $('themeToggle').setAttribute('aria-pressed', String(dark));
}
function initTheme() {
  const saved = store.get('theme');
  applyTheme(saved === 'dark' || saved === 'light' ? saved
    : matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  $('themeToggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    store.set('theme', next);
  });
}

/* Language (VI / EN) */
function applyLang(lang) {
  setLang(lang);
  $('langToggle').textContent = t('lang.btn');
  $('langToggle').setAttribute('aria-label', t('lang.aria'));
  applyTheme(document.documentElement.dataset.theme || 'light');
  renderStatus();
  updateControls();
}
$('langToggle').addEventListener('click', async () => {
  const next = getLang() === 'vi' ? 'en' : 'vi';
  applyLang(next);
  store.set('lang', next);
  if (!state.loaded) return;
  // Symptom names and result text come from the server, so ask for them again in the new language.
  $('symptomSearch').value = ''; // a keyword typed in one language would hide every symptom in the other
  try {
    await loadSymptoms();
    if (state.result && state.file) await analyze({ quiet: true });
  } catch (error) {
    status(error.message, true, true);
  }
});

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
  onError: message => {
    status(message, true, true);
    $('fileMeta').textContent = message; // also show the problem right under the dropzone
    $('fileMeta').dataset.error = 'true';
  },
  onChange: file => {
    state.file = file;
    $('fileMeta').dataset.error = 'false';
    clearResult();
    status(file ? 'status.imageReady' : 'status.pick');
    updateControls();
  },
});

$('removeImage').addEventListener('click', () => {
  upload.clear();
  state.file = null;
  resetFileMeta();
  clearResult();
  status('status.removed');
  updateControls();
  $('image').focus();
});

function updateSearch() {
  $('emptySearch').hidden = filterSymptoms($('checks'), $('symptomSearch').value) > 0;
}
$('symptomSearch').addEventListener('input', updateSearch);

/** Loads the symptom list in the current language and keeps the boxes that are already ticked. */
async function loadSymptoms() {
  const keep = new Set(selected());
  const { data } = await fetchSymptoms();
  state.urgent = data.urgent_symptoms || [];
  state.combinations = data.urgent_combinations || [];
  renderSymptoms(data.symptoms || [], $('checks'));
  for (const input of $('checks').querySelectorAll('input')) input.checked = keep.has(input.value);
  updateSearch();
  updateUrgent();
  updateControls();
}
async function init() {
  $('retry').hidden = true;
  status('status.loading');
  try {
    await loadSymptoms();
    state.loaded = true;
    status(state.file ? 'status.ready' : 'status.pick');
  } catch (error) {
    status(error.message, true, true);
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
  resetFileMeta();
  status(state.loaded ? 'status.pick' : 'status.reload');
  // The browser clears the checkboxes after this event, so refresh the UI on the next tick.
  setTimeout(() => { updateSearch(); updateUrgent(); updateControls(); }, 0);
});
$('printResult').addEventListener('click', () => window.print());

async function analyze({ quiet = false } = {}) {
  if (state.busy || !state.loaded || !state.file) return;
  const ids = selected();
  state.busy = true;
  if (!quiet) clearResult();
  updateControls();
  status('status.running');
  try {
    const { data, ok } = await screenImage(state.file, ids);
    state.result = data;
    renderResult(data, { focus: !quiet });
    status(ok ? 'status.done' : 'status.symptomOnly');
  } catch (error) {
    status(error.message, true, true);
  } finally {
    state.busy = false;
    updateControls();
  }
}
$('screenForm').addEventListener('submit', event => {
  event.preventDefault();
  analyze();
});

initTheme();
applyLang(store.get('lang') === 'en' ? 'en' : 'vi');
init();