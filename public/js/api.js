var Api = {
  async request(endpoint, opts) {
    opts = opts || {};
    var token = localStorage.getItem('pr_token');
    var headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (opts.body instanceof FormData) { headers['Content-Type'] = undefined; }
    else { headers['Content-Type'] = 'application/json'; }
    var res = await fetch(endpoint, {method:opts.method||'GET', headers:headers, body:opts.body});
    if (res.status===401){localStorage.removeItem('pr_token');S.currentUser=null;S.myRatings={};Auth.updateUI();Toast.show('登录已过期','error');throw new Error('未登录');}
    var data = await res.json();
    if (!res.ok) throw new Error(data.error||'请求失败');
    return data;
  },
  register(b){return this.request('/api/auth/register',{method:'POST',body:JSON.stringify(b)});},
  login(b){return this.request('/api/auth/login',{method:'POST',body:JSON.stringify(b)});},
  sendCode(b){return this.request('/api/auth/send-code',{method:'POST',body:JSON.stringify(b)});},
  getMe(){return this.request('/api/auth/me');},
  getImages(p){return this.request('/api/images?'+new URLSearchParams(p));},
  getImage(id){return this.request('/api/images/'+id);},
  uploadImage(fd){return this.request('/api/images',{method:'POST',body:fd});},
  deleteImage(id){return this.request('/api/images/'+id,{method:'DELETE'});},
  reportImage(id,b){return this.request('/api/images/'+id+'/report',{method:'POST',body:JSON.stringify(b)});},
  rate(b){return this.request('/api/ratings',{method:'POST',body:JSON.stringify(b)});},
  getMyRatings(){return this.request('/api/ratings/mine');},
  getProfile(){return this.request('/api/users/profile');},
  updateProfile(b){return this.request('/api/users/profile',{method:'PUT',body:JSON.stringify(b)});},
  uploadAvatar(fd){return this.request('/api/users/avatar',{method:'POST',body:fd});},
  getMyUploads(){return this.request('/api/users/uploads');},
  getConfig(){return this.request('/api/users/config');},
  getStats(){return this.request('/api/stats');},
  getRankings(s){return this.request('/api/rankings?sort='+s);},
  adminPending(){return this.request('/api/admin/pending');},
  adminReported(){return this.request('/api/admin/reported');},
  adminApprove(id){return this.request('/api/admin/approve/'+id,{method:'POST'});},
  adminReject(id,b){return this.request('/api/admin/reject/'+id,{method:'POST',body:JSON.stringify(b||{})});},
  adminStats(){return this.request('/api/admin/stats');}
};