var Rank = {
  async render(){
    var s=document.getElementById('page-rank');
    s.innerHTML='<div class="max-w-7xl mx-auto px-4 sm:px-6 py-12"><h2 style="font-family:\'Space Grotesk\';font-weight:700;font-size:36px;letter-spacing:-1px"><i class="fas fa-trophy mr-3" style="color:var(--accent)"></i>排行榜</h2><div class="flex gap-2 mt-8"><button class="tab-b active" onclick="Rank.switchTab(this,\'avg\')">平均分排行</button><button class="tab-b" onclick="Rank.switchTab(this,\'count\')">评分数排行</button></div><div class="mt-8 space-y-4" id="rankList"></div></div>';
    this.loadList();
  },
  switchTab(btn,m){S.rankMode=m;btn.parentElement.querySelectorAll('.tab-b').forEach(function(b){b.classList.remove('active');});btn.classList.add('active');this.loadList();},
  async loadList(){
    var l=document.getElementById('rankList');l.innerHTML='<div class="text-center py-8"><div class="spinner"></div></div>';
    try{var rks=await Api.getRankings(S.rankMode);if(!rks.length){l.innerHTML='<div style="color:var(--muted);text-align:center;padding:24px">暂无数据</div>';return;}
    l.innerHTML=rks.map(function(img,i){var rc=i===0?'r1':i===1?'r2':i===2?'r3':'rd';return '<div class="flex items-center gap-4 p-4 rounded-xl transition-all hover:bg-white/5 cursor-pointer" style="background:var(--card);border:1px solid var(--border)" onclick="Detail.open('+img.id+')"><div class="rank-b '+rc+'">'+(i+1)+'</div><img src="'+imgS(img,120,90)+'" alt="'+img.title+'" style="width:72px;height:54px;object-fit:cover;border-radius:8px"><div class="flex-1 min-w-0"><div style="font-weight:600;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+img.title+'</div><div style="font-size:12px;color:var(--muted)">'+img.categoryLabel+' · by '+img.uploader+'</div></div><div class="text-right flex-shrink-0"><div class="flex items-center gap-1"><i class="fas fa-star" style="color:var(--accent);font-size:13px"></i><span style="font-weight:700;font-size:18px;font-family:\'Space Grotesk\'">'+img.avgScore+'</span></div><div style="font-size:12px;color:var(--muted)">'+img.ratingCount+' 人评分</div></div></div>';}).join('');
    }catch(e){l.innerHTML='<div style="color:var(--danger);text-align:center;padding:24px">'+e.message+'</div>';}
  }
};