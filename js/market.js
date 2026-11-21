/* ============================================================
   market.js —— now.html 行情卡「快照 + 实时 + 长期曲线」
   1) 用 <script> 内嵌快照（window.MARKET_SNAPSHOT）渲染，标注数据日期
   2) 每张卡片曲线支持 近30日 / 3年 / 5年 / 10年 切换
   3) 通过 <script> 注入腾讯行情接口拉实时（A股/纳指/黄金）
   4) 「更新行情」按钮随时手动刷新实时；美元指数/国债恒用快照
   ============================================================ */
(function () {
  "use strict";

  var ASSETS = [
    { id: "sh000001", title: "上证指数", icon: "🇨🇳", note:
      "A股在 3600 点一带震荡，波动加大。仓位纪律比预测更重要：长期资金分批、短期资金留余地。（详见周期地图·allocation）", links: [
      { t: "长凳投资学 · 股票篇", href: "https://xihongactuary.github.io/changdeng-kb/05-%E8%82%A1%E7%A5%A8%E7%AF%87%E4%B8%8A.html" },
      { t: "四季周期地图 · 四季资产定位", href: "https://xihongactuary.github.io/investment-kb/cycle-kb/allocation.html" },
      { t: "本站 · 投资中枢", href: "invest.html" } ] },
    { id: "sh000300", title: "沪深300", icon: "📊", note:
      "核心蓝筹的代表，是观察企业盈利与「春天信号」的主窗口。定投与分批建仓的常用基准。", links: [
      { t: "四季周期地图 · 周期定位器", href: "https://xihongactuary.github.io/investment-kb/cycle-kb/locator.html" },
      { t: "长凳投资学 · 配置篇", href: "https://xihongactuary.github.io/changdeng-kb/11-%E9%85%8D%E7%BD%AE%E7%AF%87.html" },
      { t: "本站 · 投资中枢", href: "invest.html" } ] },
    { id: "gold", title: "COMEX黄金", icon: "🥇", note:
      "金价高位运行：央行购金与避险需求是支撑，追高需谨慎。黄金宜作组合压舱石（配置建议 5–10%），而非主攻方向。", curveProxy: "曲线为黄金ETF(518880)走势代理", links: [
      { t: "长凳投资学 · 黄金篇", href: "https://xihongactuary.github.io/changdeng-kb/02-%E9%BB%84%E9%87%91%E7%AF%87.html" },
      { t: "本站 · 风险中枢", href: "risk.html" },
      { t: "本站 · 投资中枢", href: "invest.html" } ] },
    { id: "ixic", title: "纳斯达克", icon: "💻", note:
      "AI 驱动的资本开支是本轮科技行情的慢变量；高估值意味着高波动，出海配置宜分批、控制比例。", links: [
      { t: "长凳投资学 · 出海篇（纳斯达克）", href: "https://xihongactuary.github.io/changdeng-kb/08-%E5%87%BA%E6%B5%B7%E7%AF%87.html" },
      { t: "四季周期地图 · 七种周期理论", href: "https://xihongactuary.github.io/investment-kb/cycle-kb/theory.html" },
      { t: "本站 · 趋势中枢", href: "trend.html" } ] },
    { id: "diniw", title: "美元指数", icon: "💵", note:
      "海外加息预期升温、美元偏强——人民币资产配置需把汇率纳入考量。此卡暂无实时源，显示快照数据。", curveProxy: "曲线为美元兑人民币汇率代理", links: [
      { t: "四季周期地图 · 慢变量结构", href: "https://xihongactuary.github.io/investment-kb/cycle-kb/structure.html" },
      { t: "本站 · 趋势中枢", href: "trend.html" },
      { t: "本站 · 投资中枢", href: "invest.html" } ] },
    { id: "bond10y", title: "10年期国债", icon: "🏦", static: true, note:
      "收益率约 1.6%，处历史低位：低利率时代「无风险收益」大幅缩水，这是年金险锁利与债牛的同一枚硬币两面。", links: [
      { t: "长凳投资学 · 债券篇", href: "https://xihongactuary.github.io/changdeng-kb/04-%E5%80%BA%E5%88%B8%E7%AF%87.html" },
      { t: "精算师说保险 · 年金险 IRR", href: "https://xihongactuary.github.io/actuary-kb/14-%E5%B9%B4%E9%87%91IRR.html" },
      { t: "本站 · 保险中枢", href: "insure.html" } ] }
  ];

  var PERIODS = [
    { k: "30d", label: "近30日" },
    { k: "3y", label: "3年" },
    { k: "5y", label: "5年" },
    { k: "10y", label: "10年" }
  ];

  var REFRESH_SEC = 5;
  var state = {};   // id -> {series:{k:[(d,c)]}, chg, period}

  function pctFmt(p) {
    if (p === null || p === undefined) return "";
    var cls = p >= 0 ? "m-up" : "m-down";
    var sign = p >= 0 ? "▲ +" : "▼ ";
    return '<span class="' + cls + '">' + sign + p.toFixed(2) + "%</span>";
  }

  function periodFor(id) { return state[id] ? state[id].period : "30d"; }

  function seriesFor(id, k) {
    var st = state[id];
    if (!st) return [];
    if (k === "30d") return st.series30 || [];
    return (st.seriesLong && st.seriesLong[k]) || [];
  }

  function curveHtml(a) {
    var k = periodFor(a.id);
    var ser = seriesFor(a.id, k);
    var st = state[a.id];
    var chg = st ? st.chg : null;
    var color = chg !== null && chg !== undefined && chg < 0 ? "#2f6b5a" : "#b53d2e";
    var tabs = '<div class="m-periods">' + PERIODS.map(function (p) {
      return '<button class="m-period-btn' + (p.k === k ? " active" : "") +
        '" data-id="' + a.id + '" data-k="' + p.k + '">' + p.label + "</button>";
    }).join("") + "</div>";
    return tabs + window.sparkline(ser, { color: color, axes: true });
  }

  function cardHtml(a, snapAsset, mode, asOf) {
    var price = a.price, chg = a.chg_pct;
    if (snapAsset) {
      if (price === null || price === undefined) price = snapAsset.price;
      if (chg === null || chg === undefined) chg = snapAsset.chg_pct;
    }
    var badge = mode === "realtime"
      ? '<span class="m-badge realtime">实时</span>'
      : '<span class="m-badge snapshot">快照 · ' + (asOf || "") + "</span>";
    var curveNote = a.curveProxy
      ? '<div class="m-meta">' + a.curveProxy + "</div>" : "";
    return (
      '<div class="market-card clickable" id="mc-' + a.id +
      '" data-asset="' + a.id + '" title="单击放大查看">' +
      '<div class="m-head"><span class="m-name">' + a.icon + " " + a.title +
      "</span>" + badge + "</div>" +
      '<div class="m-price" id="mp-' + a.id + '">' +
      (price !== null && price !== undefined ? price.toLocaleString("zh-CN") : "—") +
      (a.id === "bond10y" ? "%" : "") + "</div>" +
      '<div class="m-chg" id="mc-chg-' + a.id + '">' + pctFmt(chg) + "</div>" +
      '<div class="m-curve" id="ms-' + a.id + '">' + curveHtml(a) + "</div>" +
      curveNote +
      '<div class="market-note">' + a.note + "</div>" +
      "</div>"
    );
  }

  function renderSnapshot(data) {
    var grid = document.getElementById("market-grid");
    var byId = {};
    (data.assets || []).forEach(function (a) { byId[a.id] = a; });
    ASSETS.forEach(function (a) {
      var s = byId[a.id] || {};
      state[a.id] = {
        series30: s.series || [], seriesLong: s.long || {},
        chg: s.chg_pct, lastPrice: s.price, period: "30d"
      };
    });
    grid.innerHTML = ASSETS.map(function (a) {
      return cardHtml(a, byId[a.id], "snapshot", data.generated_at);
    }).join("");

    var bond = data.bond10y || {};
    var el = document.getElementById("mc-chg-bond10y");
    if (el) {
      el.innerHTML = '<span class="m-meta">中债到期收益率 · ' +
        (bond.date || "") + " · " + (bond.source || "") + "</span>";
    }
    var stamp = document.getElementById("data-stamp");
    if (stamp) {
      stamp.innerHTML = '<span class="dot"></span>快照数据生成于 ' +
        data.generated_at + " · 尝试刷新实时行情…";
    }
    bindInteractions();
  }

  // 全局事件委托：周期切换 + 卡片单击放大（innerHTML 重写后依然有效）
  var interactionsBound = false;
  function bindInteractions() {
    if (interactionsBound) return;
    interactionsBound = true;
    document.addEventListener("click", function (ev) {
      var tab = ev.target.closest ? ev.target.closest(".m-period-btn") : null;
      if (tab) {
        var id = tab.getAttribute("data-id"), k = tab.getAttribute("data-k");
        if (!id || !k || !state[id]) return;
        state[id].period = k;
        document.querySelectorAll('.m-period-btn[data-id="' + id + '"]')
          .forEach(function (x) {
            x.classList.toggle("active", x === tab);
          });
        redrawBy(id);
        return;
      }
      var card = ev.target.closest ? ev.target.closest(".market-card") : null;
      if (card && card.getAttribute("data-asset")) {
        openModal(card.getAttribute("data-asset"));
      }
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") closeModal();
    });
  }

  function redrawBy(id) {
    var box = document.getElementById("ms-" + id);
    if (box) box.innerHTML = curveHtml({ id: id });
    var big = document.getElementById("mm-curve");
    if (big && big.getAttribute("data-asset") === id) big.innerHTML = bigCurveHtml(id);
  }

  // ---------- 放大视图（模态） ----------
  var modalEl = null;
  function ensureModal() {
    if (modalEl) return modalEl;
    modalEl = document.createElement("div");
    modalEl.className = "market-modal";
    modalEl.id = "market-modal";
    modalEl.innerHTML =
      '<div class="mm-backdrop" data-mm-close="1"></div>' +
      '<div class="mm-panel" role="dialog" aria-modal="true">' +
      '<button class="mm-close" data-mm-close="1" aria-label="关闭">✕</button>' +
      '<div class="mm-body" id="mm-body"></div>' +
      "</div>";
    modalEl.addEventListener("click", function (ev) {
      if (ev.target.getAttribute &&
          ev.target.getAttribute("data-mm-close")) closeModal();
    });
    document.body.appendChild(modalEl);
    return modalEl;
  }

  function bigCurveHtml(id) {
    var k = periodFor(id);
    var ser = seriesFor(id, k);
    var st = state[id];
    var color = st && st.chg !== null && st.chg !== undefined && st.chg < 0
      ? "#2f6b5a" : "#b53d2e";
    var tabs = '<div class="m-periods mm-periods">' + PERIODS.map(function (p) {
      return '<button class="m-period-btn' + (p.k === k ? " active" : "") +
        '" data-id="' + id + '" data-k="' + p.k + '">' + p.label + "</button>";
    }).join("") + "</div>";
    return tabs + window.sparkline(ser, { color: color, axes: true });
  }

  function openModal(id) {
    var a = null;
    ASSETS.forEach(function (x) { if (x.id === id) a = x; });
    var st = state[id];
    if (!a || !st) return;
    var m = ensureModal();
    var price = st.lastPrice;
    var priceTxt = (price !== null && price !== undefined)
      ? price.toLocaleString("zh-CN") : "—";
    var proxy = a.curveProxy
      ? '<div class="m-meta">' + a.curveProxy + "</div>" : "";
    var links = (a.links || []).map(function (l) {
      return '<a class="mm-link" href="' + l.href + '">' +
        (l.href.indexOf("http") === 0 ? "↗ " : "→ ") + l.t + "</a>";
    }).join("");
    m.querySelector("#mm-body").innerHTML =
      '<div class="mm-head"><span class="m-name">' + a.icon + " " + a.title +
      "</span>" + pctFmt(st.chg) + "</div>" +
      '<div class="m-price mm-price">' + priceTxt +
      (id === "bond10y" ? "%" : "") + "</div>" +
      '<div class="mm-curve" id="mm-curve" data-asset="' + id + '">' +
      bigCurveHtml(id) + "</div>" + proxy +
      '<div class="market-note">' + a.note + "</div>" +
      '<div class="mm-links"><div class="mm-links-title">延伸阅读 · 相关文章与页面</div>' +
      links + "</div>";
    m.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (modalEl) modalEl.classList.remove("open");
    document.body.style.overflow = "";
  }

  // 腾讯行情解析（qt.gtimg.cn）
  function parseTencent(code, raw) {
    if (!raw) return null;
    if (code === "hf_GC") {
      var f = raw.split(",");
      var price = parseFloat(f[0]);
      var chg = parseFloat(f[1]);
      if (!isFinite(price)) return null;
      return { price: price, chg_pct: isFinite(chg) ? chg : null };
    }
    var b = raw.split("~");
    if (b.length < 33) return null;
    var p = parseFloat(b[3]), c = parseFloat(b[32]);
    if (!isFinite(p)) return null;
    return { price: p, chg_pct: isFinite(c) ? c : null };
  }

  function applyRealtime(id, val) {
    var mp = document.getElementById("mp-" + id);
    var mc = document.getElementById("mc-chg-" + id);
    var card = document.getElementById("mc-" + id);
    if (!mp || !val) return;
    mp.textContent = val.price.toLocaleString("zh-CN");
    if (mc) mc.innerHTML = pctFmt(val.chg_pct);
    if (state[id]) { state[id].chg = val.chg_pct; state[id].lastPrice = val.price; }
    // 实时后重画曲线端点颜色
    var box = document.getElementById("ms-" + id);
    if (box) box.innerHTML = curveHtml({ id: id });
    var badge = card && card.querySelector(".m-badge");
    if (badge) { badge.className = "m-badge realtime"; badge.textContent = "实时"; }
  }

  var fetching = false;
  function tryRealtime() {
    if (fetching) return;
    fetching = true;
    var btn = document.getElementById("btn-refresh");
    if (btn) { btn.disabled = true; btn.textContent = "更新中…"; }
    var s = document.createElement("script");
    var done = false;
    var timer = setTimeout(function () {
      if (!done) finish(false);
    }, REFRESH_SEC * 1000);
    function finish(ok) {
      done = true;
      fetching = false;
      clearTimeout(timer);
      if (btn) { btn.disabled = false; btn.textContent = "🔄 更新行情"; }
      var stamp = document.getElementById("data-stamp");
      if (stamp) {
        stamp.innerHTML = ok
          ? '<span class="dot" style="background:#2f6b5a"></span>实时行情已刷新 · ' +
            new Date().toLocaleTimeString("zh-CN") + " · 数据源：腾讯行情"
          : '<span class="dot"></span>实时源不可用 · 正在展示快照数据';
      }
    }
    s.charset = "gbk";
    s.src = "https://qt.gtimg.cn/q=sh000001,sh000300,usIXIC,hf_GC&t=" +
      Date.now();
    s.onload = function () {
      try {
        var codes = { sh000001: "v_sh000001", sh000300: "v_sh000300",
                      ixic: "v_usIXIC", gold: "v_hf_GC" };
        var ok = false;
        Object.keys(codes).forEach(function (id) {
          var raw = window[codes[id]];
          var val = parseTencent(id === "gold" ? "hf_GC" : "idx", raw);
          if (val) { applyRealtime(id, val); ok = true; }
        });
        finish(ok);
      } catch (e) { finish(false); }
    };
    s.onerror = function () { finish(false); };
    document.head.appendChild(s);
  }
  window.MarketRefresh = tryRealtime;

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("btn-refresh");
    if (btn) btn.addEventListener("click", tryRealtime);
    function boot(data) {
      renderSnapshot(data);
      tryRealtime();
    }
    // 优先用 script 标签内嵌的快照（file:// 与任何环境均可用）
    if (window.MARKET_SNAPSHOT && window.MARKET_SNAPSHOT.assets) {
      boot(window.MARKET_SNAPSHOT);
      return;
    }
    // 兜底：fetch JSON（http 环境下也可用）
    fetch("data/market.json", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(boot)
      .catch(function () {
        var grid = document.getElementById("market-grid");
        if (grid) {
          grid.innerHTML = '<div class="market-card"><div class="m-name">行情数据加载失败</div>' +
            '<div class="market-note">请检查网络后刷新页面，或重跑 tools/fetch_market.py 更新快照。</div></div>';
        }
        var stamp = document.getElementById("data-stamp");
        if (stamp) stamp.innerHTML = '<span class="dot"></span>行情快照不可用';
      });
  });
})();
