import type { Choice, Condition, FlightResult, GameState, Species } from './types.ts';

export const CONTENT_VERSION = '0.2.0';
const clamp = (value: number) => Math.max(0, Math.min(100, value));
export function createGame(species: Species, seed = Date.now() >>> 0): GameState {
  return { schema: 2, contentVersion: CONTENT_VERSION, speciesId: species.id, cursor: 0,
    energy: 65, health: 85, ageDays: species.events[0].ageDays, flags: [], facts: [],
    history: [], attempts: [], randomSeed: seed || 1, pending: null, completed: false };
}
export function meets(state: GameState, condition?: Condition): boolean {
  return !condition || ((!condition.flag || state.flags.includes(condition.flag)) &&
    (condition.minEnergy === undefined || state.energy >= condition.minEnergy) &&
    (condition.minAgeDays === undefined || state.ageDays >= condition.minAgeDays));
}
export function random(seed: number): [number, number] {
  const next = (Math.imul(1664525, seed) + 1013904223) >>> 0;
  return [next / 4294967296, next];
}
export function choose(state: GameState, species: Species, choiceId: string): GameState {
  if (species.events[state.cursor]?.task) throw new Error('请先完成本阶段的投入方案。');
  return settle(state, species, choiceId);
}
function settle(state: GameState, species: Species, choiceId: string, taskResult?: { result: string; failure?: Choice['failure'] }): GameState {
  if (state.completed || state.pending) throw new Error('请先完成当前片段。');
  const event = species.events[state.cursor];
  const choice: Choice | undefined = event?.choices.find(item => item.id === choiceId);
  if (!choice || !meets(state, choice.requires)) throw new Error('当前无法选择这一行动。');
  const next = structuredClone(state);
  const beforeEnergy = next.energy, beforeHealth = next.health;
  const failure = taskResult?.failure ?? choice.failure;
  let effect = failure ? {} : choice.effect ?? {}, result = taskResult?.result ?? choice.result;
  if (choice.chance && !failure) {
    const [roll, seed] = random(next.randomSeed);
    next.randomSeed = seed;
    if (roll < choice.chance.probability) {
      result += ` ${choice.chance.result}`;
      effect = { energy: (effect.energy ?? 0) + (choice.chance.effect.energy ?? 0),
        health: (effect.health ?? 0) + (choice.chance.effect.health ?? 0),
        flags: [...(effect.flags ?? []), ...(choice.chance.effect.flags ?? [])] };
    }
  }
  next.energy = clamp(next.energy + (effect.energy ?? 0));
  next.health = clamp(next.health + (effect.health ?? 0));
  next.flags = [...new Set([...next.flags, ...(effect.flags ?? [])])];
  if (event.fact) next.facts = [...new Set([...next.facts, event.fact])];
  next.history.push({ eventId: event.id, title: event.title, choice: choice.title, result, location: event.location });
  next.pending = { result, energyDelta: next.energy - beforeEnergy, healthDelta: next.health - beforeHealth,
    ...(failure ? { failure } : choice.flight ? { flight: choice.flight } : {}) };
  if (failure) next.attempts = [...next.attempts, { eventId: event.id, choice: choice.title, failure }].slice(-200);
  return next;
}
export function submitPlan(state: GameState, species: Species, allocation: Record<string, number>): GameState {
  const event = species.events[state.cursor], task = event?.task;
  if (!task) throw new Error('当前不是投入分配任务。');
  if (Object.keys(allocation).some(key => !task.channels.some(c => c.id === key)) ||
    task.channels.some(c => !Number.isInteger(allocation[c.id]) || allocation[c.id] < 0 || allocation[c.id] > task.budget)) {
    throw new Error('投入必须是预算范围内的整数。');
  }
  if (task.channels.reduce((sum, c) => sum + allocation[c.id], 0) !== task.budget) throw new Error(`请恰好分配 ${task.budget} 个投入块。`);
  const missing = task.channels.filter(c => allocation[c.id] < c.min || (c.max !== undefined && allocation[c.id] > c.max));
  const result = missing.length ? `${task.failure.reason} 需要调整：${missing.map(c => c.label).join('、')}。` : task.success;
  return settle(state, species, event.choices[0].id, { result, ...(missing.length ? { failure: { ...task.failure, reason: result } } : {}) });
}
export function retry(state: GameState): GameState {
  if (!state.pending?.failure) throw new Error('当前没有失败的任务。');
  const next = structuredClone(state);
  next.history.pop(); next.pending = null;
  return next;
}
export function finishFlight(state: GameState, flight: FlightResult): GameState {
  if (!state.pending?.flight) throw new Error('当前没有待完成的飞行。');
  const next = structuredClone(state);
  const energy = next.energy, health = next.health;
  const insects = Math.max(0, Math.min(20, Math.floor(flight.insects)));
  const gusts = Math.max(0, Math.min(20, Math.floor(flight.gusts)));
  next.energy = clamp(next.energy + (flight.assisted ? 5 : Math.min(16, insects * 2) - 4));
  next.health = clamp(next.health - (flight.assisted ? 0 : Math.min(6, gusts * 2)));
  const summary = flight.assisted ? '你借助辅助飞行完成了这一段路。' : `你穿过了这片天空，捕到 ${insects} 群飞虫，遇到 ${gusts} 次乱流。`;
  next.pending = { result: `${next.pending!.result} ${summary}`,
    energyDelta: next.pending!.energyDelta + next.energy - energy,
    healthDelta: next.pending!.healthDelta + next.health - health };
  next.history[next.history.length - 1].result = next.pending.result;
  return next;
}
export function advance(state: GameState, species: Species): GameState {
  if (!state.pending || state.pending.flight || state.pending.failure || state.completed) throw new Error('请先完成当前行动。');
  const next = structuredClone(state);
  next.pending = null;
  if (next.cursor + 1 >= species.events.length) next.completed = true;
  else { next.cursor++; next.ageDays = species.events[next.cursor].ageDays; }
  return next;
}

/** Validate untrusted persisted state before the UI or engine consumes it. */
export function validateSave(value: unknown, species: Species): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const s = value as GameState;
  const number = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  const strings = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 100 && v.every(x => typeof x === 'string' && x.length < 200);
  if (s.schema !== 2 || s.contentVersion !== CONTENT_VERSION || s.speciesId !== species.id ||
    !Number.isInteger(s.cursor) || !number(s.cursor, 0, species.events.length - 1) ||
    !number(s.energy, 0, 100) || !number(s.health, 0, 100) ||
    s.ageDays !== species.events[s.cursor].ageDays || !number(s.randomSeed, 0, 4294967295) || !Number.isInteger(s.randomSeed) ||
    !strings(s.flags) || !strings(s.facts) || !s.facts.every(id => species.facts.some(f => f.id === id)) ||
    typeof s.completed !== 'boolean' || !Array.isArray(s.history) || !Array.isArray(s.attempts) || s.attempts.length > 200) return false;
  const validFailure = (f: unknown) => !!f && typeof f === 'object' && ['title', 'reason', 'lesson'].every(key => typeof (f as Record<string, unknown>)[key] === 'string' && ((f as Record<string, string>)[key]).length < 4000);
  if (!s.attempts.every(a => a && species.events.some(e => e.id === a.eventId) && typeof a.choice === 'string' && validFailure(a.failure))) return false;
  const expectedHistory = s.cursor + (s.pending || s.completed ? 1 : 0);
  if (s.history.length !== expectedHistory || (s.completed && (s.cursor !== species.events.length - 1 || s.pending !== null))) return false;
  if (!s.history.every((h, i) => h && h.eventId === species.events[i].id &&
    ['title', 'choice', 'result', 'location'].every(key => typeof h[key as keyof typeof h] === 'string' && h[key as keyof typeof h].length < 4000))) return false;
  if (s.pending !== null) {
    const p = s.pending;
    if (!p || typeof p !== 'object' || typeof p.result !== 'string' || p.result.length > 4000 ||
      !number(p.energyDelta, -100, 100) || !number(p.healthDelta, -100, 100) ||
      (p.flight !== undefined && !['learn', 'forage', 'migrate'].includes(p.flight))) return false;
    if (p.flight && !species.events[s.cursor].choices.some(c => c.flight === p.flight && c.title === s.history.at(-1)?.choice)) return false;
    if (p.failure !== undefined && (!validFailure(p.failure) || p.flight !== undefined)) return false;
  }
  return true;
}

export function validateSpecies(species: Species): string[] {
  const issues: string[] = [], ids = new Set<string>();
  let age = -1;
  for (const event of species.events) {
    if (ids.has(event.id)) issues.push(`重复事件：${event.id}`);
    ids.add(event.id);
    if (event.ageDays < age) issues.push(`年龄倒退：${event.id}`);
    age = event.ageDays;
    if (!species.chapters[event.chapter]) issues.push(`章节不存在：${event.id}`);
    if (!event.choices.length || !event.choices.some(c => !c.requires)) issues.push(`缺少可用的兜底选项：${event.id}`);
    if (new Set(event.choices.map(c => c.id)).size !== event.choices.length) issues.push(`重复选项：${event.id}`);
    if (event.fact && !species.facts.some(f => f.id === event.fact)) issues.push(`知识条目不存在：${event.fact}`);
    if (event.task) {
      const task = event.task;
      if (!Number.isInteger(task.budget) || task.budget <= 0 || !task.channels.length ||
        new Set(task.channels.map(c => c.id)).size !== task.channels.length ||
        task.channels.some(c => !Number.isInteger(c.min) || c.min < 0 || c.min > task.budget ||
          (c.max !== undefined && (!Number.isInteger(c.max) || c.max < c.min || c.max > task.budget))) ||
        task.channels.reduce((sum, c) => sum + c.min, 0) > task.budget ||
        task.channels.reduce((sum, c) => sum + (c.max ?? task.budget), 0) < task.budget) issues.push(`投入任务无法完成：${event.id}`);
    }
  }
  return issues;
}
