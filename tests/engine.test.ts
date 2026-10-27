import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advance, choose, createGame, finishFlight, meets, validateSave, validateSpecies } from '../src/core/engine.ts';
import { swift } from '../src/content/swift.ts';
import type { GameState, Species } from '../src/core/types.ts';

function completeAction(state: GameState, species: Species, choiceIndex = 0): GameState {
  const choices = species.events[state.cursor].choices.filter(c => meets(state, c.requires));
  let next = choose(state, species, choices[choiceIndex % choices.length].id);
  if (next.pending?.flight) next = finishFlight(next, { insects: 3, gusts: 1, assisted: false });
  assert.ok(validateSave(next, species), '选择结果必须能保存并恢复');
  return advance(next, species);
}

test('内容引用、选项、章节与年龄合法', () => {
  assert.deepEqual(validateSpecies(swift), []);
  assert.equal(swift.events.length, 20);
  assert.equal(new Set(swift.events.map(e => e.chapter)).size, 6);
  assert.ok(swift.events.find(e => e.id === 'another-swift')!.ageDays > 365);
});

test('不同选择策略都能从出生走到结尾，状态始终合法', () => {
  for (let strategy = 0; strategy < 4; strategy++) {
    let state = createGame(swift, 42);
    for (let step = 0; !state.completed && step < 40; step++) {
      assert.ok(validateSave(state, swift));
      state = completeAction(state, swift, step + strategy);
    }
    assert.equal(state.completed, true);
    assert.equal(state.history.length, 20);
    assert.equal(state.cursor, 19);
    assert.ok(state.flags.includes('young-fledged'));
    assert.ok(validateSave(state, swift));
    assert.throws(() => choose(state, swift, 'leave'));
  }
});

test('所有事件的每个可用选项均可执行，原状态不被修改', () => {
  let state = createGame(swift, 7);
  for (const event of swift.events) {
    for (const choice of event.choices.filter(c => meets(state, c.requires))) {
      const before = JSON.stringify(state);
      const selected = choose(state, swift, choice.id);
      assert.equal(JSON.stringify(state), before);
      assert.ok(validateSave(selected, swift));
      assert.throws(() => choose(selected, swift, choice.id), /当前片段/);
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
  let state = createGame(swift, 1234);
  while (swift.events[state.cursor].id !== 'crosswind') state = completeAction(state, swift);
  const before = structuredClone(state);
  const a = choose(state, swift, 'chase');
  const b = choose(JSON.parse(JSON.stringify(before)), swift, 'chase');
  assert.deepEqual(a, b);
  const restored = JSON.parse(JSON.stringify(a));
  assert.ok(validateSave(restored, swift));
  assert.equal(advance(restored, swift).energy, a.energy);
  assert.equal(advance(restored, swift).history.length, a.history.length);
});

test('拒绝不兼容、损坏和伪造的存档结构', () => {
  const valid = createGame(swift, 9);
  for (const patch of [ { schema: 2 }, { contentVersion: 'future' }, { speciesId: 'unknown' },
    { cursor: -1 }, { cursor: 0.5 }, { energy: 101 }, { health: NaN }, { ageDays: 55 },
    { randomSeed: -1 }, { facts: ['unknown'] }, { history: [{}] }, { pending: {} },
    { completed: true }, { flags: null }, { pending: undefined } ]) {
    assert.equal(validateSave({ ...valid, ...patch }, swift), false, JSON.stringify(patch));
  }
  assert.equal(validateSave(null, swift), false);
  assert.equal(validateSave('not a save', swift), false);
});

test('数值被限制在范围内，条件不足的选项被拒绝', () => {
  let state = createGame(swift);
  state.energy = 99;
  const fed = choose(state, swift, 'call');
  assert.equal(fed.energy, 100);
  assert.equal(fed.pending?.energyDelta, 1);
  assert.throws(() => choose(state, swift, 'invalid'));
  assert.equal(meets(state, { flag: 'missing' }), false);
  assert.equal(meets(state, { minAgeDays: 700 }), false);
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
