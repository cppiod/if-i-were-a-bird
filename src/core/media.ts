export type MediaKind = 'image' | 'audio' | 'video';
export interface MediaAsset { id: string; blob: Blob; kind: MediaKind; name: string; caption: string; credit: string }
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_LIBRARY_BYTES = 100 * 1024 * 1024;
const types: Record<string, MediaKind> = {
  'image/png': 'image', 'image/jpeg': 'image', 'image/webp': 'image', 'image/gif': 'image',
  'audio/mpeg': 'audio', 'audio/wav': 'audio', 'audio/x-wav': 'audio', 'audio/ogg': 'audio', 'audio/mp4': 'audio',
  'video/mp4': 'video', 'video/webm': 'video', 'audio/webm': 'audio', 'video/ogg': 'video',
};
export const MEDIA_ACCEPT = Object.keys(types).join(',');
export async function validateMedia(file: Blob): Promise<MediaKind> {
  if (file.size === 0 || file.size > MAX_FILE_BYTES) throw new Error('请选择非空且不超过 25 MB 的素材。');
  const kind = types[file.type];
  if (!kind) throw new Error('支持 PNG/JPEG/WebP/GIF、MP3/WAV/OGG/M4A、MP4/WebM；不接受 SVG 或网页文件。');
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const ascii = (at: number, value: string) => [...value].every((char, i) => bytes[at + i] === char.charCodeAt(0));
  const signatures: Record<string, boolean> = {
    'image/png': bytes[0] === 137 && ascii(1, 'PNG\r\n\x1a\n'),
    'image/jpeg': bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    'image/webp': ascii(0, 'RIFF') && ascii(8, 'WEBP'),
    'image/gif': ascii(0, 'GIF87a') || ascii(0, 'GIF89a'),
    'audio/mpeg': ascii(0, 'ID3') || (bytes[0] === 255 && (bytes[1] & 224) === 224),
    'audio/wav': ascii(0, 'RIFF') && ascii(8, 'WAVE'),
    'audio/x-wav': ascii(0, 'RIFF') && ascii(8, 'WAVE'),
    'audio/ogg': ascii(0, 'OggS'), 'video/ogg': ascii(0, 'OggS'),
    'audio/mp4': ascii(4, 'ftyp'), 'video/mp4': ascii(4, 'ftyp'),
    'video/webm': bytes[0] === 26 && bytes[1] === 69 && bytes[2] === 223 && bytes[3] === 163,
    'audio/webm': bytes[0] === 26 && bytes[1] === 69 && bytes[2] === 223 && bytes[3] === 163,
  };
  if (!signatures[file.type]) throw new Error('文件内容与所选媒体格式不符，请检查文件。');
  return kind;
}
export function createMediaStore() {
  let connection: Promise<IDBDatabase> | undefined;
  const open = () => connection ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open('if-i-were-a-bird-media', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('assets', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error('无法打开素材库，请检查浏览器存储权限。'));
    req.onblocked = () => reject(new Error('请关闭其他旧页面后重试素材库。'));
  });
  return {
    async list(): Promise<MediaAsset[]> {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('assets', 'readonly'), req = tx.objectStore('assets').getAll();
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(new Error('读取素材库失败。'));
        tx.onabort = () => reject(new Error('读取素材库被中断。'));
      });
    },
    async save(id: string, file: File, caption = '', credit = '') {
      if (!/^[a-z0-9-]{1,80}$/.test(id)) throw new Error('无效的素材位置。');
      const kind = await validateMedia(file), db = await open();
      const asset: MediaAsset = { id, blob: file, kind, name: file.name.slice(0, 200), caption: caption.slice(0, 300), credit: credit.slice(0, 300) };
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('assets', 'readwrite'), store = tx.objectStore('assets'), req = store.getAll();
        req.onsuccess = () => {
          const size = (req.result as MediaAsset[]).filter(a => a.id !== id).reduce((sum, a) => sum + a.blob.size, 0) + file.size;
          if (size > MAX_LIBRARY_BYTES) { reject(new Error('本机素材库上限为 100 MB，请先移除部分素材。')); tx.abort(); return; }
          store.put(asset);
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new Error('保存素材失败，可能是浏览器空间或权限不足。'));
        tx.onabort = () => reject(new Error('素材保存未完成。'));
      });
    },
    async remove(id: string) {
      const db = await open();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('assets', 'readwrite');
        tx.objectStore('assets').delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(new Error('移除素材失败。'));
        tx.onabort = () => reject(new Error('移除素材被中断。'));
      });
    },
  };
}

export interface SharedAsset { src: string; kind: MediaKind; caption?: string; credit?: string }
export function parseSharedManifest(value: unknown, validSlots: string[]): Record<string, SharedAsset> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, SharedAsset> = {};
  for (const [id, entry] of Object.entries(value)) {
    if (!validSlots.includes(id) || !entry || typeof entry !== 'object') continue;
    const asset = entry as SharedAsset;
    if (!['image', 'audio', 'video'].includes(asset.kind) || typeof asset.src !== 'string' ||
      !asset.src.startsWith('media/') || /\.\.|[\\%?#:]/.test(asset.src)) continue;
    if (asset.caption !== undefined && typeof asset.caption !== 'string') continue;
    if (asset.credit !== undefined && typeof asset.credit !== 'string') continue;
    result[id] = { src: asset.src, kind: asset.kind, caption: asset.caption?.slice(0, 300), credit: asset.credit?.slice(0, 300) };
  }
  return result;
}
