/* 公差工具站 PWA：Service Worker 注册 + 「添加到桌面」引导
 * - Chrome/Edge(桌面/安卓)：走原生安装提示
 * - iOS Safari / 微信：显示对应的手动添加步骤
 * - 已安装（standalone）或用户关闭过：不再打扰
 */
(function () {
  var KEY_HIDE = 'pwa_bar_hide_until';
  var isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;
  var deferredPrompt = null;

  /* ---------- 注册 Service Worker ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () { /* 忽略 */ });
    });
  }

  // 返回手势处理：已安装(standalone)时也必须生效，所以放在 return 之前
  setupBackExit();

  if (isStandalone) return; // 已经是独立应用，不再显示安装提示

  /* ---------- 样式 ---------- */
  var CSS = [
    '.pwa-bar{position:fixed;left:0;right:0;bottom:0;z-index:9998;display:flex;align-items:center;gap:10px;',
    'padding:12px 14px;background:#0f172a;color:#fff;font-size:13px;box-shadow:0 -3px 16px rgba(15,23,42,.28);',
    'transform:translateY(105%);transition:transform .28s cubic-bezier(.16,1,.3,1);font-family:inherit}',
    '.pwa-bar.show{transform:none}',
    '.pwa-bar img{width:34px;height:34px;border-radius:9px;flex-shrink:0}',
    '.pwa-bar .pwa-txt{flex:1 1 auto;line-height:1.45;min-width:0}',
    '.pwa-bar .pwa-txt b{display:block;font-size:13.5px;margin-bottom:1px}',
    '.pwa-bar .pwa-txt span{color:#94a3b8;font-size:12px}',
    '.pwa-bar .pwa-btn{background:#2563eb;color:#fff;border:none;border-radius:999px;padding:9px 18px;',
    'font-size:13px;font-weight:600;cursor:pointer;flex-shrink:0;font-family:inherit;white-space:nowrap;line-height:1.4}',
    '.pwa-bar .pwa-btn:active{transform:scale(.97)}',
    '@media(max-width:430px){.pwa-bar{flex-wrap:wrap;padding:12px 14px 14px}',
    '.pwa-bar .pwa-txt{flex:1 1 100%;order:-1;margin-bottom:2px}',
    '.pwa-bar .pwa-btn{flex:1 1 auto;order:1}',
    '.pwa-bar .pwa-close{order:2}}',
    '.pwa-install-btn{display:inline-flex;align-items:center;gap:6px;margin-top:12px;padding:9px 18px;',
    'font-size:13px;font-weight:600;color:#2563eb;background:#eff6ff;border:1px solid #bfdbfe;',
    'border-radius:999px;cursor:pointer;font-family:inherit;white-space:nowrap;line-height:1.4}',
    '.pwa-install-btn:hover{background:#dbeafe}',
    '.pwa-install-btn:active{transform:scale(.98)}',
    '.pwa-bar .pwa-close{background:transparent;border:none;color:#64748b;font-size:20px;cursor:pointer;',
    'padding:0 2px;flex-shrink:0;line-height:1}',
    '.pwa-modal{position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);display:flex;',
    'align-items:flex-end;justify-content:center}',
    '.pwa-modal-inner{background:#fff;border-radius:18px 18px 0 0;padding:22px 22px 26px;max-width:560px;',
    'width:100%;color:#0f172a;font-size:14px;line-height:1.75;max-height:82vh;overflow:auto;',
    'animation:pwaUp .26s cubic-bezier(.16,1,.3,1)}',
    '@keyframes pwaUp{from{transform:translateY(14px);opacity:0}to{transform:none;opacity:1}}',
    '.pwa-modal-inner h3{font-size:16px;margin:0 0 12px;font-weight:700}',
    '.pwa-modal-inner ol{margin:0 0 16px;padding-left:22px}',
    '.pwa-modal-inner li{margin:7px 0}',
    '.pwa-modal-inner .pwa-x{position:absolute;top:14px;right:16px;background:#f1f5f9;border:none;',
    'width:30px;height:30px;border-radius:50%;font-size:16px;color:#475569;cursor:pointer}',
    '.pwa-modal-inner .pwa-ok{width:100%;background:#2563eb;color:#fff;border:none;border-radius:10px;',
    'padding:12px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}',
    '.pwa-tip{background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;border-radius:8px;padding:9px 12px;font-size:12.5px;margin-bottom:14px}'
  ].join('');

  function injectStyle() {
    if (document.getElementById('pwa-style')) return;
    var s = document.createElement('style');
    s.id = 'pwa-style';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- 底部提示条 ---------- */
  var bar = null;
  function showBar() {
    if (bar || isHiddenRecently()) return;
    injectStyle();
    bar = document.createElement('div');
    bar.className = 'pwa-bar';
    bar.innerHTML =
      '<img src="/icons/icon-192.png" alt="">' +
      '<div class="pwa-txt"><b>加到桌面，点一下就用</b><span>不用每次输网址</span></div>' +
      '<button class="pwa-btn" id="pwaAdd">添加</button>' +
      '<button class="pwa-close" id="pwaX" aria-label="关闭">×</button>';
    document.body.appendChild(bar);
    requestAnimationFrame(function () { bar.classList.add('show'); });
    document.getElementById('pwaAdd').onclick = doInstall;
    document.getElementById('pwaX').onclick = function () { hideBar(true); };
  }
  function hideBar(remember) {
    if (bar) { bar.classList.remove('show'); var b = bar; setTimeout(function () { b.remove(); }, 300); bar = null; }
    if (remember) { try { localStorage.setItem(KEY_HIDE, String(Date.now() + 7 * 864e5)); } catch (e) {} }
  }
  function isHiddenRecently() {
    try { return Number(localStorage.getItem(KEY_HIDE) || 0) > Date.now(); } catch (e) { return false; }
  }

  /* ---------- 安装 ---------- */
  function doInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (r) {
        if (r && r.outcome === 'accepted') hideBar(true);
        deferredPrompt = null;
      });
    } else {
      showGuide();
    }
  }

  function platform() {
    var ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/MicroMessenger/i.test(ua)) return 'wechat';
    if (/Android/i.test(ua)) return 'android';
    return 'desktop';
  }

  function showGuide() {
    injectStyle();
    var p = platform();
    var steps;
    if (p === 'ios') {
      steps = '<li>点屏幕底部中间的 <b>分享按钮</b>（方框带向上箭头 ⬆️）</li>' +
        '<li>在弹出的菜单里向下滑，选 <b>「添加到主屏幕」</b></li>' +
        '<li>右上角点 <b>「添加」</b>，桌面就有图标了</li>';
    } else if (p === 'wechat') {
      steps = '<li>点右上角 <b>「⋯」</b> 菜单</li>' +
        '<li>选择 <b>「在浏览器打开」</b></li>' +
        '<li>打开后再点浏览器菜单里的 <b>「添加到主屏幕」</b></li>' +
        '<div class="pwa-tip">微信内置浏览器不支持直接添加，需要先在浏览器中打开。</div>';
    } else if (p === 'android') {
      steps = '<li>点浏览器右上角的 <b>「⋮」</b> 菜单</li>' +
        '<li>选择 <b>「添加到主屏幕」</b> 或 <b>「安装应用」</b></li>' +
        '<li>确认后桌面就有图标了</li>';
    } else {
      steps = '<li>看浏览器<b>地址栏右侧</b>，有个方框带箭头的 <b>安装图标 ⧉</b>，点它</li>' +
        '<li>或点右上角 <b>「⋮」/「⋯」</b> 菜单 → <b>「安装公差工具站」</b></li>' +
        '<li>确认后桌面（或开始菜单）就有快捷方式了</li>';
    }
    var modal = document.createElement('div');
    modal.className = 'pwa-modal';
    modal.innerHTML =
      '<div class="pwa-modal-inner" style="position:relative">' +
      '<button class="pwa-x" id="pwaMX" aria-label="关闭">×</button>' +
      '<h3>把「公差工具站」放到桌面</h3>' +
      '<ol>' + steps + '</ol>' +
      '<button class="pwa-ok" id="pwaMOK">知道了</button>' +
      '</div>';
    document.body.appendChild(modal);
    function close() { modal.remove(); }
    modal.onclick = function (e) { if (e.target === modal) close(); };
    document.getElementById('pwaMX').onclick = close;
    document.getElementById('pwaMOK').onclick = close;
  }

  /* ---------- 触发提示 ---------- */
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    showBar();
  });
  window.addEventListener('appinstalled', function () { hideBar(true); });

  /* ---------- 返回手势：standalone 下在首页按「返回」应能退出应用 ----------
   * Android 上 PWA 有历史记录时，边缘返回手势会去回退历史而不是退出，
   * 表现就是「怎么划都退不出去」。这里在首页压一条占位历史，
   * 接到返回事件时主动关闭应用窗口（Chrome/Edge PWA 支持 window.close）。
   */
  function setupBackExit() {
    if (!isStandalone) return;
    var isHome = (location.pathname === '/' || /\/index\.html$/.test(location.pathname));
    if (!isHome) return;

    try { history.pushState({ pwaHome: 1 }, '', location.href); } catch (e) { return; }

    window.addEventListener('popstate', function () {
      var stillHome = (location.pathname === '/' || /\/index\.html$/.test(location.pathname));
      if (stillHome) {
        // 用户意图：退出应用
        try { window.close(); } catch (e) {}
        setTimeout(function () {
          // window.close 被忽略时（少数环境），补一条历史避免「划不动」
          if (!document.hidden) {
            try { history.pushState({ pwaHome: 2 }, '', location.href); } catch (e) {}
          }
        }, 150);
      }
    });
  }

  /* ---------- 常驻入口：页面底部始终有一个「添加到桌面」按钮 ---------- */
  function injectInstallEntry() {
    if (isStandalone) return;
    var host = document.querySelector('.site-footer') || document.body;
    if (host.querySelector('.pwa-install-btn')) return;
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pwa-install-btn';
    b.innerHTML = '\uD83D\uDCF2 添加到桌面';
    b.addEventListener('click', doInstall);
    host.appendChild(b);
  }

  // 没有 beforeinstallprompt 的浏览器（iOS/Safari/微信）：延迟显示引导条
  window.addEventListener('load', function () {
    injectInstallEntry();
    setTimeout(function () {
      if (!deferredPrompt && !isStandalone) showBar();
    }, 3500);
  });

  // 供页面手动调用
  window.pwaInstall = doInstall;
})();
