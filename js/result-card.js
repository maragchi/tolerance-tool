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

  /* 配合「用法一句」：与 /fit/ 结果卡同一套文字（H7 基孔制 7 组常用配合取自 /fit/「常用配合推荐」表；
     其它组合只给按实算类型的装入方式；表内类型与实算类型不一致时退回按类型的说法）。
     注意：/fit/ 页内仍有一份相同的内联副本，改文案时两处一起改。 */
  var FIT_ADVICE = {
    'H7/g6':  { type: 'clearance',    text: '最小间隙不为 0，能相对运动；常用于滑动轴承、机床导轨、导向柱、传动轴与齿轮滑移；装配：手装 / 轻推。' },
    'H7/h6':  { type: 'clearance',    text: '定位准确，可反复拆装；常用于定位销、法兰对中、皮带轮与轴、可拆定位件；装配：手装。' },
    'H7/js6': { type: 'transition',   text: '以定位为主，偶尔拆装；常用于齿轮与轴、联轴器、蜗轮与轴；装配：木锤 / 轻压。' },
    'H7/k6':  { type: 'transition',   text: '定位并传递较小扭矩；常用于齿轮、蜗轮、飞轮、带轮与轴；装配：压装。' },
    'H7/n6':  { type: 'transition',   text: '紧定位，能承受较大载荷；常用于齿圈、衬套、定位套、承受冲击的定位件；装配：压装。' },
    'H7/p6':  { type: 'interference', text: '靠过盈传力，不常拆；常用于滚动轴承内圈与轴、联轴器、销钉固定；装配：压装 / 热装。' },
    'H7/s6':  { type: 'interference', text: '重载，不拆连接；常用于大型联轴器、车轮与轴、重载齿轮；装配：热装 / 冷装。' }
  };
  var FIT_ASM_GENERIC = {
    clearance: '装入方式：手推即可，或轻轻转动就能装进，不需要工装。',
    transition: '装入方式：木锤（铜棒垫着）轻敲，或手扳压机轻压。',
    interference: '装入方式：压床压入 / 锤击（垫铜棒），或加热孔件、冷却轴件后装配。'
  };
  function fitAdvice(code, fitType) {
    var known = FIT_ADVICE[code];
    return (known && known.type === fitType) ? ('用法：' + known.text) : (FIT_ASM_GENERIC[fitType] || '');
  }

  root.ResultCard = {
    fitAdvice: fitAdvice,
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
