/* ===== 代号下拉：自定义下拉（原生 select 隐藏，保留 .value / change 语义）===== */
(function () {
  'use strict';
  var ARROW = '\u25BC';   /* 与数字框的 ▼ 一致 */
  var sels = Array.prototype.slice.call(document.querySelectorAll('select.code-select'));
  if (!sels.length) { return; }
  var states = [];

  function addItem(st, o) {
    var d = document.createElement('div');
    d.className = 'csel-item' + (o.value === st.sel.value ? ' sel' : '');
    d.setAttribute('data-v', o.value);
    d.textContent = o.textContent;
    st.list.appendChild(d);
  }
  function build(st) {
    st.list.innerHTML = '';
    Array.prototype.forEach.call(st.sel.children, function (node) {
      if (node.tagName === 'OPTGROUP') {
        var h = document.createElement('div');
        h.className = 'csel-group';
        h.textContent = node.label;
        st.list.appendChild(h);
        Array.prototype.forEach.call(node.children, function (o) { addItem(st, o); });
      } else if (node.tagName === 'OPTION') {
        addItem(st, node);
      }
    });
  }
  function sync(st) {
    var o = st.sel.options[st.sel.selectedIndex];
    st.btn.innerHTML = '<span class="csel-txt">' + (o ? o.textContent : '') + '</span>'
      + '<span class="csel-arr">' + ARROW + '</span>';
  }
  function close(st) { st.list.classList.remove('open'); st.btn.setAttribute('aria-expanded', 'false'); }
  function closeAll(except) { states.forEach(function (st) { if (st !== except) { close(st); } }); }
  function open(st) {
    build(st); sync(st); closeAll(st);
    st.list.classList.add('open');
    st.btn.setAttribute('aria-expanded', 'true');
    var sel = st.list.querySelector('.csel-item.sel') || st.list.querySelector('.csel-item');
    if (sel) { sel.classList.add('hi'); }
  }
  function choose(st, v) {
    st.sel.value = v;
    st.sel.dispatchEvent(new Event('change', { bubbles: true }));
    sync(st);
    close(st);
  }

  sels.forEach(function (sel) {
    var wrap = document.createElement('div');
    wrap.className = 'csel';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'csel-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    var list = document.createElement('div');
    list.className = 'csel-list';
    list.setAttribute('role', 'listbox');
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    wrap.appendChild(btn);
    wrap.appendChild(list);
    sel.classList.add('csel-native');

    var st = { sel: sel, btn: btn, list: list };
    states.push(st);
    sync(st);

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (list.classList.contains('open')) { close(st); } else { open(st); }
    });
    list.addEventListener('click', function (e) {
      e.stopPropagation();
      var it = e.target.closest ? e.target.closest('.csel-item') : null;
      if (it) { choose(st, it.getAttribute('data-v')); }
    });
    btn.addEventListener('keydown', function (e) {
      var items = list.querySelectorAll('.csel-item');
      if (!items.length) { return; }
      var idx = Array.prototype.indexOf.call(items, list.querySelector('.csel-item.hi'));
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!list.classList.contains('open')) {
          open(st);
          items = list.querySelectorAll('.csel-item');
          idx = Array.prototype.indexOf.call(items, list.querySelector('.csel-item.hi'));
        }
        if (idx >= 0) { items[idx].classList.remove('hi'); }
        idx = e.key === 'ArrowDown' ? Math.min(idx + 1, items.length - 1) : Math.max(idx - 1, 0);
        items[idx].classList.add('hi');
        items[idx].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!list.classList.contains('open')) { open(st); return; }
        var hi = list.querySelector('.csel-item.hi');
        if (hi) { choose(st, hi.getAttribute('data-v')); }
      } else if (e.key === 'Escape') {
        close(st);
      }
    });
  });

  document.addEventListener('click', function () {
    closeAll(null);
    states.forEach(sync);      /* 常用代号/常用配合按钮直接改 .value，这里补一次同步 */
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeAll(null); }
  });
  sels.forEach(function (sel) {
    sel.addEventListener('change', function () {
      var st = states.filter(function (x) { return x.sel === sel; })[0];
      if (st) { sync(st); }
    });
  });
  window.addEventListener('load', function () { states.forEach(sync); });
})();
