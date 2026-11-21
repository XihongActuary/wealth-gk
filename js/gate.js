/* ============================================================
   gate.js —— 咨询室完整方案阅读口令（礼貌性门槛）
   ------------------------------------------------------------
   · 机制与 cas25-guide/gate.js 一致：djb2 散列 + localStorage，
     口令 XHJS25，解锁一次本机长期有效。
   · 口令发布位置：知识星球「西红精算」置顶帖 / 公众号后台回复「口令」
   · 诚实声明：纯前端口令只能挡住"随手翻看"，定位是"礼貌性
     会员标识"而非硬防线；方案摘要（配置参考带、应急月数）
     无需口令即可见。
   · 修改口令：改 PASS_HASH（djb2，32 位无符号）。
   ============================================================ */
(function () {
  "use strict";

  var PASS_HASH = 3664108585;   /* 口令：XHJS25 */
  var STORE_KEY = "wealth_gk_unlocked";

  function djb2(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) {
      h = (h * 33 + str.charCodeAt(i)) >>> 0;
    }
    return h >>> 0;
  }

  function unlocked() {
    try { return localStorage.getItem(STORE_KEY) === "1"; }
    catch (e) { return false; }
  }

  function revealAll() {
    document.querySelectorAll(".gate-hidden").forEach(function (el) {
      el.style.display = "";
    });
    var g = document.querySelector(".gate-panel");
    if (g) g.remove();
    var report = document.getElementById("report");
    if (report && !report.querySelector(".gate-unlocked-badge")) {
      var badge = document.createElement("div");
      badge.className = "gate-unlocked-badge";
      badge.textContent = "🔓 完整方案已解锁（口令记住在本机）";
      report.insertBefore(badge, report.firstChild);
    }
  }

  function buildGate(report) {
    var gate = document.createElement("div");
    gate.className = "gate-panel";
    gate.innerHTML =
      '<div class="gate-card">' +
      '<div class="gate-lock">🔒</div>' +
      "<h3>完整方案 · 阅读口令</h3>" +
      '<p style="font-size:14px">上面的<b>趋势判断</b>与<b>配置参考带</b>已免费呈现；' +
      "保险配置清单、守正风险管理清单、待时四问与「不焦虑建议」属于完整方案，输入阅读口令解锁。</p>" +
      '<div class="gate-input-row">' +
      '<input type="password" id="gate-pass" class="gate-input" placeholder="输入阅读口令" autocomplete="off">' +
      '<button id="gate-btn" class="btn-primary">解锁完整方案</button>' +
      "</div>" +
      '<p class="gate-hint">解锁一次，本机长期有效 · 不打扰后续使用</p>' +
      '<p class="gate-hint" style="font-size:13px"><b>如何获得口令：</b><br>' +
      '① 加入知识星球「<a href="https://t.zsxq.com/Bs0tQ" target="_blank" rel="noopener">西红精算</a>」，置顶帖公布口令；<br>' +
      '② 或在微信公众号「西红精算」后台回复「<b>口令</b>」获取。</p>' +
      "</div>" +
      '<div class="gate-card" style="margin-top:14px;border-style:solid">' +
      "<h3>想要更适合你家的完整方案？</h3>" +
      '<p style="font-size:14px">口令解锁的是<b>通用完整版</b>；如果你想要的是「按你家年龄、家庭结构、焦虑点定制」的书面方案，' +
      "可以考虑 <b>99 元家庭财富体检</b>（48 小时交付 + 30 分钟微信答疑，只收咨询费、不代销产品）。</p>" +
      '<div class="gate-input-row">' +
      '<a href="consult.html" class="btn-primary" style="text-decoration:none;display:inline-block">查看 99 元家庭财富体检 →</a>' +
      "</div>" +
      "</div>";
    report.insertBefore(gate, report.querySelector(".advisor-panel"));

    var input = gate.querySelector("#gate-pass");
    var btn = gate.querySelector("#gate-btn");
    function tryUnlock() {
      var v = (input.value || "").trim();
      if (!v) { input.focus(); return; }
      if (djb2(v) === PASS_HASH) {
        try { localStorage.setItem(STORE_KEY, "1"); } catch (e) {}
        revealAll();
      } else {
        input.classList.add("gate-shake");
        input.value = "";
        setTimeout(function () { input.classList.remove("gate-shake"); }, 400);
        input.focus();
      }
    }
    btn.addEventListener("click", tryUnlock);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") tryUnlock();
    });
  }

  // 生成方案后调用：未解锁则隐藏完整章节并插入口令门
  window.WGate = {
    unlocked: unlocked,
    applyToReport: function () {
      var report = document.getElementById("report");
      if (!report) return;
      if (unlocked()) { revealAll(); return; }
      // 隐藏 3/4/5 章节与禅盒（保留趋势与配置作为摘要）
      ["r-insurance", "r-risk", "r-fourq", "r-zen", "r-llm-section"]
        .forEach(function (id) {
          var el = document.getElementById(id);
          if (el) {
            var sec = el.closest(".report-section") || el.closest(".zen-box");
            if (sec) { sec.classList.add("gate-hidden"); sec.style.display = "none"; }
          }
        });
      buildGate(report);
    }
  };
})();
