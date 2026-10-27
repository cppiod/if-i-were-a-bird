export interface Source { id: string; title: string; url: string; scope: string }
export interface GuideField { title: string; text: string; source?: string; pending?: boolean }
export interface StageGuide { id: string; name: string; subtitle: string; season: string; perspective: string; mechanic: string; fields: GuideField[]; slots: string[] }
export interface MediaSlot { id: string; title: string; brief: string; stage: number }

export const sources: Source[] = [
  { id: 'beijing', title: '北京市园林绿化局：北京雨燕', url: 'https://yllhj.beijing.gov.cn/ztxx/lhysh/st/202208/t20220817_2794389.shtml', scope: '北京雨燕的形态、巢居与迁徙背景。' },
  { id: 'tracking', title: '2022 北京雨燕迁徙追踪论文', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9245314/', scope: '被追踪的北京繁殖种群；数字是样本统计，不是每只鸟的日程。' },
  { id: 'bto', title: 'BTO：普通雨燕生命周期', url: 'https://www.bto.org/learn/about-birds/birdfacts/swift', scope: '主要英国普通雨燕资料；繁殖数值不直接视为北京固定参数。' },
  { id: 'plumage', title: 'Blasco-Zumeta & Heinze：普通雨燕鉴别', url: 'https://www.blascozumeta.com/specie_files/07950_Apus_apus_E.pdf', scope: '雌雄羽色、幼成鸟差异；不能只凭单张照片确定性别。' },
  { id: 'nest', title: 'Woodland Trust：普通雨燕筑巢', url: 'https://www.woodlandtrust.org.uk/trees-woods-and-wildlife/animals/birds/swift/', scope: '普通雨燕巢材与唾液黏结；场景与阈值是游戏化设计。' },
  { id: 'calls', title: 'RSPB：普通雨燕的叫声与生活', url: 'https://www.rspb.org.uk/birds-and-wildlife/swift', scope: '普通雨燕科普；英国时序不能直接用于北京。' },
  { id: 'sanitation', title: '1998：普通雨燕亲鸟对粪囊的处理', url: 'https://www.sciencedirect.com/science/article/pii/S0003347298908399', scope: '普通雨燕录像研究；幼雏早期常见吞食粪囊，随后减少。' },
  { id: 'hobby', title: 'Hawk and Owl Trust：燕隼捕食', url: 'https://hawkandowltrust.org/learn-and-discover/about-birds-of-prey/hobby', scope: '普通雨燕的捕食者示例，不是北京当地捕食率。' },
  { id: 'art', title: '奥林匹克博物馆：妮妮与燕形风筝', url: 'https://olympic-museum-artefacts.zetcom.net/en/collection/item/131257/', scope: '文化与艺术资料，不用于生物学认种或自动取得图片使用许可。' },
];

export const mediaSlots: MediaSlot[] = [
  { id: 'intro-female', stage: 0, title: '雌鸟外形', brief: '经确认性别的雌鸟照片或视频；注明识别依据，外形近似不等于可凭照片辨性别。' },
  { id: 'intro-male', stage: 0, title: '雄鸟外形', brief: '经确认性别的雄鸟资料，与雌鸟保持相近角度和光线。' },
  { id: 'intro-form', stage: 0, title: '体态与羽色', brief: '镰刀形翼、浅色喉斑、短叉尾与飞行轮廓，图片或视频。' },
  { id: 'intro-habitat', stage: 0, title: '居住环境与食物链', brief: '巢址环境、空中昆虫和捕食者关系；可用图解或实拍。' },
  { id: 'intro-art', stage: 0, title: '艺术中的燕意象', brief: '自制或经授权的风筝、绘画等；附作者、年代与物种辨识边界。' },
  { id: 'courtship-call', stage: 1, title: '叫声与回应', brief: '上传录音或视频，标明录制地点、日期和行为情境。' },
  { id: 'courtship-display', stage: 1, title: '求偶与配对行为', brief: '经确认的行为录像；不要将所有追逐飞行都标为求偶。' },
  { id: 'nest-site', stage: 2, title: '巢址对照', brief: '安全缝隙、开阔入口、遮蔽条件与不适合巢位的对照图。' },
  { id: 'nest-build', stage: 2, title: '巢与巢材', brief: '拍摄现有资料或授权录像，不为取材接近或干扰在繁殖的鸟。' },
  { id: 'incubation-eggs', stage: 3, title: '卵与巢内位置', brief: '展示实际窝卵数及来源；不把普通雨燕样本当成北京固定值。' },
  { id: 'incubation-care', stage: 3, title: '孵卵与轮换', brief: '带日期或阶段说明的孵卵、亲鸟轮换资料。' },
  { id: 'young-newborn', stage: 4, title: '初孵幼雏', brief: '裸露皮肤、闭眼与依赖保温的形态素材；注明实际日龄。' },
  { id: 'young-growing', stage: 4, title: '羽毛生长阶段', brief: '同一只或来源明确的连续记录；不要依图片硬推所有个体的日龄。' },
  { id: 'young-fledging', stage: 4, title: '离巢前幼鸟', brief: '飞羽伸长、体态与活动能力的对照照片或视频。' },
  { id: 'young-feeding', stage: 4, title: '喂食与巢内卫生', brief: '可计时录像，用于分析喂食频次及粪囊处理；不是人工救护喂养教程。' },
  { id: 'flight-preparation', stage: 5, title: '起飞准备', brief: '巢内活动、展翼与首次离巢过程的连续记录。' },
  { id: 'flight-silhouette', stage: 5, title: '首次飞行与捕虫', brief: '真实飞行参考；游戏内控制符号不作为形态标本。' },
  { id: 'migration-route', stage: 6, title: '南迁地图与景观', brief: '自制地图或可公开使用的路线素材，区分追踪点与推定连线。' },
  { id: 'migration-flock', stage: 6, title: '迁途中同伴与觅食', brief: '有地点和行为说明的群飞素材；群飞本身不能证明轮流领航。' },
  { id: 'home-route', stage: 7, title: '北返地图', brief: '区分春季与秋季路线、节奏，保留误差和种群说明。' },
  { id: 'home-nest', stage: 7, title: '归来与巢址变化', brief: '同一巢位跨年的对比，展示保留入口与封堵修缮的差异。' },
];

export const stages: StageGuide[] = [
  { id: 'intro', name: '介绍', subtitle: '认识身体，也认识世界', season: '四月 · 北京', perspective: '观察者 → 成年雨燕', mechanic: '观察形态、食物链与环境，建立后续判断的依据。', slots: ['intro-female', 'intro-male', 'intro-form', 'intro-habitat', 'intro-art'], fields: [
    { title: '雌雄外形', text: '雌雄羽色相近；不设置靠颜色辨性别的题目。幼鸟与成鸟的羽缘等特征可有差别。', source: 'plumage' },
    { title: '体态', text: '深褐色身体、浅色喉部、细长弯翼与短叉尾，适于空中生活。外形展示区等待你的素材。', source: 'beijing' },
    { title: '居住地', text: '繁殖时利用适宜的建筑缝隙；非繁殖期的活动空间主要在天空。', source: 'beijing' },
    { title: '食物链', text: '捕食空中昆虫等小型无脊椎动物；也会成为燕隼等空中捕食者的猎物。', source: 'hobby' },
    { title: '迁徙概览', text: '北京繁殖地与非洲南部越冬区之间，连接着中国西北、中亚及红海附近等区域。', source: 'tracking' },
    { title: '艺术品中的表现', text: '燕形风筝与妮妮可作为文化入口；艺术中的“燕”不等同于已鉴定的北京雨燕。作品图像等待授权素材。', source: 'art' },
  ] },
  { id: 'courtship', name: '求偶', subtitle: '一声回应之后', season: '春季返京后', perspective: '成年雨燕', mechanic: '观察叫声与行为情境，回应、等待或退让；强行进入已占巢位会失败。', slots: ['courtship-call', 'courtship-display'], fields: [
    { title: '时间', text: '篇章从返京后的繁殖季展开，具体配对日期随个体与年份变化。', source: 'beijing' },
    { title: '叫声', text: '雨燕的尖声鸣叫可用于交流；叫声和成群绕飞不能一律解读为求偶。录音先留白。', source: 'calls' },
    { title: '舞蹈与展示', text: '不套用地面舞蹈。这里用接近、回应与共同活动表现配对，具体动作需有可靠录像再补充。', pending: true },
    { title: '互动边界', text: '玩家响应的是行为线索，不会逐句翻译鸟语，也不能靠反复点击强制获得伴侣。' },
  ] },
  { id: 'nest', name: '筑巢', subtitle: '选一处，能回来过夏天的家', season: '春末至初夏 · 示意', perspective: '成年雨燕', mechanic: '比较三个巢址的入口、遮蔽和干扰；错误选址或危险巢材会导致任务失败。', slots: ['nest-site', 'nest-build'], fields: [
    { title: '时间', text: '在繁殖准备期寻找、使用或修整巢位，不把每年都从零筑新巢作为规则。', source: 'calls' },
    { title: '地点选择', text: '适宜缝隙、进出空间、遮蔽与持续可用性需要一起考虑。修缮封堵会改变可用巢位。', source: 'beijing' },
    { title: '筑巢方式', text: '普通雨燕可收集空中材料，并用唾液黏合；不同雨燕的巢不能混用。', source: 'nest' },
    { title: '游戏规则', text: '巢址卡的风险和失败阈值是教学情境，不是野外成功概率，也不是人工巢箱施工标准。' },
  ] },
  { id: 'incubation', name: '孵化', subtitle: '温度与饥饿之间', season: '繁殖季 · 产卵之后', perspective: '共同育雏的亲鸟', mechanic: '分配六个抽象投入块，兼顾卵的照料与亲鸟觅食；全部离巢或顾此失彼会失败。', slots: ['incubation-eggs', 'incubation-care'], fields: [
    { title: '下蛋时间', text: '安排在返京、配对与巢位准备之后；具体产卵日期待北京本地资料补充，不沿用英国月份。', pending: true },
    { title: '一窝几个', text: '普通雨燕参考：通常 2—3 枚。页面保留种群说明，不作为每窝固定数量。', source: 'bto' },
    { title: '孵化多久', text: '普通雨燕参考：约 18—24 天；天气、开始计时方式与个体条件会影响观察值。', source: 'bto' },
    { title: '孵化特点', text: '亲鸟照料与自身补给需要平衡。投入块既不是小时，也不是真实轮换次数。' },
  ] },
  { id: 'rearing', name: '养育', subtitle: '把每一天，带回巢里', season: '孵出至离巢', perspective: '亲鸟 · 观察幼鸟成长', mechanic: '分别为初孵和羽毛渐丰阶段安排觅食、照料与卫生，需求随阶段变化。', slots: ['young-newborn', 'young-growing', 'young-fledging', 'young-feeding'], fields: [
    { title: '初孵', text: '晚成雏，身体裸露，依赖亲鸟；不能将会飞的缩小成鸟当成刚出生的雏鸟。', source: 'bto' },
    { title: '生长与能力', text: '从羽毛发育、活动增强，逐步到飞羽伸长和离巢准备。阶段对照留给带日龄的素材，不以一张照片规定日龄。', source: 'plumage' },
    { title: '一天喂多少次', text: '尚无本项目核实的北京野外固定值。与日龄、天气、虫量和每次食团有关；救护喂养表不能冒充亲鸟喂食频率。', pending: true },
    { title: '排泄与卫生', text: '普通雨燕录像研究记录了幼雏早期吞食粪囊的行为，随后频率降低；不能一律设计成“衔走”。', source: 'sanitation' },
    { title: '成长所需时间', text: '普通雨燕离巢参考约 37—56 天。北京种群与个体条件仍需本地复核。', source: 'bto' },
  ] },
  { id: 'flight', name: '飞行', subtitle: '第一次，天空托住身体', season: '幼鸟离巢前后', perspective: '明确切换为幼鸟', mechanic: '先判断羽毛、身体与天气是否准备好，再体验控制高度、捕虫与避开乱流。', slots: ['flight-preparation', 'flight-silhouette'], fields: [
    { title: '学习过程', text: '先展示巢内活动与生长准备，再进入首次离巢。不是像学步一样在地面反复练飞。', source: 'bto' },
    { title: '准备判断', text: '羽毛与身体未准备好时，提前离巢的方案失败。游戏给出的判断线索不构成野鸟放飞教程。' },
    { title: '独立生活', text: '离巢后需要在空中自行觅食。控制符号只服务互动，真实体态素材保持可替换。', source: 'calls' },
  ] },
  { id: 'migration', name: '迁徙', subtitle: '向南的路，先向西北', season: '七月左右至秋末 · 样本背景', perspective: '切回成年雨燕', mechanic: '根据区域、食物和天气选择路段，并体验飞行。群鸟只提供可观察的环境线索。', slots: ['migration-route', 'migration-flock'], fields: [
    { title: '起止地点与路线', text: '从北京经蒙古国、中国新疆北部及中亚，转向阿拉伯半岛、红海与非洲，抵达南部越冬区域。', source: 'tracking' },
    { title: '迁徙时间', text: '追踪样本大致七月离京、十一月到越冬区；包含沿途停留，不能理解为一直匀速直飞。', source: 'tracking' },
    { title: '所需时长', text: '该研究样本秋迁总时长约 111 天，个体有差异。只作背景，不做倒计时生存门槛。', source: 'tracking' },
    { title: '群体合作', text: '群飞不证明固定领队、轮流领航、V 字省力或空中接力喂食。暂以观察同伴活动作为寻找虫群的艺术化线索。', pending: true },
  ] },
  { id: 'home', name: '回家', subtitle: '入口还在，家才还在', season: '翌年二月至四月 · 样本背景', perspective: '成年雨燕', mechanic: '安排北返，查看旧巢是否可用；入口封堵时必须寻找替代，而非强行进入。', slots: ['home-route', 'home-nest'], fields: [
    { title: '回归时间与时长', text: '同一研究样本大致二月离开越冬区、四月抵京，春迁总时长约 64 天。', source: 'tracking' },
    { title: '返回路线', text: '返回仍经过非洲、红海附近、中亚等区域，但季节节奏与具体路径不必与南迁一致。', source: 'tracking' },
    { title: '路途中合作', text: '不虚构已证实的轮班分工。选项侧重同处食物空域、适时补给和保持安全距离。', pending: true },
    { title: '回到哪里', text: '这里展示成年繁殖鸟返回繁殖巢址，不暗示所有幼鸟必定回出生巢繁殖。入口是否保留影响下一季。', source: 'calls' },
  ] },
];
