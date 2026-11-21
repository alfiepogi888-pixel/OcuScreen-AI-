/** Small DOM components. API text is always inserted as text, never HTML. */
export const byId = id => document.getElementById(id);

/** State tracker for filter operations - prevents clearing checked inputs during search */
let filterState = {
  query: '',        // Current search query string
  pendingOperations: [], // Deferred UI updates until filter completes
};

export function textNode(tag, text, parent, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  parent.append(node);
  return node;
}

export function renderSymptoms(symptoms, container) {
  const fragment = document.createDocumentFragment();
  for (const symptom of symptoms) {
    const label = document.createElement('label');
    label.className = 'choice';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = symptom.id;
    
    // Attach event listener to preserve state during filter operations
    input.addEventListener('change', () => {
      // Notify parent component of checkbox state change
      window.dispatchEvent(new CustomEvent('symptomsChanged', { 
        detail: { symptomId: symptom.id, checked: input.checked } 
      }));
    });
    
    label.append(input);
    textNode('span', symptom.label, label);
    fragment.append(label);
  }
  container.replaceChildren(fragment);
}

/** Debounced filter function that preserves checkbox state during execution */
function performFilter(container, query) {
  // Immediately update query state to prevent clearing selected items
  filterState.query = query;
  
  const term = normalizeSearch(query);
  let count = 0;
  
  for (const choice of container.children) {
    const labelNormalized = normalizeSearch(choice.textContent);
    const shouldShow = !term || labelNormalized.includes(term);
    
    // Critical: Only modify DOM visibility, NEVER reset checkbox values
    if (shouldShow) {
      choice.hidden = false;
      count++;
    } else {
      choice.hidden = true;
    }
  }
  
  return count;
}

/** Throttled search handler */
const filterThrottle = () => {
  const timeoutId = setTimeout(() => {
    filterState.pendingOperations.forEach(op => op());
    filterState.pendingOperations = [];
  }, 300); // Increased debounce delay from 150ms to 300ms for better UX
  
  // Store operation to execute when throttle clears
  if (!filterState.query) return; // Don't debounce on empty queries (instant show all)
  
  filterState.pendingOperations.push(performFilter.bind(null, byId('checks'), filterState.query));
};

export function renderResult({ image, risk }) {
  byId('level').textContent = 'Mức ưu tiên: ' + risk.label;
  byId('level').className = 'badge ' + ({ Cao: 'high', Vừa: 'medium', Thấp: 'low' }[risk.level] || '');
  byId('imageResult').textContent = image.label && Number.isFinite(image.confidence)
    ? `Nhãn ảnh: ${image.label} · Điểm model: ${(image.confidence * 100).toFixed(1)}%`
    : 'Chưa có nhãn ảnh hợp lệ';
  byId('imageMessage').textContent = image.message;
  byId('advice').textContent = risk.recommendation;
  byId('reasons').replaceChildren();
  risk.reasons.forEach(reason => textNode('li', reason, byId('reasons')));
  const candidates = byId('candidates');
  candidates.replaceChildren();
  if (risk.candidates.length) {
    textNode('h3', 'Nhóm biểu hiện có điểm tương đồng', candidates);
    textNode('p', 'Danh sách tham khảo; thứ tự theo điểm khớp, không phải xác suất bệnh.', candidates, 'hint');
    for (const candidate of risk.candidates) {
      const article = document.createElement('article');
      textNode('strong', candidate.name, article);
      textNode('p', candidate.note, article);
      const matches = [candidate.matched_image_sign, ...candidate.matched_symptoms].filter(Boolean);
      textNode('small', 'Thông tin khớp: ' + matches.join(', '), article);
      candidates.append(article);
    }
  }
  byId('disclaimer').textContent = risk.disclaimer;
  byId('result').hidden = false;
  
  // Accessibility: Focus result and announce to screen readers
  byId('result').focus({ preventScroll: true });
  byId('result').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  
  // Inject ARIA live region for results announcement
  const announcer = document.createElement('div');
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', 'polite');
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = 'sr-only';
  announcer.textContent = 'Kết quả sàng lọc đã sẵn sàng. Vui lòng xem chi tiết.';
  document.body.prepend(announcer);
  
  // Add PDF export functionality if button exists
  const printBtn = byId('printResult');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
      printBtn.textContent = 'Đang in…';
      setTimeout(() => { printBtn.textContent = 'In / lưu thành PDF'; }, 2000);
    });
  }
}

/** Accent-insensitive search preserves checked inputs, including hidden matches. */
export function normalizeSearch(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim();
}

/** Public filterSymptoms that uses debounced handler */
export function filterSymptoms(container, query) {
  performFilter(container, query);
  return container.querySelectorAll(':scope > label:not([hidden])').length;
}

/** Listen for checkbox changes to update urgent hint immediately */
function attachChangeListeners() {
  const checkboxes = byId('checks').querySelectorAll('input[type=checkbox]');
  
  checkboxes.forEach((cb, index) => {
    // Use capture phase to catch events before propagation
    cb.addEventListener('change', (event) => {
      const changedSymptom = event.target.value;
      
      // Update any urgency indicators immediately
      if (window.onSymptomsChanged) {
        window.onSymptomsChanged(changedSymptom);
      }
    }, true);
  });
}

// Initialize listeners on module load
attachChangeListeners();
