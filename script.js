// Bumblebee Cinematic New Tab — v2
// Movable / closable / minimizable video sticker + sticky note

const bgVideo = document.getElementById('bg-video');
const frameVideo = document.getElementById('frame-video');
const playBtn = document.getElementById('play-toggle');
const muteBtn = document.getElementById('mute-toggle');
const scrubTrack = document.getElementById('scrub-track');
const scrubFill = document.getElementById('scrub-fill');
const scrubThumb = document.getElementById('scrub-thumb');
const timeLabel = document.getElementById('time-label');
const audioBadge = document.getElementById('audio-badge');
const videoNotice = document.getElementById('video-notice');

// ——— Clock / Date / Greeting ———
const clockEl = document.getElementById('clock');
const dateEl = document.getElementById('date');
const greetingEl = document.getElementById('greeting');
function updateClock() {
  const now = new Date();
  const h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const hour12 = h % 12 || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  clockEl.textContent = `${String(hour12).padStart(2,'0')}:${m} ${ampm}`;
  const dateFmt = new Intl.DateTimeFormat('en-US', { weekday:'long', month:'long', day:'numeric' });
  dateEl.textContent = dateFmt.format(now);
  let greet = 'Good evening';
  if (h < 12) greet = 'Good morning';
  else if (h < 18) greet = 'Good afternoon';
  greetingEl.textContent = greet;
}
updateClock();
setInterval(updateClock, 30*1000);
setInterval(() => { if (new Date().getSeconds()===0) updateClock(); }, 1000);

// ——— Search + Suggestions (Google/DuckDuckGo) ———
const searchForm = document.getElementById('search-form');
const searchInput = document.getElementById('search-input');
const suggestionsBox = document.getElementById('suggestions');
let selectedIndex = -1;
let currentSuggestions = [];

function navigateToQuery(q){
  q=q.trim(); if(!q) return;
  const isUrl = /^https?:\/\//i.test(q) || /^[\w-]+\.[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(q);
  if(isUrl) window.location.href = q.startsWith('http') ? q : 'https://'+q;
  else window.location.href = 'https://www.google.com/search?q='+encodeURIComponent(q);
}
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if(selectedIndex>=0 && currentSuggestions[selectedIndex]){
    navigateToQuery(currentSuggestions[selectedIndex]);
  } else {
    navigateToQuery(searchInput.value);
  }
});

function renderSuggestions(list){
  currentSuggestions = list;
  selectedIndex = -1;
  if(!list.length){ suggestionsBox.classList.add('hidden'); searchForm.classList.remove('has-suggestions'); return; }
  suggestionsBox.innerHTML = list.map((text,i)=>`
    <div class="suggestion-item" data-index="${i}" role="option">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <span class="suggestion-text">${text.replace(/</g,'&lt;')}</span>
      <span class="suggestion-go">↗</span>
    </div>
  `).join('');
  suggestionsBox.querySelectorAll('.suggestion-item').forEach(el=>{
    el.addEventListener('click', ()=> navigateToQuery(el.querySelector('.suggestion-text').textContent));
    el.addEventListener('mousemove', ()=>{
      suggestionsBox.querySelectorAll('.suggestion-item').forEach(x=>x.classList.remove('active'));
      el.classList.add('active'); selectedIndex = parseInt(el.dataset.index);
    });
  });
  suggestionsBox.classList.remove('hidden');
  searchForm.classList.add('has-suggestions');
}
function hideSuggestions(){
  suggestionsBox.classList.add('hidden');
  searchForm.classList.remove('has-suggestions');
  selectedIndex=-1; currentSuggestions=[];
}
let suggestTimer=null, lastFetchController=null;
async function fetchSuggestions(q){
  q=q.trim(); if(q.length<1){ hideSuggestions(); return; }
  if(lastFetchController) try{ lastFetchController.abort(); }catch{}
  lastFetchController = new AbortController();
  // Try Google first, fallback to DuckDuckGo
  const endpoints = [
    `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(q)}`,
    `https://duckduckgo.com/ac/?q=${encodeURIComponent(q)}&type=list`
  ];
  for(const url of endpoints){
    try{
      const res = await fetch(url, { signal: lastFetchController.signal });
      if(!res.ok) continue;
      const data = await res.json();
      let list=[];
      if(Array.isArray(data) && Array.isArray(data[1])) list = data[1]; // google chrome
      else if(Array.isArray(data) && data.length===2 && Array.isArray(data[1])) list = data[1]; // duckduckgo
      else if(data.results) list = data.results;
      list = list.slice(0,6);
      if(list.length){ renderSuggestions(list); return; }
    }catch(e){ if(e.name==='AbortError') return; continue; }
  }
  hideSuggestions();
}
searchInput.addEventListener('input', ()=>{
  const q=searchInput.value;
  if(suggestTimer) clearTimeout(suggestTimer);
  if(!q.trim()){ hideSuggestions(); return; }
  suggestTimer=setTimeout(()=>fetchSuggestions(q), 180);
});
searchInput.addEventListener('keydown', (e)=>{
  const items=suggestionsBox.querySelectorAll('.suggestion-item');
  if(suggestionsBox.classList.contains('hidden') || !items.length) return;
  if(e.key==='ArrowDown'){
    e.preventDefault();
    selectedIndex=Math.min(selectedIndex+1, items.length-1);
    items.forEach((el,i)=>el.classList.toggle('active', i===selectedIndex));
    if(selectedIndex>=0) searchInput.value=currentSuggestions[selectedIndex];
  } else if(e.key==='ArrowUp'){
    e.preventDefault();
    selectedIndex=Math.max(selectedIndex-1, -1);
    items.forEach((el,i)=>el.classList.toggle('active', i===selectedIndex));
    if(selectedIndex>=0) searchInput.value=currentSuggestions[selectedIndex];
    else searchInput.value=searchInput.value; // keep typed?
  } else if(e.key==='Escape'){
    hideSuggestions();
  } else if(e.key==='Enter' && selectedIndex>=0){
    e.preventDefault();
    navigateToQuery(currentSuggestions[selectedIndex]);
  }
});
document.addEventListener('click', (e)=>{
  if(!searchForm.contains(e.target)) hideSuggestions();
});
searchInput.addEventListener('focus', ()=>{
  if(currentSuggestions.length) { suggestionsBox.classList.remove('hidden'); searchForm.classList.add('has-suggestions'); }
});

// ——— Quick links: FREQUENT (topSites) vs PINNED ———
const STORAGE_KEY = 'bumblebee_quicklinks_v1';
const MODE_KEY = 'bumblebee_qlink_mode_v1'; // 'frequent' | 'pinned'
const quickLinksNav = document.getElementById('quick-links');
const toggleBtn = document.getElementById('toggle-mode');
const hintEl = document.getElementById('qlink-hint');
const defaultLinks = [
  { label:'YouTube', href:'https://youtube.com' },
  { label:'GitHub', href:'https://github.com' },
  { label:'X', href:'https://x.com' },
  { label:'Gmail', href:'https://mail.google.com' },
];
function getMode(){ try{ const m=localStorage.getItem(MODE_KEY); return m==='pinned'?'pinned':'frequent'; }catch{ return 'frequent'; } }
function setMode(m){ try{ localStorage.setItem(MODE_KEY,m);}catch{} }
function getFaviconUrl(href){
  try{ const u=new URL(href); return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`; }catch{ return ''; }
}
function getHostnameLabel(url){
  try{ const h=new URL(url).hostname.replace(/^www\./,''); const base=h.split('.')[0]; return base.charAt(0).toUpperCase()+base.slice(1); }catch{ return url; }
}
function getBrandedIconSvg(label){
  const l=label.toLowerCase();
  if(l.includes('youtube')) return `<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path fill="#FF0000" d="M23.5 12s0-3.9-.5-5.8a1 1 0 0 0-.7-.7C20.4 4.9 12 4.9 12 4.9s-8.4 0-10.3.6a1 1 0 0 0-.7.7C.5 8.1.5 12 .5 12s0 3.9.5 5.8a1 1 0 0 0 .7.7c1.9.6 10.3.6 10.3.6s8.4 0 10.3-.6a1 1 0 0 0 .7-.7c.5-1.9.5-5.8.5-5.8Z"/><path fill="#fff" d="M9.7 15.6 15.6 12 9.7 8.4z"/></svg>`;
  if(l.includes('github')) return `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="#181717" d="M12 0.3C5.4 0.3 0 5.7 0 12.3c0 5.3 3.4 9.8 8.2 11.4.6.1.8-.3.8-.6v-2c-3.3.7-4-1.4-4-1.4-.5-1.3-1.2-1.6-1.2-1.6-1-0.7.1-0.7.1-0.7 1.1.1 1.7 1.1 1.7 1.1 1 1.7 2.6 1.2 3.2.9.1-.7.4-1.2.7-1.5-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2 0-.3-.5-1.3.1-2.7 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.4.2 2.4.1 2.7.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6C20.6 22.1 24 17.6 24 12.3 24 5.7 18.6.3 12 .3Z"/></svg>`;
  if(l==='x' || l.includes('twitter')) return `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="#000" d="M18.9 2.2H22l-6.9 7.9L23.3 22h-6.4l-5-6.6L5.9 22H2.8l7.4-8.5L2.2 2.2h6.6l4.5 6 5.6-6ZM17.8 20h1.7L7.2 3.9H5.3L17.8 20Z"/></svg>`;
  if(l.includes('gmail') || l.includes('mail')) return `<svg viewBox="52 42 88 66" width="28" height="28" aria-hidden="true"><path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6"/><path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15"/><path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2"/><path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92"/><path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2"/></svg>`;
  return null;
}
function loadLinks(){
  try{
    const r=localStorage.getItem(STORAGE_KEY);
    if(r){
      const parsed=JSON.parse(r);
      if(parsed.length !== defaultLinks.length){
        const migrated = parsed.slice(0, defaultLinks.length);
        while(migrated.length < defaultLinks.length) migrated.push(defaultLinks[migrated.length]);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
      return parsed;
    }
  }catch{} return defaultLinks;
}
function saveLinks(l){ localStorage.setItem(STORAGE_KEY, JSON.stringify(l)); }

function attachPinnedListeners(){
  quickLinksNav.querySelectorAll('.qlink').forEach((a,i)=>{
    a.addEventListener('contextmenu',(e)=>{
      e.preventDefault();
      const links=loadLinks(); const cur=links[i]||defaultLinks[i];
      const label=prompt('Label:', cur.label); if(label===null) return;
      const href=prompt('URL (include https://):', cur.href); if(href===null) return;
      links[i]={label:label.trim()||cur.label, href:href.trim()||cur.href};
      saveLinks(links); renderPinnedLinks();
    });
  });
}
function renderPinnedLinks(){
  const links=loadLinks();
  quickLinksNav.innerHTML = links.map((link,i)=>{
    const branded=getBrandedIconSvg(link.label);
    const iconInner = branded ? branded : `<img src="${getFaviconUrl(link.href)}" width="24" height="24" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"><span class="fallback" style="display:none; width:24px;height:24px;align-items:center;justify-content:center;font-weight:700;">${(link.label[0]||'?').toUpperCase()}</span>`;
    return `<a href="${link.href}" class="qlink" data-index="${i}"><span class="qlink-icon">${iconInner}</span><span class="qlink-label">${link.label}</span></a>`;
  }).join('');
  attachPinnedListeners();
  if(hintEl) hintEl.textContent = 'Right-click a tile to edit · Your pinned sites';
  if(toggleBtn) toggleBtn.textContent = 'Show frequent';
}
function renderFrequentLinks(sites){
  if(!sites || !sites.length){
    quickLinksNav.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:14px 18px; background:var(--glass-bg); border:1px solid var(--glass-border); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border-radius:16px; color:var(--text-secondary); font-size:12px; line-height:1.5;">No frequent sites yet<br><span style="color:var(--text-tertiary); font-size:11px;">Browse a few sites, then reload. Click “Show pinned” below.</span></div>`;
    if(hintEl) hintEl.textContent = 'Frequent is empty — showing placeholder';
    if(toggleBtn) toggleBtn.textContent = 'Show pinned';
    return;
  }
  const limited=sites.slice(0,8);
  quickLinksNav.innerHTML = limited.map(site=>{
    const href=site.url;
    let label = site.title ? site.title.split(' - ')[0].split(' | ')[0].trim() : '';
    if(!label || label.length>18) label=getHostnameLabel(href);
    if(label.length>14) label=label.slice(0,14);
    const fav=getFaviconUrl(href);
    return `<a href="${href}" class="qlink"><span class="qlink-icon"><img src="${fav}" width="24" height="24" alt="" onerror="this.outerHTML='<span class=&quot;fallback&quot; style=&quot;display:grid;place-items:center;width:24px;height:24px;font-weight:700;background:#fff;border-radius:4px;&quot;>'+'${label[0].toUpperCase()}'+'</span>'"></span><span class="qlink-label">${label}</span></a>`;
  }).join('');
  if(hintEl) hintEl.textContent = 'Your most visited sites · Click “Show pinned” to edit';
  if(toggleBtn) toggleBtn.textContent = 'Show pinned';
}
function loadFrequentAndRender(){
  if(typeof chrome!=='undefined' && chrome.topSites && chrome.topSites.get){
    try{
      chrome.topSites.get((sites)=>{
        if(chrome.runtime.lastError){
          console.warn('topSites error', chrome.runtime.lastError);
          renderFrequentLinks([]);
          return;
        }
        // filter out chrome:// and extension urls
        const filtered = (sites||[]).filter(s=> s.url && !s.url.startsWith('chrome://') && !s.url.startsWith('chrome-extension://') && !s.url.startsWith('edge://'));
        if(!filtered.length) renderFrequentLinks([]);
        else renderFrequentLinks(filtered);
      });
    }catch(e){ console.warn(e); renderFrequentLinks([]); }
  } else {
    console.warn('chrome.topSites not available — are you on chrome://extensions after reload?');
    renderFrequentLinks([]);
  }
}
function applyMode(mode){
  setMode(mode);
  if(mode==='frequent') loadFrequentAndRender();
  else renderPinnedLinks();
}
if(toggleBtn){
  toggleBtn.addEventListener('click', ()=>{
    const cur=getMode();
    applyMode(cur==='frequent' ? 'pinned' : 'frequent');
  });
}
// init
applyMode(getMode());

// ——— Caption — removed per user request (controls now replace it) — guard if elements missing ———
const captionText=document.getElementById('caption-text');
const captionBtn=document.getElementById('caption-edit');
if(captionText && captionBtn){
  const CAPTION_KEY='bumblebee_caption_v1';
  try{ const s=localStorage.getItem(CAPTION_KEY); if(s) captionText.textContent=s; }catch{}
  function setEditing(on){
    captionText.contentEditable=on?'true':'false';
    if(on){ captionText.focus(); const r=document.createRange(); r.selectNodeContents(captionText); const sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(r); }
    else { try{ localStorage.setItem(CAPTION_KEY, captionText.textContent.trim()); }catch{} }
  }
  captionBtn.addEventListener('click',()=>setEditing(captionText.contentEditable!=='true'));
  captionText.addEventListener('click',()=>{ if(captionText.contentEditable!=='true') setEditing(true); });
  captionText.addEventListener('keydown',(e)=>{ if(e.key==='Enter'){ e.preventDefault(); setEditing(false); captionText.blur(); } if(e.key==='Escape'){ setEditing(false); captionText.blur(); }});
  captionText.addEventListener('blur',()=>setEditing(false));
}

// ——— Video sync & scrub ———
function keepInSync(){ if(!bgVideo.duration||!frameVideo.duration) return; const drift=Math.abs(bgVideo.currentTime-frameVideo.currentTime); if(drift>0.35) bgVideo.currentTime=frameVideo.currentTime; }
function formatTime(s){ if(!isFinite(s)) return '0:00'; const m=Math.floor(s/60); const sec=Math.floor(s%60).toString().padStart(2,'0'); return `${m}:${sec}`; }
function updateScrub(){ const dur=frameVideo.duration||32; const cur=frameVideo.currentTime||0; const pct=dur?(cur/dur)*100:0; scrubFill.style.width=pct+'%'; scrubThumb.style.left=pct+'%'; timeLabel.textContent=`${formatTime(cur)} / ${formatTime(dur)}`; keepInSync(); }
frameVideo.addEventListener('timeupdate', updateScrub);
frameVideo.addEventListener('loadedmetadata', updateScrub);
bgVideo.addEventListener('loadedmetadata', ()=>{ bgVideo.play().catch(()=>{}); frameVideo.play().catch(()=>{}); });
let isDraggingScrub=false;
function seekFromEvent(e){
  const rect=scrubTrack.getBoundingClientRect();
  const x=(e.touches?e.touches[0].clientX:e.clientX)-rect.left;
  const pct=Math.max(0,Math.min(1,x/rect.width));
  const dur=frameVideo.duration||32; const t=pct*dur;
  frameVideo.currentTime=t; bgVideo.currentTime=t; updateScrub();
}
scrubTrack.addEventListener('click', seekFromEvent);
scrubTrack.addEventListener('mousedown',(e)=>{ isDraggingScrub=true; seekFromEvent(e); });
window.addEventListener('mousemove',(e)=>{ if(isDraggingScrub) seekFromEvent(e); });
window.addEventListener('mouseup',()=>{ isDraggingScrub=false; });
scrubTrack.addEventListener('touchstart',(e)=>{ isDraggingScrub=true; seekFromEvent(e); },{passive:true});
window.addEventListener('touchmove',(e)=>{ if(isDraggingScrub) seekFromEvent(e); },{passive:true});
window.addEventListener('touchend',()=>{ isDraggingScrub=false; });

// ——— Audio — ONLY frame ———
bgVideo.muted=true; frameVideo.muted=true;
function refreshAudioUI(){
  const muted=frameVideo.muted, paused=frameVideo.paused;
  playBtn.querySelector('.icon-play').style.display=paused?'block':'none';
  playBtn.querySelector('.icon-pause').style.display=paused?'none':'block';
  muteBtn.querySelector('.icon-muted').style.display=muted?'block':'none';
  muteBtn.querySelector('.icon-unmuted').style.display=muted?'none':'block';
  if(!muted&&!paused){ audioBadge.textContent='live • sound'; audioBadge.classList.add('live'); }
  else if(muted){ audioBadge.textContent='muted'; audioBadge.classList.remove('live'); }
  else { audioBadge.textContent='paused'; audioBadge.classList.remove('live'); }
  playBtn.setAttribute('aria-label', paused?'Play with sound':'Pause');
  muteBtn.setAttribute('aria-label', muted?'Unmute':'Mute');
}
playBtn.addEventListener('click', async()=>{
  try{
    if(frameVideo.paused){ if(frameVideo.muted) frameVideo.muted=false; await frameVideo.play(); bgVideo.currentTime=frameVideo.currentTime; bgVideo.play().catch(()=>{}); }
    else { frameVideo.pause(); bgVideo.pause(); }
  }catch(e){ console.warn(e); }
  refreshAudioUI();
});
muteBtn.addEventListener('click', async()=>{
  frameVideo.muted=!frameVideo.muted;
  if(!frameVideo.muted && frameVideo.paused){ try{ await frameVideo.play(); bgVideo.play().catch(()=>{});}catch{} }
  refreshAudioUI();
});
frameVideo.addEventListener('click', ()=>muteBtn.click());
frameVideo.addEventListener('play', refreshAudioUI);
frameVideo.addEventListener('pause', refreshAudioUI);
frameVideo.addEventListener('volumechange', refreshAudioUI);
refreshAudioUI();
Promise.allSettled([bgVideo.play(), frameVideo.play()]).then(refreshAudioUI);

// video missing
let bgError=false, frameError=false;
function checkMissing(){ if(bgError&&frameError){ videoNotice.classList.remove('hidden'); bgVideo.style.display='none'; document.getElementById('frame-video').style.display='none'; document.getElementById('frame-video-wrap').style.background='linear-gradient(135deg,#1a1a0a,#0A0A0A)'; } }
bgVideo.addEventListener('error',()=>{ bgError=true; checkMissing(); });
frameVideo.addEventListener('error',()=>{ frameError=true; checkMissing(); });
setTimeout(()=>{ if(frameVideo.readyState===0&&bgVideo.readyState===0){ fetch('assets/video.mp4',{method:'HEAD'}).then(r=>{ if(!r.ok){ bgError=true; frameError=true; checkMissing(); }}).catch(()=>{}); }},1200);
document.addEventListener('keydown',(e)=>{
  if(e.code==='Space'&&document.activeElement===document.body){ e.preventDefault(); playBtn.click(); }
  if(e.key.toLowerCase()==='m'&&document.activeElement===document.body) muteBtn.click();
});

// ———————————————————————————————
//  WINDOW CONTROLS + DRAGGING
// ———————————————————————————————
const videoFrame=document.getElementById('video-frame');
const frameHeader=document.getElementById('frame-header');
const frameRestore=document.getElementById('frame-restore');
const stickyNote=document.getElementById('sticky-note');
const stickyHeader=document.getElementById('sticky-header');
const stickyRestore=document.getElementById('sticky-restore');

// persist keys
const FRAME_POS_KEY='bumblebee_frame_pos_v2';
const FRAME_STATE_KEY='bumblebee_frame_state_v2'; // normal | minimized | maximized | closed
const STICKY_POS_KEY='bumblebee_sticky_pos_v2';
const STICKY_STATE_KEY='bumblebee_sticky_state_v2';
const STICKY_TEXT_KEY='bumblebee_sticky_text_v2';
const STICKY_COLOR_KEY='bumblebee_sticky_color_v2';

// ——— generic drag helper ———
function makeDraggable(frame, header, posKey){
  let dragging=false, startX=0, startY=0, origLeft=0, origTop=0;
  let frameLeft=0, frameTop=0;

  function loadPos(){
    try{
      const raw=localStorage.getItem(posKey);
      if(raw){ const p=JSON.parse(raw); frame.style.left=p.left; frame.style.top=p.top; frame.style.right='auto'; frame.style.bottom='auto'; return; }
    }catch{}
  }
  loadPos();

  function clamp(val, min, max){ return Math.max(min, Math.min(max, val)); }

  header.addEventListener('mousedown', (e)=>{
    if(e.target.closest('.dot')) return; // don't drag when clicking traffic lights
    dragging=true; frame.classList.add('dragging');
    const rect=frame.getBoundingClientRect();
    startX=e.clientX; startY=e.clientY;
    origLeft=rect.left; origTop=rect.top;
    // switch to left/top positioning if was right/bottom
    frame.style.left=rect.left+'px'; frame.style.top=rect.top+'px';
    frame.style.right='auto'; frame.style.bottom='auto';
    e.preventDefault();
  });
  header.addEventListener('touchstart', (e)=>{
    if(e.target.closest('.dot')) return;
    dragging=true; frame.classList.add('dragging');
    const rect=frame.getBoundingClientRect();
    const t=e.touches[0];
    startX=t.clientX; startY=t.clientY;
    origLeft=rect.left; origTop=rect.top;
    frame.style.left=rect.left+'px'; frame.style.top=rect.top+'px';
    frame.style.right='auto'; frame.style.bottom='auto';
  }, {passive:true});

  window.addEventListener('mousemove', (e)=>{
    if(!dragging) return;
    const dx=e.clientX-startX, dy=e.clientY-startY;
    let nl=origLeft+dx, nt=origTop+dy;
    nl=clamp(nl, 6, window.innerWidth - frame.offsetWidth - 6);
    nt=clamp(nt, 6, window.innerHeight - frame.offsetHeight - 6);
    frame.style.left=nl+'px'; frame.style.top=nt+'px';
  });
  window.addEventListener('touchmove', (e)=>{
    if(!dragging) return;
    const t=e.touches[0];
    const dx=t.clientX-startX, dy=t.clientY-startY;
    let nl=origLeft+dx, nt=origTop+dy;
    nl=clamp(nl, 6, window.innerWidth - frame.offsetWidth - 6);
    nt=clamp(nt, 6, window.innerHeight - frame.offsetHeight - 6);
    frame.style.left=nl+'px'; frame.style.top=nt+'px';
  }, {passive:true});
  function endDrag(){
    if(!dragging) return;
    dragging=false; frame.classList.remove('dragging');
    try{ localStorage.setItem(posKey, JSON.stringify({left:frame.style.left, top:frame.style.top})); }catch{}
  }
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('touchend', endDrag);
}

makeDraggable(videoFrame, frameHeader, FRAME_POS_KEY);
makeDraggable(stickyNote, stickyHeader, STICKY_POS_KEY);

// ——— Video frame traffic lights ———
function applyFrameState(state){
  videoFrame.classList.remove('minimized','maximized','hidden-frame');
  frameRestore.classList.add('hidden');
  if(state==='minimized') videoFrame.classList.add('minimized');
  else if(state==='maximized') videoFrame.classList.add('maximized');
  else if(state==='closed'){ videoFrame.classList.add('hidden-frame'); frameRestore.classList.remove('hidden'); }
  try{ localStorage.setItem(FRAME_STATE_KEY, state); }catch{}
  // keep within viewport after state change
  setTimeout(()=>{
    if(state!=='closed'){
      const r=videoFrame.getBoundingClientRect();
      if(r.right>window.innerWidth-6 || r.bottom>window.innerHeight-6 || r.left<6 || r.top<6){
        videoFrame.style.left=Math.max(6, window.innerWidth - videoFrame.offsetWidth - 20)+'px';
        videoFrame.style.top=Math.max(6, window.innerHeight - videoFrame.offsetHeight - 20)+'px';
        videoFrame.style.right='auto'; videoFrame.style.bottom='auto';
      }
    }
  }, 300);
}
try{
  const saved=localStorage.getItem(FRAME_STATE_KEY);
  if(saved) applyFrameState(saved);
}catch{}
document.querySelectorAll('#video-frame .dot').forEach(btn=>{
  btn.addEventListener('click',(e)=>{
    e.stopPropagation();
    const action=btn.dataset.action;
    if(action==='close') applyFrameState('closed');
    else if(action==='minimize'){
      const isMin=videoFrame.classList.contains('minimized');
      applyFrameState(isMin ? 'normal' : 'minimized');
    }
    else if(action==='expand'){
      const isMax=videoFrame.classList.contains('maximized');
      applyFrameState(isMax ? 'normal' : 'maximized');
    }
  });
});
frameRestore.addEventListener('click', ()=>applyFrameState('normal'));

// double-click header to toggle maximize/minimize
frameHeader.addEventListener('dblclick',(e)=>{
  if(e.target.closest('.dot')) return;
  const isMax=videoFrame.classList.contains('maximized');
  applyFrameState(isMax ? 'normal' : 'maximized');
});

// ——— Sticky note ———
const stickyText=document.getElementById('sticky-text');
const stickyBody=document.getElementById('sticky-body');
const colorDots=document.getElementById('color-dots');
const stickyCount=document.getElementById('sticky-count');
const stickyClear=document.getElementById('sticky-clear');

try{
  const savedText=localStorage.getItem(STICKY_TEXT_KEY);
  if(savedText) stickyText.value=savedText;
  const savedColor=localStorage.getItem(STICKY_COLOR_KEY);
  if(savedColor){ stickyNote.style.background=savedColor; document.querySelectorAll('.color-dot').forEach(d=>d.classList.toggle('active', d.dataset.color===savedColor)); }
  const savedState=localStorage.getItem(STICKY_STATE_KEY);
  if(savedState==='closed'){ stickyNote.classList.add('hidden-note'); stickyRestore.classList.remove('hidden'); }
  else if(savedState==='minimized') stickyNote.classList.add('minimized');
  else if(savedState==='maximized') stickyNote.classList.add('maximized');
}catch{}
function updateCount(){ stickyCount.textContent=String(stickyText.value.length); }
updateCount();
stickyText.addEventListener('input', ()=>{
  updateCount();
  try{ localStorage.setItem(STICKY_TEXT_KEY, stickyText.value); }catch{}
});
stickyClear.addEventListener('click', ()=>{
  if(confirm('Clear sticky note?')){ stickyText.value=''; updateCount(); try{ localStorage.setItem(STICKY_TEXT_KEY,''); }catch{} stickyText.focus(); }
});
colorDots.addEventListener('click',(e)=>{
  const dot=e.target.closest('.color-dot'); if(!dot) return;
  const color=dot.dataset.color;
  stickyNote.style.background=color;
  document.querySelectorAll('.color-dot').forEach(d=>d.classList.remove('active'));
  dot.classList.add('active');
  try{ localStorage.setItem(STICKY_COLOR_KEY, color); }catch{}
});

function applyStickyState(state){
  stickyNote.classList.remove('minimized','maximized','hidden-note');
  stickyRestore.classList.add('hidden');
  if(state==='minimized') stickyNote.classList.add('minimized');
  else if(state==='maximized') stickyNote.classList.add('maximized');
  else if(state==='closed'){ stickyNote.classList.add('hidden-note'); stickyRestore.classList.remove('hidden'); }
  try{ localStorage.setItem(STICKY_STATE_KEY, state); }catch{}
}
document.querySelectorAll('#sticky-note .dot').forEach(btn=>{
  btn.addEventListener('click',(e)=>{
    e.stopPropagation();
    const action=btn.dataset.sticky;
    if(action==='close') applyStickyState('closed');
    else if(action==='minimize'){ const isMin=stickyNote.classList.contains('minimized'); applyStickyState(isMin?'normal':'minimized'); }
    else if(action==='expand'){ const isMax=stickyNote.classList.contains('maximized'); applyStickyState(isMax?'normal':'maximized'); }
  });
});
stickyRestore.addEventListener('click', ()=>applyStickyState('normal'));
stickyHeader.addEventListener('dblclick',(e)=>{
  if(e.target.closest('.dot')) return;
  const isMax=stickyNote.classList.contains('maximized');
  applyStickyState(isMax?'normal':'maximized');
});

// keep sticky readable in light scheme: if white, add subtle border
