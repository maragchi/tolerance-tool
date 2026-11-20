/* 表面粗糙度经验数据（场景推荐 / 加工方法可达 Ra / GB/T 1031 取样长度） —— 由 /roughness/ 原样搬出的数据表与纯查表函数（无 DOM、无页面状态）。
 * /roughness/ 与首页仪表盘共用同一份，改数值只改这里。 */
const SCENARIOS = [
  {name:'动密封面（O型圈/油封）', raMin:0.4, raMax:0.8, cost:'high', methods:'精磨', note:'防泄漏，要求严，需磨削'},
  {name:'静密封面（垫片密封）', raMin:1.6, raMax:3.2, cost:'mid', methods:'精车/精铣', note:'一般静密封'},
  {name:'滚动轴承配合面（轴颈/箱体孔）', raMin:0.4, raMax:1.6, cost:'high', methods:'精磨', note:'0级：轴颈Ra0.8/箱体孔Ra1.6；6级高精度：轴颈0.4/箱体孔0.8'},
  {name:'滑动轴承/轴颈（高速）', raMin:0.2, raMax:0.4, cost:'high', methods:'精磨', note:'减摩耐磨'},
  {name:'精密配合面（IT5-IT6）', raMin:0.4, raMax:0.8, cost:'high', methods:'精磨', note:'高精度孔轴配合'},
  {name:'普通间隙配合面（IT7-IT9）', raMin:1.6, raMax:3.2, cost:'mid', methods:'精车/精铣', note:'间隙配合，如滑动配合、低相对运动面'},
  {name:'一般配合面（IT7-IT8）/ 键槽工作面', raMin:0.8, raMax:1.6, cost:'mid', methods:'精车/精铣/磨', note:'最常用配合'},
  {name:'导轨/滑块工作面', raMin:0.4, raMax:0.8, cost:'high', methods:'精磨/刮研', note:'滑动导向'},
  {name:'安装基准面/定位面', raMin:1.6, raMax:3.2, cost:'mid', methods:'精铣/精车', note:'装配定位'},
  {name:'齿轮齿面', raMin:0.8, raMax:1.6, cost:'mid', methods:'剃齿/磨齿', note:'传动面'},
  {name:'螺纹工作牙面', raMin:1.6, raMax:3.2, cost:'mid', methods:'车/滚压', note:'连接螺纹'},
  {name:'外观装饰面（高要求）', raMin:0.4, raMax:0.8, cost:'high', methods:'抛光/精磨', note:'可见美观面'},
  {name:'一般外观面', raMin:1.6, raMax:3.2, cost:'mid', methods:'精车/精铣', note:'普通可见面'},
  {name:'半精配合面/不重要配合', raMin:3.2, raMax:6.3, cost:'low', methods:'车/铣', note:'一般机械零件'},
  {name:'非配合面/非接触面', raMin:6.3, raMax:12.5, cost:'low', methods:'粗加工', note:'自由表面'},
  {name:'粗加工面/结构件非配合', raMin:12.5, raMax:25, cost:'low', methods:'粗车/粗铣', note:'非配合结构面'},
  {name:'铸锻毛坯面', raMin:25, raMax:50, cost:'low', methods:'铸造/锻造', note:'毛坯未加工面'}
];

const METHODS = [
  {name:'砂型铸造', cat:'毛坯成型', raMin:12.5, raMax:50, cost:'low', note:'毛坯面'},
  {name:'锻造（模锻）', cat:'毛坯成型', raMin:12.5, raMax:25, cost:'low', note:'毛坯'},
  {name:'气割/锯切', cat:'毛坯成型', raMin:12.5, raMax:50, cost:'low', note:'粗分离'},
  {name:'钻孔', cat:'切削加工', raMin:6.3, raMax:25, cost:'low', note:'经济6.3~25，精密钻头极限3.2（不易稳定）'},
  {name:'粗车/粗铣/粗刨', cat:'切削加工', raMin:6.3, raMax:25, cost:'low', note:'粗加工'},
  {name:'半精车/铣', cat:'切削加工', raMin:3.2, raMax:12.5, cost:'mid', note:'半精加工（IT9~IT10）'},
  {name:'精车/精铣/精刨', cat:'切削加工', raMin:0.8, raMax:3.2, cost:'mid', note:'精加工'},
  {name:'铰孔', cat:'切削加工', raMin:0.8, raMax:3.2, cost:'mid', note:'精孔'},
  {name:'镗孔', cat:'切削加工', raMin:0.4, raMax:6.3, cost:'mid', note:'孔精加工'},
  {name:'粗磨', cat:'磨削与光整', raMin:0.4, raMax:1.6, cost:'mid', note:'磨削'},
  {name:'精磨', cat:'磨削与光整', raMin:0.1, raMax:0.4, cost:'high', note:'高精度面'},
  {name:'珩磨', cat:'磨削与光整', raMin:0.05, raMax:0.4, cost:'high', note:'孔超精'},
  {name:'超精加工', cat:'磨削与光整', raMin:0.012, raMax:0.1, cost:'vhigh', note:'超精密'},
  {name:'研磨', cat:'磨削与光整', raMin:0.012, raMax:0.1, cost:'vhigh', note:'手工/机精'},
  {name:'抛光', cat:'磨削与光整', raMin:0.025, raMax:0.8, cost:'high', note:'机械抛光，镜面可达 Ra 0.01'},
  {name:'电火花加工', cat:'特种加工', raMin:0.8, raMax:12.5, cost:'mid', note:'成型放电，精规准可达0.8'},
  {name:'线切割', cat:'特种加工', raMin:0.2, raMax:6.3, cost:'mid', note:'快走丝1.6~6.3，慢走丝0.2~1.6'},
  {name:'拉削', cat:'切削加工', raMin:0.4, raMax:3.2, cost:'mid', note:'高精度孔/键槽'},
  {name:'喷砂/喷丸', cat:'表面处理', raMin:1.6, raMax:12.5, cost:'low', note:'毛坯/装饰面强化'}
];

// Ra → 取样长度 lr / 评定长度 ln（GB/T 1031 表6，标准数据）
function findLrForRa(ra) {
  const map = [
    {min:0.008, max:0.02, minIn:true, lr:0.08, ln:0.4},
    {min:0.02, max:0.1, minIn:false, lr:0.25, ln:1.25},
    {min:0.1, max:2.0, minIn:false, lr:0.8, ln:4.0},
    {min:2.0, max:10.0, minIn:false, lr:2.5, ln:12.5},
    {min:10.0, max:80.0, minIn:false, lr:8.0, ln:40.0}
  ];
  for (const m of map) {
    const inRange = m.minIn ? (ra >= m.min && ra <= m.max) : (ra > m.min && ra <= m.max);
    if (inRange) return m;
  }
  return null;
}

const COST_LABEL = {low:'低成本', mid:'中等成本', high:'较高成本', vhigh:'极高成本'};
const COST_CLASS = {low:'cost-low', mid:'cost-mid', high:'cost-high', vhigh:'cost-vhigh'};

const COST_RANK = {low:0, mid:1, high:2, vhigh:3};
/* 按图纸 Ra 推荐加工方法时不参与推荐（首选与备选都不出现）；对照表与「现有加工方法」下拉里照常保留 */
const RA_NOT_RECOMMEND = ['喷砂/喷丸'];
function raRecommendable(m) { return RA_NOT_RECOMMEND.indexOf(m.name) < 0; }
/* 目标 Ra 与某加工方法可达区间的关系（只按页面 METHODS 的 raMin / raMax 判断，不另造数）：
   stable = 可达区间整体 ≤ 目标；ok = 区间跨过目标；limit = 目标恰为可达下限；no = 达不到 */
function raFit(m, r) {
  if (m.raMax <= r) return 'stable';
  if (m.raMin < r) return 'ok';
  if (m.raMin === r) return 'limit';
  return 'no';
}
/* 按图纸 Ra 选加工方法（由 /roughness/ raCardHTML 搬出）：可达方法按 稳妥 / 需控制 / 到下限 分组，
 * 各组按成本、表内顺序排；main = 首选，verdict = 结论短句。没有可达方法时 main 为 null。 */
function raPick(r) {
  const order = (a, b) => COST_RANK[a.cost] - COST_RANK[b.cost] || METHODS.indexOf(a) - METHODS.indexOf(b);
  const pool = METHODS.filter(raRecommendable);
  const stable = pool.filter(m => raFit(m, r) === 'stable').sort(order);
  const ok = pool.filter(m => raFit(m, r) === 'ok').sort(order);
  const limit = pool.filter(m => raFit(m, r) === 'limit').sort(order);
  const reach = stable.length + ok.length + limit.length;
  if (!reach) return { stable: stable, ok: ok, limit: limit, reach: 0, main: null, mf: 'no', verdict: '' };
  const main = stable[0] || ok[0] || limit[0];
  const mf = raFit(main, r);
  const verdict = mf === 'stable' ? main.name+'即可' : mf === 'ok' ? '可用'+main.name+'，需控制参数' : main.name+'已到可达下限';
  return { stable: stable, ok: ok, limit: limit, reach: reach, main: main, mf: mf, verdict: verdict };
}
