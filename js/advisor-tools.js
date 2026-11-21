/* ============================================================
   advisor-tools.js —— 咨询室确定性规则引擎（纯函数层）
   原则：所有数字与建议由本层产出，LLM（若有）只做解读润色。
   运行环境：浏览器(window.AdvisorTools) 与 node(module.exports) 双兼容。
   ============================================================ */
(function (root) {
  "use strict";

  var AGE_GROUPS = ["25-35", "36-45", "46-55", "56-65", "66+"];
  var ANXIETY_KEYS = ["job", "retire", "edu", "health", "mortgage", "market"];

  var ANXIETY_LABELS = {
    job: "失业降薪", retire: "养老储备", edu: "子女教育",
    health: "健康医疗", mortgage: "房贷压力", market: "市场波动"
  };

  // 基准配置（股/债/金/现金 参考带），按年龄段
  var BASE_ALLOC = {
    "25-35": { eq: 55, bond: 25, gold: 10, cash: 10 },
    "36-45": { eq: 45, bond: 30, gold: 10, cash: 15 },
    "46-55": { eq: 35, bond: 35, gold: 10, cash: 20 },
    "56-65": { eq: 25, bond: 40, gold: 10, cash: 25 },
    "66+":   { eq: 15, bond: 45, gold: 10, cash: 30 }
  };

  var KB = {
    changdeng: "https://xihongactuary.github.io/changdeng-kb/",
    cycle: "https://xihongactuary.github.io/investment-kb/cycle-kb/",
    kb1: "https://xihongactuary.github.io/actuary-kb/",
    kb2: "https://xihongactuary.github.io/actuary-kb2/",
    risk: "https://xihongactuary.github.io/risk-map/"
  };

  function u(base, file) {
    return base + encodeURI(file);
  }

  // ---------- 校验 ----------
  function validateInput(input) {
    if (!input || typeof input !== "object") return "输入必须为对象";
    if (AGE_GROUPS.indexOf(input.ageGroup) < 0)
      return "年龄段必须是 " + AGE_GROUPS.join("/") + " 之一";
    if (!Array.isArray(input.anxieties))
      return "anxieties 必须是数组";
    for (var i = 0; i < input.anxieties.length; i++) {
      if (ANXIETY_KEYS.indexOf(input.anxieties[i]) < 0)
        return "未知焦虑项：" + input.anxieties[i];
    }
    return null;
  }

  // ---------- 配置建议 ----------
  function computeAlloc(ageGroup, anxieties, hasMortgage) {
    var a = {
      eq: BASE_ALLOC[ageGroup].eq,
      bond: BASE_ALLOC[ageGroup].bond,
      gold: BASE_ALLOC[ageGroup].gold,
      cash: BASE_ALLOC[ageGroup].cash
    };
    var set = {};
    anxieties.forEach(function (k) { set[k] = true; });
    if (hasMortgage || set.mortgage) { a.cash += 5; a.eq -= 5; }
    if (set.job)     { a.cash += 5; a.eq -= 5; }
    if (set.health)  { a.cash += 5; a.eq -= 5; }
    if (set.edu)     { a.cash += 5; a.eq -= 5; }
    if (set.retire)  { a.bond += 5; a.eq -= 5; }
    if (set.market)  { a.eq -= 5; a.gold += 5; }
    // 限界
    a.eq = Math.max(10, Math.min(70, a.eq));
    a.bond = Math.max(15, Math.min(60, a.bond));
    a.gold = Math.max(5, Math.min(15, a.gold));
    a.cash = Math.max(10, Math.min(40, a.cash));
    // 归一化到 100
    var sum = a.eq + a.bond + a.gold + a.cash;
    a.eq = Math.round(a.eq * 100 / sum);
    a.bond = Math.round(a.bond * 100 / sum);
    a.gold = Math.round(a.gold * 100 / sum);
    a.cash = 100 - a.eq - a.bond - a.gold;
    return a;
  }

  // ---------- 保险配置建议 ----------
  function computeInsurance(input) {
    var age = input.ageGroup;
    var set = {};
    input.anxieties.forEach(function (k) { set[k] = true; });
    var recs = [];
    recs.push({
      item: "百万医疗险（全家）",
      why: "小额保费撬动大额医疗报销，是所有配置的第一顺位。",
      url: u(KB.kb1, "12-百万医疗险.html")
    });
    if (age !== "66+") {
      recs.push({
        item: "重疾险（保额≥3年收入）",
        why: "收入中断 + 医疗自付的双击防御；保额以「3 年家庭年支出」为锚。",
        url: u(KB.kb1, "11-买重疾险.html")
      });
    }
    if (input.hasMortgage || set.job) {
      recs.push({
        item: "定期寿险（覆盖房贷余额）",
        why: "家庭支柱的责任险：保额至少覆盖房贷余额 + 子女成年前的开销。先看懂保单价格再买。",
        url: u(KB.kb1, "06-保单价格拆解.html")
      });
    }
    if (age === "46-55" || age === "56-65" || age === "66+" || set.retire) {
      recs.push({
        item: "年金险（养老现金流）",
        why: "低利率时代用长期合同锁定利率，把「活得太久钱不够」的长寿风险转移出去。买入前先算 IRR。",
        url: u(KB.kb1, "13-年金险IRR.html")
      });
    }
    if (age === "66+") {
      recs.push({
        item: "老年意外险 + 防癌医疗",
        why: "66 岁后重疾险费率过高，以老年意外与防癌医疗补位更划算。",
        url: u(KB.kb1, "15-保险公司安全网.html")
      });
    }
    if (set.market || set.retire) {
      recs.push({
        item: "储蓄险（分红/万能）按「演示打折」理解",
        why: "演示利率≠保证收益；一切以写入合同的现金价值与 IRR 为准。",
        url: u(KB.kb1, "14-分红万能演示利率.html")
      });
    }
    recs.push({
      item: "顺序原则：先保额后储蓄",
      why: "保额型产品（医疗/重疾/寿险/意外）未配齐前，不动任何储蓄型产品。",
      url: u(KB.kb1, "00-序言.html")
    });
    return recs;
  }

  // ---------- 风险管理建议 ----------
  function computeRisk(input) {
    var set = {};
    input.anxieties.forEach(function (k) { set[k] = true; });
    var months = 6;
    if (set.job || set.mortgage || input.hasMortgage) months += 3;
    if (set.health) months += 3;
    if (set.edu) months += 2;
    months = Math.min(12, months);
    return {
      emergencyMonths: months,
      items: [
        {
          item: "应急现金 ≥ " + months + " 个月刚性支出",
          why: "货币基金/短债存放，随取随用；这是家庭财务的第一道堤坝。",
          url: u(KB.changdeng, "13-存款篇.html")
        },
        {
          item: "杠杆红线：负债率 ≤ 50%，月供 ≤ 收入 40%",
          why: "超过红线先降杠杆，再谈投资。",
          url: u(KB.changdeng, "14-提前还贷篇.html")
        },
        {
          item: "三条投资纪律（写在纸上）",
          why: "单一资产 ≤ 30%、最大可承受回撤事先确定、永不借钱投资。",
          url: u(KB.cycle, "playbook.html")
        },
        {
          item: "防骗三不：不听高息、不信无风险高收益、不碰不懂的产品",
          why: "骗局专盯「想快富」的中产——保住本金的老规矩。",
          url: u(KB.changdeng, "16-防骗篇.html")
        },
        {
          item: "全家保单清单化",
          why: "把每张保单的保额/保障期/缴费期列成表，对照缺口逐年补齐。",
          url: u(KB.risk, "baoxian.html")
        }
      ]
    };
  }

  // ---------- 趋势判断 ----------
  function computeTrend(ageGroup) {
    var young = ageGroup === "25-35" || ageGroup === "36-45";
    return {
      regime: "冬末春初",
      text: (young
        ? "当下处于「冬末春初」：利率之冬仍在（10 年国债约 1.6%），权益市场磨底后孕育修复。年轻意味着人力资本丰厚、纠错能力强，可以在守正（保障+应急金）到位后，用定投与分批为春天播种——本金是你最大的资产，别让它暴露在单一赌注里。"
        : "当下处于「冬末春初」：利率之冬仍在（10 年国债约 1.6%），权益市场磨底后孕育修复。中年以后「输不起」的权重上升，配置上先保证现金流与保障，再以更低的权益仓位、更分散的品种参与修复行情——稳住节奏比抢反弹重要。"),
      url: u(KB.cycle, "locator.html")
    };
  }

  // ---------- 待时四问 ----------
  function computeFourQuestions(input, alloc, risk) {
    var anxious = input.anxieties.map(function (k) {
      return ANXIETY_LABELS[k];
    }).join("、") || "无明显焦虑";
    return {
      now: {
        q: "当下怎么办？",
        a: "先守正：应急现金补足到 " + risk.emergencyMonths +
          " 个月刚性支出，保额型保险配齐；投资端保持纪律，权益参考带 " +
          alloc.eq + "%，分批执行不一把梭。你的焦虑点（" + anxious +
          "）里，哪一条最扎心，就先把那一器的口子补上。"
      },
      future: {
        q: "未来怎么看？",
        a: "以「冬末春初」为基准情景：低利率会持续压制无风险收益，权益修复需要盈利确认。不预测顶底，只跟随季节——每季度用周期定位器复核一次自己的仓位与季节是否匹配。"
      },
      risk: {
        q: "风险怎么应对？",
        a: "四步法：能规避的规避（不加危险杠杆）、能降低的降低（分散、控仓）、该转移的转移（保险转移大病/意外/长寿）、无法转移的自留（应急现金 " +
          risk.emergencyMonths + " 个月）。每一步都有对应工具，见风险管理清单。"
      },
      opportunity: {
        q: "机遇如何抓取？",
        a: "机遇只留给「守正在手」的人：保障齐、现金足，才能在市场便宜时有钱有胆分批买进。把「看得懂的时机」写进纪律（估值分位、盈利拐点），其余时间种好自家田。"
      }
    };
  }

  // ---------- 不焦虑建议 ----------
  function computeZen(input) {
    return [
      "守正：你无法控制市场，但可以控制保障、现金与仓位——控制力所在，焦虑就减少。",
      "待时：财富增长是四季的事，不是今晚的事；把期限拉长到十年，波动就成了风景。",
      "坐看云起：把最坏的情形算清楚并接受它，剩下的交给时间——「行到水穷处，坐看云起时」。"
    ];
  }

  // ---------- 汇总 ----------
  function generatePlan(input) {
    var err = validateInput(input);
    if (err) throw new Error(err);
    var anxieties = input.anxieties.slice();
    var hasMortgage = !!input.hasMortgage;
    var alloc = computeAlloc(input.ageGroup, anxieties, hasMortgage);
    var trend = computeTrend(input.ageGroup);
    var insurance = computeInsurance({ ageGroup: input.ageGroup,
      anxieties: anxieties, hasMortgage: hasMortgage });
    var risk = computeRisk({ ageGroup: input.ageGroup,
      anxieties: anxieties, hasMortgage: hasMortgage });
    var fourQ = computeFourQuestions({ ageGroup: input.ageGroup,
      anxieties: anxieties }, alloc, risk);
    var investLinks = [
      { t: "配置篇：像农民一样规划四季",
        url: u(KB.changdeng, "11-配置篇.html") },
      { t: "数学篇：跌 50% 要涨 100%",
        url: u(KB.changdeng, "10-数学篇.html") },
      { t: "趋势篇：低利率时代生存指南",
        url: u(KB.changdeng, "18-趋势篇.html") }
    ];
    return {
      profile: { ageGroup: input.ageGroup,
        anxieties: anxieties.map(function (k) { return ANXIETY_LABELS[k]; }),
        hasMortgage: hasMortgage },
      alloc: alloc,
      trend: trend,
      investLinks: investLinks,
      insurance: insurance,
      risk: risk,
      fourQuestions: fourQ,
      zen: computeZen(input),
      generatedAt: new Date().toISOString().slice(0, 16).replace("T", " ")
    };
  }

  var AdvisorTools = {
    AGE_GROUPS: AGE_GROUPS,
    ANXIETY_KEYS: ANXIETY_KEYS,
    ANXIETY_LABELS: ANXIETY_LABELS,
    validateInput: validateInput,
    computeAlloc: computeAlloc,
    computeInsurance: computeInsurance,
    computeRisk: computeRisk,
    computeTrend: computeTrend,
    computeFourQuestions: computeFourQuestions,
    computeZen: computeZen,
    generatePlan: generatePlan
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = AdvisorTools;
  } else {
    root.AdvisorTools = AdvisorTools;
  }
})(typeof window !== "undefined" ? window : globalThis);
