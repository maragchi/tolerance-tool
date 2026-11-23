/* 首页 6 张小卡：手机（≤640px）可折叠
 * - 只在 JS 运行后给 .dash-grid 加 .dash-js 才生效；无 JS 时内容全部在 HTML 里、全部展开（不影响 SEO）
 * - 折叠时只露标题栏 + 一行当前答案；答案直接取卡片实时结果（.dash-main / .dash-err），用 MutationObserver 同步
 * - 整条标题栏是一个真正的 <button>（aria-expanded / aria-controls），「查看详细 →」叠在按钮之上、单独可点
 * - 桌面端（>640px）：按钮与摘要 display:none、包裹层 display:contents，布局与以前完全一致
 */
(function () {
  var grid = document.querySelector('.dash-grid');
  if (!grid || !window.MutationObserver) return;
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  [].forEach.call(grid.querySelectorAll('.dash-card'), function (card) {
    var head = card.querySelector('.dash-head');
    if (!head) return;
    var title = (head.querySelector('h2') || head).textContent.replace(/\s+/g, '').trim();

    /* 标题栏以下的内容装进 .dash-body > .dash-body-in（grid-template-rows 0fr↔1fr 做展开动画） */
    var body = document.createElement('div');
    body.className = 'dash-body';
    body.id = card.id + 'Body';
    var inner = document.createElement('div');
    inner.className = 'dash-body-in';
    body.appendChild(inner);
    while (head.nextSibling) inner.appendChild(head.nextSibling);

    /* 折叠时显示的一行答案 */
    var sum = document.createElement('div');
    sum.className = 'dash-sum';
    var sumIn = document.createElement('div');
    sumIn.className = 'dash-sum-in';
    var sumT = document.createElement('p');
    sumT.className = 'dash-sum-t';
    sumIn.appendChild(sumT);
    sum.appendChild(sumIn);
    card.appendChild(sum);
    card.appendChild(body);

    /* 整条标题栏的开关按钮（▼ 在左侧空列，标题仍在整条栏居中） */
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dash-tg';
    btn.setAttribute('aria-controls', body.id);
    btn.setAttribute('aria-label', title);
    btn.innerHTML = '<span class="dash-tg-ic" aria-hidden="true">▼</span>';
    head.insertBefore(btn, head.firstChild);

    var res = inner.querySelector('.dash-res');
    function syncSum() {
      var m = res && (res.querySelector('.dash-main') || res.querySelector('.dash-err'));
      var t = m ? m.textContent : (res ? res.textContent : '');
      t = t.replace(/\s+/g, ' ').trim();
      if (sumT.textContent !== t) sumT.textContent = t;
    }
    if (res) new MutationObserver(syncSum).observe(res, { childList: true, subtree: true, characterData: true });
    syncSum();

    var timer = 0;
    function setOpen(open, animate) {
      if (animate && !reduce.matches) {
        card.classList.add('dash-anim');           /* 动画期间裁切内容；结束后放开，下拉列表不被裁 */
        clearTimeout(timer);
        timer = setTimeout(function () { card.classList.remove('dash-anim'); }, 260);
      }
      card.classList.toggle('is-closed', !open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    btn.addEventListener('click', function () { setOpen(card.classList.contains('is-closed'), true); });
    sumT.addEventListener('click', function () { setOpen(true, true); });
    /* 「查看详细 →」只做跳转，不触发折叠 */
    var more = head.querySelector('.dash-more');
    if (more) more.addEventListener('click', function (e) { e.stopPropagation(); });

    setOpen(false, false);                          /* 默认：全部折叠（只在 ≤640px 的 CSS 里生效） */
  });
  grid.classList.add('dash-js');
})();
