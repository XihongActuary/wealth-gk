/* ============================================================
   atlas.js —— 财富星图 v2
   伪 3D 知识星空：14 颗页面恒星（赤道环）+ 87 颗知识行星
   （围绕各自恒星成簇分布）+ 8 座知识库星云（高纬环）。
   知识行星携带迷你曲线图（9 张），点击弹出图表+解释+深链。
   支持整站自转、拖拽旋转、悬停点亮、点击跳转/弹卡；
   亦可内嵌（index.html #atlasHost 容器模式）。
   无外部依赖，Canvas 2D 实现。
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 数据 ---------- */
  var KB = "https://xihongactuary.github.io/";

  var PAGES = [
    { t: "总纲",   href: "index.html",      c: "#d8b25a", d: "守正待时：这个网站的骨架与哲学" },
    { t: "来处",   href: "origin.html",     c: "#5fae94", d: "中产从哪里来：一套房的来历与代价" },
    { t: "困境",   href: "dilemma.html",    c: "#9a938a", d: "行到水穷处：中产家庭的四重夹击" },
    { t: "现状",   href: "now.html",        c: "#e05540", d: "时之所处：实时行情与利率坐标" },
    { t: "趋势",   href: "trend.html",      c: "#d8b25a", d: "识时：周期四季，判断此刻是春是冬" },
    { t: "国际",   href: "international.html", c: "#5fae94", d: "他山之石：美日走过的利率下行之路" },
    { t: "投资",   href: "invest.html",     c: "#d8b25a", d: "待时而动：长凳投资学四条路" },
    { t: "保险",   href: "insure.html",     c: "#e05540", d: "藏器于身：精算师说保险两季七十篇" },
    { t: "风险",   href: "risk.html",       c: "#e08a6d", d: "守正之本：家庭风险地图与保障缺口" },
    { t: "精算思维", href: "thinking.html", c: "#5fae94", d: "像精算师一样思考，精算这一生" },
    { t: "咨询室", href: "advisor.html",    c: "#e05540", d: "待时四问：年龄+焦虑 → 四维方案" },
    { t: "预约咨询", href: "consult.html",  c: "#e05540", d: "99 元家庭财富体检 / 499 元一对一" },
    { t: "延伸资源", href: "resources.html", c: "#d8b25a", d: "公众号、星球与官方数据源" },
    { t: "尾声",   href: "ending.html",     c: "#9a938a", d: "坐看云起时：守正待时的落点" }
  ];

  /* ---------- 迷你曲线图数据（年末/关键时点约值，仅作示意） ---------- */
  var Y11 = ["2016","2017","2018","2019","2020","2021","2022","2023","2024","2025","2026"];
  var CH = {
    cn10y: {
      yMin: 1.2, yMax: 4.2, unit: "%", x: Y11,
      src: "中国债券信息网 · 中债国债收益率曲线",
      series: [{ name: "中债10年期国债收益率", c: "#d8b25a", d: [3.0,3.9,3.2,3.1,3.3,2.8,2.8,2.6,1.7,1.75,1.61] }]
    },
    jp10y: {
      yMin: -0.3, yMax: 8, unit: "%", x: ["1990","1995","2000","2005","2010","2015","2020","2024"],
      src: "日本财务省 · 日本银行",
      series: [{ name: "日本10年期国债收益率", c: "#5fae94", d: [7.5,3.0,1.7,1.4,1.1,0.3,-0.1,1.1] }]
    },
    us10y: {
      yMin: 1, yMax: 6, unit: "%", x: ["2007中","2007末","2008","2009","2010","2011","2012"],
      src: "美国财政部 · FRED",
      series: [{ name: "美国10年期国债收益率", c: "#e05540", d: [5.3,4.1,2.2,3.9,3.3,1.9,1.6] }]
    },
    curves: {
      yMin: 0, yMax: 2.8, unit: "%", x: ["1年","2年","3年","5年","7年","10年","20年","30年"],
      src: "中国债券信息网 · 美国财政部 · 日本财务省",
      series: [
        { name: "中国 2026", c: "#d8b25a", d: [1.35,1.35,1.40,1.50,1.55,1.61,1.90,2.05] },
        { name: "美国 2012 低点", c: "#e05540", d: [0.15,0.24,0.31,0.55,0.85,1.60,2.05,2.60] },
        { name: "日本 2003", c: "#5fae94", d: [0.02,0.05,0.10,0.30,0.60,1.00,1.20,1.30] }
      ]
    },
    crisis: {
      yMin: 50, yMax: 230, unit: "", x: ["2007","2008","2009","2010","2011","2012","2013"],
      src: "标普 · Case-Shiller · FRED · 世界银行（2007年=100）",
      series: [
        { name: "标普500", c: "#e05540", d: [100,62,67,81,89,100,115] },
        { name: "国债指数", c: "#5fae94", d: [100,112,114,105,109,105,101] },
        { name: "黄金", c: "#d8b25a", d: [100,105,133,178,205,197,158] },
        { name: "房价", c: "#9a938a", d: [100,82,76,76,72,73,80] }
      ]
    },
    spread: {
      yMin: 1.4, yMax: 4.2, unit: "%", x: Y11,
      src: "中证指数 · 中国债券信息网",
      series: [
        { name: "沪深300股息率", c: "#e05540", d: [2.0,1.8,2.2,2.1,2.1,2.0,2.3,2.6,2.9,3.0,3.1] },
        { name: "10年期国债", c: "#d8b25a", d: [3.0,3.9,3.2,3.1,3.3,2.8,2.8,2.6,1.7,1.75,1.61] }
      ]
    },
    gold: {
      yMin: 1000, yMax: 4400, unit: "$", x: Y11,
      src: "LBMA · 伦敦金银市场协会",
      series: [{ name: "伦敦金现（美元/盎司）", c: "#d8b25a", d: [1150,1300,1280,1520,1900,1830,1825,2070,2620,4000,4150] }]
    },
    nasdaq: {
      yMin: 50, yMax: 900, unit: "", x: ["2004","2006","2008","2010","2012","2014","2016","2018","2020","2022","2024","2026"],
      src: "纳斯达克 · 新浪财经（2004年=100）",
      series: [{ name: "纳斯达克指数", c: "#5fae94", d: [100,96,55,110,130,190,230,290,400,450,690,830] }]
    },
    fx: {
      yMin: 5.5, yMax: 9.2, unit: "", x: ["1994","1998","2005","2010","2014","2018","2022","2026"],
      src: "中国外汇交易中心 · 新浪财经",
      series: [{ name: "美元兑人民币", c: "#7f9fc4", d: [8.7,8.28,8.07,6.77,6.12,6.88,6.96,7.05] }]
    }
  };

  var POINTS = [
    /* ---- 总纲 ---- */
    { t: "守正待时", p: 0, d: "「藏器于身，待时而动」——《周易·系辞下》的财富版：先把自己修炼成器，再等市场给机会。", L: [["总纲", "index.html"], ["尾声", "ending.html"]] },
    { t: "藏器于身", p: 0, d: "君子的器，是认知与纪律；中产的器，是资产配置与保障。器不藏，则时来也接不住。", L: [["总纲", "index.html"]] },
    { t: "三层漏斗", p: 0, d: "免费阅读 → 99 元体检 → 499 元一对一。只收咨询费，不代销产品。", L: [["预约咨询", "consult.html"]] },
    { t: "五维中枢", p: 0, d: "现状、趋势、投资、保险、风险——五个维度一次看全，缺一不可。", L: [["总纲", "index.html"]] },
    /* ---- 来处 ---- */
    { t: "家庭资产负债表", p: 1, d: "把房子、存款、保单、负债写进一张表——所有规划的第一步。", L: [["来处", "origin.html"]] },
    { t: "中产的来处", p: 1, d: "教育改变命运的一代，财富的底色是「工资 + 房子」。", L: [["来处", "origin.html"]] },
    { t: "六个钱包", p: 1, d: "一套房掏空两代人的六个钱包——中产来处最沉重的一笔注脚。", L: [["来处", "origin.html"]] },
    { t: "房贷三十年", p: 1, d: "30 年期、等额本息——中产最大的负债，也是最长的承诺。", L: [["来处", "origin.html"]] },
    { t: "房产占比七成", p: 1, d: "中国家庭约七成资产压在房子上，流动性趋近于零。", L: [["来处", "origin.html"], ["困境", "dilemma.html"]] },
    /* ---- 困境 ---- */
    { t: "四重夹击", p: 2, d: "失业断贷、教育军备、养老缺口、投资失衡——困境页逐个拆解。", L: [["困境", "dilemma.html"]] },
    { t: "行到水穷处", p: 2, d: "王维的下半句是「坐看云起时」——困境的解法写在尾声。", L: [["困境", "dilemma.html"], ["尾声", "ending.html"]] },
    { t: "中产返贫三件套", p: 2, d: "失业、大病、被迫卖房——三件事接踵而至时，返贫比致贫更快。", L: [["困境", "dilemma.html"], ["风险", "risk.html"]] },
    { t: "教育军备竞赛", p: 2, d: "教育投入逐年攀升，回报却越来越不确定——用IRR冷静算一算。", L: [["困境", "dilemma.html"]] },
    { t: "养老缺口", p: 2, d: "社保替代率约四成，剩下的缺口要靠第二、三支柱自己补。", L: [["困境", "dilemma.html"], ["保险", "insure.html"]] },
    /* ---- 现状 ---- */
    { t: "利率坐标 1.6%", p: 3, d: "10 年期国债收益率，是所有资产定价的锚。", L: [["现状", "now.html"], ["国际", "international.html"]] },
    { t: "沪深300股息率", p: 3, d: "与国债收益率之差，是股债性价比的温度计。", L: [["现状", "now.html"]] },
    { t: "中债收益率曲线", p: 3, d: "从 1 年到 30 年，曲线的形状藏着市场对经济的全部预期。", L: [["现状", "now.html"], ["国际", "international.html"]] },
    { t: "股债性价比曲线", p: 3, chart: "spread", d: "2016–2026：股息率向上、国债收益率向下，2024 年完成历史性交叉——股票相对债券从未如此便宜。", L: [["现状", "now.html"]] },
    { t: "黄金十年曲线", p: 3, chart: "gold", d: "金价十年涨了三倍多——零利率与地缘动荡时代，黄金的计票器属性被反复验证。", L: [["现状", "now.html"], ["国际", "international.html"]] },
    { t: "纳指全史曲线", p: 3, chart: "nasdaq", d: "2004 年至今二十余倍——科技成长的力量，也藏着三次腰斩级的回撤。", L: [["现状", "now.html"], ["投资", "invest.html"]] },
    { t: "美元兑人民币曲线", p: 3, chart: "fx", d: "1994 汇改至今：8.7 → 6.1 → 7.1。汇率影响外币资产与海外消费的购买力。", L: [["现状", "now.html"]] },
    { t: "30年国债约2%", p: 3, d: "曲线长端仍有约 2%——「锁长」的窗口期还在，但不长。", L: [["现状", "now.html"], ["国际", "international.html"]] },
    { t: "LPR与房贷利率", p: 3, d: "5 年期 LPR 一路下调，存量房贷利率同步走低——旧债正在变轻。", L: [["现状", "now.html"]] },
    { t: "通胀与实际利率", p: 3, d: "CPI 低位徘徊，实际利率决定现金的真实回报——存钱也要算实际数。", L: [["现状", "now.html"]] },
    /* ---- 趋势 ---- */
    { t: "四季周期", p: 4, d: "春播、夏长、秋收、冬藏——把投资周期翻译成季节语言。", L: [["趋势", "trend.html"], ["四季周期地图", KB + "investment-kb/cycle-kb/"]] },
    { t: "美林时钟", p: 4, d: "复苏买股、过热买商品、滞胀持币、衰退买债。", L: [["四季周期地图", KB + "investment-kb/cycle-kb/"]] },
    { t: "康波周期", p: 4, d: "五十年一轮回的技术长波——冬天之后，春天照例会来。", L: [["四季周期地图", KB + "investment-kb/cycle-kb/"]] },
    { t: "朱格拉周期", p: 4, d: "十年一轮的设备更新周期——产业升级的节拍器。", L: [["四季周期地图", KB + "investment-kb/cycle-kb/"]] },
    { t: "基钦周期", p: 4, d: "三四年一轮的库存周期——最短、也最实用的择时参考。", L: [["四季周期地图", KB + "investment-kb/cycle-kb/"]] },
    { t: "货币信用周期", p: 4, d: "宽货币、宽信用的四象限组合，决定股债轮动的大方向。", L: [["趋势", "trend.html"]] },
    { t: "春播秋收纪律", p: 4, d: "冬天播种、秋天收割——周期投资的全部纪律就是别逆季节。", L: [["趋势", "trend.html"], ["投资", "invest.html"]] },
    /* ---- 国际 ---- */
    { t: "2008 危机座次", p: 5, chart: "crisis", d: "危机不改变资产的价格，改变资产的座次：美股腰斩、国债独秀、黄金翻倍、房价跌四成。", L: [["国际", "international.html"]] },
    { t: "日本三十年", p: 5, chart: "jp10y", d: "利率从 8% 到负值再到回升：国债是最长牛，存款是底线价值。", L: [["国际", "international.html"]] },
    { t: "美国危机利率曲线", p: 5, chart: "us10y", d: "2007 年中 5.3% → 金融危机直落至历史低位——危机到来时，利率是最快的temperature计。", L: [["国际", "international.html"]] },
    { t: "中债十年下行曲线", p: 5, chart: "cn10y", d: "2016–2026：3% 时代 → 2024 年破 2% → 1.6% 附近。方向与美日一致，速度介于两者之间。", L: [["国际", "international.html"], ["现状", "now.html"]] },
    { t: "中美日曲线对比", p: 5, chart: "curves", d: "当下中国曲线 vs 美国 2012 低点 vs 日本 2003：短端已接近，长端仍有约 2% 的「锁长」余地。", L: [["国际", "international.html"]] },
    { t: "锁久期", p: 5, d: "把今天的利率签成长约——低利率时代最重要的动作。", L: [["国际", "international.html"], ["资产负债管理", KB + "ca-alm-kb/"]] },
    { t: "黄金压舱", p: 5, d: "零利率时代的计票器，家庭资产的 5–10% 是常见起手量。", L: [["国际", "international.html"]] },
    { t: "日本房产三十年", p: 5, d: "东京房价直到 2020 年前后才回到泡沫高点——三十年一梦。", L: [["国际", "international.html"]] },
    { t: "零利率与保单", p: 5, d: "日本多家寿险公司因利差损破产——零利率最深的伤，写在保险业的历史里。", L: [["国际", "international.html"], ["保险", "insure.html"]] },
    { t: "套息交易", p: 5, d: "借低息日元买高息美元资产——杠杆逆转时，全球市场一起震。", L: [["国际", "international.html"]] },
    { t: "美股科技十年", p: 5, d: "零利率喂养出的美股长牛，是 2010–2020 最大的行情叙事。", L: [["国际", "international.html"], ["投资", "invest.html"]] },
    /* ---- 投资 ---- */
    { t: "长凳四条路", p: 6, d: "认资产、走现场、修情绪、修认知——长凳投资学的骨架。", L: [["长凳投资学", KB + "changdeng-kb/"]] },
    { t: "安全边际", p: 6, d: "别把最乐观的情景当计划——留出犯错的空间。", L: [["长凳投资学", KB + "changdeng-kb/"], ["精算思维", "thinking.html"]] },
    { t: "四分配置", p: 6, d: "股、债、金、现金——每年生日，再平衡一次。", L: [["投资", "invest.html"]] },
    { t: "微笑曲线与定投", p: 6, d: "下跌时坚持定投，画出的正是微笑曲线——先跌后涨才是定投的朋友。", L: [["投资", "invest.html"]] },
    { t: "复利72法则", p: 6, d: "72 ÷ 年收益率 = 翻倍年数——一把随身携带的计算器。", L: [["投资", "invest.html"], ["精算思维", "thinking.html"]] },
    { t: "股债再平衡", p: 6, d: "每年生日把比例调回原点——赚波动的钱，不做预测的事。", L: [["投资", "invest.html"]] },
    { t: "股息再投资", p: 6, d: "分红再买入——长期收益的隐形发动机，复利最好的燃料。", L: [["投资", "invest.html"]] },
    { t: "现金流资产", p: 6, d: "股息、房租、票息——不看谁的脸色也会按期发钱的资产。", L: [["投资", "invest.html"], ["国际", "international.html"]] },
    { t: "波动不是风险", p: 6, d: "波动是朋友，永久性损失才是风险——价投的第一课。", L: [["投资", "invest.html"], ["长凳投资学", KB + "changdeng-kb/"]] },
    { t: "择时的陷阱", p: 6, d: "错过涨幅最好的十天，长期收益腰斩——纪律优于预测。", L: [["投资", "invest.html"]] },
    /* ---- 保险 ---- */
    { t: "大数法则", p: 7, d: "保险定价的第一性原理：风险池越大，价格越稳。", L: [["精算师说保险·一", KB + "actuary-kb/"]] },
    { t: "三差利润", p: 7, d: "利差、费差、死差——把保险公司的赚钱机器拆开看。", L: [["精算师说保险·二", KB + "actuary-kb2/"]] },
    { t: "年金 IRR", p: 7, d: "别听销售讲情怀，用 IRR 算年金的真实回报。", L: [["精算师说保险·一", KB + "actuary-kb/"]] },
    { t: "预定利率下调", p: 7, d: "4.025% → 3.5% → 3.0% → 2.5%……老保单为何成了稀缺资产。", L: [["保险", "insure.html"]] },
    { t: "分红实现率", p: 7, d: "红利有没有兑现？分红实现率是检验保险公司成色的试金石。", L: [["精算师说保险·二", KB + "actuary-kb2/"]] },
    { t: "现金价值", p: 7, d: "退保能拿回多少——写在合同现金价值表里的数字，买前必看。", L: [["精算师说保险·一", KB + "actuary-kb/"]] },
    { t: "准备金与偿付能力", p: 7, d: "保险公司自己也要被监管盯住杠杆——偿二代体系的硬约束。", L: [["保险", "insure.html"]] },
    { t: "重疾保额三倍收入", p: 7, d: "重疾险保额的经验法则：3–5 倍年收入，覆盖三到五年的康复期。", L: [["保险", "insure.html"], ["风险", "risk.html"]] },
    { t: "寿险缺口算法", p: 7, d: "收入法或遗属需要法——把身故缺口算成具体的数字。", L: [["风险地图", KB + "risk-map/"]] },
    { t: "百万医疗免赔额", p: 7, d: "1 万元免赔额的设计，把保费降到人人买得起——杠杆的智慧。", L: [["精算师说保险·一", KB + "actuary-kb/"]] },
    { t: "增额终身寿", p: 7, d: "写进合同的现金价值表——低利率时代的「类债」资产，锁定长期利率。", L: [["精算师说保险·二", KB + "actuary-kb2/"]] },
    { t: "IFRS17 与 CSM", p: 7, d: "新准则下的利润释放机制——看懂保险股财报的钥匙。", L: [["保险", "insure.html"]] },
    /* ---- 风险 ---- */
    { t: "四象限矩阵", p: 8, d: "概率 × 损失，给家庭风险排座次。", L: [["风险地图", KB + "risk-map/"]] },
    { t: "保障缺口", p: 8, d: "身故、重疾、医疗、失能——四大缺口的算法。", L: [["风险地图", KB + "risk-map/"]] },
    { t: "应急金", p: 8, d: "6–12 个月开支——低利率时代最贵的资产是流动性。", L: [["风险", "risk.html"]] },
    { t: "双十原则", p: 8, d: "保费不超过年收入 10%，保额做到 10 倍——保障配置的锚。", L: [["风险", "risk.html"]] },
    { t: "医疗通胀", p: 8, d: "医疗费用涨幅长期高于 CPI——医疗险额度要逐年重估。", L: [["风险", "risk.html"], ["保险", "insure.html"]] },
    { t: "房贷压力线", p: 8, d: "月供不超过家庭收入三成——越过这条线，抗风险能力骤降。", L: [["风险", "risk.html"], ["来处", "origin.html"]] },
    { t: "高收益骗局", p: 8, d: "年化超过 8% 就要打问号，超过 12% 请准备损失全部本金。", L: [["风险", "risk.html"]] },
    /* ---- 精算思维 ---- */
    { t: "折现力", p: 9, d: "30 年后的 100 万今天值多少？时间本身就是利率。", L: [["精算思维知识库", KB + "actuary-kb3/"]] },
    { t: "动态修正力", p: 9, d: "每年做一次家庭财务「经验回看」，用纪律修正而非情绪。", L: [["精算思维知识库", KB + "actuary-kb3/"]] },
    { t: "人生资产负债表", p: 9, d: "健康、时间、信用都是资产——先盘点，再决策。", L: [["精算思维知识库", KB + "actuary-kb3/"]] },
    { t: "期望值思维", p: 9, d: "概率 × 损失 = 期望值——用数字代替情绪做决定。", L: [["精算思维知识库", KB + "actuary-kb3/"], ["精算思维", "thinking.html"]] },
    { t: "贝叶斯更新", p: 9, d: "新信息来了就更新判断——不赌单一剧本，不做一次定终身。", L: [["精算思维知识库", KB + "actuary-kb3/"]] },
    { t: "幸存者偏差", p: 9, d: "你看到的成功者，是筛掉失败者之后的样本——别拿彩票当理财。", L: [["精算思维知识库", KB + "actuary-kb3/"]] },
    { t: "六大能力", p: 9, d: "折现、修正、期望值、贝叶斯、翻译、平衡——精算思维的六张面孔。", L: [["精算思维", "thinking.html"], ["精算思维知识库", KB + "actuary-kb3/"]] },
    /* ---- 咨询室 ---- */
    { t: "待时四问", p: 10, d: "年龄 + 焦虑 → 趋势、配置、保险、风险，四维一次说清。", L: [["咨询室", "advisor.html"]] },
    { t: "规则引擎+LLM", p: 10, d: "本地方案引擎，可选接入大模型——数据不出浏览器。", L: [["咨询室", "advisor.html"]] },
    { t: "四维方案", p: 10, d: "趋势判断、保险清单、投资参考、风险守正——一份可执行的家庭方案。", L: [["咨询室", "advisor.html"], ["预约咨询", "consult.html"]] },
    /* ---- 预约咨询 ---- */
    { t: "99 元财富体检", p: 11, d: "四维方案交付，15 分钟内无理由退款。", L: [["预约咨询", "consult.html"]] },
    { t: "499 一对一", p: 11, d: "一小时深度对话：盯配置、盯保单、盯现金流。", L: [["预约咨询", "consult.html"]] },
    { t: "1999 年度陪伴", p: 11, d: "每季度一次复盘、全年随时提问——陪伴式顾问（预告）。", L: [["预约咨询", "consult.html"]] },
    /* ---- 延伸资源 ---- */
    { t: "阅读口令", p: 12, d: "公众号后台回复「口令」，解锁咨询室完整方案。", L: [["延伸资源", "resources.html"]] },
    { t: "官方数据源", p: 12, d: "中债、央行、统计局、FRED、BOJ……只引一手数据。", L: [["延伸资源", "resources.html"], ["现状", "now.html"]] },
    { t: "公众号与星球", p: 12, d: "「西红精算」公众号每周更新，知识星球深度讨论。", L: [["延伸资源", "resources.html"]] }
  ];

  var KBS = [
    { t: "四季周期地图", href: KB + "investment-kb/cycle-kb/", d: "七种周期理论 · 四季资产对策 · 投资纪律 12 条" },
    { t: "长凳投资学", href: KB + "changdeng-kb/", d: "普通人的投资学：从钓鱼篇到庖丁解牛" },
    { t: "精算师说保险·一", href: KB + "actuary-kb/", d: "保险科普 19 章：大数法则到年金 IRR" },
    { t: "精算师说保险·二", href: KB + "actuary-kb2/", d: "分红险的精算内核 20 篇" },
    { t: "精算思维", href: KB + "actuary-kb3/", d: "六大能力 · 20 章：像精算师一样思考" },
    { t: "风险地图", href: KB + "risk-map/", d: "家庭风险应对与保障缺口测算" },
    { t: "资产负债管理", href: KB + "ca-alm-kb/", d: "久期匹配 · 现金流测试 · ALM 方法论" },
    { t: "投资学知识库", href: KB + "investment-kb/", d: "资产配置与长期投资的底层逻辑" }
  ];

  /* ---------- 迷你曲线图 SVG ---------- */
  function chartSVG(cfg) {
    var x0 = 34, x1 = 252, y0 = 10, y1 = 86;
    var n = cfg.series[0].d.length;
    function X(i) { return x0 + (x1 - x0) * (n === 1 ? 0.5 : i / (n - 1)); }
    function Y(v) { return y1 - (y1 - y0) * ((v - cfg.yMin) / (cfg.yMax - cfg.yMin)); }
    function fmt(v) { return String(parseFloat(v.toFixed(2))); }
    var s = '<svg viewBox="0 0 264 132" style="width:100%;display:block;margin:4px 0 0" role="img">';
    [cfg.yMax, (cfg.yMin + cfg.yMax) / 2, cfg.yMin].forEach(function (v) {
      var y = Y(v);
      s += '<line x1="' + x0 + '" y1="' + y.toFixed(1) + '" x2="' + x1 + '" y2="' + y.toFixed(1) + '" stroke="rgba(216,178,90,0.18)" stroke-width="1"/>';
      s += '<text x="' + (x0 - 4) + '" y="' + (y + 3).toFixed(1) + '" font-size="8" fill="#8a93a1" text-anchor="end">' + fmt(v) + cfg.unit + "</text>";
    });
    var step = Math.max(1, Math.ceil(n / 5));
    var shown = [];
    for (var i = 0; i < n; i += step) shown.push(i);
    if (shown[shown.length - 1] !== n - 1 && n - 1 - shown[shown.length - 1] >= 2) shown.push(n - 1);
    shown.forEach(function (i) {
      s += '<text x="' + X(i).toFixed(1) + '" y="' + (y1 + 12) + '" font-size="8" fill="#8a93a1" text-anchor="middle">' + cfg.x[i] + "</text>";
    });
    cfg.series.forEach(function (sr) {
      var pts = sr.d.map(function (v, i) { return X(i).toFixed(1) + "," + Y(v).toFixed(1); }).join(" ");
      s += '<polyline points="' + pts + '" fill="none" stroke="' + sr.c + '" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>';
      var last = sr.d[n - 1];
      s += '<circle cx="' + X(n - 1).toFixed(1) + '" cy="' + Y(last).toFixed(1) + '" r="2.2" fill="' + sr.c + '"/>';
    });
    var lx = x0, ly = y1 + 26;
    cfg.series.forEach(function (sr) {
      s += '<circle cx="' + lx + '" cy="' + (ly - 3) + '" r="3" fill="' + sr.c + '"/>';
      s += '<text x="' + (lx + 6) + '" y="' + ly + '" font-size="8.5" fill="#9aa4b1">' + sr.name + "</text>";
      lx += 14 + sr.name.length * 9.5;
    });
    s += '<text x="' + x0 + '" y="129" font-size="8" fill="#6f7885">数据来源：' + cfg.src + "（约值示意）</text>";
    s += "</svg>";
    return s;
  }

  /* ---------- 构建球面节点（知识行星围绕各自恒星成簇分布） ---------- */
  var nodes = [];
  var pageNodes = [], pagePoints = [];
  function addNode(o, latDeg, lonDeg, size, kind) {
    var lat = latDeg * Math.PI / 180, lon = lonDeg * Math.PI / 180;
    nodes.push({
      t: o.t, c: o.c || "#d8b25a", d: o.d || "", kind: kind,
      href: o.href || null, L: o.L || null, cfg: o.cfg || null, page: o.p,
      lat: lat, lon: lon, size: size
    });
  }
  var byPage = {};
  POINTS.forEach(function (q) { (byPage[q.p] = byPage[q.p] || []).push(q); });
  PAGES.forEach(function (p, i) {
    var base = i / PAGES.length * 360;
    addNode(p, 0, base, 6.5, "page");
    pageNodes.push(nodes[nodes.length - 1]);
    var pts = byPage[i] || [];
    var m = pts.length;
    var spread = Math.min(88, Math.max(24, m * 9));
    var cluster = [];
    pts.forEach(function (q, j) {
      var side = j % 2 === 0 ? 1 : -1;
      var lat = side * (24 + ((j * 29) % 16));           /* ±24~39 双层纬度 */
      if (m > 8 && j >= 8) lat = side * 52;              /* 拥挤星系第二环 */
      var lon = base + (m === 1 ? 0 : (j / (m - 1) - 0.5) * spread) + (((j * 17) % 7) - 3);
      q.cfg = q.chart ? CH[q.chart] : null;
      addNode(q, lat, lon, 3.4, "point");
      cluster.push(nodes[nodes.length - 1]);
    });
    pagePoints.push(cluster);
  });
  KBS.forEach(function (k, i) { addNode(k, (i % 2 === 0 ? 66 : -66), i / KBS.length * 360 + 30, 5, "kb"); });

  /* ---------- 画布（支持内嵌模式） ---------- */
  var host = document.getElementById("atlasHost");
  var EMBED = !!host;
  var canvas = document.getElementById("sky");
  var ctx = canvas.getContext("2d");
  var W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    W = EMBED ? host.clientWidth : window.innerWidth;
    H = EMBED ? host.clientHeight : window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  /* ---------- 背景星 ---------- */
  var bgStars = [];
  for (var i0 = 0; i0 < 240; i0++) {
    bgStars.push({
      x: Math.random(), y: Math.random(),
      r: Math.random() * 1.3 + 0.3,
      ph: Math.random() * Math.PI * 2,
      sp: 0.4 + Math.random() * 1.2
    });
  }
  var nebulae = [
    { x: 0.22, y: 0.3, r: 0.34, c: "181,61,46" },
    { x: 0.78, y: 0.62, r: 0.3, c: "47,107,90" },
    { x: 0.5, y: 0.85, r: 0.28, c: "187,138,31" }
  ];

  /* ---------- 状态 ---------- */
  var theta = 0.6, tilt = 0.35, zoom = EMBED ? 0.92 : 1;
  var targetTheta = theta, targetTilt = tilt;
  var dragging = false, moved = 0, lastX = 0, lastY = 0;
  var hoverNode = null, mouseX = -1, mouseY = -1;
  if (EMBED) canvas.style.touchAction = "pan-y"; /* 内嵌时不劫持纵向滚动 */

  function localXY(e) {
    if (!EMBED) return [e.clientX, e.clientY];
    var r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  function project(n) {
    var lon = n.lon + theta;
    var x = Math.cos(n.lat) * Math.sin(lon);
    var y = Math.sin(n.lat);
    var z = Math.cos(n.lat) * Math.cos(lon);
    var ct = Math.cos(tilt), st = Math.sin(tilt);
    var y2 = y * ct - z * st;
    var z2 = y * st + z * ct;
    var persp = 3 / (3 + z2);
    var k = Math.min(W, H) * (EMBED ? 0.33 : 0.36) * zoom;
    return {
      x: W / 2 + x * persp * k,
      y: H / 2 + y2 * persp * k + Math.min(H * 0.03, 26),
      z: z2, s: n.size * persp * (0.85 + zoom * 0.3)
    };
  }

  function drawNode(n, pr) {
    var front = pr.z > -0.15;
    var alpha = front ? (pr.z > 0.4 ? 1 : 0.55 + pr.z) : 0.22;
    if (n === hoverNode) alpha = 1;
    var r = pr.s * (n === hoverNode ? 1.5 : 1);
    ctx.beginPath();
    var g = ctx.createRadialGradient(pr.x, pr.y, 0, pr.x, pr.y, r * 3.2);
    g.addColorStop(0, hexA(n.c, 0.35 * alpha));
    g.addColorStop(1, hexA(n.c, 0));
    ctx.fillStyle = g;
    ctx.arc(pr.x, pr.y, r * 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = hexA(n.c, alpha);
    ctx.arc(pr.x, pr.y, r, 0, Math.PI * 2);
    ctx.fill();
    if (n === hoverNode) {
      ctx.beginPath();
      ctx.strokeStyle = hexA("#d8b25a", 0.9);
      ctx.lineWidth = 1.2;
      ctx.arc(pr.x, pr.y, r + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (front && (pr.s > 4.6 || n === hoverNode)) {
      ctx.font = (n.kind === "page" ? "600 13px" : "10.5px") + " 'Noto Serif SC', serif";
      ctx.fillStyle = hexA(n === hoverNode ? "#e9dfc7" : "#b9bfc9", Math.min(1, alpha + 0.15));
      ctx.textAlign = "center";
      ctx.fillText(n.t, pr.x, pr.y - r - 6);
    }
  }

  function hexA(hex, a) {
    var h = hex.replace("#", "");
    var r = parseInt(h.substr(0, 2), 16), g = parseInt(h.substr(2, 2), 16), b = parseInt(h.substr(4, 2), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }

  function draw(t) {
    ctx.fillStyle = "#0b0e13";
    ctx.fillRect(0, 0, W, H);
    nebulae.forEach(function (nb) {
      var g = ctx.createRadialGradient(nb.x * W, nb.y * H, 0, nb.x * W, nb.y * H, nb.r * Math.min(W, H));
      g.addColorStop(0, "rgba(" + nb.c + ",0.10)");
      g.addColorStop(1, "rgba(" + nb.c + ",0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    });
    bgStars.forEach(function (s) {
      var a = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 0.001 * s.sp + s.ph));
      ctx.beginPath();
      ctx.fillStyle = "rgba(223,228,236," + a.toFixed(2) + ")";
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    /* 轨道环 */
    var k = Math.min(W, H) * (EMBED ? 0.33 : 0.36) * zoom;
    ctx.strokeStyle = "rgba(216,178,90,0.10)";
    ctx.lineWidth = 1;
    [32, 52, 66].forEach(function (lat) {
      var rad = lat * Math.PI / 180;
      var ry = k * Math.abs(Math.sin(rad)) * Math.abs(Math.cos(tilt));
      ctx.beginPath();
      ctx.ellipse(W / 2, H / 2 + Math.min(H * 0.03, 26), k * Math.cos(rad), Math.max(6, k * Math.cos(rad) * Math.abs(Math.sin(tilt)) * 0.9 + ry * 0.2), 0, 0, Math.PI * 2);
      ctx.stroke();
    });

    /* 投影 */
    var proj = nodes.map(function (n) { return { n: n, pr: project(n) }; });
    proj.forEach(function (p) { p.n._pr = p.pr; });

    /* 星系连线：知识行星围绕各自恒星 */
    for (var pi = 0; pi < pageNodes.length; pi++) {
      var pn = pageNodes[pi];
      if (pn._pr.z <= -0.1) continue;
      var hot = (pn === hoverNode);
      ctx.strokeStyle = "rgba(216,178,90," + (hot ? 0.35 : 0.09) + ")";
      ctx.lineWidth = 1;
      pagePoints[pi].forEach(function (pt) {
        if (pt._pr.z <= -0.1) return;
        ctx.beginPath();
        ctx.moveTo(pn._pr.x, pn._pr.y);
        ctx.lineTo(pt._pr.x, pt._pr.y);
        ctx.stroke();
      });
    }

    proj.sort(function (a, b) { return a.pr.z - b.pr.z; });
    proj.forEach(function (p) { drawNode(p.n, p.pr); });

    /* hover pick */
    hoverNode = null;
    if (mouseX >= 0) {
      for (var j = proj.length - 1; j >= 0; j--) {
        var dx = mouseX - proj[j].pr.x, dy = mouseY - proj[j].pr.y;
        if (dx * dx + dy * dy < Math.pow(proj[j].pr.s + 8, 2) && proj[j].pr.z > -0.15) { hoverNode = proj[j].n; break; }
      }
    }

    /* 中心印章 */
    ctx.save();
    var cx = W / 2, cy = H / 2 + Math.min(H * 0.03, 26);
    var pulse = 1 + 0.03 * Math.sin(t * 0.0015);
    ctx.beginPath();
    ctx.strokeStyle = "rgba(216,178,90,0.5)";
    ctx.lineWidth = 1.4;
    ctx.arc(cx, cy, 34 * pulse * zoom * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = "rgba(181,61,46,0.4)";
    ctx.arc(cx, cy, 40 * pulse * zoom * 0.8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = "700 15px 'Noto Serif SC', serif";
    ctx.fillStyle = "rgba(233,223,199,0.92)";
    ctx.textAlign = "center";
    ctx.fillText("守正待时", cx, cy + 5);
    ctx.restore();
  }

  /* ---------- 交互 ---------- */
  var tip = document.getElementById("tip");
  var cardWrap = document.getElementById("cardWrap");
  var card = document.getElementById("card");

  canvas.addEventListener("pointerdown", function (e) {
    dragging = true; moved = 0;
    lastX = e.clientX; lastY = e.clientY;
    canvas.classList.add("dragging");
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", function (e) {
    var loc = localXY(e);
    mouseX = loc[0]; mouseY = loc[1];
    if (dragging) {
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      targetTheta += dx * 0.005;
      targetTilt = Math.max(-0.9, Math.min(0.9, targetTilt + dy * 0.004));
      lastX = e.clientX; lastY = e.clientY;
    }
    if (hoverNode) {
      canvas.style.cursor = "pointer";
      var sub = hoverNode.kind === "page" ? "进入本章 →"
              : hoverNode.kind === "kb" ? "打开知识库 ↗"
              : (hoverNode.cfg ? "点击查看曲线图" : "点击查看知识点");
      tip.innerHTML = "<b>" + hoverNode.t + "</b><span>" + (hoverNode.d || "") + "<br>" + sub + "</span>";
      tip.style.display = "block";
      if (EMBED) {
        tip.style.left = Math.min(mouseX + 16, W - 265) + "px";
        tip.style.top = Math.max(mouseY - 10, 8) + "px";
      } else {
        tip.style.left = Math.min(e.clientX + 16, W - 280) + "px";
        tip.style.top = Math.max(e.clientY - 10, 80) + "px";
      }
    } else {
      canvas.style.cursor = dragging ? "grabbing" : "grab";
      tip.style.display = "none";
    }
  });
  canvas.addEventListener("pointerup", function (e) {
    dragging = false;
    canvas.classList.remove("dragging");
    if (moved < 7 && hoverNode) { activate(hoverNode); return; }
    /* 内嵌模式：点星空空白处 → 进入全屏星图页 */
    if (EMBED && moved < 7) location.href = "atlas.html";
  });
  canvas.addEventListener("pointerleave", function () {
    mouseX = -1; mouseY = -1; dragging = false; tip.style.display = "none";
  });
  if (!EMBED) {
    canvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      zoom = Math.max(0.55, Math.min(1.8, zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    }, { passive: false });
  }

  function activate(n) {
    if (n.kind === "page") { location.href = n.href; return; }
    if (n.kind === "kb") { window.open(n.href, "_blank"); return; }
    var from = PAGES[n.page].t;
    var links = [['进入「' + from + '」章', PAGES[n.page].href]].concat(
      (n.L || []).map(function (l) { return [l[0], l[1]]; })
    );
    var seen = {}; var html = "";
    links.forEach(function (l) {
      if (seen[l[1]]) return; seen[l[1]] = 1;
      var ext = l[1].indexOf("http") === 0 ? ' target="_blank" rel="noopener"' : "";
      html += '<a href="' + l[1] + '"' + ext + ">" + l[0] + (ext ? " ↗" : " →") + "</a>";
    });
    card.innerHTML = "<h3>" + n.t + "</h3>" +
      '<div class="from">知识点 · 所属章节：' + from + "</div>" +
      '<div class="desc">' + n.d + "</div>" +
      (n.cfg ? '<div class="chart">' + chartSVG(n.cfg) + "</div>" : "") +
      html +
      '<button id="cardClose">合上卡片</button>';
    cardWrap.classList.add("open");
    document.getElementById("cardClose").onclick = function () { cardWrap.classList.remove("open"); };
  }
  cardWrap.addEventListener("click", function (e) {
    if (e.target === cardWrap) cardWrap.classList.remove("open");
  });

  /* ---------- 主循环 ---------- */
  var paused = false;
  var inView = !EMBED; /* 内嵌模式：滚出视口时暂停动画省电 */
  if (EMBED && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (en) { inView = en.isIntersecting; });
    }, { threshold: 0.02 }).observe(canvas);
  }
  document.addEventListener("visibilitychange", function () { paused = document.hidden; });
  function loop(t) {
    if (!paused && inView) {
      if (!dragging) targetTheta += 0.0012;
      theta += (targetTheta - theta) * 0.12;
      tilt += (targetTilt - tilt) * 0.12;
      draw(t);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
