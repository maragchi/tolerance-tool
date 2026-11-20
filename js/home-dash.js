/* 首页仪表盘：6 张小卡打开即出结果。
 * 数值全部来自工具页同一份数据与计算（不在这里另抄表）：
 *   键槽 /js/keyway-data.js · 卡簧槽 /js/circlip-data.js · 形状公差 /js/form-data.js
 *   表面粗糙度 /js/roughness-data.js · 公差反查 /js/iso286.js · 气缸选型 /js/cylinder-calc.js
 * 断面图：运行时从 /keyway/、/circlip/ 取原图（不另画），id 加前缀后用 cad-live.js 填数；取不到就不显示图。 */
(function () {
  'use strict';
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fail(box, msg) { box.innerHTML = '<p class="dash-err">' + esc(msg) + '</p>'; }
  function out(box, main, lines) {
    box.innerHTML = '<div class="dash-main">' + main + '</div>'
      + lines.filter(Boolean).map(function (l) { return '<div class="dash-line">' + l + '</div>'; }).join('');
  }
  function segInit(id, cb) {
    var host = $(id);
    host.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-v]');
      if (!b) return;
      var all = host.querySelectorAll('button[data-v]');
      for (var i = 0; i < all.length; i++) {
        all[i].classList.toggle('on', all[i] === b);
        all[i].setAttribute('aria-pressed', all[i] === b ? 'true' : 'false');
      }
      cb(b.getAttribute('data-v'));
    });
  }
  function segVal(id) { var b = $(id).querySelector('button.on'); return b ? b.getAttribute('data-v') : null; }
  function setSelect(sel, v) {
    sel.value = String(v);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }
  /* 与 /circlip/ 的 t() 相同 */
  function t3(v) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return (Math.round(v * 1000) / 1000).toString();
  }

  /* ================= 断面图（取工具页原图） ================= */
  var FIG = { k: null, c: null };          /* {dbg, root} */
  function prefixIds(html, p) {
    return html
      .replace(/\bid="([^"]+)"/g, function (m, id) { return 'id="' + p + id + '"'; })
      .replace(/url\(#([^)]+)\)/g, function (m, id) { return 'url(#' + p + id + ')'; })
      .replace(/href="#([^"]+)"/g, function (m, id) { return 'href="#' + p + id + '"'; });
  }
  function grabFigs(url, figsId, p) {
    return fetch(url, { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var figs = doc.getElementById(figsId);
      var cadTxt = null;
      var ss = doc.querySelectorAll('script');
      for (var i = 0; i < ss.length; i++) {
        var tx = ss[i].textContent.trim();
        if (tx.indexOf('window.CAD=') === 0) { cadTxt = tx.slice('window.CAD='.length).replace(/;\s*$/, ''); break; }
      }
      if (!figs || !cadTxt) throw new Error('no figs');
      var cad = JSON.parse(cadTxt);
      (cad.figures || []).forEach(function (f) {
        (f.slots || []).forEach(function (s) { s.slot = p + s.slot; });
      });
      var boxes = figs.querySelectorAll('.cad-figbox');
      var list = [];
      for (var j = 0; j < boxes.length; j++) {
        var cap = boxes[j].querySelector('.cad-figcap');
        var capTxt = cap ? cap.firstChild.textContent.trim() : '';
        var svg = boxes[j].querySelector('.cad-figwrap > svg');
        if (svg) list.push({ cap: capTxt, svg: prefixIds(svg.outerHTML, p) });
      }
      return { cad: cad, list: list };
    });
  }
  function runCad(cad) {
    return new Promise(function (res) {
      window.CAD = cad;
      var s = document.createElement('script');
      s.src = '/js/cad-live.js';
      s.onload = function () { res(window.CAD_DEBUG || null); };
      s.onerror = function () { res(null); };
      document.body.appendChild(s);
    });
  }
  function mountFigs(hostId, g) {
    var host = $(hostId);
    host.innerHTML = g.list.map(function (f, i) {
      return '<figure class="dash-fig" data-i="' + i + '">' + f.svg + '<figcaption>' + esc(f.cap) + '</figcaption></figure>';
    }).join('');
    host.hidden = false;
    return host;
  }

  /* ================= 键槽 ================= */
  var kw = { d: $('dkD'), fit: $('dkFit'), res: $('dkRes'), figs: $('dkFigs') };
  function kwRender() {
    var d = parseFloat(kw.d.value);
    if (isNaN(d) || d < 6 || d > 500) { fail(kw.res, '请输入 6~500mm（毫米） 范围内的轴径。'); kw.figs.classList.add('dim'); return; }
    var row = findKeyway(d);
    if (!row) { fail(kw.res, '该轴径超出 GB/T 1095-2003 范围（6~500mm（毫米））。'); kw.figs.classList.add('dim'); return; }
    var fit = FIT_DEF[kw.fit.value];
    out(kw.res, 'Φ' + d + ' → 键 <span class="nw">' + row.b + ' × ' + row.h + ' mm</span>', [
      '轴槽深 t₁ = ' + row.t1 + ' · 毂槽深 t₂ = ' + row.t2 + ' mm',
      '<span class="muted">' + fit.name + '：轴槽 ' + fit.shaft + ' · 毂槽 ' + fit.hub + '</span>'
    ]);
    kw.figs.classList.remove('dim');
    var F = FIG.k;
    if (F && F.dbg) {
      /* 与 /keyway/ cadSync 相同的填数 */
      var tol = KEY_TOL[row.b];
      var s = getTolValues(tol[fit.shaft]);
      var h = getTolValues(tol[fit.hub]);
      var P = F.dbg.params;
      P.d = d; P.b = row.b;
      P.k1t = row.t1; P.k2t = row.t2;
      P.k1bES = s.upper; P.k1bEI = s.lower;
      P.k2bES = h.upper; P.k2bEI = h.lower;
      P.k1tES = row.t1tol; P.k1tEI = 0;
      P.k2tES = row.t2tol; P.k2tEI = 0;
      F.dbg.paint();
    }
  }
  kw.d.addEventListener('input', kwRender);
  kw.fit.addEventListener('change', kwRender);

  /* ================= 卡簧槽 ================= */
  var CD = window.CLIP_DATA || {};
  var cc = { size: $('dcSize'), res: $('dcRes'), figs: $('dcFigs'), lab: $('dcSizeLab') };
  function ccRows(k) { return (CD[k] && CD[k].rows) || []; }
  function ccFind(k, v) {
    var r = ccRows(k);
    for (var i = 0; i < r.length; i++) { if (+r[i].size === +v) return r[i]; }
    return null;
  }
  function ccFill() {
    var k = segVal('dcType'), r = ccRows(k);
    cc.size.innerHTML = r.map(function (x) { return '<option value="' + x.size + '">Φ' + x.size + '</option>'; }).join('');
    /* 与 /circlip/ buildSelect 相同：默认 45，没有 45 取中间一档 */
    var pick = 45, found = ccFind(k, pick);
    cc.size.value = String(found ? pick : (r[Math.floor(r.length / 2)] || {}).size);
    cc.lab.textContent = k === 'shaft' ? '轴径 d0' : '孔径 d1';
  }
  function ccRender() {
    var k = segVal('dcType');
    var row = ccFind(k, cc.size.value);
    if (!row) { fail(cc.res, '没有这个规格'); return; }
    var hole = k !== 'shaft', std = CD[k].std;
    out(cc.res, (hole ? '孔径 d1' : '轴径 d0') + ' Φ' + t3(row.size) + ' → <span class="nw">槽径 d2 = Φ' + t3(row.d2) + '</span>', [
      '槽宽 m = ' + t3(row.m) + ' · 槽边距 n ≥ ' + t3(row.n),
      '<span class="muted">配挡圈 ' + std + ' ' + t3(row.size) + '（' + CD[k].name + '）· '
        + (hole ? '自由状态外径 d3 = ' : '自由状态内径 d3 = ') + t3(row.ring) + '</span>'
    ]);
    var F = FIG.c;
    if (F && F.dbg) {
      /* 与 /circlip/ render 相同的填数（只显示当前类型那张图） */
      var P = F.dbg.params;
      if (hole) {
        P.ch_d1 = row.size; P.ch_d2 = row.d2; P.ch_m = row.m; P.ch_n = row.n;
        P.ch_mUP = row.mUp; P.ch_mLO = row.mLo;
        P.ch_d2UP = row.d2Up; P.ch_d2LO = row.d2Lo;
      } else {
        P.cs_d0 = row.size; P.cs_d2 = row.d2; P.cs_m = row.m; P.cs_n = row.n;
        P.cs_d2UP = row.d2Up; P.cs_d2LO = row.d2Lo;
        P.cs_mUP = row.mUp; P.cs_mLO = row.mLo;
      }
      var figs = cc.figs.querySelectorAll('.dash-fig');
      for (var i = 0; i < figs.length; i++) figs[i].hidden = (i === 0) !== hole;
      F.dbg.paint();
    }
  }
  segInit('dcType', function () { ccFill(); setSelect(cc.size, cc.size.value); ccRender(); });
  cc.size.addEventListener('change', ccRender);

  /* ================= 形状公差 ================= */
  var fm = { item: $('dfItem'), v: $('dfVal'), g: $('dfGrade'), lab: $('dfValLab'), res: $('dfRes'), L: '100', d: '50' };
  var fmParam = 'L';
  fm.item.innerHTML = Object.keys(TYPE_INFO).map(function (k) { return '<option value="' + k + '">' + esc(TYPE_INFO[k].name) + '</option>'; }).join('');
  fm.item.value = 'straightness';
  /* 与 /form/ 相同：1~12 级，默认 7 级 */
  (function () { var h = ''; for (var i = 1; i <= 12; i++) h += '<option value="' + i + '">' + i + ' 级</option>'; fm.g.innerHTML = h; fm.g.value = '7'; })();
  function fmRender() {
    var item = fm.item.value, ti = TYPE_INFO[item], grade = parseInt(fm.g.value, 10);
    if (ti.param === 'd') {
      var dia = parseFloat(fm.v.value);
      var rd = roundnessOf(dia, grade);
      if (!rd) { fail(fm.res, '请输入直径 d（0~500mm）'); return; }
      if (rd.value == null) {
        out(fm.res, 'Φ' + dia + '、' + grade + ' 级：暂无数据', ['<span class="muted">' + ti.sym + ' ' + ti.name + ' · 本站只收录到 8 级</span>']);
        return;
      }
      out(fm.res, 'Φ' + dia + '、' + grade + ' 级 <span class="nw">→ ' + rd.value + ' μm</span>', ['<span class="muted">' + ti.sym + ' ' + ti.name + '公差值</span>']);
      return;
    }
    var length = parseFloat(fm.v.value);
    if (isNaN(length) || length < 0 || length > 10000) { fail(fm.res, '长度范围：0~10000mm（毫米）'); return; }
    var range = findRange(length, item === 'orientation' ? ORIENTATION_TABLE : TOLERANCE_TABLE);
    if (!range) { fail(fm.res, '未找到对应的长度范围'); return; }
    var tol = range.grades[grade] || null;
    out(fm.res, 'L = ' + esc(fm.v.value.trim()) + ' mm、' + grade + ' 级 <span class="nw">→ ' + tol + ' μm</span>',
      ['<span class="muted">' + ti.sym + ' ' + ti.name + ' · 长度范围 ' + range.label + '</span>']);
  }
  function fmItem() {
    var p = TYPE_INFO[fm.item.value].param;
    if (p !== fmParam) {
      fm[fmParam] = fm.v.value;
      fmParam = p;
      fm.v.value = fm[p];
    }
    fm.lab.textContent = p === 'd' ? '直径 d (mm)' : '长度 L (mm)';
    fmRender();
  }
  fm.item.addEventListener('change', fmItem);
  fm.v.addEventListener('input', fmRender);
  fm.g.addEventListener('change', fmRender);

  /* ================= 表面粗糙度 ================= */
  var rg = { scen: $('drScen'), ra: $('drRa'), res: $('drRes'), wS: $('drScenW'), wR: $('drRaW') };
  rg.scen.innerHTML = SCENARIOS.map(function (s, i) { return '<option value="' + i + '">' + esc(s.name) + '</option>'; }).join('');
  (function () {
    /* 与 /roughness/ initMethodQuery 相同：Ra 选项＝加工对照表里出现过的全部区间端点 */
    var vals = [];
    METHODS.forEach(function (m) { [m.raMin, m.raMax].forEach(function (v) { if (vals.indexOf(v) < 0) vals.push(v); }); });
    vals.sort(function (a, b) { return a - b; });
    rg.ra.innerHTML = vals.map(function (v) { return '<option value="' + v + '">Ra ' + v + '</option>'; }).join('');
    rg.ra.value = '3.2';
  })();
  function rgRender() {
    var mode = segVal('drMode');
    rg.wS.hidden = mode !== 'scen';
    rg.wR.hidden = mode !== 'ra';
    if (mode === 'scen') {
      var s = SCENARIOS[parseInt(rg.scen.value, 10)];
      var hard = s.cost === 'high' || s.cost === 'vhigh';
      out(rg.res, '标 Ra ' + s.raMin + ' ~ ' + s.raMax + ' μm，<span class="nw">' + esc(hard ? '需' + s.methods : s.methods + '即可') + '</span>',
        ['<span class="muted">' + COST_LABEL[s.cost] + ' · 推荐加工：' + esc(s.methods) + '</span>']);
      return;
    }
    var r = parseFloat(rg.ra.value);
    var pk = raPick(r);
    if (!pk.reach) { fail(rg.res, '页面所列加工方法都达不到 Ra ' + r); return; }
    out(rg.res, '标 Ra ' + r + '：<span class="nw">' + esc(pk.verdict) + '</span>',
      ['<span class="muted">' + COST_LABEL[pk.main.cost] + ' · ' + esc(pk.main.name) + ' 可达 Ra ' + pk.main.raMin + ' ~ ' + pk.main.raMax + ' μm</span>']);
  }
  segInit('drMode', rgRender);
  rg.scen.addEventListener('change', rgRender);
  rg.ra.addEventListener('change', rgRender);

  /* ================= 公差反查（偏差 → 代号） ================= */
  var I = window.ISO286;
  var rv = { dim: $('dvDim'), up: $('dvUp'), lo: $('dvLo'), res: $('dvRes') };
  function um(v) { return I.formatUm(Math.round(v * 10) / 10); }
  function rvRender() {
    var isHole = segVal('dvKind') === 'hole';
    var r = I.findCodesByDeviation(parseFloat(rv.dim.value), I.toUm(parseFloat(rv.up.value), 'mm'), I.toUm(parseFloat(rv.lo.value), 'mm'), isHole, { limitClose: 1000 });
    if (r.error) { fail(rv.res, r.error); return; }
    var kind = isHole ? '孔' : '轴';
    if (r.exact.length) {
      var e = r.exact[0];
      out(rv.res, 'Φ' + r.dim + ' ' + kind + ' → <span class="nw">' + esc(e.code) + '</span>', [
        '上 ' + um(e.upper) + ' / 下 ' + um(e.lower) + ' μm · IT' + e.grade,
        r.exact.length > 1 ? '<span class="muted">同样匹配：' + r.exact.slice(1).map(function (x) { return esc(x.code); }).join('、') + '</span>' : ''
      ]);
      return;
    }
    if (!r.closest.length) { fail(rv.res, '该尺寸下没有可比较的公差带。'); return; }
    var c = r.closest[0];
    out(rv.res, 'Φ' + r.dim + ' ' + kind + ' → <span class="nw">最接近 ' + esc(c.code) + '</span>', [
      esc(c.code) + '：上 ' + um(c.upper) + ' / 下 ' + um(c.lower) + ' μm',
      '<span class="muted">与输入相差 上 ' + um(c.dUpper) + ' / 下 ' + um(c.dLower) + ' μm</span>'
    ]);
  }
  segInit('dvKind', rvRender);
  [rv.dim, rv.up, rv.lo].forEach(function (el) { el.addEventListener('input', rvRender); });

  /* ================= 气缸选型（只改负载与行程，其余取 /cylinder/ 默认） ================= */
  var CY_DEF = { dir: 'h', mu: 0.1, f0: 0, P: 0.5, eta: 0.5, bite: 0 };
  var cy = { m: $('dyM'), s: $('dyS'), res: $('dyRes') };
  function cyRender() {
    var m = parseFloat(cy.m.value) || 0, stroke = parseFloat(cy.s.value) || 0;
    var c = cylCore({ dir: CY_DEF.dir, m: m, mu: CY_DEF.mu, f0: CY_DEF.f0, P: CY_DEF.P, eta: CY_DEF.eta, stroke: stroke, bite: CY_DEF.bite });
    var st = { zero: ['warn', '负载为 0'], ok: ['ok', '余量合格'], low: ['warn', '余量偏小'], bad: ['bad', '出力不足'] }[c.state];
    var strokeTxt = typeof c.sRec === 'number' ? String(c.sRec) : '行程 ' + c.sRec;
    var mg = (c.state !== 'ok' && c.state !== 'low') ? '' : '（' + Number(c.margin).toFixed(0) + '%）';
    out(cy.res, 'Φ' + c.D + ' × ' + esc(strokeTxt) + '，<span class="nw tag-' + st[0] + '">' + st[1] + mg + '</span>'
      + (c.buck === 'risk' ? ' <span class="nw tag-bad">屈曲风险</span>' : ''), [
      '<span class="muted">活塞杆 Φ' + c.rod + ' · 水平推出、μ 0.1、P 0.5 MPa、η 0.5（同选型页默认）</span>'
    ]);
  }
  [cy.m, cy.s].forEach(function (el) { el.addEventListener('input', cyRender); });

  /* ================= 首次渲染 ================= */
  ccFill();
  kwRender(); ccRender(); fmItem(); rgRender(); rvRender(); cyRender();

  /* 图：先键槽后卡簧（cad-live.js 读 window.CAD，必须一个一个来） */
  if (window.fetch && window.DOMParser && window.Promise) {
    grabFigs('/keyway/', 'cadKwFigs', 'hk-').then(function (g) {
      mountFigs('dkFigs', g);
      return runCad(g.cad).then(function (dbg) { FIG.k = { dbg: dbg }; kwRender(); });
    }).catch(function () { $('dkFigs').hidden = true; }).then(function () {
      return grabFigs('/circlip/', 'cadFigs', 'hc-').then(function (g) {
        mountFigs('dcFigs', g);
        return runCad(g.cad).then(function (dbg) { FIG.c = { dbg: dbg }; ccRender(); });
      });
    }).catch(function () { $('dcFigs').hidden = true; });
  }
})();
