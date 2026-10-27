import './style.css';
import { swift } from './content/swift.ts';
import { advance, choose, createGame, finishFlight, meets, validateSpecies } from './core/engine.ts';
import { createSaveStore } from './core/storage.ts';
import type { GameState } from './core/types.ts';
import type { SkyControl } from './game/sky.ts';

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const birdIcon = `<svg viewBox="0 0 90 55" fill="currentColor" aria-hidden="true"><path d="M85 21 56 19 15 1 32 22 4 38 35 31 48 50 47 29 64 30Z"/></svg>`;
const issues = validateSpecies(swift);
if (issues.length) throw new Error(issues.join('\n'));
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="#" aria-label="若我为鸟 首页">${birdIcon}<span>若我为鸟<small>A LIFE ON THE WING</small></span></a>
    <nav aria-label="游戏工具"><button data-tool="map">迁徙手记 <span>↗</span></button><button data-tool="journal">鸟生图鉴 <span>↗</span></button><button data-tool="settings" aria-label="打开设置">设置 <span>☷</span></button></nav>
  </header>
  <main>
    <div class="edition"><span>第一篇 · 北京雨燕</span><span>可玩原型 / 0.1.0</span></div>
    <section class="experience" aria-label="鸟生体验">
      <div class="landscape">
        <div id="sky" role="img" aria-label="北京屋檐与天空的程序插画"></div>
        <div class="scene-top"><span id="scene-location">北京 · 一处旧屋檐</span><span id="scene-season">初夏 / 风起时</span></div>
        <div id="scene-caption" class="scene-caption"><span class="eyebrow">一处屋檐，通向整个世界</span><h1>如果，<br>你是一只鸟。</h1><p>从第一道光，到万里之外的天空。</p></div>
        <div class="scene-bottom"><span>普通雨燕 · 北京亚种</span><span>APUS APUS PEKINENSIS</span></div>
        <div id="flight-overlay" hidden><span id="flight-readout" role="status">飞行准备中</span><div><button id="pause-flight">暂停</button><button id="assist-flight">辅助完成这一段</button></div></div>
      </div>
      <section id="story" class="story" aria-label="故事与行动"></section>
    </section>
    <div id="save-message" class="save-message" role="status" aria-live="polite">正在读取本地进度…</div>
    <section class="journey" aria-label="生命章节"><div class="journey-label"><span>一生的片段</span><small>THE JOURNEY</small></div><ol id="chapter-list"></ol></section>
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
    `<li class="${i === chapter ? 'current' : i < chapter || state?.completed ? 'visited' : ''}" ${i === chapter ? 'aria-current="step"' : ''}><span>${String(i + 1).padStart(2, '0')}</span>${name}</li>`).join('');
  const caption = document.querySelector<HTMLElement>('#scene-caption')!;
  caption.hidden = state !== null;
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
  if (!state) {
    story.innerHTML = `<div class="intro"><div class="eyebrow"><i></i> 一次小小的生命，一段很远的旅程</div><h2>天空，<br>会是怎样的家？</h2><p class="lead">你将出生在北京的一处屋檐下。<br>学会飞翔，追逐虫群，越过山与海，<br>再寻找记忆中的那道光。</p><div class="intro-actions"><button id="new-game" class="primary" ${loading ? 'disabled' : ''}>${saved ? '开始新的鸟生' : '从孵化开始'} <span>↗</span></button>${saved ? '<button id="resume-game" class="secondary">继续上次的鸟生 →</button>' : ''}</div><div class="intro-note"><span>◷ 约 10—15 分钟的流程原型</span><p>六章精选片段 · 可随时保存退出<br>身体数值与部分情节为游戏化简化，尚待科学复核。</p></div>${loadError ? `<p class="inline-warning">${escape(loadError)}</p>` : ''}</div>`;
    document.querySelector('#new-game')!.addEventListener('click', () => saved || loadError ? confirmRestart() : void persist(createGame(swift)));
    document.querySelector('#resume-game')?.addEventListener('click', () => { state = structuredClone(saved); notify('已恢复上次保存的进度。'); render(); });
    return;
  }
  if (state.completed) {
    story.innerHTML = `<div class="ending"><div class="eyebrow">这一段鸟生 · 已完成</div><h2>天空仍在，<br>故事还会继续。</h2><p class="lead">你从屋檐出发，见过陌生的天空。<br>又把一处小小的入口，记成了家。</p><div class="ending-numbers"><div><strong>${new Set(state.history.map(h => h.location)).size}</strong><span>处地方的记忆</span></div><div><strong>${state.facts.length}</strong><span>条自然手记</span></div></div><p class="ending-detail">${state.flags.includes('old-nest') ? '你回到了记忆中的巢址。' : '你找到了新的巢位。'}${state.flags.includes('young-fledged') ? '你看见年轻的翅膀离开屋檐。' : ''} 人们保留的入口，也成为这段故事的一部分。</p><button class="primary" id="ending-journal">翻开鸟生回忆 <span>↗</span></button><button class="text-button" id="restart">再开始一段鸟生</button><p class="fine-print">感谢体验原型。完整篇章的内容、声音和科学审核仍在制作中。</p></div>`;
    document.querySelector('#ending-journal')!.addEventListener('click', () => showJournal());
    document.querySelector('#restart')!.addEventListener('click', confirmRestart);
    return;
  }
  const s = state;
  const metrics = `<div class="vitals"><div><span>能量 <b>${s.energy}</b></span><meter min="0" max="100" value="${s.energy}" aria-label="能量 ${s.energy}"></meter></div><div><span>身体 <b>${s.health}</b></span><meter min="0" max="100" value="${s.health}" aria-label="身体状况 ${s.health}"></meter></div></div>`;
  const marker = `<div class="chapter-marker"><span>第 ${chapter + 1} 章 · ${swift.chapters[chapter]}</span><span>${String(s.cursor + 1).padStart(2, '0')} / ${swift.events.length}</span></div>`;
  if (isFlying) {
    story.innerHTML = `${marker}<div class="event-copy"><span class="eyebrow">把身体交给天空</span><h2>${event!.title}</h2><p>用 ↑ ↓ 调整高度，或按住画面移动。靠近金色虫群，避开白色乱流。</p><p>飞行持续 30 秒。你可以随时暂停，也可以选择辅助完成，继续故事。</p><div class="flight-legend"><span>✦ 金色光点 · 虫群</span><span>≋ 白色环线 · 乱流</span></div></div>${metrics}<p class="fine-print">切换页面或打开手记时自动暂停，返回后需手动继续。</p>`;
    return;
  }
  if (s.pending) {
    const delta = (name: string, value: number) => value === 0 ? '' : `<span>${name} ${value > 0 ? '+' : ''}${value}</span>`;
    story.innerHTML = `${marker}<div class="event-copy result-copy"><span class="eyebrow">这一刻的回响</span><h2>${event!.title}</h2><p>${escape(s.pending.result)}</p><div class="deltas">${delta('能量', s.pending.energyDelta)}${delta('身体', s.pending.healthDelta)}</div></div>${metrics}<div class="choices"><button id="next" class="primary" ${busy || (s.pending.flight && !skyReady) ? 'disabled' : ''}>${s.pending.flight ? skyReady ? '进入这片天空' : '正在准备天空…' : s.cursor === swift.events.length - 1 ? '收起这段鸟生' : '继续这段旅程'} <span>→</span></button>${event!.fact ? '<button id="fact-link" class="text-button">+ 看看这段经历背后的自然</button>' : ''}</div>`;
    document.querySelector('#next')!.addEventListener('click', () => { if (busy) return; if (state?.pending?.flight) startFlight(); else void persist(advance(state!, swift)); });
    document.querySelector('#fact-link')?.addEventListener('click', () => showJournal());
  } else {
    story.innerHTML = `${marker}<div class="event-copy"><span class="eyebrow">${event!.ageLabel}</span><h2>${event!.title}</h2>${event!.paragraphs.map(p => `<p>${escape(p)}</p>`).join('')}</div>${metrics}<div class="choices">${event!.choices.map((choice, i) => `<button class="choice" data-choice="${choice.id}" ${busy || !meets(s, choice.requires) ? 'disabled' : ''}><span class="choice-number">${String(i + 1).padStart(2, '0')}</span><span><strong>${choice.title}</strong><small>${!meets(s, choice.requires) ? '当前条件不足' : choice.hint}</small></span><span class="choice-arrow">↗</span></button>`).join('')}</div>`;
    story.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(button => button.addEventListener('click', () => {
      if (!busy) void persist(choose(state!, swift, button.dataset.choice!));
    }));
  }
}
function startFlight() {
  if (!sky || !state?.pending?.flight) return;
  isFlying = true; flightPaused = false;
  document.querySelector('#pause-flight')!.textContent = '暂停';
  render();
  sky.beginFlight(state.pending.flight, state.randomSeed + state.cursor, result => {
    isFlying = false; flightPaused = false;
    sky?.pause(reducedMotion);
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
  document.querySelector('#dialog-kicker')!.textContent = title;
  document.querySelector('#modal-content')!.innerHTML = html;
  modal.showModal();
}
function showJournal() {
  const s = state ?? saved;
  const unlocked = swift.facts.filter(f => s?.facts.includes(f.id));
  openModal('鸟生图鉴 / FIELD NOTES', `<h2>翅膀记得的事</h2><p class="dialog-intro">知识随经历解锁。文字与画面中对鸟的感受，属于艺术表达。</p><div class="fact-list">${unlocked.length ? unlocked.map(f => `<article><span class="eyebrow">自然手记</span><h3>${f.title}</h3><p>${f.text}</p><p class="boundary">${f.boundary}</p><a href="${f.source}" target="_blank" rel="noopener noreferrer">${f.sourceLabel} ↗</a></article>`).join('') : '<p class="empty-note">第一道光之后，你会慢慢拥有自己的自然手记。</p>'}</div><h3 class="memory-heading">鸟生回忆</h3><ol class="memory-list">${s?.history.length ? s.history.map(h => `<li><small>${escape(h.location)}</small><strong>${escape(h.title)}</strong><span>${escape(h.choice)}</span><p>${escape(h.result)}</p></li>`).join('') : '<li>还没有出发。屋檐下，有一个故事正在等待。</li>'}</ol>`);
}
function showMap() {
  const cursor = (state ?? saved)?.cursor ?? -1;
  const regions = [ ['北京', '出生与成长', 0], ['中国西北 · 中亚', '向西北，再向西南', 6], ['阿拉伯半岛 · 红海', '进入陌生的海风', 8], ['非洲南部', '非繁殖季的天空', 10], ['北京', '跨越岁月后的归来', 13] ] as const;
  openModal('迁徙手记 / THE LONG WAY HOME', `<h2>世界，比屋檐大很多。</h2><p class="dialog-intro">一条代表性的区域路线。方向与地点经过简化，不能用作个体轨迹或实时导航。</p><div class="route-list">${regions.map(([name, label, index], i) => `<article class="${cursor >= index ? 'reached' : ''}"><span>${i + 1}</span><div><h3>${name}</h3><p>${label}</p></div><small>${cursor >= index ? '已抵达' : '未经历'}</small></article>`).join('')}</div><p class="boundary">南迁示意不代表返程完全原路返回。原型压缩了路程和非繁殖年份；首次繁殖并非紧接出生年度。</p><a href="https://yllhj.beijing.gov.cn/ztxx/lhysh/st/202208/t20220817_2794389.shtml" target="_blank" rel="noopener noreferrer">迁徙资料 · 北京市园林绿化局 ↗</a>`);
}
function showSettings() {
  openModal('设置 / A QUIETER SKY', `<h2>按自己的节奏飞。</h2><label class="setting"><span><strong>减少环境动画</strong><small>停止叙事场景的持续运动；飞行互动保留必要反馈。</small></span><input id="reduce-motion" type="checkbox" ${reducedMotion ? 'checked' : ''}></label><p class="boundary">飞行提供辅助完成。此版本尚未加入音效；所有必要提示均以文字或图形呈现。</p><p class="boundary">存档只保存在当前浏览器。清除网站数据、使用无痕窗口或更换访问地址，可能无法继续原有进度。</p><button id="settings-restart" class="secondary" ${isFlying ? 'disabled' : ''}>${isFlying ? '完成当前飞行后可重新开始' : '重新开始鸟生'}</button><p class="fine-print">0.1.0 · 开发原型。年龄、能量和部分事件结果为叙事与平衡设计，尚未完成本地专家审核。首版暂不模拟死亡。</p>`);
  document.querySelector('#reduce-motion')!.addEventListener('change', event => {
    reducedMotion = (event.target as HTMLInputElement).checked;
    sky?.pause(isFlying ? flightPaused : reducedMotion);
  });
  document.querySelector('#settings-restart')!.addEventListener('click', () => { modal.close(); confirmRestart(); });
}
function confirmRestart() {
  if (isFlying) return;
  openModal('重新开始', '<h2>回到第一道光？</h2><p class="dialog-intro">新的鸟生将替换此浏览器中保存的进度和回忆。</p><div class="dialog-actions"><button id="confirm-restart" class="primary">开始新的鸟生 ↗</button><button id="cancel-restart" class="secondary">保留当前进度</button></div>');
  document.querySelector('#confirm-restart')!.addEventListener('click', () => { modal.close(); loadError = ''; void persist(createGame(swift)); });
  document.querySelector('#cancel-restart')!.addEventListener('click', () => modal.close());
}
document.querySelector('#close-modal')!.addEventListener('click', () => modal.close());
document.querySelector('.brand')!.addEventListener('click', event => {
  event.preventDefault(); if (isFlying || busy) return;
  state = null; render();
});
document.querySelectorAll<HTMLButtonElement>('[data-tool]').forEach(button => button.addEventListener('click', () => {
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
  try { saved = await store.load(); notify(saved ? '已找到上次的鸟生 · 可以继续旅程' : '● 本地自动存档 · 无需登录'); }
  catch (error) { loadError = error instanceof Error ? error.message : '读取存档失败。'; notify(loadError, true); }
  loading = false; render();
  try {
    const { mountSky } = await import('./game/sky.ts');
    sky = mountSky(document.querySelector('#sky')!, (left, insects, paused) => {
      document.querySelector('#flight-readout')!.textContent = `${paused ? '已暂停 · ' : ''}剩余 ${left} 秒 · 捕到 ${insects} 群飞虫`;
    });
    skyReady = true;
    sky.setLandscape(state ? swift.events[state.cursor].landscape : 'city');
    sky.pause(reducedMotion);
    render();
  } catch {
    notify('天空画面暂时无法载入。仍可使用辅助飞行继续文字流程。', true);
    // Preserve the full narrative even if WebGL or the renderer cannot initialize.
    sky = { setLandscape() {}, pause() {}, destroy() {}, assist() {}, beginFlight(_mode, _seed, done) { done({ insects: 0, gusts: 0, assisted: true }); } };
    skyReady = true; render();
  }
}
void boot();
