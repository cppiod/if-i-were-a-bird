import type { Choice, Failure, LifeEvent, Species, AllocationTask } from '../core/types.ts';
import { sources, stages } from './guide.ts';

const facts = stages.map(stage => {
  const source = sources.find(s => s.id === stage.fields.find(f => f.source)?.source)!;
  return { id: stage.id, title: stage.name, text: stage.fields.slice(0, 2).map(f => f.text).join(' '), source: source.url,
    sourceLabel: source.title, boundary: '完整资料与适用边界见阶段指南；待补资料不作为已知事实。投入块和失败条件是教学规则。' };
});
const fail = (title: string, reason: string, lesson: string): Failure => ({ title, reason, lesson });
const c = (id: string, title: string, hint: string, result: string, extra: Partial<Choice> = {}): Choice => ({ id, title, hint, result, ...extra });
const events: LifeEvent[] = [];
function add(chapter: number, id: string, title: string, ageDays: number, location: string, landscape: LifeEvent['landscape'], paragraphs: string[], choices: Choice[], extra: Partial<LifeEvent> = {}) {
  events.push({ chapter, id, title, ageDays, ageLabel: stages[chapter].subtitle, season: stages[chapter].season, location,
    landscape, paragraphs, choices, fact: stages[chapter].id, perspective: stages[chapter].perspective, ...extra });
}
function plan(needs: [string, string, string, number][], success: string, failure: Failure): AllocationTask {
  return { budget: 6, success, failure, channels: needs.map(([id, label, hint, min]) => ({ id, label, hint, min })) };
}
add(0, 'meet-swift', '先认识这双翅膀', 1460, '北京 · 繁殖季开始前', 'city', [
  '这次从成年北京雨燕的繁殖季开始。求偶、筑巢、孵化和养育之后，故事会短暂切换到幼鸟视角，再回到成鸟的迁徙与归来。',
  '雌雄与幼成鸟外形、叫声和真实动作，都留在素材位置。你可以上传自己的图片、录音或视频。',
], [c('observe', '观察形态与生活环境', '先了解，再行动', '身体适于天空，而繁殖还需要一处能安全进出的巢位。', { effect: { flags: ['body-known'] } })]);
add(0, 'food-web', '吃虫子的鸟，也要避开猎手', 1460, '北京 · 空中食物网络', 'city', [
  '小型飞虫悬在空气里，远处一道猎鸟轮廓快速接近。天空提供食物，也包含风险。',
  '食物链和艺术中的燕意象，可以在阶段指南与素材馆里继续探索。',
], [c('safe-air', '避开猎手，再寻找虫群', '观察风险 · 保持距离', '你绕开追逐，进入另一处可以觅食的空域。', { effect: { energy: 4 } }), c('wait-line', '改变方向，等待合适的机会', '少些收获 · 保留身体状况', '暂时少吃几口，比在危险空域勉强停留更合适。', { effect: { energy: -2, health: 3 } })]);

add(1, 'courtship-response', '先听见，再回应', 1465, '北京 · 巢区附近', 'city', [
  '雨燕往返飞行，尖细叫声穿过屋顶。不能只凭一声叫喊，就把对方判定为伴侣。',
  '这里观察回应、接近与退让。没有可靠素材的具体展示动作先留白，不套用地面舞蹈。',
], [c('respond', '保持距离，观察并回应', '等待共同活动的机会', '反复相遇后，对方仍在相近空域活动。故事将这段过程压缩为配对准备。', { effect: { flags: ['courtship-ready'], energy: -3 } }), c('rush', '挤进正被防卫的入口', '入口附近的鸟持续驱赶靠近者', '配对尝试被驱赶打断。', { failure: fail('这次接近失败了', '你忽略防卫线索，进入了已被使用的空间。', '退让并重新观察；巢区追逐不一定是求偶。') })]);
add(1, 'pairing', '两只鸟的决定', 1470, '北京 · 共同活动的空域', 'city', [
  '几次来回，你们仍在相近空域活动。伴侣不是点满进度条就必然获得的奖励。',
  '这里选取配对成功的叙事，接下来需要共同面对繁殖投入。',
], [c('pair', '进入共同繁殖的篇章', '压缩时间 · 共同照料', '这处家，需要两只鸟持续投入。', { effect: { flags: ['partner'], energy: 3 } })]);

add(2, 'nest-site', '三个入口，选一处家', 1475, '北京 · 建筑缝隙', 'city', [
  '依次比较三个位置。进出空间、遮蔽与干扰，都会影响这次选择。',
  '先读卡片线索。不适合的巢址会让当前任务失败，解释原因后可以重新选。',
], [
  c('sheltered', '有遮蔽的高处缝隙', '入口持续开放，附近无施工', '入口通畅，内部有遮蔽。你记住了这处繁殖巢址。', { details: ['进出：开阔', '遮蔽：避雨、非暴晒', '干扰：无施工迹象'], effect: { flags: ['nest-site-safe', 'home-memory'], energy: -3 } }),
  c('sealed', '即将封堵的旧屋檐', '熟悉，但次日将封缝修缮', '修缮封闭了入口，无法继续使用。', { details: ['进出：现在可用', '遮蔽：良好', '干扰：次日封缝'], failure: fail('巢址不可继续使用', '忽略修缮计划，导致入口在繁殖期间消失。', '熟悉不等于安全，持续可进出的条件更重要。') }),
  c('exposed', '无遮蔽的低处平台', '直接暴露在雨水与干扰中', '平台不能提供本情境需要的遮蔽和空间。', { details: ['进出：低处、受干扰', '遮蔽：无遮雨', '干扰：频繁靠近'], failure: fail('平台不适合这次筑巢', '位置无遮蔽且频繁受干扰。', '重新比较条件；此为教学情境，不是野外成功率。') }),
], { interaction: 'nest-site' });
add(2, 'nest-material', '巢材，不是越多越好', 1480, '北京 · 巢位附近', 'nest', [
  '普通雨燕可收集空中材料，并用唾液黏合整理。这里有小片轻软材料，还有一根很长的塑料丝。',
  '你需要考虑缠绕风险，而不只看材料是否显得牢固。',
], [c('light-material', '收集适合的小片材料', '轻软、无长线缠绕', '巢位渐渐整理妥当。', { effect: { flags: ['nest-ready'], energy: -4 } }), c('plastic-line', '把长塑料丝拖进巢', '长线有明显缠绕风险', '长线进入巢内，安全检查未通过。', { failure: fail('巢材方案失败', '长线给巢内带来缠绕风险。', '重新选择适合的材料，数量与安全不能等同。') })]);
add(2, 'nest-check', '留下下一次返回的路', 1483, '北京 · 繁殖巢址', 'nest', [
  '入口仍开放，屋檐下的人绕开了这处缝隙。',
  '人的关照没有变成抓握与驯养，而是让这里继续可用。',
], [c('keep-entry', '记住入口，准备繁殖', '保留巢址记忆', '你们反复返回，进入产卵后的照料。', { effect: { flags: ['entry-kept'] } })]);

add(3, 'eggs', '等待，开始有了重量', 1490, '北京 · 巢内', 'nest', [
  '故事跳过产卵，来到卵已经在巢中的时刻。玩家不会通过点击决定某只鸟必定产几枚卵。',
  '普通雨燕参考常见一窝 2—3 枚，孵化约 18—24 天；不是北京每窝固定的日历。',
], [c('observe-eggs', '观察卵，准备分配照料', '查看孵化资料', '需要平衡巢内照料与亲鸟补给。', { effect: { flags: ['eggs'] } })]);
add(3, 'incubation-plan', '不能只顾一件事', 1500, '北京 · 孵卵阶段', 'nest', [
  '你与伴侣共同维持卵的照料和自身补给。',
  '分配六个抽象投入块：巢内照料至少 3、亲鸟觅食至少 2、自身恢复至少 1。这不是小时或真实轮换次数。',
], [c('complete', '执行孵化方案', '', '照料得以维持。', { effect: { energy: -4, flags: ['hatched'] } })], { task: plan(
  [['warmth', '巢内照料', '至少 3 块', 3], ['food', '亲鸟觅食', '至少 2 块', 2], ['rest', '自身恢复', '至少 1 块', 1]],
  '照料和补给都得到维持。经过压缩的等待，巢里出现新的动静。', fail('孵化方案未能维持', '分配不能同时满足卵照料与亲鸟补给。', '依据线索重新分配；阈值是教学规则，不是真实温度或时长。')) });

add(4, 'young-newborn', '初孵：你曾经也是这样', 1512, '北京 · 初孵幼雏的巢', 'nest', [
  '晚成雏身体裸露，依赖亲鸟。它不是一只缩小的、已经会飞的成鸟。外形展示等待带日龄的素材。',
  '六个投入块中：觅食至少 3、幼雏照料至少 2、卫生至少 1。',
], [c('complete', '执行初孵照料方案', '', '幼雏继续生长。', { effect: { energy: -5, flags: ['young-fed'] } })], { task: plan(
  [['food', '觅食与带回食物', '至少 3 块', 3], ['warmth', '幼雏照料', '至少 2 块', 2], ['clean', '巢内卫生', '至少 1 块', 1]],
  '食物、照料与卫生均有投入，小小的身体继续生长。', fail('初孵照料有缺口', '至少一项幼雏需要被忽略了。', '根据初孵阶段的需要重新分配，不能只增加食物。')) });
add(4, 'young-feathers', '羽毛渐丰，能力也改变', 1527, '北京 · 幼鸟生长阶段', 'nest', [
  '羽毛逐渐发育，活动能力增强。用真实连续记录呈现变化，不为所有个体规定同一张“第几天”的脸。',
  '目前没有填入北京野外固定的每日喂食次数；日龄、天气、虫量与食团大小都需要一起看。',
], [c('observe-growth', '记录外形与能力变化', '查看成长素材与待补问题', '你开始同时关注外形、活动和食物需要。', { effect: { energy: 8 } })]);
add(4, 'nest-sanitation', '不只有“衔走”一种方式', 1530, '北京 · 巢内卫生观察', 'nest', [
  '普通雨燕研究记录了幼雏早期亲鸟吞食粪囊，较大后这种行为减少。',
  '等待上传的录像会补充具体情境，不把其他鸟的清巢方式直接写成雨燕规则。',
], [c('age-aware', '根据日龄与记录观察', '关注研究边界', '你保留了问题与证据。', { effect: { flags: ['sanitation-known'] } }), c('all-carry', '把一律衔走当成唯一正确行为', '忽略了普通雨燕研究', '这个判断与观察记录不一致。', { failure: fail('行为判断需要修正', '粪囊处理并不只有衔走。', '回到证据，注意物种、幼雏阶段和具体情境。') })]);
add(4, 'young-late', '离巢前，食物仍从天空来', 1550, '北京 · 羽毛渐丰的幼鸟', 'nest', [
  '飞羽伸长，幼鸟活动更多。普通雨燕离巢参考约 37—56 天，但不能据此规定每只北京雨燕的日程。',
  '这次六个投入块需要觅食至少 4、卫生至少 1、亲鸟恢复至少 1。不是每天实际喂六次。',
], [c('complete', '执行离巢前照料方案', '', '亲鸟与幼鸟都继续生活。', { effect: { energy: -3, flags: ['young-ready'] } })], { task: plan(
  [['food', '觅食与带回食物', '至少 4 块', 4], ['clean', '巢内卫生', '至少 1 块', 1], ['rest', '亲鸟恢复', '至少 1 块', 1]],
  '更多投入交给食物，同时保留卫生与恢复。年轻的翅膀接近了天空。', fail('离巢前照料不足', '分配没有满足这个阶段的需要。', '幼鸟长大后需求会改变，不能照搬初孵方案。')) });

add(5, 'flight-readiness', '视角切换：现在，你是幼鸟', 1554, '北京 · 幼鸟的巢口', 'nest', [
  '这里明确切换到下一代幼鸟，不是成鸟突然变年轻。',
  '眼前的情境：飞羽还未充分伸长，天气有强风雨。选择等待，会压缩到条件改善的时候。',
], [c('wait-ready', '等待身体与条件改善', '准备也是飞行的一部分', '经过一些日子，身体更充分，天气转为适宜。', { effect: { flags: ['flight-ready'], health: 4 } }), c('early-flight', '现在就冲出巢口', '羽毛未充分，且有强风雨', '起飞方案未通过准备检查。', { failure: fail('起飞准备不足', '身体与眼前环境都不适合立即离巢。', '先等待条件改善。本题不是人工放飞或野鸟救护指导。') })], { interaction: 'readiness', perspective: '幼鸟 · 离巢前' });
add(5, 'first-flight', '第一次，天空托住身体', 1560, '北京 · 初次飞行', 'city', [
  '风开始托住身体。你需要调整高度，寻找食物，避开乱流。',
  '互动符号只用于操作；真实幼鸟体态和飞行动作由上传素材展示。',
], [c('fly', '展开翅膀', '30 秒飞行 · 可暂停或辅助', '你离开巢，开始在天空里寻找生活。', { flight: 'learn', effect: { flags: ['young-fledged'], energy: -2 } })], { perspective: '幼鸟 · 首次离巢' });

add(6, 'migration-route', '切回成鸟：向南，先向西北', 1575, '北京 → 蒙古国与新疆北部', 'mountains', [
  '幼鸟片段结束，现在切回成鸟，体验繁殖后的迁徙。',
  '本情境的区域与资源线索先指向蒙古国与新疆北部，再经中亚转向非洲。迁徙不是在地图上朝正南画直线。',
], [c('northwest', '先向西北，接入中亚路段', '跟随区域与资源线索', '你离开北京，进入通向中亚的天空。', { details: ['北京 → 蒙古国 / 新疆北部', '沿已示意的季节与资源窗口'], effect: { energy: -5, flags: ['southbound'] } }), c('straight-south', '直接穿过图上的无补给区', '只看纸面最短距离', '当前路段没有可用补给安排。', { details: ['纸面距离较短', '该情境已标示缺少补给'], failure: fail('路段方案失败', '最短直线不能满足当前资源条件。', '根据线索重新选。这不表示所有偏离路线的鸟都会死亡。') })], { interaction: 'route', perspective: '成年雨燕 · 南迁' });
add(6, 'migration-companions', '同伴是线索，不是自动驾驶', 1600, '中亚 → 阿拉伯半岛附近', 'desert', [
  '几只雨燕在远处盘旋，另一边很少看到虫群。它们的活动可以成为观察环境的线索。',
  '这是艺术化示意，不假定固定领队、V 字编队、轮流领航或接力喂食已获证明。',
], [c('check-food', '查看同伴盘旋处的食物条件', '保留自己的观察与判断', '你找到一些食物，补充储备后继续前进。', { effect: { energy: 10, flags: ['food-observed'] } }), c('ignore-needs', '等待同伴替自己寻找并送来食物', '当前没有这类行为证据', '你没有安排自己的补给。', { failure: fail('合作设想无法执行', '此处没有同伴代喂的机制与证据。', '观察同伴有帮助，但自己的觅食与路线判断仍然重要。') })], { perspective: '成年雨燕 · 南迁' });
add(6, 'migration-arrival', '越过海风，进入另一种暖季', 1645, '红海附近 → 非洲南部 · 压缩路段', 'sea', [
  '这一段压缩了海风与后续许多路程。沿途停留不等于必须落地，整个迁程也不是匀速直飞。',
  '抵达越冬区后，食物和天气再次决定生活的节奏。',
], [c('migrate', '穿过天空，进入越冬季', '30 秒互动 · 压缩后的路段', '许多天空之后，你抵达非洲南部越冬区域。', { flight: 'migrate', effect: { energy: -4, flags: ['wintering'] } })], { perspective: '成年雨燕 · 南迁' });

add(7, 'home-departure', '二月，北方还很远', 1760, '非洲南部 → 北返途中', 'savanna', [
  '季节使方向再次改变。你将离开越冬区，回到北方繁殖地。',
  '眼前有食物，而下一段空域难以补给。春迁也需要身体储备，不只是越快越好。',
], [c('refuel', '利用眼前食物，再进入下段', '补给后继续北返', '你带着储备进入下一段路。', { effect: { energy: 12, health: 4, flags: ['northbound'] } }), c('no-refuel', '储备不足时跳过全部补给', '下一段难以觅食', '当前方案没有为缺食路段留下储备。', { failure: fail('北返补给方案失败', '你忽略了明确的食物条件。', '重新安排补给。春迁停留与前进需要平衡。') })], { interaction: 'route' });
add(7, 'home-return', '春风把城市带回来', 1820, '非洲 → 红海附近 → 中亚 → 北京 · 示意', 'mountains', [
  '城市轮廓重现在远处。春迁与秋迁的具体路径和节奏不必相同。',
  '这里返回的是成年鸟的繁殖巢址，不承诺所有幼鸟必定回出生巢。',
], [c('return', '完成北返，查看熟悉的巢区', '30 秒飞行 · 春迁路段', '你回到北京，但熟悉的地方还需要重新检查。', { flight: 'migrate', effect: { energy: -3, flags: ['returned'] } })]);
add(7, 'home-entry', '回到地方，还要找得到入口', 1821, '北京 · 下一季巢址检查', 'city', [
  '旧入口已经封堵，附近另一处适宜入口仍然开放，没有施工迹象。',
  '人的修缮方式改变了下一季。继续撞向记忆，还是查看现实？',
], [c('new-entry', '查看仍开放的替代巢位', '依据现实条件重新选择', '你找到一处可以继续查看和使用的空间，下一年的故事仍有机会开始。', { effect: { flags: ['home-adapted'], energy: -4 } }), c('force-old', '反复尝试进入已封闭的旧入口', '记忆中的入口已经消失', '你无法穿过封堵。', { failure: fail('记忆打不开封住的巢口', '熟悉的地方已经不能进入。', '重新寻找替代。保留入口、减少繁殖期干扰，是人可以改变的条件。') })], { interaction: 'nest-site' });

export const swift: Species = { id: 'beijing-swift', name: '北京雨燕', scientificName: 'Apus apus pekinensis', chapters: stages.map(s => s.name), events, facts };
