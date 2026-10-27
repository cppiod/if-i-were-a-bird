import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { swift } from '../src/content/swift.ts';
import { advance, choose, createGame, finishFlight } from '../src/core/engine.ts';
import { createSaveStore } from '../src/core/storage.ts';

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
  state = choose(state, species, 'call');
  await store.save(state);
  const restored = await createSaveStore(species).load();
  assert.deepEqual(restored, state);
  assert.throws(() => choose(restored!, species, 'call'));
  state = advance(restored!, species);
  while (!state.completed) {
    const event = species.events[state.cursor];
    // Choose the guaranteed unconditional option for this end-to-end save path.
    state = choose(state, species, event.choices.find(c => !c.requires)!.id);
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
  await rawRecord(species.id, corrupted);
  await assert.rejects(() => store.load(), /不兼容或损坏/);
  assert.deepEqual(await rawRecord(species.id), corrupted);
});

test('IndexedDB：不同鸟种的进度分开保存', async () => {
  const speciesA = { ...swift, id: 'storage-a' };
  const speciesB = { ...swift, id: 'storage-b' };
  const a = createSaveStore(speciesA), b = createSaveStore(speciesB);
  const stateA = choose(createGame(speciesA, 10), speciesA, 'call');
  const stateB = createGame(speciesB, 20);
  await a.save(stateA);
  await b.save(stateB);
  assert.deepEqual(await a.load(), stateA);
  assert.deepEqual(await b.load(), stateB);
});
