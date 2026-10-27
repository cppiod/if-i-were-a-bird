import './style.css';
import './lifecycle.css';
import { swift } from './content/swift.ts';
import { advance, choose, createGame, finishFlight, meets, retry, submitPlan, validateSpecies } from './core/engine.ts';
import { createSaveStore } from './core/storage.ts';
import type { GameState } from './core/types.ts';
import type { SkyControl } from './game/sky.ts';
import { sources, stages, mediaSlots } from './content/guide.ts';
import { renderMedia, clearMedia } from './ui/media.ts';

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const birdIcon = `<svg viewBox="0 0 90 55" fill="currentColor" aria-hidden="true"><path d="M85 21 56 19 15 1 32 22 4 38 35 31 48 50 47 29 64 30Z"/></svg>`;
const issues = validateSpecies(swift);
if (issues.length) throw new Error(issues.join('\n'));
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#" aria-label="若我为鸟 首页">${birdIcon}<span>若我为鸟<small>IF I WERE A BIRD</small></span></a>
    <nav aria-label="游戏工具"><button data-tool="guide">阶段指南</button><button data-tool="media">素材馆 <span>＋</span></button><button data-tool="map">迁徙手记</button><button data-tool="journal">鸟生回忆</button><button data-tool="settings" aria-label="打开设置">设置 <span>☷</span></button></nav>
  </header>
  <main>
    <div class="edition"><span>北京雨燕 · 一个繁殖与迁徙周期</span><span>八阶段探索 / 0.2.0</span></div>
    <section class="experience" aria-label="鸟生体验">
      <div class="landscape">
        <div id="sky" role="img" aria-label="北京屋檐与天空的程序插画"></div>
        <div id="stage-media" class="stage-media" aria-label="本阶段形态与行为素材"></div>
        <div class="scene-top"><span id="scene-location">北京 · 一处旧屋檐</span><span id="scene-season">初夏 / 风起时</span></div>
        <div id="scene-caption" class="scene-caption"><span class="eyebrow">一处屋檐，通向整个世界</span><h1>如果，<br>你是一只鸟。</h1><p>从第一道光，到万里之外的天空。</p></div>
        <div class="scene-bottom"><span>真实形态与声音等待你的素材</span><span>APUS APUS PEKINENSIS</span></div>
        <div id="flight-overlay" hidden><span id="flight-readout" role="status">飞行准备中</span><div><button id="pause-flight">暂停</button><button id="assist-flight">辅助完成这一段</button></div></div>
      </div>
      <section id="story" class="story" aria-label="故事与行动"></section>
    </section>
    <div id="save-message" class="save-message" role="status" aria-live="polite">正在读取本地进度…</div>
    <section class="journey" aria-label="生命章节"><div class="journey-label"><span>八阶段探索</span><small>EXPLORE</small></div><ol id="chapter-list"></ol></section>
    <section id="stage-summary" class="stage-summary" aria-label="阶段玩法说明"></section>
    <footer><span>天空很大，而每一处家都很小。</span><span>独立开发中的自然叙事游戏 · 无账号 · 本地存档</span></footer>
  </main>
  <dialog id="modal"><div class="dialog-head"><span id="dialog-kicker">野外手记</span><button id="close-modal" aria-label="关闭窗口">×</button></div><div id="modal-content"></div></dialog>
`;
const story = document.querySelector<HTMLElement>('#story')!;
const saveMessage = document.querySelector<HTMLElement>('#save-message')!;
const modal = document.querySelector<HTMLDialogElement>('#modal')!;
const store = createSaveStore(swift);
let state: GameState | null = null;
let saved: GameState | null = null;
let busy = false, loading = true, isFlying = false, flightPaused = false;
let reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let sky: SkyControl | undefined;
let skyReady = false;
let loadError = '';
let legacyNote = '';
let mediaStage = -1;

function notify(text: string, warning = false) {
  saveMessage.textContent = text;
  saveMessage.classList.toggle('warning', warning);
}
async function persist(next: GameState) {
  state = next;
  busy = true;
  render();
  notify('正在保存这段记忆…');
  try {
    await store.save(next); saved = structuredClone(next);
    notify('● 进度已保存在此浏览器 · 刷新后可继续');
  } catch (error) {
    notify(`${error instanceof Error ? error.message : '保存失败。'} 当前可以继续，但刷新可能丢失进度。`, true);
  } finally {
    busy = false; render();
    const heading = story.querySelector<HTMLElement>('h2');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
  }
}
function render() {
  const event = state ? swift.events[state.cursor] : null;
  const chapter = event?.chapter ?? -1;
  document.querySelector('#chapter-list')!.innerHTML = swift.chapters.map((name, i) =>
    `<li class="${i === chapter ? 'current' : i < chapter || state?.completed ? 'visited' : ''}" ${i === chapter ? 'aria-current="step"' : ''}><button data-stage="${i}"><span>${String(i).padStart(2, '0')}</span>${name}</button></li>`).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(button => button.addEventListener('click', () => showGuide(Number(button.dataset.stage))));
  const stageIndex = Math.max(0, chapter), stage = stages[stageIndex];
  document.querySelector('#stage-summary')!.innerHTML = `<div><span class="eyebrow">${stage.perspective}</span><h3>${stage.name} · ${stage.subtitle}</h3><p>${stage.mechanic}</p></div><button id="open-stage-guide" class="secondary">时间、习性与资料 ↗</button>`;
  document.querySelector('#open-stage-guide')!.addEventListener('click', () => showGuide(stageIndex));
  const mediaContainer = document.querySelector<HTMLElement>('#stage-media')!;
  mediaContainer.hidden = isFlying;
  if (isFlying) mediaContainer.querySelectorAll<HTMLMediaElement>('audio, video').forEach(media => media.pause());
  document.querySelector<HTMLElement>('#sky')!.hidden = !isFlying;
  if (mediaStage !== stageIndex) { mediaStage = stageIndex; void renderMedia(mediaContainer, stage.slots.slice(0, 2)); }
  const caption = document.querySelector<HTMLElement>('#scene-caption')!;
  caption.hidden = true;
  document.querySelector('#scene-location')!.textContent = event?.location ?? '北京 · 一处旧屋檐';
  document.querySelector('#scene-season')!.textContent = event ? `${event.season} / ${event.ageLabel}` : '初夏 / 风起时';
  const landscape = event?.landscape ?? 'city';
  const sceneElement = document.querySelector<HTMLElement>('.landscape')!;
  sceneElement.dataset.scene = landscape;
  sceneElement.dataset.night = String(event?.id === 'night-air');
  sky?.setLandscape(landscape, event?.id === 'night-air');
  document.querySelector('#sky')!.setAttribute('aria-label', `程序插画：${event?.location ?? '北京天空'}${isFlying ? '，飞行互动中' : ''}`);
  const flightOverlay = document.querySelector<HTMLElement>('#flight-overlay')!;
  flightOverlay.hidden = !isFlying;
  document.querySelector('.scene-bottom span')!.textContent = isFlying ? '互动符号示意 · 不作为形态标本' : '真实形态与声音等待你的素材';
  if (!state) {
    story.innerHTML = `<div class="intro"><div class="eyebrow"><i></i> IF I WERE A BIRD</div><h2>一次繁殖，<br>一场万里归途。</h2><p class="lead">先认识北京雨燕，再进入七个生命阶段。<br>为伴侣回应，为巢位判断，为幼鸟投入，<br>也为下一次回家保留可能。</p><div class="intro-actions"><button id="new-game" class="primary" ${loading || busy ? 'disabled' : ''}>${saved ? '开始新的周期' : '从介绍开始探索'} <span>↗</span></button>${saved ? '<button id="resume-game" class="secondary">继续当前周期 →</button>' : ''}<button id="intro-guide" class="text-button">先看雌雄、体态、食物链与艺术表现 ↗</button></div><div class="intro-note"><span>八阶段 · 有线索、有失败、可重试</span><p>以成年鸟为主，飞行阶段切换幼鸟视角。<br>真实形态、录音与录像先留白，等待你上传。</p></div>${legacyNote ? `<p class="fine-print">${legacyNote}</p>` : ''}${loadError ? `<p class="inline-warning">${escape(loadError)}</p>` : ''}</div>`;
    document.querySelector('#new-game')!.addEventListener('click', () => saved || loadError ? confirmRestart() : void persist(createGame(swift)));
    document.querySelector('#resume-game')?.addEventListener('click', () => { state = structuredClone(saved); notify('已恢复上次保存的进度。'); render(); });
    document.querySelector('#intro-guide')!.addEventListener('click', () => showGuide(0));
    return;
  }
  if (state.completed) {
    story.innerHTML = `<div class="ending"><div class="eyebrow">一个繁殖与迁徙周期 · 已完成</div><h2>回来了，<br>还要有一处家。</h2><p class="lead">你经历配对与育雏，感受年轻翅膀的初飞，<br>又切回成鸟，走过南迁与北返。</p><div class="ending-numbers"><div><strong>${state.facts.length}</strong><span>个阶段的手记</span></div><div><strong>${state.attempts.length}</strong><span>次失败后的调整</span></div></div><p class="ending-detail">旧入口已经封堵，你选择寻找替代巢位。鸟的记忆与能力之外，人的做法也影响下一季能否继续。</p><button class="primary" id="ending-journal">回顾选择与调整 <span>↗</span></button><button class="text-button" id="restart">再探索一个周期</button><p class="fine-print">身体数值、投入块与失败规则用于教学，不是野外成功率。待补资料与素材仍可继续完善。</p></div>`;
    document.querySelector('#ending-journal')!.addEventListener('click', () => showJournal());
    document.querySelector('#restart')!.addEventListener('click', confirmRestart);
    return;
  }
  const s = state;
  const metrics = `<div class="vitals"><div><span>能量 <b>${s.energy}</b></span><meter min="0" max="100" value="${s.energy}" aria-label="能量 ${s.energy}"></meter></div><div><span>身体 <b>${s.health}</b></span><meter min="0" max="100" value="${s.health}" aria-label="身体状况 ${s.health}"></meter></div></div>`;
  const marker = `<div class="chapter-marker"><span>${chapter === 0 ? '序 · 介绍' : `第 ${chapter} 阶段 · ${swift.chapters[chapter]}`}</span><span>${String(s.cursor + 1).padStart(2, '0')} / ${swift.events.length}</span></div><div class="perspective">视角：${escape(event!.perspective || stage.perspective)}</div>`;
  if (isFlying) {
    story.innerHTML = `${marker}<div class="event-copy"><span class="eyebrow">把身体交给天空</span><h2>${event!.title}</h2><p>用 ↑ ↓ 调整高度，或按住画面移动。靠近金色虫群，避开白色乱流。</p><p>飞行持续 30 秒。你可以随时暂停，也可以选择辅助完成，继续故事。</p><div class="flight-legend"><span>✦ 金色光点 · 虫群</span><span>≋ 白色环线 · 乱流</span></div></div>${metrics}<p class="fine-print">切换页面或打开手记时自动暂停，返回后需手动继续。</p>`;
    return;
  }
  if (s.pending?.failure) {
    const failure = s.pending.failure;
    story.innerHTML = `${marker}<div class="failure-panel"><span class="eyebrow">当前任务失败 · 先调整，再继续</span><h2>${escape(failure.title)}</h2><p>${escape(failure.reason)}</p><div class="failure-lesson"><strong>从这次经历学到</strong><p>${escape(failure.lesson)}</p></div></div>${metrics}<button id="retry-task" class="primary" ${busy ? 'disabled' : ''}>重新尝试当前任务 <span>↺</span></button><button id="failure-guide" class="text-button">查看本阶段资料 ↗</button>`;
    document.querySelector('#retry-task')!.addEventListener('click', () => { if (!busy) void persist(retry(state!)); });
    document.querySelector('#failure-guide')!.addEventListener('click', () => showGuide(chapter));
    return;
  }
  if (s.pending) {
    const delta = (name: string, value: number) => value === 0 ? '' : `<span>${name} ${value > 0 ? '+' : ''}${value}</span>`;
    story.innerHTML = `${marker}<div class="event-copy result-copy"><span class="eyebrow">这一刻的回响</span><h2>${event!.title}</h2><p>${escape(s.pending.result)}</p><div class="deltas">${delta('能量', s.pending.energyDelta)}${delta('身体', s.pending.healthDelta)}</div></div>${metrics}<div class="choices"><button id="next" class="primary" ${busy || (s.pending.flight && !skyReady) ? 'disabled' : ''}>${s.pending.flight ? skyReady ? '进入这片天空' : '正在准备天空…' : s.cursor === swift.events.length - 1 ? '收起这段鸟生' : '继续这段旅程'} <span>→</span></button>${event!.fact ? '<button id="fact-link" class="text-button">+ 看看这段经历背后的自然</button>' : ''}</div>`;
    document.querySelector('#next')!.addEventListener('click', () => { if (busy) return; if (state?.pending?.flight) startFlight(); else void persist(advance(state!, swift)); });
    document.querySelector('#fact-link')?.addEventListener('click', () => showJournal());
  } else {
    story.innerHTML = `${marker}<div class="event-copy"><span class="eyebrow">${event!.ageLabel}</span><h2>${event!.title}</h2>${event!.paragraphs.map(p => `<p>${escape(p)}</p>`).join('')}</div>${metrics}<div class="choices">${event!.task ? `<form id="allocation-form"><div class="allocation-head">共同投入预算 <b>${event!.task.budget} 块</b></div>${event!.task.channels.map(channel => `<label class="allocation-row"><span>${channel.label}<small>${channel.hint}</small></span><input type="number" name="${channel.id}" min="0" max="${event!.task!.budget}" step="1" value="0" aria-label="${channel.label}投入块"></label>`).join('')}<p id="allocation-total" class="allocation-total">已分配 0 / ${event!.task.budget} 块</p><p class="fine-print">抽象的共同投入，不是小时、轮换或喂食次数。</p><p id="plan-error" class="inline-warning" role="alert"></p><button type="submit" class="primary" ${busy ? 'disabled' : ''}>执行这个方案 <span>→</span></button></form>` : event!.choices.map((choice, i) => `<button class="choice ${event!.interaction === 'nest-site' ? 'site-choice' : ''}" data-choice="${choice.id}" ${busy || !meets(s, choice.requires) ? 'disabled' : ''}><span class="choice-number">${String(i + 1).padStart(2, '0')}</span><span><strong>${choice.title}</strong><small>${!meets(s, choice.requires) ? '当前条件不足' : choice.hint}</small>${choice.details ? `<span class="choice-details">${choice.details.map(d => `<span>${escape(d)}</span>`).join('')}</span>` : ''}</span><span class="choice-arrow">↗</span></button>`).join('')}</div>`;
    story.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(button => button.addEventListener('click', () => {
      if (!busy) void persist(choose(state!, swift, button.dataset.choice!));
    }));
    const form = document.querySelector<HTMLFormElement>('#allocation-form');
    if (form) {
      const allocation = () => Object.fromEntries(event!.task!.channels.map(channel => [channel.id, Number(form.querySelector<HTMLInputElement>(`[name="${channel.id}"]`)!.value)]));
      form.addEventListener('input', () => { document.querySelector('#allocation-total')!.textContent = `已分配 ${Object.values(allocation()).reduce((sum, value) => sum + value, 0)} / ${event!.task!.budget} 块`; });
      form.addEventListener('submit', event => {
        event.preventDefault(); if (busy) return;
        try { void persist(submitPlan(state!, swift, allocation())); }
        catch (error) { document.querySelector('#plan-error')!.textContent = error instanceof Error ? error.message : '请检查投入方案。'; }
      });
    }
  }
}
function startFlight() {
  if (!sky || !state?.pending?.flight) return;
  isFlying = true; flightPaused = false;
  document.querySelector('#pause-flight')!.textContent = '暂停';
  render();
  sky.beginFlight(state.pending.flight, state.randomSeed + state.cursor, result => {
    isFlying = false; flightPaused = false;
    sky?.pause(true);
    void persist(finishFlight(state!, result));
  });
}
function pauseFlight() {
  if (isFlying) {
    flightPaused = true; sky?.pause(true);
    document.querySelector('#pause-flight')!.textContent = '继续飞行';
  }
}
function openModal(title: string, html: string) {
  pauseFlight();
  modal.querySelectorAll<HTMLElement>('[data-media-container]').forEach(clearMedia);
  document.querySelector('#dialog-kicker')!.textContent = title;
  document.querySelector('#modal-content')!.innerHTML = html;
  if (!modal.open) modal.showModal();
}
function guideFields(chapter: number) {
  return stages[chapter].fields.map(field => {
    const source = sources.find(s => s.id === field.source);
    return `<article class="guide-field ${field.pending ? 'pending-field' : ''}"><h3>${field.title}${field.pending ? '<span>待补资料</span>' : ''}</h3><p>${field.text}</p>${source ? `<a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.title} ↗</a><small>${source.scope}</small>` : ''}</article>`;
  }).join('');
}
function showGuide(chapter: number) {
  const stage = stages[chapter];
  openModal(`阶段 ${String(chapter).padStart(2, '0')} / ${stage.name}`, `<h2>${stage.name} · ${stage.subtitle}</h2><p class="dialog-intro">${stage.season} / 视角：${stage.perspective}</p><div class="mechanic-note"><strong>这一阶段怎样玩</strong><p>${stage.mechanic}</p></div><div class="guide-fields">${guideFields(chapter)}</div><h3 class="memory-heading">本阶段素材位置</h3><div id="guide-assets" data-media-container></div>`);
  void renderMedia(document.querySelector<HTMLElement>('#guide-assets')!, stage.slots);
}
function showMediaLibrary() {
  openModal('素材馆 / YOUR FIELD MATERIALS', `<h2>把真实的鸟，放进故事。</h2><p class="dialog-intro">共 ${mediaSlots.length} 个位置，支持图片、声音、视频。这里上传只保存在当前浏览器，不会提交 GitHub，也不会改变其他玩家看到的内容。</p><label class="media-filter">选择阶段<select id="media-stage-filter">${stages.map((stage, i) => `<option value="${i}">${String(i).padStart(2, '0')} · ${stage.name}</option>`).join('')}</select></label><p class="boundary">先展开卡片中的“上传说明与署名”，填写情境与来源，再选择文件。图片不自动证明性别、日龄或行为；作品需有相应使用许可。</p><div id="library-assets" data-media-container></div>`);
  const target = document.querySelector<HTMLElement>('#library-assets')!;
  const refresh = (stage: number) => { mediaStage = -1; void renderMedia(target, stages[stage].slots); };
  refresh(0);
  document.querySelector('#media-stage-filter')!.addEventListener('change', event => refresh(Number((event.target as HTMLSelectElement).value)));
}
function showJournal() {
  const s = state ?? saved;
  const unlocked = swift.facts.filter(f => s?.facts.includes(f.id));
  openModal('鸟生回忆 / FIELD NOTES', `<h2>选择，也包括调整。</h2><p class="dialog-intro">阶段资料始终可查，手记随经历解锁。失败保留为学习记录，重试不会重复扣数值。</p><div class="fact-list">${unlocked.length ? unlocked.map(f => `<article><span class="eyebrow">阶段手记</span><h3>${f.title}</h3><p>${f.text}</p><p class="boundary">${f.boundary}</p><a href="${f.source}" target="_blank" rel="noopener noreferrer">${f.sourceLabel} ↗</a></article>`).join('') : '<p class="empty-note">还没有出发，可以先查看各阶段资料。</p>'}</div><h3 class="memory-heading">失败与调整</h3><ol class="memory-list">${s?.attempts.length ? s.attempts.map(a => `<li><strong>${escape(a.failure.title)}</strong><span>${escape(a.choice)}</span><p>${escape(a.failure.reason)}</p><p>${escape(a.failure.lesson)}</p></li>`).join('') : '<li>还没有失败记录。</li>'}</ol><h3 class="memory-heading">经过的片段</h3><ol class="memory-list">${s?.history.length ? s.history.map(h => `<li><small>${escape(h.location)}</small><strong>${escape(h.title)}</strong><span>${escape(h.choice)}</span><p>${escape(h.result)}</p></li>`).join('') : '<li>等待开始。</li>'}</ol>`);
}
function showMap() {
  const cursor = (state ?? saved)?.cursor ?? -1;
  const regions = [ ['北京', '繁殖地 · 南迁出发', 0], ['蒙古国 · 新疆北部 · 中亚', '先向西北，随后转向西南', 15], ['阿拉伯半岛 · 红海附近', '继续进入非洲的区域路线', 16], ['非洲南部', '秋末抵达越冬区 · 时间压缩', 17], ['北返区域', '翌年离开越冬区，进入春迁', 18], ['北京', '回到繁殖地，重新检查巢位', 19] ] as const;
  openModal('迁徙手记 / THE LONG WAY HOME', `<h2>两次迁徙，两种节奏。</h2><p class="dialog-intro">区域关系示意，不是按比例的地图或精确轨迹。完整时间、路线与证据边界见“迁徙”“回家”指南。</p><div class="route-direction"><span>南迁 ↓</span><span>北京 → 西北 → 中亚 → 红海附近 → 非洲南部</span></div><div class="route-direction"><span>北返 ↑</span><span>非洲南部 → 非洲北上路段 → 红海附近 / 中亚 → 北京</span></div><div class="route-list">${regions.map(([name, label, index], i) => `<article class="${cursor >= index ? 'reached' : ''}"><span>${i + 1}</span><div><h3>${name}</h3><p>${label}</p></div><small>${cursor >= index ? '已进入该篇章' : '未经历'}</small></article>`).join('')}</div><p class="boundary">南北迁不必完全原路往返。群飞不等于已证实固定领队或接力喂食；玩法只将同伴活动作为观察线索。</p><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC9245314/" target="_blank" rel="noopener noreferrer">北京种群迁徙研究 ↗</a>`);
}
function showSettings() {
  openModal('设置 / A QUIETER SKY', `<h2>按自己的节奏探索。</h2><label class="setting"><span><strong>减少环境动画</strong><small>飞行保留必要操作反馈；素材不会自动播放。</small></span><input id="reduce-motion" type="checkbox" ${reducedMotion ? 'checked' : ''}></label><p class="boundary">任务失败后说明原因并重试，不模拟死亡。飞行可辅助完成；只有你上传的声音或视频会提供音频。</p><p class="boundary">本地存档与上传素材都只在当前浏览器。清除网站数据可能丢失它们；素材不会自动发布给其他玩家。</p><button id="settings-restart" class="secondary" ${isFlying ? 'disabled' : ''}>${isFlying ? '完成飞行后可重新开始' : '重新开始当前周期'}</button><p class="fine-print">0.2.0 · 八阶段原型。旧版进度独立保留，新结构从介绍开始。具体物种参数和待补资料仍需审核。</p>`);
  document.querySelector('#reduce-motion')!.addEventListener('change', event => {
    reducedMotion = (event.target as HTMLInputElement).checked;
    sky?.reduceMotion(reducedMotion);
    sky?.pause(isFlying ? flightPaused : true);
  });
  document.querySelector('#settings-restart')!.addEventListener('click', () => { modal.close(); confirmRestart(); });
}
function confirmRestart() {
  if (isFlying) return;
  openModal('重新开始', '<h2>重新探索这个周期？</h2><p class="dialog-intro">替换本版本的进度与回忆。已上传素材和旧版存档会保留。</p><div class="dialog-actions"><button id="confirm-restart" class="primary">从介绍重新开始 ↗</button><button id="cancel-restart" class="secondary">保留当前进度</button></div>');
  document.querySelector('#confirm-restart')!.addEventListener('click', () => { modal.close(); loadError = ''; void persist(createGame(swift)); });
  document.querySelector('#cancel-restart')!.addEventListener('click', () => modal.close());
}
document.querySelector('#close-modal')!.addEventListener('click', () => modal.close());
modal.addEventListener('close', () => {
  modal.querySelectorAll<HTMLElement>('[data-media-container]').forEach(clearMedia);
  mediaStage = -1;
  render();
});
document.querySelector('.brand')!.addEventListener('click', event => {
  event.preventDefault(); if (isFlying || busy) return;
  state = null; render();
});
document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.tool === 'guide') showGuide(state ? swift.events[state.cursor].chapter : 0);
  if (button.dataset.tool === 'media') showMediaLibrary();
  if (button.dataset.tool === 'map') showMap();
  if (button.dataset.tool === 'journal') showJournal();
  if (button.dataset.tool === 'settings') showSettings();
}));
document.querySelector('#pause-flight')!.addEventListener('click', () => {
  flightPaused = !flightPaused; sky?.pause(flightPaused);
  document.querySelector('#pause-flight')!.textContent = flightPaused ? '继续飞行' : '暂停';
});
document.querySelector('#assist-flight')!.addEventListener('click', () => sky?.assist());
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseFlight(); });
window.addEventListener('blur', () => pauseFlight());
document.addEventListener('keydown', event => {
  if (isFlying && !modal.open && ['ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault();
});
render();
async function boot() {
  try {
    saved = await store.load();
    if (!saved && await store.hasLegacy()) legacyNote = '已保留旧版存档。八阶段结构使用独立进度，从介绍重新开始；上传素材不受重新开始影响。';
    notify(saved ? '已找到本版本进度 · 可以继续' : '● 本地自动存档 · 无需登录');
  }
  catch (error) { loadError = error instanceof Error ? error.message : '读取存档失败。'; notify(loadError, true); }
  loading = false; render();
  try {
    const { mountSky } = await import('./game/sky.ts');
    sky = mountSky(document.querySelector('#sky')!, (left, insects, paused) => {
      document.querySelector('#flight-readout')!.textContent = `${paused ? '已暂停 · ' : ''}剩余 ${left} 秒 · 捕到 ${insects} 群飞虫`;
    });
    skyReady = true;
    sky.setLandscape(state ? swift.events[state.cursor].landscape : 'city');
    sky.pause(true);
    sky.reduceMotion(reducedMotion);
    render();
  } catch {
    notify('天空画面暂时无法载入。仍可使用辅助飞行继续文字流程。', true);
    // Preserve the full narrative even if WebGL or the renderer cannot initialize.
    sky = { setLandscape() {}, pause() {}, reduceMotion() {}, destroy() {}, assist() {}, beginFlight(_mode, _seed, done) { done({ insects: 0, gusts: 0, assisted: true }); } };
    skyReady = true; render();
  }
}
void boot();
