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
})();
