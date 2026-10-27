import { createMediaStore, MEDIA_ACCEPT, parseSharedManifest } from '../core/media.ts';
import type { MediaAsset, SharedAsset } from '../core/media.ts';
import { mediaSlots } from '../content/guide.ts';

const store = createMediaStore();
const urls = new WeakMap<HTMLElement, string[]>();
const generations = new WeakMap<HTMLElement, number>();
let shared: Promise<Record<string, SharedAsset>> | undefined;
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
function loadShared() {
  return shared ??= fetch(new URL('media/manifest.json', document.baseURI)).then(r => {
    if (!r.ok) throw new Error('共享素材清单读取失败');
    return r.json();
  }).then(value => parseSharedManifest(value, mediaSlots.map(s => s.id))).catch((): Record<string, SharedAsset> => ({}));
}
export function clearMedia(container: HTMLElement) {
  container.querySelectorAll<HTMLMediaElement>('audio, video').forEach(media => media.pause());
  urls.get(container)?.forEach(url => URL.revokeObjectURL(url));
  urls.delete(container);
  generations.set(container, (generations.get(container) ?? 0) + 1);
}
export async function renderMedia(container: HTMLElement, ids: string[]) {
  clearMedia(container);
  const generation = generations.get(container)!;
  container.innerHTML = '<p class="media-notice">正在打开素材位置…</p>';
  const [localResult, publicAssets] = await Promise.all([store.list().then(items => ({ items, error: '' })).catch(() => ({ items: [] as MediaAsset[], error: '本机素材库不可用；仍可查看公开素材。' })), loadShared()]);
  if (generation !== generations.get(container) || !container.isConnected) return;
  const objectUrls: string[] = [];
  const slots = ids.map(id => mediaSlots.find(s => s.id === id)).filter(s => s !== undefined);
  container.innerHTML = `${localResult.error ? `<p class="media-notice">${localResult.error}</p>` : ''}<div class="media-grid">${slots.map(slot => {
    const local = localResult.items.find(a => a.id === slot.id), asset = local ?? publicAssets[slot.id];
    const src = local ? URL.createObjectURL(local.blob) : asset && 'src' in asset ? new URL(asset.src, document.baseURI).href : '';
    if (local) objectUrls.push(src);
    const label = escape(slot.title);
    const preview = !asset ? `<div class="media-empty"><span>＋</span><strong>${label}</strong><small>留白 · 等待图片 / 声音 / 视频</small></div>` : asset.kind === 'image' ? `<img src="${escape(src)}" alt="${escape(asset.caption || slot.title)}" loading="lazy">` : asset.kind === 'audio' ? `<div class="audio-preview"><span>声 音</span><audio src="${escape(src)}" controls preload="metadata"></audio></div>` : `<video src="${escape(src)}" aria-label="${label}" controls preload="metadata" playsinline></video>`;
    return `<article class="media-card" data-slot="${slot.id}"><div class="media-preview">${preview}</div><div class="media-card-body"><h4>${label}</h4><p>${escape(slot.brief)}</p>${asset ? `<p class="asset-caption">${escape(asset.caption || '')}${asset.credit ? ` · ${escape(asset.credit)}` : ''}</p><small class="asset-origin">${local ? '本机素材 · 不会自动公开' : '随网站发布的素材'}</small>` : ''}<details><summary>上传说明与署名</summary><label>说明<input class="asset-description" maxlength="300" value="${escape(asset?.caption || '')}" placeholder="拍摄日期、实际日龄、行为情境"></label><label>作者 / 来源 / 授权<input class="asset-credit" maxlength="300" value="${escape(asset?.credit || '')}" placeholder="填写素材来源及使用许可"></label></details><div class="media-actions"><label class="upload-label">${asset ? '替换素材' : '上传素材'}<input type="file" accept="${MEDIA_ACCEPT}" aria-label="上传${label}素材"></label>${local ? '<button class="remove-media" type="button">移除本机素材</button>' : ''}</div><p class="media-status" role="status"></p></div></article>`;
  }).join('')}</div><p class="media-notice">上传保存在当前浏览器，仅你可见。单文件 ≤25 MB、总量 ≤100 MB。清除网站数据会移除本机素材；公开发布方式见仓库 docs/MEDIA.md。</p>`;
  urls.set(container, objectUrls);
  container.querySelectorAll<HTMLElement>('.media-card').forEach(card => {
    const status = card.querySelector<HTMLElement>('.media-status')!;
    const input = card.querySelector<HTMLInputElement>('input[type=file]')!;
    input.addEventListener('change', async () => {
      const file = input.files?.[0]; if (!file) return;
      input.disabled = true; status.textContent = '正在检查并保存素材…';
      try {
        await store.save(card.dataset.slot!, file, card.querySelector<HTMLInputElement>('.asset-description')!.value, card.querySelector<HTMLInputElement>('.asset-credit')!.value);
        await renderMedia(container, ids);
      } catch (error) { status.textContent = error instanceof Error ? error.message : '上传失败。'; input.disabled = false; input.value = ''; }
    });
    card.querySelector('.remove-media')?.addEventListener('click', async () => {
      try { await store.remove(card.dataset.slot!); await renderMedia(container, ids); }
      catch (error) { status.textContent = error instanceof Error ? error.message : '移除失败。'; }
    });
    card.querySelectorAll('img, audio, video').forEach(media => media.addEventListener('error', () => { status.textContent = '素材未能显示或播放，请检查文件编码、格式和发布路径。'; }));
  });
}
