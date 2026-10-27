import { validateSave } from './engine.ts';
import type { GameState, Species } from './types.ts';

export const saveKey = (species: Species) => `${species.id}:v2`;
export interface SaveStore { load: () => Promise<GameState | null>; save: (state: GameState) => Promise<void>; hasLegacy: () => Promise<boolean> }
export function createSaveStore(species: Species): SaveStore {
  let connection: Promise<IDBDatabase> | undefined;
  const open = () => connection ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('if-i-were-a-bird', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('saves');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error('浏览器无法打开本地存档。'));
    req.onblocked = () => reject(new Error('请关闭其他旧版本页面后重试。'));
  });
  const run = async (write: boolean, state?: GameState, key = saveKey(species)): Promise<unknown> => {
    const db = await open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('saves', write ? 'readwrite' : 'readonly');
      const store = transaction.objectStore('saves');
      const req = write ? store.put(state, key) : store.get(key);
      transaction.oncomplete = () => resolve(req.result);
      transaction.onerror = () => reject(new Error('本地存档失败，请检查浏览器的存储权限。'));
      transaction.onabort = () => reject(new Error('存档写入被中断，尚未保存。'));
    });
  };
  return {
    async load() {
      const value = await run(false);
      if (value === undefined) return null;
      if (!validateSave(value, species)) throw new Error('发现不兼容或损坏的存档，已保留原记录。开始新的鸟生会覆盖它。');
      return value;
    },
    async save(state) { await run(true, structuredClone(state)); },
    async hasLegacy() { return (await run(false, undefined, species.id)) !== undefined; },
  };
}
