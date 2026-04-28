var App = {
  navigate(page, anchor) {
    S.currentPageName = page;
    document.querySelectorAll('.page-s').forEach(function(s) { s.classList.remove('active'); });
    var target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');
    document.querySelectorAll('.tab-b[data-p]').forEach(function(b) { b.classList.toggle('active', b.dataset.p === page); });
    switch(page) {
      case 'home': Gallery.render(); break;
      case 'rank': Rank.render(); break;
      case 'upload': Upload.render(); break;
      case 'profile': Profile.render(); break;
      case 'admin': Admin.render(); break;
    }
    if (anchor === 'gallery') setTimeout(function() { document.getElementById('filters')?.scrollIntoView({behavior:'smooth'}); }, 100);
    else window.scrollTo({top:0, behavior:'smooth'});
  },

  initNav() {
    var tabs = [{page:'home',icon:'fa-images',label:'发现'},{page:'rank',icon:'fa-trophy',label:'排行'},{page:'upload',icon:'fa-cloud-upload-alt',label:'上传'}];
    var desktop = document.getElementById('navTabs');
    var mobile = document.getElementById('navTabsMobile');
    desktop.innerHTML = tabs.map(function(t) {
      return '<button class="tab-b' + (t.page==='home'?' active':'') + '" data-p="' + t.page + '" onclick="App.navigate(\'' + t.page + '\')"><i class="fas ' + t.icon + ' mr-2"></i>' + t.label + '</button>';
    }).join('');
    mobile.innerHTML = tabs.map(function(t) {
      return '<button class="tab-b' + (t.page==='home'?' active':'') + '" data-p="' + t.page + '" onclick="App.navigate(\'' + t.page + '\')"><i class="fas ' + t.icon + '"></i></button>';
    }).join('') + '<button class="tab-b" data-p="profile" onclick="App.navigate(\'profile\')"><i class="fas fa-user"></i></button>';
    document.getElementById('logoLink').addEventListener('click', function(e) { e.preventDefault(); App.navigate('home'); });
  },

  async init() {
    this.initNav();
    var token = localStorage.getItem('pr_token');
    if (token) { try { S.currentUser = await Api.getMe(); } catch(e) { localStorage.removeItem('pr_token'); } }
    Auth.updateUI();
    if (S.currentUser) await Auth.loadMyRatings();
    // 加载站点配置
    try { S.siteConfig = await Api.getConfig(); } catch(e) {}
    Auth.updateUI(); // 再次更新以显示管理入口
    Gallery.render();
  }
};

window.addEventListener('scroll', function() {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
});

App.init();