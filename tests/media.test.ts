import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMediaStore, MAX_FILE_BYTES, parseSharedManifest, validateMedia } from '../src/core/media.ts';
import { mediaSlots, stages } from '../src/content/guide.ts';
const png = () => new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])], 'sample.png', { type: 'image/png' });

test('素材格式检查支持图片、声音、视频，并拒绝伪装格式和超限文件', async () => {
  assert.equal(await validateMedia(png()), 'image');
  assert.equal(await validateMedia(new File(['ID3audio'], 'call.mp3', { type: 'audio/mpeg' })), 'audio');
  assert.equal(await validateMedia(new File([new Uint8Array([0, 0, 0, 20]), 'ftypisom'], 'flight.mp4', { type: 'video/mp4' })), 'video');
  await assert.rejects(() => validateMedia(new File(['<html>'], 'fake.png', { type: 'image/png' })), /内容/);
  await assert.rejects(() => validateMedia(new File(['<svg>'], 'bird.svg', { type: 'image/svg+xml' })), /不接受 SVG/);
  await assert.rejects(() => validateMedia(new File([], 'empty.png', { type: 'image/png' })), /非空/);
  await assert.rejects(() => validateMedia(new Blob([new Uint8Array(MAX_FILE_BYTES + 1)], { type: 'image/png' })), /25 MB/);
});

test('本地素材可持久化、替换、移除，失败上传不覆盖旧素材', async () => {
  const store = createMediaStore();
  await store.save('intro-male', png(), '成鸟', '测试作者');
  const loaded = (await createMediaStore().list()).find(a => a.id === 'intro-male')!;
  assert.equal(loaded.caption, '成鸟');
  assert.equal(loaded.credit, '测试作者');
  assert.equal(loaded.kind, 'image');
  assert.equal(loaded.blob.size, png().size);
  await assert.rejects(() => store.save('intro-male', new File(['bad'], 'bad.png', { type: 'image/png' })));
  assert.equal((await store.list()).find(a => a.id === 'intro-male')!.caption, '成鸟');
  await store.save('intro-male', png(), '替换后的说明');
  assert.equal((await store.list()).filter(a => a.id === 'intro-male').length, 1);
  await store.remove('intro-male');
  assert.equal((await store.list()).some(a => a.id === 'intro-male'), false);
});

test('公开素材清单仅接受已知位置和站内 media 路径', () => {
  const input = {
    'intro-male': { src: 'media/male.png', kind: 'image', caption: '<text>' },
    'intro-female': { src: 'https://example.com/female.png', kind: 'image' },
    'intro-form': { src: 'media/../secret', kind: 'image' },
    'courtship-call': { src: 'media/%2e%2e/secret', kind: 'audio' },
    'unknown': { src: 'media/unknown.png', kind: 'image' },
  };
  const parsed = parseSharedManifest(input, mediaSlots.map(s => s.id));
  assert.deepEqual(Object.keys(parsed), ['intro-male']);
  assert.equal(parsed['intro-male'].caption, '<text>');
  assert.deepEqual(parseSharedManifest(null, []), {});
});

test('每个阶段都有资料和素材位置，全部素材位置唯一且可达', () => {
  assert.equal(stages.length, 8);
  assert.equal(new Set(mediaSlots.map(s => s.id)).size, mediaSlots.length);
  assert.equal(mediaSlots.length, 21);
  for (const stage of stages) {
    assert.ok(stage.fields.length >= 3);
    assert.ok(stage.slots.length >= 2);
    for (const id of stage.slots) assert.ok(mediaSlots.some(slot => slot.id === id));
  }
  assert.match(stages[4].fields.find(f => f.title === '一天喂多少次')!.text, /尚无/);
});
