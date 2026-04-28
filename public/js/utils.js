var Toast = {
  show(msg, type) {
    type = type || 'info';
    var c = document.getElementById('toastC'), t = document.createElement('div');
    t.className = 'toast ' + type;
    var ic = {success:'fa-check-circle',error:'fa-exclamation-circle',info:'fa-info-circle',warn:'fa-exclamation-triangle'};
    t.innerHTML = '<i class="fas '+(ic[type]||ic.info)+'"></i><span>'+msg+'</span>';
    c.appendChild(t);
    setTimeout(function(){t.classList.add('exit');setTimeout(function(){t.remove();},300);},3500);
  }
};

var Modals = {
  open(id){var m=document.getElementById(id);m.style.display='flex';requestAnimationFrame(function(){m.classList.add('active');});document.body.style.overflow='hidden';},
  close(id){var m=document.getElementById(id);m.classList.remove('active');setTimeout(function(){m.style.display='none';document.body.style.overflow='';},300);}
};

document.addEventListener('click',function(e){if(e.target.classList.contains('modal-b'))Modals.close(e.target.id);});
document.addEventListener('keydown',function(e){if(e.key==='Escape')document.querySelectorAll('.modal-b.active').forEach(function(m){Modals.close(m.id);});});

function rAvatar(user,size,br){
  size=size||40;br=br||(size>50?16:10);var fs=Math.round(size*0.4);
  if(user&&user.avatarUrl) return '<div class="avatar-box" style="width:'+size+'px;height:'+size+'px;border-radius:'+br+'px"><img src="'+user.avatarUrl+'" alt="头像"></div>';
  var ch=(user&&(user.avatar||(user.username&&user.username.charAt(0))))||'?';
  return '<div class="avatar-box" style="width:'+size+'px;height:'+size+'px;border-radius:'+br+'px;font-size:'+fs+'px">'+ch.toUpperCase()+'</div>';
}
function imgS(img,w,h){
  if(img.filename&&img.filename.startsWith('picsum:')) return 'https://picsum.photos/seed/'+img.filename.replace('picsum:','')+'/'+w+'/'+h+'.jpg';
  return img.url||'/uploads/'+img.filename;
}
function animateNum(id,t){
  var el=document.getElementById(id);if(!el||!t){if(el)el.textContent=t||0;return;}
  var d=1200,s=performance.now();
  (function f(n){var p=Math.min((n-s)/d,1);el.textContent=Math.round(t*(1-Math.pow(1-p,3))).toLocaleString();if(p<1)requestAnimationFrame(f);})(s);
}