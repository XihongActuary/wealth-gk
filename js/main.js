/* ============================================================
   main.js —— 《中产的财富增长与守护》公共脚本
   1) 注入共享顶栏与页脚（含免责声明）
   2) 导航高亮
   3) 滚动浮现动画
   4) 迷你走势曲线 sparkline（行情页复用）
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 黑夜星空模式：尽早应用，避免闪白 ---------- */
  var NIGHT_KEY = "wealth-night";
  try {
    if (localStorage.getItem(NIGHT_KEY) === "1") {
      document.documentElement.classList.add("night");
    }
  } catch (e) { /* ignore */ }

  var NAV = [
    { href: "index.html", t: "总纲" },
    { href: "origin.html", t: "来处" },
    { href: "dilemma.html", t: "困境" },
    { href: "now.html", t: "现状" },
    { href: "trend.html", t: "趋势" },
    { href: "international.html", t: "国际" },
    { href: "invest.html", t: "投资" },
    { href: "insure.html", t: "保险" },
    { href: "risk.html", t: "风险" },
    { href: "thinking.html", t: "精算思维" },
    { href: "advisor.html", t: "咨询室" },
    { href: "consult.html", t: "预约咨询", cls: "nav-cta" },
    { href: "resources.html", t: "延伸资源" },
    { href: "ending.html", t: "尾声" }
  ];

  var DISCLAIMER =
    "本站由「西红精算」运营，内容为个人视角的知识整理与分享，不构成任何投资建议、保险购买建议或法律意见。市场有风险，决策需独立。行情数据来自公开接口（腾讯/新浪/中债），仅作参考，请以官方发布为准。";

  function buildHeader(current) {
    var h = document.createElement("header");
    h.className = "site-header";
    var links = NAV.map(function (n) {
      var cls = n.href === current ? ' class="active"' : "";
      if (n.cls) cls = (cls ? cls.slice(0, -1) + " " : ' class="') + n.cls + '"';
      return '<a href="' + n.href + '"' + cls + ">" + n.t + "</a>";
    }).join("");
    h.innerHTML =
      '<div class="nav-inner">' +
      '<a class="brand" href="index.html">' +
      '<span class="seal-mini"><span>守</span><span>正</span></span>' +
      '<span class="bt">中产的财富增长与守护</span></a>' +
      "<nav>" + links + "</nav></div>";
    return h;
  }

  function buildFooter() {
    var f = document.createElement("footer");
    f.className = "site-footer";
    f.innerHTML =
      '<div class="foot-inner">' +
      '<div class="sisters">' +
      '<a href="https://xihongactuary.github.io/changdeng-kb/" target="_blank" rel="noopener">长凳投资学</a>' +
      '<a href="https://xihongactuary.github.io/investment-kb/cycle-kb/" target="_blank" rel="noopener">四季·投资周期地图</a>' +
      '<a href="https://xihongactuary.github.io/actuary-kb/" target="_blank" rel="noopener">精算师说保险·第一季</a>' +
      '<a href="https://xihongactuary.github.io/actuary-kb2/" target="_blank" rel="noopener">精算师说保险·第二季</a>' +
      '<a href="https://xihongactuary.github.io/risk-map/" target="_blank" rel="noopener">风险地图</a>' +
      "</div>" +
      '<div>守正待时 · 君子藏器于身，待时而动 —— 《周易·系辞下》</div>' +
      '<div class="disclaimer">' + DISCLAIMER + "</div>" +
      "</div>";
    return f;
  }

  // sparkline：把序列画成迷你 SVG 折线
  // opts.axes = true 时外层加纵轴（最高/最低）与横轴（起止日期）标签
  window.sparkline = function (series, opts) {
    opts = opts || {};
    var w = 300, h = 64, pad = 4;
    if (!series || series.length < 2) {
      return '<svg class="spark" viewBox="0 0 ' + w + " " + h + '"></svg>';
    }
    var vals = series.map(function (p) { return p[1]; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var span = max - min || 1;
    var step = (w - pad * 2) / (series.length - 1);
    var pts = series.map(function (p, i) {
      var x = pad + i * step;
      var y = h - pad - ((p[1] - min) / span) * (h - pad * 2);
      return [x.toFixed(1), y.toFixed(1)];
    });
    var line = pts.map(function (p) { return p.join(","); }).join(" ");
    var last = pts[pts.length - 1];
    var color = opts.color || "#2f6b5a";
    // 网格线：axes 模式下画 5 条水平线，与纵轴刻度（最高/3/4/中/1/4/最低）对齐
    var gridLines = "";
    if (opts.axes) {
      [0, 0.25, 0.5, 0.75, 1].forEach(function (t) {
        var y = (pad + t * (h - pad * 2)).toFixed(1);
        gridLines +=
          '<line x1="' + pad + '" y1="' + y + '" x2="' + (w - pad) +
          '" y2="' + y + '" stroke="#2b2a26" stroke-opacity="0.12" ' +
          'stroke-width="1" vector-effect="non-scaling-stroke"' +
          (t === 0.5 ? ' stroke-opacity="0.22"' : "") + "/>";
      });
    }
    var area =
      '<polygon points="' + pad + "," + (h - pad) + " " + line + " " +
      last[0] + "," + (h - pad) + '" fill="' + color + '" opacity="0.08"/>';
    var svg =
      '<svg class="spark" viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none">' +
      (opts.axes ? gridLines : "") +
      area +
      '<polyline points="' + line + '" fill="none" stroke="' + color +
      '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<circle cx="' + last[0] + '" cy="' + last[1] + '" r="3" fill="' + color + '"/>' +
      "</svg>";
    if (!opts.axes) return svg;
    // 坐标轴：纵轴 最高/最低，横轴 起止日期（HTML 标签，避免 preserveAspectRatio 拉伸文字）
    function fmtV(v) {
      return v >= 10000 ? v.toLocaleString("zh-CN") :
        (Math.abs(v) < 100 ? v.toFixed(2) : Math.round(v * 100) / 100);
    }
    function fmtD(d) {
      d = String(d || "");
      return d.length >= 10 ? d.slice(0, 10) : d;
    }
    var mid = (min + max) / 2;
    var yLabels =
      '<div class="spark-yaxis"><span class="sy-max">' + fmtV(max) + "</span>" +
      '<span class="sy-mid">' + fmtV(mid) + "</span>" +
      '<span class="sy-min">' + fmtV(min) + "</span></div>";
    var xLabels =
      '<div class="spark-xaxis"><span>' + fmtD(series[0][0]) + "</span>" +
      '<span>' + fmtD(series[Math.floor(series.length / 2)][0]) + "</span>" +
      '<span>' + fmtD(series[series.length - 1][0]) + "</span></div>";
    return (
      '<div class="spark-wrap">' +
      '<div class="spark-row">' + yLabels +
      '<div class="spark-svg-box">' + svg + "</div></div>" +
      xLabels + "</div>"
    );
  };

  document.addEventListener("DOMContentLoaded", function () {
    var page =
      (document.body.getAttribute("data-page") || "index.html").trim();
    document.body.insertBefore(buildHeader(page), document.body.firstChild);
    if (page !== "atlas.html") {
      document.body.appendChild(buildFooter());
    }

    /* ---------- 昼夜切换按钮（月亮 = 黑夜星空 / 太阳 = 宣纸日间） ---------- */
    if (page !== "atlas.html") {
      var tbtn = document.createElement("button");
      tbtn.className = "night-toggle";
      tbtn.type = "button";
      tbtn.title = "黑夜星空模式 / 日间宣纸模式";
      function paintToggle() {
        tbtn.textContent = document.documentElement.classList.contains("night") ? "☀" : "🌙";
      }
      paintToggle();
      tbtn.addEventListener("click", function () {
        var on = document.documentElement.classList.toggle("night");
        try { localStorage.setItem(NIGHT_KEY, on ? "1" : "0"); } catch (e) { /* ignore */ }
        paintToggle();
      });
      document.body.appendChild(tbtn);
    }

    // 滚动浮现
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("visible");
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll(".reveal").forEach(function (el) {
      obs.observe(el);
    });
  });
})();
