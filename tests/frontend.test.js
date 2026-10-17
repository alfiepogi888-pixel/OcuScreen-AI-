import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateFile, hasUrgentSymptoms, MAX_BYTES } from '../frontend/js/validation.js';
import { requestJSON } from '../frontend/js/api.js';
const kb = JSON.parse(readFileSync(new URL('../data/disease_knowledge.json', import.meta.url)));

test('upload validation rejects unsupported, empty and oversized images', () => {
  assert.equal(validateFile({ size: MAX_BYTES, type: 'image/png' }), null);
  for (const file of [null, {size: 0}, {size: MAX_BYTES + 1}, {size: 20, type: 'text/html'}]) {
    assert.ok(validateFile(file));
  }
});
test('pre-inference warnings match image-independent knowledge rules', () => {
  const warn = ids => hasUrgentSymptoms(ids, kb.urgent_symptoms, kb.urgent_combinations);
  assert.equal(warn([]), false);
  assert.equal(warn(['itch']), false);
  assert.equal(warn(['contacts']), false);
  for (const ids of [['vision_loss'], ['contacts', 'red_eye'], ['fever', 'pain_movement'], ['yellow_skin'], ['bulging']]) {
    assert.equal(warn(ids), true);
  }
});
test('API retains symptom-only 503 results and handles non-JSON failures', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ risk: { level: 'Cao' } }), {status: 503});
    assert.equal((await requestJSON('/api/screen')).data.risk.level, 'Cao');
    globalThis.fetch = async () => new Response('<html>Bad gateway</html>', {status: 502});
    await assert.rejects(requestJSON('/api/screen'), /Vui lòng thử lại/);
  } finally { globalThis.fetch = original; }
});

test('Vietnamese symptom search ignores accents and preserves choices', async () => {
  const { filterSymptoms } = await import('../frontend/js/components.js');
  const choices = [{textContent: 'Đỏ mắt', checked: true}, {textContent: 'Ngứa mắt'}];
  assert.equal(filterSymptoms({children: choices}, 'do mat'), 1);
  assert.equal(choices[0].hidden, false);
  assert.equal(choices[1].hidden, true);
  assert.equal(choices[0].checked, true);
  assert.equal(filterSymptoms({children: choices}, ''), 2);
});

test('upload synchronizes native files, releases previews and preserves cancellation', async () => {
  const { createUpload } = await import('../frontend/js/upload.js');
  const original = { window: globalThis.window, transfer: globalThis.DataTransfer,
    create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  const element = () => Object.assign(new EventTarget(), {
    value: '', files: [], hidden: true, textContent: '',
    classList: {remove() {}, toggle() {}}, removeAttribute() {},
  });
  const input = element(), dropzone = element(), preview = element(), meta = element();
  let chosen, error, busy = false;
  const revoked = [];
  try {
    globalThis.window = new EventTarget();
    globalThis.DataTransfer = class { constructor() { this.files=[]; this.items={add: f=>this.files.push(f)}; } };
    URL.createObjectURL = file => `blob:${file.name}`;
    URL.revokeObjectURL = url => revoked.push(url);
    const upload = createUpload({input, dropzone, preview, meta, isBusy:()=>busy,
      onChange:f=>{chosen=f;}, onError:m=>{error=m;}});
    const first={name:'first.png',type:'image/png',size:100};
    input.files=[first];input.dispatchEvent(new Event('change'));
    assert.equal(chosen,first);
    input.files=[];input.dispatchEvent(new Event('change'));
    assert.equal(input.files[0],first);
    const second={...first,name:'second.png'};
    const drop=new Event('drop');drop.dataTransfer={files:[second,first]};
    dropzone.dispatchEvent(drop);
    assert.deepEqual(input.files,[second]);
    assert.deepEqual(revoked,['blob:first.png']);
    busy=true;input.dispatchEvent(new Event('change'));
    assert.equal(chosen,second);
    busy=false;
    preview.dispatchEvent(new Event('error'));
    assert.equal(chosen,null);
    assert.match(error,/Không đọc được ảnh/);
    assert.deepEqual(revoked,['blob:first.png','blob:second.png']);
    upload.clear();
    assert.equal(preview.hidden,true);
  } finally {
    globalThis.window=original.window;globalThis.DataTransfer=original.transfer;
    URL.createObjectURL=original.create;URL.revokeObjectURL=original.revoke;
  }
});
