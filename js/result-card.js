/* 结果优先 · 共用组件的小工具（与 /css/result-card.css 配套）
 * 只做格式化与折叠，不含任何公差数据或计算。 */
(function (root) {
  'use strict';

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* μm 保留一位小数，并把 -0 归为 0 */
  function r1(v) { var n = +(+v).toFixed(1); return n === 0 ? 0 : n; }
  function absUm(v) { return String(Math.abs(r1(v))); }

  /* 把一个间隙区间（μm，过盈为负）说成工程口语：间隙 a–b / 过盈 a–b / 最大过盈 a ~ 最大间隙 b */
  function rangeText(min, max) {
    min = r1(min); max = r1(max);
    if (min >= 0) return '间隙 ' + absUm(min) + '–' + absUm(max) + ' μm';
    if (max <= 0) return '过盈 ' + absUm(max) + '–' + absUm(min) + ' μm';
    return '最大过盈 ' + absUm(min) + ' μm ~ 最大间隙 ' + absUm(max) + ' μm';
  }

  function typeClass(t) {
    if (t === 'clearance') return 'clearance';
    if (t === 'interference') return 'interference';
    return 'transition';
  }

  function badge(fitType, text) {
    return '<span class="fit-badge ' + typeClass(fitType) + '">' + esc(text) + '</span>';
  }

  /* 按钮式展开 / 收起（「显示全部 N 组」） */
  function bindToggle(btn, box, labelOpen, labelClosed) {
    if (typeof btn === 'string') btn = document.getElementById(btn);
    if (typeof box === 'string') box = document.getElementById(box);
    if (!btn || !box) return;
    btn.addEventListener('click', function () {
      var open = box.hidden;
      box.hidden = !open;
      btn.textContent = open ? labelOpen : labelClosed;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* <details class="answer-details">：展开后摘要改成「收起详细数据」，并回调（例如重排断面图文字） */
  function bindDetails(el, onOpen) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    var sum = el.querySelector('summary');
    var closedText = sum ? sum.textContent : '';
    el.addEventListener('toggle', function () {
      if (sum) sum.textContent = el.open ? '收起详细数据' : closedText;
      if (el.open && typeof onOpen === 'function') onOpen();
    });
  }

  root.ResultCard = {
    esc: esc,
    r1: r1,
    absUm: absUm,
    rangeText: rangeText,
    typeClass: typeClass,
    badge: badge,
    bindToggle: bindToggle,
    bindDetails: bindDetails
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
