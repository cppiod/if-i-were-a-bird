import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advance, choose, createGame, finishFlight, meets, retry, submitPlan, validateSave, validateSpecies } from '../src/core/engine.ts';
import { swift } from '../src/content/swift.ts';
import type { GameState, Species } from '../src/core/types.ts';

function completeAction(state: GameState, species: Species, choiceIndex = 0): GameState {
  const event = species.events[state.cursor];
  const choices = event.choices.filter(c => !c.failure && meets(state, c.requires));
  let next = event.task ? submitPlan(state, species, Object.fromEntries(event.task.channels.map(c => [c.id, c.min]))) : choose(state, species, choices[choiceIndex % choices.length].id);
  if (next.pending?.flight) next = finishFlight(next, { insects: 3, gusts: 1, assisted: false });
  assert.ok(validateSave(next, species), '选择结果必须能保存并恢复');
  return advance(next, species);
}

test('内容引用、选项、章节与年龄合法', () => {
  assert.deepEqual(validateSpecies(swift), []);
  assert.deepEqual(swift.chapters, ['介绍', '求偶', '筑巢', '孵化', '养育', '飞行', '迁徙', '回家']);
  assert.equal(new Set(swift.events.map(e => e.chapter)).size, 8);
  assert.match(swift.events.find(e => e.id === 'flight-readiness')!.perspective!, /幼鸟/);
  assert.match(swift.events.find(e => e.id === 'migration-route')!.perspective!, /成年/);
});

test('不同成功策略都能完成八阶段周期，状态始终合法', () => {
  for (let strategy = 0; strategy < 4; strategy++) {
    let state = createGame(swift, 42);
    for (let step = 0; !state.completed && step < 40; step++) {
      assert.ok(validateSave(state, swift));
      state = completeAction(state, swift, step + strategy);
    }
    assert.equal(state.completed, true);
    assert.equal(state.history.length, swift.events.length);
    assert.equal(state.cursor, swift.events.length - 1);
    assert.ok(state.flags.includes('young-fledged'));
    assert.ok(validateSave(state, swift));
    assert.throws(() => choose(state, swift, 'leave'));
  }
});

test('所有事件的每个可用选项均可执行，原状态不被修改', () => {
  let state = createGame(swift, 7);
  for (const event of swift.events) {
    for (const choice of event.task ? [] : event.choices.filter(c => meets(state, c.requires))) {
      const before = JSON.stringify(state);
      const selected = choose(state, swift, choice.id);
      assert.equal(JSON.stringify(state), before);
      assert.ok(validateSave(selected, swift));
      assert.throws(() => choose(selected, swift, choice.id), /当前片段/);
      if (choice.failure) {
        assert.throws(() => advance(selected, swift));
        const retried = retry(JSON.parse(JSON.stringify(selected)));
        assert.equal(retried.energy, state.energy);
        assert.equal(retried.health, state.health);
        assert.deepEqual(retried.flags, state.flags);
        assert.equal(retried.history.length, state.history.length);
        assert.equal(retried.attempts.length, state.attempts.length + 1);
        assert.ok(validateSave(retried, swift));
        continue;
      }
      let resolved = selected;
      if (selected.pending?.flight) {
        assert.throws(() => advance(selected, swift));
        resolved = finishFlight(selected, { insects: 0, gusts: 0, assisted: true });
        assert.throws(() => finishFlight(resolved, { insects: 0, gusts: 0, assisted: true }));
      }
      assert.ok(validateSave(advance(resolved, swift), swift));
    }
    state = completeAction(state, swift);
  }
});

test('随机结果在刷新恢复后保持一致，不会重复结算', () => {
  const species = { ...swift, events: [{ ...swift.events[0], choices: [{ ...swift.events[0].choices[0], chance: { probability: 0.5, result: '测试随机结果', effect: { energy: -3 } } }] }, ...swift.events.slice(1)] };
  const state = createGame(species, 1234);
  const before = structuredClone(state);
  const a = choose(state, species, 'observe');
  const b = choose(JSON.parse(JSON.stringify(before)), species, 'observe');
  assert.deepEqual(a, b);
  const restored = JSON.parse(JSON.stringify(a));
  assert.ok(validateSave(restored, swift));
  assert.equal(advance(restored, swift).energy, a.energy);
  assert.equal(advance(restored, swift).history.length, a.history.length);
});

test('拒绝不兼容、损坏和伪造的存档结构', () => {
  const valid = createGame(swift, 9);
  for (const patch of [ { schema: 1 }, { contentVersion: 'future' }, { speciesId: 'unknown' },
    { cursor: -1 }, { cursor: 0.5 }, { energy: 101 }, { health: NaN }, { ageDays: 55 },
    { randomSeed: -1 }, { facts: ['unknown'] }, { history: [{}] }, { pending: {} },
    { completed: true }, { flags: null }, { pending: undefined }, { attempts: null }, { attempts: [{ eventId: 'unknown' }] } ]) {
    assert.equal(validateSave({ ...valid, ...patch }, swift), false, JSON.stringify(patch));
  }
  assert.equal(validateSave(null, swift), false);
  assert.equal(validateSave('not a save', swift), false);
});

test('数值被限制在范围内，条件不足的选项被拒绝', () => {
  let state = createGame(swift);
  state.energy = 99;
  const species = { ...swift, events: [{ ...swift.events[0], choices: [{ ...swift.events[0].choices[0], effect: { energy: 10 } }] }, ...swift.events.slice(1)] };
  const fed = choose(state, species, 'observe');
  assert.equal(fed.energy, 100);
  assert.equal(fed.pending?.energyDelta, 1);
  assert.throws(() => choose(state, swift, 'invalid'));
  assert.equal(meets(state, { flag: 'missing' }), false);
  assert.equal(meets(state, { minAgeDays: 2000 }), false);
});

test('投入任务：失败可恢复重试，正确方案才允许继续，直接选项不能绕过', () => {
  let state = createGame(swift, 51);
  for (const event of swift.events) {
    if (event.task) {
      assert.throws(() => choose(state, swift, event.choices[0].id), /投入方案/);
      const allFirst = Object.fromEntries(event.task.channels.map((c, i) => [c.id, i ? 0 : event.task!.budget]));
      const failed = submitPlan(state, swift, allFirst);
      assert.ok(failed.pending?.failure);
      assert.equal(failed.energy, state.energy);
      assert.equal(failed.health, state.health);
      assert.throws(() => advance(failed, swift));
      assert.ok(validateSave(failed, swift));
      const restored = JSON.parse(JSON.stringify(failed));
      const resumed = retry(restored);
      const good = submitPlan(resumed, swift, Object.fromEntries(event.task.channels.map(c => [c.id, c.min])));
      assert.equal(good.pending?.failure, undefined);
      assert.ok(validateSave(advance(good, swift), swift));
      assert.throws(() => submitPlan(state, swift, { unknown: 6 }));
      assert.throws(() => submitPlan(state, swift, Object.fromEntries(event.task.channels.map(c => [c.id, 0]))), /恰好/);
      assert.throws(() => submitPlan(state, swift, Object.fromEntries(event.task.channels.map(c => [c.id, 0.5]))), /整数/);
    }
    state = completeAction(state, swift);
  }
});

test('任务内容校验拒绝不可满足的约束', () => {
  const species = { ...swift, events: [{ ...swift.events[0], task: { budget: 2, channels: [{ id: 'food', label: '食物', hint: '', min: 3 }], success: '', failure: { title: '', reason: '', lesson: '' } } }] };
  assert.ok(validateSpecies(species).some(issue => issue.includes('无法完成')));
  assert.throws(() => retry(createGame(swift)));
});

test('非雨燕配置可复用流程，地面觅食不强制进入飞行', () => {
  const fixture: Species = {
    id: 'ground-forager-fixture', name: '地面觅食测试物种', scientificName: 'Internal fixture',
    chapters: ['探索', '觅食', '离开'], facts: [],
    events: ['探索地面', '翻找落叶', '回到隐蔽处'].map((title, index) => ({
      id: `ground-${index}`, chapter: index, title, paragraphs: ['仅验证接口，不提供物种知识。'],
      ageDays: index, ageLabel: '测试', season: '测试', location: '测试环境', landscape: 'savanna',
      choices: [{ id: 'act', title: '地面行动', hint: '', result: '完成行动', effect: { energy: 3, flags: [`step-${index}`] } }],
    })),
  };
  assert.deepEqual(validateSpecies(fixture), []);
  let state = createGame(fixture);
  while (!state.completed) state = completeAction(state, fixture);
  assert.equal(state.speciesId, fixture.id);
  assert.equal(state.history.length, 3);
  assert.deepEqual(state.flags, ['step-0', 'step-1', 'step-2']);
});
