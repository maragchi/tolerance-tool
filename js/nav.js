/* 公差工具站 - 共享导航脚本 */
(function(){
  // 高亮当前页面的导航链接
  var path = window.location.pathname;
  var links = document.querySelectorAll('.site-nav a');
  for(var i = 0; i < links.length; i++){
    var href = links[i].getAttribute('href');
    if(!href) continue;
    // 标准化路径比较
    var linkPath = new URL(href, window.location.origin).pathname;
    if(path === linkPath || (linkPath !== '/' && path.indexOf(linkPath) === 0)){
      links[i].classList.add('active');
    }
    // 首页特殊处理
    if(href === '/' || href === '/index.html'){
      if(path === '/' || path === '/index.html'){
        links[i].classList.add('active');
      }
    }
  }

  // 注入面包屑 JSON-LD
  var bc = document.querySelector('.breadcrumb');
  if(bc){
    var items = [];
    var bcLinks = bc.querySelectorAll('a');
    var bcText = bc.querySelectorAll('span:last-child, :scope > *:last-child');

    items.push({
      "@type": "ListItem",
      "position": 1,
      "name": "公差工具站",
      "item": window.location.origin + "/"
    });

    if(bcLinks.length > 0){
      for(var j = 0; j < bcLinks.length; j++){
        var name = bcLinks[j].textContent.trim();
        if(name === '公差工具站') continue;
        items.push({
          "@type": "ListItem",
          "position": items.length + 1,
          "name": name,
          "item": new URL(bcLinks[j].getAttribute('href'), window.location.origin).href
        });
      }
    }

    if(items.length > 1){
      var ld = document.createElement('script');
      ld.type = 'application/ld+json';
      ld.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items
      });
      document.head.appendChild(ld);
    }
  }

  /* ==========================================================================
     移动端导航抽屉（渐进增强）
     窄屏上横排导航要占两行、约 110px；这里把它收进右侧抽屉，header 只剩一行。
     —— 只有本脚本跑起来（<html> 加 .has-drawer）抽屉样式才生效，
        脚本没加载/报错时，导航保持原来的横排换行，不会变成打不开的菜单。
     ========================================================================== */
  var header = document.querySelector('.site-header');
  var nav = header && header.querySelector('.site-nav');
  if(header && nav){
    document.documentElement.classList.add('has-drawer');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'nav-toggle';
    btn.setAttribute('aria-label', '打开导航菜单');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'siteNavDrawer');
    btn.innerHTML = '<svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true">'
      + '<rect width="18" height="2" rx="1" fill="currentColor"/>'
      + '<rect y="6" width="18" height="2" rx="1" fill="currentColor"/>'
      + '<rect y="12" width="18" height="2" rx="1" fill="currentColor"/></svg>';
    header.appendChild(btn);

    var mask = document.createElement('div');
    mask.className = 'nav-mask';
    header.appendChild(mask);

    nav.id = 'siteNavDrawer';
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'nav-close';
    close.setAttribute('aria-label', '关闭导航菜单');
    close.textContent = '\u2715';
    nav.insertBefore(close, nav.firstChild);
    var title = document.createElement('p');
    title.className = 'nav-title';
    title.textContent = '站内导航';
    nav.insertBefore(title, close.nextSibling);

    function isOpen(){ return nav.classList.contains('open'); }
    function openNav(){
      nav.classList.add('open'); mask.classList.add('open');
      document.body.classList.add('nav-open');
      btn.setAttribute('aria-expanded', 'true');
    }
    function closeNav(){
      nav.classList.remove('open'); mask.classList.remove('open');
      document.body.classList.remove('nav-open');
      btn.setAttribute('aria-expanded', 'false');
    }
    btn.addEventListener('click', function(){ isOpen() ? closeNav() : openNav(); });
    mask.addEventListener('click', closeNav);
    close.addEventListener('click', closeNav);
    nav.addEventListener('click', function(e){          // 点了链接就走，抽屉自动关
      var a = e.target.closest ? e.target.closest('a') : null;
      if(a){ closeNav(); }
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape' || e.keyCode === 27){ closeNav(); }
    });
    var mq = window.matchMedia('(max-width: 720px)');   // 转回桌面宽度时复位
    if(mq.addEventListener){ mq.addEventListener('change', closeNav); }
    else if(mq.addListener){ mq.addListener(closeNav); }
  }
})();
