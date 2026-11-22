/** Small DOM components. API text is always inserted as text, never HTML. */
import { t } from './i18n.js';

export const byId = id => document.getElementById(id);

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
    label.append(input);
    textNode('span', symptom.label, label);
    fragment.append(label);
  }
  container.replaceChildren(fragment);
}

/** Accent-insensitive search: only toggles visibility, so checked inputs are never lost. */
export function normalizeSearch(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim();
}

/** Returns how many symptoms remain visible. */
export function filterSymptoms(container, query) {
  const term = normalizeSearch(query);
  let count = 0;
  for (const choice of container.children) {
    const show = !term || normalizeSearch(choice.textContent).includes(term);
    choice.hidden = !show;
    if (show) count++;
  }
  return count;
}

export function renderResult({ image = {}, risk }, { focus = true } = {}) {
  const level = byId('level');
  const levelKey = { Cao: 'lvl.high', Vừa: 'lvl.medium', Thấp: 'lvl.low' }[risk.level];
  level.textContent = t('res.level') + (levelKey ? t(levelKey) : risk.label);
  level.className = 'badge ' + ({ Cao: 'high', Vừa: 'medium', Thấp: 'low' }[risk.level] || '');
  byId('imageResult').textContent = image.label && Number.isFinite(image.confidence)
    ? t('res.imageLabel', { label: image.label, score: (image.confidence * 100).toFixed(1) })
    : t('res.noLabel');
  byId('imageMessage').textContent = image.message || '';
  byId('advice').textContent = risk.recommendation || '';
  byId('reasons').replaceChildren();
  (risk.reasons || []).forEach(reason => textNode('li', reason, byId('reasons')));
  const candidates = byId('candidates');
  candidates.replaceChildren();
  if ((risk.candidates || []).length) {
    textNode('h3', t('res.group'), candidates);
    textNode('p', t('res.groupNote'), candidates, 'hint');
    for (const candidate of risk.candidates) {
      const article = document.createElement('article');
      textNode('strong', candidate.name, article);
      textNode('p', candidate.note, article);
      const matches = [candidate.matched_image_sign, ...(candidate.matched_symptoms || [])].filter(Boolean);
      textNode('small', t('res.matches') + matches.join(', '), article);
      candidates.append(article);
    }
  }
  byId('disclaimer').textContent = risk.disclaimer || '';
  const result = byId('result');
  result.hidden = false;
  if (!focus) return;
  result.focus({ preventScroll: true });
  result.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}