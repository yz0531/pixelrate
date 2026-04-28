var Auth = {
  _cd: null,
  _startCD(btnId, sec) {
    sec=sec||60;var btn=document.getElementById(btnId);if(!btn)return;
    btn.disabled=true;btn.style.opacity='.5';btn.style.cursor='not-allowed';btn.textContent=sec+'s';
    var r=sec;clearInterval(this._cd);
    this._cd=setInterval(function(){r--;if(r<=0){clearInterval(Auth._cd);btn.disabled=false;btn.style.opacity='1';btn.style.cursor='pointer';btn.textContent='获取验证码';}else{btn.textContent=r+'s';}},1000);
  },
  _validPhone(p){return /^1[3-9]\d{9}$/.test(p);},

  async sendLoginCode(){
    var p=document.getElementById('lPhone').value.trim();
    if(!p){Toast.show('请输入手机号','error');return;}
    if(!this._validPhone(p)){Toast.show('手机号格式不正确','error');return;}
    try{var d=await Api.sendCode({phone:p});this._startCD('lSendBtn',60);
      if(d.devMode)Toast.show('开发模式：验证码在服务器控制台','warn');else Toast.show('验证码已发送','success');
    }catch(e){Toast.show(e.message,'error');}
  },
  async sendRegCode(){
    var p=document.getElementById('rPhone').value.trim();
    if(!p){Toast.show('请输入手机号','error');return;}
    if(!this._validPhone(p)){Toast.show('手机号格式不正确','error');return;}
    try{var d=await Api.sendCode({phone:p});this._startCD('rSendBtn',60);
      if(d.devMode)Toast.show('开发模式：验证码在服务器控制台','warn');else Toast.show('验证码已发送','success');
    }catch(e){Toast.show(e.message,'error');}
  },
  updateUser(d){if(d.token)localStorage.setItem('pr_token',d.token);if(d.user)S.currentUser=d.user;this.updateUI();},
  async doRegister(e){
    e.preventDefault();var u=document.getElementById('rUser').value.trim(),p=document.getElementById('rPhone').value.trim(),c=document.getElementById('rCode').value.trim(),err=document.getElementById('rErr');
    if(!u||!p||!c){err.textContent='请填写完整信息';err.style.display='block';return;}
    try{var d=await Api.register({username:u,phone:p,code:c});this.updateUser(d);Modals.close('regM');Toast.show('注册成功！','success');this.loadMyRatings();App.navigate(S.currentPageName);e.target.reset();err.style.display='none';}catch(e){err.textContent=e.message;err.style.display='block';}
  },
  async doLogin(e){
    e.preventDefault();var p=document.getElementById('lPhone').value.trim(),c=document.getElementById('lCode').value.trim(),err=document.getElementById('lErr');
    if(!p||!c){err.textContent='请输入手机号和验证码';err.style.display='block';return;}
    try{var d=await Api.login({phone:p,code:c});this.updateUser(d);Modals.close('loginM');Toast.show('欢迎回来！','success');this.loadMyRatings();App.navigate(S.currentPageName);e.target.reset();err.style.display='none';}catch(e){err.textContent=e.message;err.style.display='block';}
  },
  logout(){localStorage.removeItem('pr_token');S.currentUser=null;S.myRatings={};this.updateUI();Toast.show('已退出','info');App.navigate('home');},
  async loadMyRatings(){if(!S.currentUser){S.myRatings={};return;}try{var r=await Api.getMyRatings();S.myRatings={};r.forEach(function(x){S.myRatings[x.imageId]=x.score;});}catch(e){S.myRatings={};}},
  updateUI(){
    var a=document.getElementById('authArea');
    if(S.currentUser){
      a.innerHTML='<div class="flex items-center gap-3">'+rAvatar(S.currentUser,36)+'<span class="hidden sm:inline" style="font-weight:500;font-size:14px">'+S.currentUser.username+'</span><div class="relative"><button onclick="document.getElementById(\'uMenu\').classList.toggle(\'hidden\')" class="btn-g" style="padding:8px 12px;font-size:13px"><i class="fas fa-chevron-down"></i></button><div id="uMenu" class="absolute right-0 top-12 w-48 rounded-xl py-2 hidden" style="background:var(--bg-e);border:1px solid var(--border);box-shadow:0 8px 30px rgba(0,0,0,.5);z-index:60"><button onclick="App.navigate(\'profile\');document.getElementById(\'uMenu\').classList.add(\'hidden\')" class="w-full text-left px-4 py-2 text-sm hover:bg-white/5" style="color:var(--fg);background:none;border:none;cursor:pointer"><i class="fas fa-user mr-2" style="color:var(--muted)"></i>个人中心</button><button onclick="App.navigate(\'upload\');document.getElementById(\'uMenu\').classList.add(\'hidden\')" class="w-full text-left px-4 py-2 text-sm hover:bg-white/5" style="color:var(--fg);background:none;border:none;cursor:pointer"><i class="fas fa-cloud-upload-alt mr-2" style="color:var(--muted)"></i>上传图片</button><hr style="border-color:var(--border);margin:4px 0"><button onclick="Auth.logout()" class="w-full text-left px-4 py-2 text-sm hover:bg-white/5" style="color:var(--danger);background:none;border:none;cursor:pointer"><i class="fas fa-sign-out-alt mr-2"></i>退出登录</button></div></div></div>';
      // 管理员入口
      if(S.siteConfig&&S.siteConfig.admins&&S.siteConfig.admins.indexOf(S.currentUser.username)!==-1){
        var dt=document.getElementById('navTabs');
        if(dt&&!dt.querySelector('[data-p="admin"]'))dt.insertAdjacentHTML('beforeend','<button class="tab-b" data-p="admin" onclick="App.navigate(\'admin\')"><i class="fas fa-shield-alt mr-2"></i>审核</button>');
      }
    } else {
      a.innerHTML='<button class="btn-g" onclick="Modals.open(\'loginM\')" style="font-size:14px;padding:8px 20px">登录</button><button class="btn-a" onclick="Modals.open(\'regM\')" style="font-size:14px;padding:8px 20px">注册</button>';
    }
  }
};
document.addEventListener('click',function(e){var m=document.getElementById('uMenu');if(m&&!e.target.closest('.relative'))m.classList.add('hidden');});