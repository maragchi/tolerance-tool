/* ============================================================================
 * cad-live.js —— 通用前端运行时（换图不用改这个文件）
 *
 * 职责只有一件事：**把参数写成文字，填进预留好的槽位**。
 * 它不认识键槽、也不认识任何具体图纸 —— 所有"哪块标注叫什么、从哪取值、
 * 怎么格式化"都从 window.CAD 里读（由后端 cadmodule 打包）。
 *
 * 三条铁律（决定了它为什么这么短）：
 *   ① 不算位置 —— 每个槽位的坐标在渲染期就定死了，这里只改 textContent
 *   ② 不渲染    —— 几何是静态 SVG，一次都没重画过
 *   ③ 不发请求  —— 没有后端参与，离线也能用
 *
 * window.CAD 结构：
 *   { id, title, subtitle,
 *     slots:    [{slot, kind, label, main:{from|const,prefix,fmt}, up:{…}, low:{…}}],
 *     controls: [{id, type:'number'|'switch', label, min, max, step, primary, auto}],
 *     readout:  [{label, items:[字段名], sep}],
 *     legend:   [{color, text}],
 *     colors:   {pos, neg, zero},
 *     initial:  {参数: 值},
 *     data:     {primary, range, columns, rows, seg, tol, defaults} }
 * ========================================================================== */
(function () {
  'use strict';

  var CAD = window.CAD;
  if (!CAD) { return; }
  var D = CAD.data || null;          // 数据表（可选：没有它就是"手输即变"的模式）
  var P = {};                        // 当前参数表 —— 它才是真正的数据源
  var SW = (D && D.tol && D.tol.switch) ? D.tol.switch.default : null;
  var PAINTING = false;              // 防止 derive→syncInputs→input 事件回环

  /* ---------- 1. 数值格式化（与 Python 侧 spec.fmt_value 保持一致）---------- */
  function trim(v) {
    if (v === undefined || v === null || v === '') { return ''; }
    if (!isFinite(+v)) { return String(v); }
    var s = (+v).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
    return (s === '' || s === '-0') ? '0' : s;
  }
  function fmtDev(v) {
    v = +v;
    if (v === 0) { return '0'; }               // 零偏差写单字符 0
    return (v > 0 ? '+' : '-') + trim(Math.abs(v));
  }
  function fmt(v, kind) {
    if (v === undefined || v === null || v === '') { return ''; }
    if (kind === 'int') { return String(Math.round(+v)); }
    if (kind === 'trim') { return trim(+v); }
    if (kind === 'dev') { return fmtDev(v); }
    return String(v);
  }
  /* 取值表达式 → 文字。prefix 在这里加上（写 DXF 时不加，由后端负责） */
  function applyExpr(ex) {
    if (!ex) { return ''; }
    if (ex.const !== undefined) { return ex.const; }
    if (!ex.from) { return ''; }
    var v = P[ex.from];
    if (v === undefined || v === null || v === '') { return ''; }
    return (ex.prefix || '') + fmt(v, ex.fmt) + (ex.suffix || '');
  }
  /* 偏差 → [符号, 数值]。符号单独占一格，所以必须拆开（GB/T 4458.4 小数点对齐） */
  function splitDev(v) {
    if (v === undefined || v === null || v === '' || !isFinite(+v) || +v === 0) {
      return ['', '0'];
    }
    var f = fmtDev(v);
    return [f.charAt(0), f.slice(1)];
  }
  function devColor(v) {
    return (+v < 0) ? CAD.colors.neg : CAD.colors.pos;   // 非负（含 0）→ 正色
  }
  /* 上下偏差【绝对值相同、符号相反】时合并成一行 ±值（GB/T 4458.4）。
     返回 '' 表示不合并 → 走"上下两行"那套槽位。
     任一侧为零、两侧同号、绝对值不等，都不合并。 */
  function mergePM(a, b) {
    a = +a; b = +b;
    if (!isFinite(a) || !isFinite(b) || a === 0 || b === 0) { return ''; }
    if ((a > 0) === (b > 0)) { return ''; }
    if (Math.abs(Math.abs(a) - Math.abs(b)) > 1e-9) { return ''; }
    return '\u00b1' + trim(Math.abs(a));
  }

  /* ---------- 2. 查表（零逻辑：找行 → 取列 / 查下标 / 读分段）---------- */
  function findRow(v) {
    var R = D.rows, i;
    for (i = 0; i < R.length; i++) {
      if (v > R[i][0] && v <= R[i][1]) { return R[i]; }
    }
    return (v <= R[0][0]) ? R[0] : R[R.length - 1];
  }
  function segVal(id, v) {
    var s = D.seg && D.seg[id];
    if (!s) { return undefined; }
    for (var i = 0; i < s.segs.length; i++) {
      var hi = s.segs[i][0];
      if (hi === null || v <= hi) { return s.segs[i][1]; }
    }
    return undefined;
  }
  function tolIdx(b) {
    var ix = D.tol.index, k = ix[0], i;
    for (i = 0; i < ix.length; i++) { if (b >= ix[i]) { k = ix[i]; } }
    return ix.indexOf(k);
  }
  /* 由主参数算出所有派生参数 —— 与后端 Dataset.params_for 完全等价。
     没有数据表（D 为空）时是"纯手输"模式，这个函数什么都不用做。 */
  function derive() {
    if (!D) { return; }
    var v = +P[D.primary], i, name, s, base, val;
    var R = findRow(v);
    for (i = 0; i < D.columns.length; i++) { P[D.columns[i]] = R[i]; }
    for (name in (D.seg || {})) {
      s = D.seg[name];
      base = (s.by === D.primary) ? v : P[s.by];
      val = segVal(name, base);
      if (val !== undefined) { P[name] = val; }
    }
    if (D.tol) {
      var sw = SW || D.tol.switch.default;
      var vals = D.tol.sets[sw][tolIdx(+P[D.tol.by])];
      for (i = 0; i < D.tol.fields.length; i++) { P[D.tol.fields[i]] = vals[i]; }
    }
  }

  /* ---------- 3. 写槽位（唯一真正碰图形的地方，只改文字）---------- */
  function put(id, text, color) {
    var g = document.getElementById(id);
    if (!g) { return; }
    var t = g.querySelector('text');
    if (!t) { return; }
    t.textContent = text;
    t.style.fill = color || '';
  }
  /* ---------- 3b. 公差数字贴紧基本尺寸（按实测边界，不用渲染期定死的位置）----------
     渲染期定死的槽位在"基本尺寸位数变了"的时候会离得很远：键宽 b=14 时刚好，
     b=8 时中间空一大截（用户反馈"一位数就拉得有点太开了，有点离谱"）。
     所以写完文字后按**实测屏幕边界**把整栈公差平移过去：
       横排尺寸（rotate 0）→ 水平平移；竖排尺寸（rotate ±90，如 Φ50 那一列）→ 竖直平移。
     只平移、不改字号与行内对齐，所以上下偏差的小数点对齐关系原样保留。 */
  var STACK_GAP = 2.5;                      // 与基本尺寸之间的空隙（SVG 用户单位 = pt）
  var STACK_ROWS = ['-pm', '-up-s', '-up-v', '-low-s', '-low-v'];

  function rotAngle(t) {
    var m = /rotate\(\s*(-?[\d.]+)/.exec(t.getAttribute('transform') || '');
    return m ? Math.abs(parseFloat(m[1])) : 0;
  }
  function curTranslate(g) {
    var m = /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(g.getAttribute('transform') || '');
    return m ? [parseFloat(m[1]), parseFloat(m[2])] : [0, 0];
  }
  function svgScale(el) {
    var svg = el.ownerSVGElement;
    if (!svg) { return 1; }
    var r = svg.getBoundingClientRect();
    var vb = svg.viewBox && svg.viewBox.baseVal;
    return (r.width && vb && vb.width) ? (r.width / vb.width) : 1;
  }
  function alignStack(slot) {
    var main = document.getElementById(slot + '-main');
    var mt = main && main.querySelector('text');
    if (!mt || !mt.textContent.trim()) { return; }
    var groups = [], boxes = [], i, g, t, r;
    for (i = 0; i < STACK_ROWS.length; i++) {
      g = document.getElementById(slot + STACK_ROWS[i]);
      if (!g) { continue; }
      groups.push(g);
      t = g.querySelector('text');
      if (!t || !t.textContent.trim()) { continue; }   // 空格占位的行不参与定位
      r = t.getBoundingClientRect();
      if (r.width || r.height) { boxes.push(r); }
    }
    if (!groups.length || !boxes.length) { return; }
    var sb = boxes[0];
    for (i = 1; i < boxes.length; i++) {              // 取非空行的并集（屏幕坐标）
      sb = { left: Math.min(sb.left, boxes[i].left), right: Math.max(sb.right, boxes[i].right),
             top: Math.min(sb.top, boxes[i].top), bottom: Math.max(sb.bottom, boxes[i].bottom) };
    }
    var mr = mt.getBoundingClientRect();
    if (!mr.width && !mr.height) { return; }
    var sc = svgScale(mt) || 1;
    /* 平移量必须**累加**：getBoundingClientRect 已经把上一次的 transform 算进去了，
       如果直接用"目标位置 − 当前视觉位置"再覆盖 transform，就会把上次的位移丢掉（实测第二次改
       轴径时间距从 2.5px 变成 10px，就是这个 bug）。 */
    var t0 = curTranslate(groups[0]);
    var dx = t0[0], dy = t0[1];
    if (rotAngle(mt) > 45) {                          // 竖排：公差落到基本尺寸上方
      dy += ((mr.top - STACK_GAP * sc) - sb.bottom) / sc;
    } else {                                          // 横排：公差落到基本尺寸右侧
      dx += ((mr.right + STACK_GAP * sc) - sb.left) / sc;
    }
    var tr = 'translate(' + dx.toFixed(2) + ',' + dy.toFixed(2) + ')';
    for (i = 0; i < groups.length; i++) { groups[i].setAttribute('transform', tr); }
  }

  function paint() {
    (CAD.figures || []).forEach(function (fig) {
      (fig.slots || []).forEach(function (s) {
        var slot = s.slot;
        if (s.main) { put(slot + '-main', applyExpr(s.main), null); }
        if (s.kind !== 'stack') { return; }
        // 能合并就显示"±一行"（清空上下两行），否则反之 —— 两套槽位的位置
        // 都是渲染期定死的，这里只决定填哪一套。
        var pm = (s.up && s.low) ? mergePM(P[s.up.from], P[s.low.from]) : '';
        put(slot + '-pm', pm, pm ? CAD.colors.pos : null);
        if (pm) {
          put(slot + '-up-s', ' '); put(slot + '-up-v', '');
          put(slot + '-low-s', ' '); put(slot + '-low-v', '');
        } else {
          if (s.up) {
            var u = splitDev(P[s.up.from]);
            put(slot + '-up-s', u[0] || ' ', devColor(P[s.up.from]));
            put(slot + '-up-v', u[1], devColor(P[s.up.from]));
          }
          if (s.low) {
            var l = splitDev(P[s.low.from]);
            put(slot + '-low-s', l[0] || ' ', devColor(P[s.low.from]));
            put(slot + '-low-v', l[1], devColor(P[s.low.from]));
          }
        }
        alignStack(slot);            // 位数变了也要贴住基本尺寸
      });
    });
  }

  /* ---------- 4. 控件（按 CAD.controls 生成，后端说了算）---------- */
  function ctrlNumber(c, host) {
    var wrap = document.createElement('div');
    wrap.className = 'f' + (c.compact ? ' sm' : '');
    if (c.hint) { wrap.title = c.hint; }
    var lab = document.createElement('label');
    lab.textContent = c.label || c.id;
    var inp = document.createElement('input');
    inp.type = 'number';
    inp.id = 'in-' + c.id;
    if (c.step !== undefined) { inp.step = c.step; }
    if (c.min !== undefined) { inp.min = c.min; }
    if (c.max !== undefined) { inp.max = c.max; }
    inp.value = (P[c.id] === undefined) ? '' : trim(P[c.id]);
    inp.addEventListener('input', function () {
      if (PAINTING) { return; }
      var v = parseFloat(inp.value);
      if (isNaN(v)) { return; }
      if (c.min !== undefined && v < c.min) { v = c.min; }
      if (c.max !== undefined && v > c.max) { v = c.max; }
      P[c.id] = v;
      if (c.primary) { derive(); syncInputs(); }
      paint(); paintReadout();
    });
    wrap.appendChild(lab);
    wrap.appendChild(inp);
    host.appendChild(wrap);
  }
  function ctrlSwitch(c, host) {
    var opts = c.options;
    if (!opts && D && D.tol && D.tol.switch && D.tol.switch.id === c.id) {
      opts = D.tol.switch.options;
    }
    if (!opts) { return; }
    var wrap = document.createElement('div');
    wrap.className = 'f';
    var lab = document.createElement('label');
    lab.textContent = c.label || c.id;
    var box = document.createElement('div');
    box.className = 'sw';
    opts.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = o.t;
      if (o.v === SW) { b.className = 'on'; }
      b.addEventListener('click', function () {
        SW = o.v;
        Array.prototype.forEach.call(box.children, function (x) {
          x.className = (x === b) ? 'on' : '';
        });
        derive(); syncInputs(); paint(); paintReadout();
      });
      box.appendChild(b);
    });
    wrap.appendChild(lab);
    wrap.appendChild(box);
    host.appendChild(wrap);
  }
  function syncInputs() {
    PAINTING = true;
    (CAD.controls || []).forEach(function (c) {
      if (c.type !== 'number') { return; }
      var el = document.getElementById('in-' + c.id);
      if (!el || document.activeElement === el) { return; }
      if (P[c.id] === undefined) { return; }
      el.value = trim(P[c.id]);
    });
    PAINTING = false;
  }

  /* ---------- 5. 读数行与图例 ---------- */
  function paintReadout() {
    var host = document.getElementById('readout');
    if (!host || !CAD.readout) { return; }
    host.innerHTML = CAD.readout.map(function (r) {
      var vals = r.items.map(function (k) { return trim(P[k]); }).join(r.sep || ' ');
      return (r.label ? r.label + ' ' : '') + '<b>' + vals + '</b>';
    }).join(' ｜ ');
  }
  function paintLegend() {
    var host = document.getElementById('legend');
    if (!host || !CAD.legend) { return; }
    // 每条包一层 .lg-item：页面想排成一行就 inline，想排成一列就 flex-column（站内页面是一列）
    host.innerHTML = CAD.legend.map(function (g) {
      return '<span class="lg-item"><i style="background:' + g.color + '"></i>'
        + g.text + '</span>';
    }).join('');
  }

  /* ---------- 6. 启动 ---------- */
  function init() {
    Object.keys(CAD.initial || {}).forEach(function (k) { P[k] = CAD.initial[k]; });
    if (D) { derive(); }

    var box = document.getElementById('controls');
    (CAD.controls || []).forEach(function (c) {
      if (c.type === 'switch') { ctrlSwitch(c, box); } else { ctrlNumber(c, box); }
    });
    // 读数行跟在控件后面（模板没配 readout 就不占位）
    if (CAD.readout && CAD.readout.length) {
      var ro = document.createElement('div');
      ro.className = 'readout';
      ro.id = 'readout';
      box.appendChild(ro);
    }

    paintLegend();
    syncInputs();
    paint();
    paintReadout();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 调试用：控制台里改 window.CAD_DEBUG.paint() 可手动重画
  // fmt 是给页面复用的排版原语（配合页把断面图克隆一份到「单要素查询」时用同一套规则）
  window.CAD_DEBUG = {
    params: P, derive: derive, paint: paint, splitDev: splitDev,
    fmt: {mergePM: mergePM, splitDev: splitDev, devColor: devColor}
  };
})();
