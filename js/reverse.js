/* 公差反查页 UI，数据与计算全部走 /js/iso286.js；卡片样式与格式化见 /css/result-card.css、/js/result-card.js */
(function () {
  'use strict';
  var I = window.ISO286;
  var RC = window.ResultCard;
  if (!I || !RC) return;

  var MAX_ALTS = 3;

  function $(id) { return document.getElementById(id); }
  function val(id) { return $(id).value; }
  function num(id) { return parseFloat(val(id)); }
  var esc = RC.esc;

  function setMode(mode) {
    document.querySelectorAll('.rev-tab').forEach(function (t) {
      var on = t.getAttribute('data-mode') === mode;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $('panel-dev').hidden = mode !== 'dev';
    $('panel-fit').hidden = mode !== 'fit';
  }

  function selectedKind() {
    var el = document.querySelector('input[name="kind"]:checked');
    return el ? el.value : 'hole';
  }

  var r1 = RC.r1;
  function um(v) { return I.formatUm(r1(v)); }               /* 带符号：+21 / -13 / 0 */
  var abs = RC.absUm;
  function pair(u, l) { return um(u) + ' / ' + um(l) + ' μm'; }

  function showError(box, msg) {
    box.innerHTML = '<p class="rev-msg error">' + esc(msg) + '</p>';
  }

  function gradeOf(code) { return parseInt(String(code).replace(/\D/g, ''), 10); }


  var typeClass = RC.typeClass;
  var rangeText = RC.rangeText;
  var bindToggle = RC.bindToggle;



  /* ---------- 模式 1：偏差 → 代号 ---------- */

  function zoneMini(row, showDelta) {
    return '<li class="answer-alt">' +
      '<span class="answer-alt-title">' + esc(row.code) + '</span>' +
      '<span class="answer-alt-line">' + pair(row.upper, row.lower) + ' · IT' + row.grade + '</span>' +
      (showDelta ? '<span class="answer-alt-line muted">相差 上 ' + um(row.dUpper) + ' / 下 ' + um(row.dLower) + ' μm</span>' : '') +
      '</li>';
  }

  function runDev() {
    var box = $('devResult');
    var dim = num('devDim');
    var unit = val('devUnit');
    var upper = I.toUm(num('devUpper'), unit);
    var lower = I.toUm(num('devLower'), unit);
    var isHole = selectedKind() === 'hole';
    var r = I.findCodesByDeviation(dim, upper, lower, isHole, { limitClose: 1000 });
    if (r.error) { showError(box, r.error); return; }
    var kind = isHole ? '孔' : '轴';
    var q = 'Φ' + r.dim + ' ' + kind + '，输入 ' + pair(r.queryUpper, r.queryLower);
    var html = '';

    if (r.exact.length) {
      var e = r.exact[0];
      html += '<div class="answer-card exact">' +
        '<div class="answer-label">匹配代号</div>' +
        '<div class="answer-title">' + esc(e.code) + '</div>' +
        '<div class="answer-line">上偏差 <b>' + um(e.upper) + ' μm</b>（' + I.formatDev(e.upper) + ' mm），下偏差 <b>' + um(e.lower) + ' μm</b>（' + I.formatDev(e.lower) + ' mm）</div>' +
        '<div class="answer-line">IT' + e.grade + ' = ' + e.it + ' μm · ' + esc(q) + '</div>' +
        (r.exact.length > 1 ? '<div class="answer-line">同样匹配：' + r.exact.slice(1).map(function (x) { return esc(x.code); }).join('、') + '</div>' : '') +
        '</div>';
    } else {
      var list = r.closest;
      if (!list.length) { box.innerHTML = '<p class="rev-msg">该尺寸下没有可比较的公差带。</p>'; return; }
      var c = list[0];
      html += '<div class="answer-card">' +
        '<div class="answer-label">没有完全一致的代号，最接近的是</div>' +
        '<div class="answer-title">' + esc(c.code) + '</div>' +
        '<div class="answer-line">' + esc(c.code) + ' 的偏差：上 <b>' + um(c.upper) + ' μm</b>（' + I.formatDev(c.upper) + ' mm），下 <b>' + um(c.lower) + ' μm</b>（' + I.formatDev(c.lower) + ' mm），IT' + c.grade + ' = ' + c.it + ' μm</div>' +
        '<div class="answer-line">与输入相差：上偏差 <b>' + um(c.dUpper) + ' μm</b>，下偏差 <b>' + um(c.dLower) + ' μm</b>（正值表示代号比输入大）</div>' +
        '<div class="answer-line muted">' + esc(q) + '</div>' +
        '</div>';
      var alts = list.slice(1, 1 + MAX_ALTS);
      if (alts.length) {
        html += '<p class="answer-sub">其他接近的代号</p><ul class="answer-alts">' + alts.map(function (x) { return zoneMini(x, true); }).join('') + '</ul>';
      }
      var rest = list.slice(1 + MAX_ALTS);
      if (rest.length) {
        var lbl = '显示其余 ' + rest.length + ' 个';
        html += '<p class="answer-more"><button type="button" class="answer-more-btn" id="devAllBtn" aria-expanded="false">' + lbl + '</button></p>' +
          '<ul class="answer-all" id="devAll" hidden>' + rest.map(function (x) { return zoneMini(x, true); }).join('') + '</ul>';
      }
      html += '<p class="rev-note">接近程度：先看上、下偏差差值中较大的那个，再看两者之和，再看 IT 等级（细的在前）。</p>';
    }
    html += '<p class="rev-note">数值来自本站与「<a href="/fit/">公差配合查询</a>」共用的 ISO 286 / GB/T 1800 数据，范围 1~500 mm、IT5~IT13。</p>';
    box.innerHTML = html;
    bindToggle('devAllBtn', 'devAll', '收起', rest && rest.length ? '显示其余 ' + rest.length + ' 个' : '');
  }

  /* ---------- 模式 2：间隙 / 过盈 → 配合 ---------- */

  /* 常见组合：基孔制（H 孔），孔等级 = 轴等级 或 比轴粗一级 */
  function isCommonCombo(row) {
    if (!/^H\d+$/.test(row.holeCode)) return false;
    var hg = gradeOf(row.holeCode), sg = gradeOf(row.shaftCode);
    return hg === sg || hg === sg + 1;
  }

  /* 富余 = (实际最小间隙 − 要求最小) + (要求最大 − 实际最大间隙)
     = 要求区间宽度 − 配合实际变动量。越小说明孔轴公差越宽、越好加工。 */
  function decorate(row, reqMin, reqMax) {
    row.slack = r1((row.minClearance - reqMin) + (reqMax - row.maxClearance));
    row.edge = r1(Math.min(row.minClearance - reqMin, reqMax - row.maxClearance));
    return row;
  }

  function byRecommend(a, b) {
    if (a.preferred !== b.preferred) return a.preferred ? -1 : 1;
    if (a.slack !== b.slack) return a.slack - b.slack;
    if (a.edge !== b.edge) return b.edge - a.edge;
    var ae = gradeOf(a.holeCode) === gradeOf(a.shaftCode), be = gradeOf(b.holeCode) === gradeOf(b.shaftCode);
    if (ae !== be) return ae ? 1 : -1;  /* 孔比轴粗一级（如 H7/g6）更常见，排前 */
    return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
  }

  function fitMini(row) {
    var tags = '';
    if (row.preferred) tags += '<span class="answer-pref">常用</span>';
    if (!row.holeBasis) tags += '<span class="answer-tag-muted">非基孔制</span>';
    else if (!isCommonCombo(row)) tags += '<span class="answer-tag-muted">等级不常见</span>';
    return '<li class="answer-alt">' +
      '<span class="answer-alt-title">' + esc(row.code) + ' <span class="fit-badge ' + typeClass(row.fitType) + '">' + row.fitTypeShort + '</span>' + tags + '</span>' +
      '<span class="answer-alt-line">' + rangeText(row.minClearance, row.maxClearance) + '</span>' +
      '<span class="answer-alt-line muted">孔 ' + pair(row.holeUpper, row.holeLower) + ' · 轴 ' + pair(row.shaftUpper, row.shaftLower) + '</span>' +
      '</li>';
  }

  function lowSide(fv, rv) {   /* fv < rv：实际最小间隙低于要求 */
    if (rv >= 0 && fv >= 0) return '最小间隙 ' + abs(fv) + ' μm 小于要求的 ' + abs(rv) + ' μm';
    if (rv <= 0) return '最大过盈 ' + abs(fv) + ' μm 超过要求的 ' + abs(rv) + ' μm';
    return '会出现 ' + abs(fv) + ' μm 过盈，而要求最小间隙 ' + abs(rv) + ' μm';
  }
  function highSide(fv, rv) {  /* fv > rv：实际最大间隙高于要求 */
    if (rv >= 0) return '最大间隙 ' + abs(fv) + ' μm 超过要求的 ' + abs(rv) + ' μm';
    if (fv <= 0) return '最小过盈 ' + abs(fv) + ' μm 小于要求的 ' + abs(rv) + ' μm';
    return '会出现 ' + abs(fv) + ' μm 间隙，而要求至少过盈 ' + abs(rv) + ' μm';
  }

  function nearestQuick(dim, reqMin, reqMax) {
    var out = [];
    I.FIT_QUICK.forEach(function (code) {
      var p = code.split('/');
      var f = I.calcFit(dim, p[0], p[1]);
      if (!f || f.error || f.hole.deltaUnavailable || f.shaft.deltaUnavailable) return;
      var mn = r1(f.minClearance), mx = r1(f.maxClearance);
      var miss = [];
      var short = 0;
      if (mn < reqMin) { miss.push(lowSide(mn, reqMin)); short += reqMin - mn; }
      if (mx > reqMax) { miss.push(highSide(mx, reqMax)); short += mx - reqMax; }
      out.push({
        code: code, holeCode: p[0], shaftCode: p[1], holeBasis: true, preferred: true,
        holeUpper: f.hole.upper, holeLower: f.hole.lower, shaftUpper: f.shaft.upper, shaftLower: f.shaft.lower,
        minClearance: mn, maxClearance: mx, fitType: f.fitType, fitTypeShort: f.fitTypeShort,
        short: r1(short), miss: miss
      });
    });
    out.sort(function (a, b) { return a.short - b.short || (a.code < b.code ? -1 : 1); });
    return out.slice(0, 2);
  }

  function recCard(row, label, reason) {
    return '<div class="answer-card">' +
      '<div class="answer-label">' + label + '</div>' +
      '<div class="answer-title">' + esc(row.code) + ' <span class="fit-badge ' + typeClass(row.fitType) + '">' + row.fitTypeShort + '配合</span></div>' +
      '<div class="answer-line">孔 ' + esc(row.holeCode) + '：<b>' + pair(row.holeUpper, row.holeLower) + '</b>　轴 ' + esc(row.shaftCode) + '：<b>' + pair(row.shaftUpper, row.shaftLower) + '</b></div>' +
      '<div class="answer-line">实际最小间隙 <b>' + um(row.minClearance) + ' μm</b>，最大间隙 <b>' + um(row.maxClearance) + ' μm</b>（负值为过盈）</div>' +
      '<div class="answer-advice">' + reason + '</div>' +
      '</div>';
  }

  function runFit() {
    var box = $('fitResult');
    var dim = num('fitDim');
    var unit = val('fitUnit');
    var reqMin = I.toUm(num('fitMin'), unit);
    var reqMax = I.toUm(num('fitMax'), unit);
    var r = I.findFitsByClearance(dim, reqMin, reqMax, { initial: 20 });
    if (r.error) { showError(box, r.error); return; }
    reqMin = r.reqMin; reqMax = r.reqMax;
    var all = r.matches.map(function (row) { return decorate(row, reqMin, reqMax); });
    var common = all.filter(isCommonCombo).sort(byRecommend);
    var reqText = rangeText(reqMin, reqMax);
    var html = '<p class="rev-msg">Φ' + r.dim + '，要求' + reqText + '（实际最小 / 最大间隙都要落在 ' + um(reqMin) + ' ~ ' + um(reqMax) + ' μm 内）。</p>';

    if (common.length) {
      var best = common[0];
      var why = (best.preferred ? '常用配合，' + rangeText(best.minClearance, best.maxClearance) + ' 落在要求范围内。'
        : '常用配合都不满足；这是基孔制常见组合里公差最宽（最好加工）的一组，' + rangeText(best.minClearance, best.maxClearance) + ' 落在要求范围内。');
      html += recCard(best, '推荐配合', why);
      var alts = common.slice(1, 1 + MAX_ALTS);
      if (alts.length) {
        html += '<p class="answer-sub">备选</p><ul class="answer-alts">' + alts.map(fitMini).join('') + '</ul>';
      }
    } else {
      html += '<div class="answer-card none"><div class="answer-label">结论</div>' +
        '<div class="answer-none">没有常见配合满足</div>' +
        '<div class="answer-line">基孔制、孔轴等级相同或孔粗一级的组合里，没有一组的实际间隙完全落在要求范围内。下面是最接近的常用配合：</div></div>';
      var near = nearestQuick(r.dim, reqMin, reqMax);
      if (near.length) {
        html += '<ul class="answer-alts">' + near.map(function (n) {
          return '<li class="answer-alt">' +
            '<span class="answer-alt-title">' + esc(n.code) + ' <span class="fit-badge ' + typeClass(n.fitType) + '">' + n.fitTypeShort + '</span><span class="answer-pref">常用</span></span>' +
            '<span class="answer-alt-line">' + rangeText(n.minClearance, n.maxClearance) + '</span>' +
            '<span class="answer-alt-line warn">差在：' + n.miss.join('；') + '</span>' +
            '<span class="answer-alt-line muted">孔 ' + pair(n.holeUpper, n.holeLower) + ' · 轴 ' + pair(n.shaftUpper, n.shaftLower) + '</span>' +
            '</li>';
        }).join('') + '</ul>';
      }
    }

    if (all.length) {
      var lbl = '显示全部 ' + all.length + ' 组';
      var full = all.slice().sort(function (a, b) {
        if (a.group !== b.group) return a.group - b.group;
        return byRecommend(a, b);
      });
      html += '<p class="answer-more"><button type="button" class="answer-more-btn" id="fitAllBtn" aria-expanded="false">' + lbl + '</button></p>' +
        '<div id="fitAll" class="answer-all-box" hidden><p class="rev-note" style="margin:0 0 8px">满足要求的全部组合（含非基孔制和等级不常见的组合），常用配合在前，其余按富余从小到大。</p>' +
        '<ul class="answer-all">' + full.map(fitMini).join('') + '</ul></div>';
      html += '<p class="rev-note">排序：常用配合优先，其次按「富余」从小到大。富余 =（实际最小间隙 − 要求最小）+（要求最大 − 实际最大间隙），富余越小，孔轴公差越宽、越好加工。数值与「<a href="/fit/">公差配合查询</a>」同源。</p>';
    } else {
      html += '<p class="rev-note">任何孔轴组合都无法满足该范围，可放宽最小 / 最大间隙后再查。</p>';
    }
    box.innerHTML = html;
    bindToggle('fitAllBtn', 'fitAll', '收起', all.length ? '显示全部 ' + all.length + ' 组' : '');
  }

  function bindExamples() {
    document.querySelectorAll('[data-example]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var ex = btn.getAttribute('data-example');
        if (ex === 'h7') {
          setMode('dev');
          $('devDim').value = '25';
          $('devUpper').value = '0.021';
          $('devLower').value = '0';
          $('devUnit').value = 'mm';
          document.querySelector('input[name="kind"][value="hole"]').checked = true;
          runDev();
        } else if (ex === 'g6') {
          setMode('dev');
          var g = I.calcTolerance(50, 'g6');
          $('devDim').value = '50';
          $('devUnit').value = 'um';
          $('devUpper').value = String(g.upper);
          $('devLower').value = String(g.lower);
          document.querySelector('input[name="kind"][value="shaft"]').checked = true;
          runDev();
        } else if (ex === 'close') {
          setMode('dev');
          $('devDim').value = '25';
          $('devUpper').value = '0.020';
          $('devLower').value = '0';
          $('devUnit').value = 'mm';
          document.querySelector('input[name="kind"][value="hole"]').checked = true;
          runDev();
        } else if (ex === 'inter') {
          setMode('fit');
          $('fitDim').value = '30';
          $('fitMin').value = '-0.050';
          $('fitMax').value = '-0.010';
          $('fitUnit').value = 'mm';
          runFit();
        } else if (ex === 'clr') {
          setMode('fit');
          $('fitDim').value = '25';
          $('fitMin').value = '0.020';
          $('fitMax').value = '0.070';
          $('fitUnit').value = 'mm';
          runFit();
        }
      });
    });
  }

  document.querySelectorAll('.rev-tab').forEach(function (t) {
    t.addEventListener('click', function () { setMode(t.getAttribute('data-mode')); });
  });
  $('devForm').addEventListener('submit', function (e) { e.preventDefault(); runDev(); });
  $('fitForm').addEventListener('submit', function (e) { e.preventDefault(); runFit(); });
  bindExamples();
  setMode('dev');
})();
