/* 公差工具站 · 广告位加载器（Adsterra）
 * ------------------------------------------------------------------
 * 为什么不用官方那段代码直接粘进 HTML：
 *   300x250 / 728x90 / 320x50 三个 banner 的官方代码都靠同一个全局变量
 *   atOptions 传参，同一页面并排放会互相覆盖（后写的赢），结果只有一个能出图。
 *   所以这里把每个 banner 单独装进一个 iframe（srcdoc），各用各的 window。
 *
 * 另外两点设计：
 *   · IntersectionObserver 懒加载：滚到附近才发请求，不拖首屏
 *   · 高度由 CSS 预留：广告回来前后不跳版
 *
 * 调试：本地（localhost / file:）默认不加载，避免无效展示；
 *       需要看效果时在地址后加 ?ads=1 强制加载。
 * ------------------------------------------------------------------ */
(function () {
  'use strict';

  var HOST = 'https://bauval.org';

  var UNITS = {
    /* 300x250 —— 查询结果旁 / 内容段落之间，单价最高的一种 */
    rect: { type: 'frame', key: '0a11cf35ef27dee0702e7de0a609f107', w: 300, h: 250 },
    /* 728x90 —— 桌面端页面顶部横幅 */
    leaderboard: { type: 'frame', key: 'de08c03da887ebef192c4895155f9ab7', w: 728, h: 90 },
    /* 320x50 —— 手机端窄幅横幅 */
    mobile: { type: 'frame', key: '3bce179e22ec4a9a3548c168c1d93698', w: 320, h: 50 },
    /* Native Banner —— 容器型，脚本自己往 div 里灌内容 */
    native: { type: 'native', id: 'dd650a423d6b8163501516531de4a04e', path: '21' }
  };

  var START_MARGIN = '400px';

  function isLocalPreview() {
    var h = location.hostname;
    return location.protocol === 'file:' || h === 'localhost' || h === '127.0.0.1' || h === '';
  }

  function forced() {
    return /[?&]ads=1(?:&|$)/.test(location.search);
  }

  /* 单个 iframe banner：把官方两段代码原样放进 srcdoc */
  function buildFrame(cfg) {
    var atOpts = JSON.stringify({
      key: cfg.key, format: 'iframe', height: cfg.h, width: cfg.w, params: {}
    });

    var doc = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="utf-8">'
      + '<meta name="viewport" content="width=device-width,initial-scale=1">'
      + '<style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}'
      + 'img{max-width:100%}</style></head><body>'
      + '<script>atOptions=' + atOpts + ';<' + '/script>'
      + '<script src="' + HOST + '/22/' + cfg.key + '" data-cfasync="false"><' + '/script>'
      + '</body></html>';

    var f = document.createElement('iframe');
    f.width = String(cfg.w);
    f.height = String(cfg.h);
    f.scrolling = 'no';
    f.frameBorder = '0';
    f.title = '广告';
    f.setAttribute('data-ad-frame', cfg.key);
    f.style.cssText = 'border:0;display:block;width:' + cfg.w + 'px;height:'
      + cfg.h + 'px;max-width:100%;margin:0 auto';
    f.srcdoc = doc;
    return f;
  }

  /* Native Banner：官方是「容器 div + 异步脚本」，脚本按 id 找容器 */
  function buildNative(cfg, slot) {
    var box = document.createElement('div');
    box.id = 'container-' + cfg.id;
    slot.appendChild(box);

    var s = document.createElement('script');
    s.async = true;
    s.setAttribute('data-cfasync', 'false');
    s.src = HOST + '/' + cfg.path + '/' + cfg.id;
    slot.appendChild(s);
  }

  function load(slot) {
    if (slot.getAttribute('data-ad-loaded') === '1') { return; }
    var cfg = UNITS[slot.getAttribute('data-ad')];
    if (!cfg) { return; }
    slot.setAttribute('data-ad-loaded', '1');

    try {
      if (cfg.type === 'frame') {
        var frame = buildFrame(cfg);
        slot.appendChild(frame);
        watchFill(slot, frame);
      } else {
        buildNative(cfg, slot);
      }
    } catch (err) {
      /* 广告失败不能影响页面本身 */
      if (window.console && console.warn) { console.warn('[ads] 加载失败', err); }
    }
  }

  /* 广告被拦截或未填充时，收起空占位，避免页面上留一条白带。
   * srcdoc 与父页面同源，可以直接读它的 DOM。
   * 注意 body 里本来就躺着两个 <script>，不能拿 children.length 判断，
   * 要认脚本真正注入的元素（iframe / div / img / ins ...）。
   * 读不到就放弃——宁可留空，不可误删。 */
  function watchFill(slot, frame) {
    var tries = 0;

    function check() {
      tries += 1;
      var doc = null;
      try { doc = frame.contentDocument; } catch (e) { return; }
      if (!doc || !doc.body) { return; }
      if (doc.body.querySelector('iframe,ins,div,img,object,embed,table,canvas')) { return; }

      if (tries >= 3) {
        slot.style.display = 'none';
        slot.setAttribute('data-ad-empty', '1');
        return;
      }
      setTimeout(check, 3000);
    }

    setTimeout(check, 3000);
  }

  /* 按 CSS 媒体查询决定显示哪一档：被 display:none 的位不去请求 */
  function isReady(slot) {
    if (slot.getAttribute('data-ad-loaded') === '1') { return false; }
    var st = window.getComputedStyle(slot);
    return st.display !== 'none' && st.visibility !== 'hidden';
  }

  function start() {
    var slots = Array.prototype.slice.call(document.querySelectorAll('.ad-slot[data-ad]'));
    if (!slots.length) { return; }
    if (isLocalPreview() && !forced()) { return; }

    if (!('IntersectionObserver' in window)) {
      slots.forEach(function (s) { if (isReady(s)) { load(s); } });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) { return; }
        var slot = en.target;
        io.unobserve(slot);
        if (isReady(slot)) { load(slot); }
      });
    }, { rootMargin: START_MARGIN });

    slots.forEach(function (s) { io.observe(s); });

    /* 转屏 / 拉宽窗口后，桌面横幅换成手机条，需要重新排队 */
    var t = null;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        slots.forEach(function (s) { if (isReady(s)) { io.observe(s); } });
      }, 250);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
