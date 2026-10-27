import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { swift } from '../src/content/swift.ts';
import { advance, choose, createGame, finishFlight, retry, submitPlan } from '../src/core/engine.ts';
import { createSaveStore, saveKey } from '../src/core/storage.ts';

async function rawRecord(key: string, value?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('if-i-were-a-bird', 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('saves', value === undefined ? 'readonly' : 'readwrite');
      const store = tx.objectStore('saves');
      const request = value === undefined ? store.get(key) : store.put(value, key);
      tx.oncomplete = () => { db.close(); resolve(request.result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });
}

test('IndexedDB：空档、选择结果、下一片段与结尾均可恢复', async () => {
  const species = { ...swift, id: 'storage-roundtrip' };
  const store = createSaveStore(species);
  assert.equal(await store.load(), null);
  let state = createGame(species, 7);
  state = choose(state, species, 'observe');
  await store.save(state);
  const restored = await createSaveStore(species).load();
  assert.deepEqual(restored, state);
  assert.throws(() => choose(restored!, species, 'observe'));
  state = advance(restored!, species);
  while (!state.completed) {
    const event = species.events[state.cursor];
    // Choose the guaranteed unconditional option for this end-to-end save path.
    state = event.task ? submitPlan(state, species, Object.fromEntries(event.task.channels.map(c => [c.id, c.min]))) : choose(state, species, event.choices.find(c => !c.requires && !c.failure)!.id);
    if (state.pending?.flight) {
      await store.save(state);
      assert.equal((await store.load())?.pending?.flight, state.pending.flight);
      state = finishFlight(state, { insects: 0, gusts: 0, assisted: true });
    }
    state = advance(state, species);
    await store.save(state);
    assert.deepEqual(await store.load(), state);
  }
  assert.equal((await store.load())?.completed, true);
});

test('IndexedDB：损坏档拒绝加载，原记录保持不变', async () => {
  const species = { ...swift, id: 'storage-corruption' };
  const store = createSaveStore(species);
  await store.save(createGame(species));
  const corrupted = { schema: 999, note: 'preserve me' };
  await rawRecord(saveKey(species), corrupted);
  await assert.rejects(() => store.load(), /不兼容或损坏/);
  assert.deepEqual(await rawRecord(saveKey(species)), corrupted);
});

test('IndexedDB：不同鸟种的进度分开保存', async () => {
  const speciesA = { ...swift, id: 'storage-a' };
  const speciesB = { ...swift, id: 'storage-b' };
  const a = createSaveStore(speciesA), b = createSaveStore(speciesB);
  const stateA = choose(createGame(speciesA, 10), speciesA, 'observe');
  const stateB = createGame(speciesB, 20);
  await a.save(stateA);
  await b.save(stateB);
  assert.deepEqual(await a.load(), stateA);
  assert.deepEqual(await b.load(), stateB);
});

test('IndexedDB：八阶段新存档不会覆盖旧版记录', async () => {
  const species = { ...swift, id: 'storage-legacy' };
  const store = createSaveStore(species);
  await store.load();
  const old = { schema: 1, contentVersion: '0.1.0', marker: 'keep old save' };
  await rawRecord(species.id, old);
  assert.equal(await store.hasLegacy(), true);
  assert.equal(await store.load(), null);
  const fresh = createGame(species);
  await store.save(fresh);
  assert.deepEqual(await rawRecord(species.id), old);
  assert.deepEqual(await store.load(), fresh);
});

test('IndexedDB：失败状态刷新后仍需重试，不能跳过任务', async () => {
  const species = { ...swift, id: 'storage-failure' };
  let state = createGame(species);
  while (species.events[state.cursor].id !== 'nest-site') state = advance(choose(state, species, species.events[state.cursor].choices[0].id), species);
  state = choose(state, species, 'sealed');
  const store = createSaveStore(species);
  await store.save(state);
  const loaded = await store.load();
  assert.ok(loaded?.pending?.failure);
  assert.throws(() => advance(loaded!, species));
  const resumed = retry(loaded!);
  await store.save(resumed);
  assert.equal((await store.load())?.attempts.length, 1);
  assert.equal((await store.load())?.pending, null);
});
