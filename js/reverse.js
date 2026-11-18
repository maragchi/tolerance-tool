/* 公差反查页 UI，计算全部走 /js/iso286.js */
(function () {
  'use strict';
  var I = window.ISO286;
  if (!I) return;

  var INITIAL = 20;
  var shownFits = 0;
  var lastFitResult = null;

  function $(id) { return document.getElementById(id); }
  function val(id) { return $(id).value; }
  function num(id) { return parseFloat(val(id)); }

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

  function fmtPair(upper, lower) {
    return I.formatUm(upper) + ' / ' + I.formatUm(lower) + ' μm';
  }

  function fmtClr(v) {
    var n = +(+v).toFixed(1);
    if (n === 0) return '0 μm';
    return (n > 0 ? '+' : '') + n + ' μm';
  }

  function showError(box, msg) {
    box.innerHTML = '<p class="rev-msg error">' + msg + '</p>';
  }

  function runDev() {
    var box = $('devResult');
    var dim = num('devDim');
    var unit = val('devUnit');
    var upper = I.toUm(num('devUpper'), unit);
    var lower = I.toUm(num('devLower'), unit);
    var isHole = selectedKind() === 'hole';
    var r = I.findCodesByDeviation(dim, upper, lower, isHole, { limitClose: 8 });
    if (r.error) { showError(box, r.error); return; }

    var rows = r.exact.length ? r.exact : r.closest;
    var title = r.exact.length
      ? ('精确匹配 ' + r.exact.length + ' 个' + (isHole ? '孔' : '轴') + '公差带')
      : ('没有精确匹配，下面是最接近的 ' + rows.length + ' 个（按接近程度排列）');
    var html = '<p class="rev-msg">' + title +
      '。查询：Φ' + r.dim + ' ' + (isHole ? '孔' : '轴') + ' ' +
      I.formatUm(r.queryUpper) + ' / ' + I.formatUm(r.queryLower) + ' μm。</p>';
    if (!r.exact.length) {
      html += '<p class="rev-note">接近程度：先比较 max(|Δ上偏差|, |Δ下偏差|)，相同时再比较两者绝对值之和。差值单位为 μm，正值表示该代号比查询值更大（更正）。</p>';
    }
    html += '<div class="table-scroll"><table class="rev-table"><thead><tr>' +
      '<th>代号</th><th>上偏差</th><th>下偏差</th><th>IT</th>' +
      (r.exact.length ? '' : '<th>Δ上 (μm)</th><th>Δ下 (μm)</th><th>接近度</th>') +
      '</tr></thead><tbody>';
    rows.forEach(function (row) {
      html += '<tr class="' + (row.exact ? 'exact' : '') + '"><td class="mono">' + row.code + '</td>' +
        '<td class="mono">' + I.formatUm(row.upper) + ' μm</td>' +
        '<td class="mono">' + I.formatUm(row.lower) + ' μm</td>' +
        '<td class="mono">IT' + row.grade + '（' + row.it + ' μm）</td>';
      if (!r.exact.length) {
        html += '<td class="mono">' + I.formatUm(row.dUpper) + '</td>' +
          '<td class="mono">' + I.formatUm(row.dLower) + '</td>' +
          '<td class="mono">' + row.chebyshev + '（和 ' + row.manhattan + '）</td>';
      }
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    html += '<p class="rev-note">数值来自本站与「公差配合查询」共用的 ISO 286 / GB/T 1800 数据，范围 1~500 mm、IT5~IT13。可到 <a href="/fit/">公差配合查询</a> 核对极限尺寸。</p>';
    box.innerHTML = html;
  }

  function typeClass(t) {
    if (t === 'clearance') return 'clearance';
    if (t === 'interference') return 'interference';
    return 'transition';
  }

  function renderFits(all) {
    var box = $('fitResult');
    var rows = lastFitResult.matches;
    var show = rows.slice(0, shownFits);
    var html = '<p class="rev-msg">共 ' + lastFitResult.total + ' 组配合的实际间隙范围落在所给区间内' +
      '（Φ' + lastFitResult.dim + '，要求 ' + fmtClr(lastFitResult.reqMin) + ' ~ ' + fmtClr(lastFitResult.reqMax) +
      '）。常用配合（本站「公差配合查询」的常用配合列表）和基孔制（H 孔）排在前面。</p>';
    if (!rows.length) {
      box.innerHTML = html + '<p class="rev-msg">没有符合该范围的配合。可放宽最小 / 最大间隙后再查。</p>';
      return;
    }
    html += '<div class="table-scroll"><table class="rev-table"><thead><tr>' +
      '<th>配合</th><th>类型</th><th>孔偏差</th><th>轴偏差</th><th>实际最小间隙</th><th>实际最大间隙</th></tr></thead><tbody>';
    show.forEach(function (row) {
      html += '<tr>' +
        '<td class="mono">' + row.code + (row.preferred ? ' <span class="pref">常用</span>' : '') + '</td>' +
        '<td><span class="fit-type ' + typeClass(row.fitType) + '">' + row.fitTypeShort + '</span></td>' +
        '<td class="mono">' + fmtPair(row.holeUpper, row.holeLower) + '</td>' +
        '<td class="mono">' + fmtPair(row.shaftUpper, row.shaftLower) + '</td>' +
        '<td class="mono">' + fmtClr(row.minClearance) + '</td>' +
        '<td class="mono">' + fmtClr(row.maxClearance) + '</td>' +
        '</tr>';
    });
    html += '</tbody></table></div>';
    if (shownFits < rows.length) {
      html += '<p class="rev-more"><button type="button" class="rev-more-btn" id="showMoreFits">再显示 20 条（还有 ' +
        (rows.length - shownFits) + ' 条）</button></p>';
    } else if (rows.length > INITIAL) {
      html += '<p class="rev-note">已显示全部 ' + rows.length + ' 条。</p>';
    }
    html += '<p class="rev-note">实际最小 / 最大间隙必须都落在要求范围内才会列出。负值表示过盈。数值与「公差配合查询」同源。</p>';
    box.innerHTML = html;
    var btn = $('showMoreFits');
    if (btn) {
      btn.addEventListener('click', function () {
        shownFits = Math.min(shownFits + 20, lastFitResult.matches.length);
        renderFits();
      });
    }
  }

  function runFit() {
    var dim = num('fitDim');
    var unit = val('fitUnit');
    var reqMin = I.toUm(num('fitMin'), unit);
    var reqMax = I.toUm(num('fitMax'), unit);
    var r = I.findFitsByClearance(dim, reqMin, reqMax, { initial: INITIAL });
    if (r.error) { showError($('fitResult'), r.error); lastFitResult = null; return; }
    lastFitResult = r;
    shownFits = Math.min(INITIAL, r.matches.length) || INITIAL;
    renderFits();
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