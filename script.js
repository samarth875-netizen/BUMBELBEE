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

// ——— Tiny live weather — top-left, Silicon Valley fallback ———
const weatherIcon = document.getElementById('weather-icon');
const weatherTemp = document.getElementById('weather-temp');
const weatherDesc = document.getElementById('weather-desc');
const weatherLoc = document.getElementById('weather-loc');
function wmoToText(code){
  const m = {
    0:'clear',1:'mainly clear',2:'partly cloudy',3:'overcast',
    45:'fog',48:'rime fog',51:'light drizzle',53:'drizzle',55:'dense drizzle',
    61:'slight rain',63:'rain',65:'heavy rain',71:'slight snow',73:'snow',75:'heavy snow',
    80:'slight showers',81:'showers',82:'heavy showers',95:'thunderstorm',96:'thunderstorm hail',99:'thunderstorm hail'
  };
  return m[code] || '—';
}
function wmoToEmoji(code, isDay=1){
  if(code===0) return isDay ? '☀️' : '🌙';
  if([1,2].includes(code)) return isDay ? '⛅' : '☁️';
  if(code===3) return '☁️';
  if([45,48].includes(code)) return '🌫️';
  if([51,53,55,61,63,65,80,81,82].includes(code)) return '🌧️';
  if([71,73,75].includes(code)) return '❄️';
  if([95,96,99].includes(code)) return '⛈️';
  return '◐';
}
async function fetchWeather(lat, lon){
  try{
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day,wind_speed_10m&timezone=auto`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('weather');
    const j = await res.json();
    const cur = j.current;
    if(!cur) throw new Error('no current');
    const temp = Math.round(cur.temperature_2m);
    const code = cur.weather_code;
    const isDay = cur.is_day;
    if(weatherTemp) weatherTemp.textContent = `${temp}°`;
    if(weatherIcon) weatherIcon.textContent = wmoToEmoji(code, isDay);
    if(weatherDesc) weatherDesc.textContent = wmoToText(code);
    // reverse geocode for location name (small, non-blocking)
    try{
      const rev = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`, {headers:{'Accept-Language':'en'}});
      if(rev.ok){
        const gj = await rev.json();
        const name = gj.address && (gj.address.city || gj.address.town || gj.address.village || gj.address.county || gj.address.state);
        if(name && weatherLoc) weatherLoc.textContent = name;
      }
    }catch{}
  }catch(e){
    console.warn('weather', e);
    if(weatherDesc) weatherDesc.textContent = '—';
  }
}
const WEATHER_MANUAL_KEY = 'bumblebee_weather_manual_v1';
async function geocodeCity(city){
  try{
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1&addressdetails=1`;
    const r = await fetch(url, {headers:{'Accept-Language':'en'}});
    if(!r.ok) return null;
    const j = await r.json();
    if(j && j[0]) return {lat: parseFloat(j[0].lat), lon: parseFloat(j[0].lon), name: j[0].display_name.split(',').slice(0,2).join(', ')};
  }catch(e){ console.warn('geocode', e); }
  return null;
}
async function promptForCity(){
  const manual = localStorage.getItem(WEATHER_MANUAL_KEY);
  if(manual){
    try{ const p = JSON.parse(manual); if(p && p.lat) return p; }catch{}
  }
  const city = prompt('Location blocked — enter your city for live weather (e.g., “Mumbai” or “London, UK”)\nLeave empty for Silicon Valley:');
  if(city === null) return null; // cancel → use fallback
  const trimmed = city.trim();
  if(!trimmed) return null;
  const geo = await geocodeCity(trimmed);
  if(geo){
    localStorage.setItem(WEATHER_MANUAL_KEY, JSON.stringify(geo));
    return geo;
  } else {
    alert('Could not find that city. Using Silicon Valley.');
    return null;
  }
}
function initWeather(){
  const fallback = {lat:37.3875, lon:-122.0575, name:'Silicon Valley'};
  if(weatherLoc) weatherLoc.textContent = fallback.name;
  // click weather to change city manually
  const weatherEl = document.getElementById('weather');
  if(weatherEl){
    weatherEl.style.pointerEvents = 'auto';
    weatherEl.style.cursor = 'pointer';
    weatherEl.title = 'Click to change city';
    weatherEl.addEventListener('click', async ()=>{
      const city = prompt('Enter city for weather (e.g., “Delhi”):');
      if(city === null) return;
      const t = city.trim();
      if(!t){ localStorage.removeItem(WEATHER_MANUAL_KEY); fetchWeather(fallback.lat, fallback.lon); if(weatherLoc) weatherLoc.textContent = fallback.name; return; }
      const geo = await geocodeCity(t);
      if(geo){ localStorage.setItem(WEATHER_MANUAL_KEY, JSON.stringify(geo)); fetchWeather(geo.lat, geo.lon); if(weatherLoc) weatherLoc.textContent = geo.name; }
      else alert('City not found');
    });
  }
  // if manual city saved, use it directly
  try{
    const saved = localStorage.getItem(WEATHER_MANUAL_KEY);
    if(saved){
      const p = JSON.parse(saved);
      if(p && p.lat){ fetchWeather(p.lat, p.lon); if(weatherLoc) weatherLoc.textContent = p.name; return; }
    }
  }catch{}
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(pos=>{
      const {latitude, longitude} = pos.coords;
      if(weatherLoc) weatherLoc.textContent = '';
      fetchWeather(latitude, longitude);
    }, async err=>{
      console.warn('geo denied', err.message);
      const manual = await promptForCity();
      if(manual) { fetchWeather(manual.lat, manual.lon); if(weatherLoc) weatherLoc.textContent = manual.name; }
      else fetchWeather(fallback.lat, fallback.lon);
    }, {timeout:7000, maximumAge: 10*60*1000});
  } else {
    promptForCity().then(manual=>{
      if(manual) { fetchWeather(manual.lat, manual.lon); if(weatherLoc) weatherLoc.textContent = manual.name; }
      else fetchWeather(fallback.lat, fallback.lon);
    });
  }
  setInterval(()=>{
    try{
      const saved = localStorage.getItem(WEATHER_MANUAL_KEY);
      if(saved){ const p=JSON.parse(saved); if(p&&p.lat){ fetchWeather(p.lat,p.lon); return; } }
    }catch{}
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(p=>fetchWeather(p.coords.latitude,p.coords.longitude), ()=>fetchWeather(fallback.lat,fallback.lon), {maximumAge: 10*60*1000});
    } else fetchWeather(fallback.lat, fallback.lon);
  }, 10*60*1000);
}
initWeather();

// ——— Clock / Date / Greeting ———
const clockEl = document.getElementById('clock');
const dateEl = document.getElementById('date');
const greetingEl = document.getElementById('greeting');
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  clockEl.textContent = `${h}:${m}`;
  // like photo: Monday, 5 June (no year, no uppercase)
  const dateFmt = new Intl.DateTimeFormat('en-GB', { weekday:'long', day:'numeric', month:'long' });
  dateEl.textContent = dateFmt.format(now);
  let greet = 'Good evening';
  const hr = now.getHours();
  if (hr < 12) greet = 'Good morning';
  else if (hr < 18) greet = 'Good afternoon';
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

// ——— Quick links: 5 MOST-VISITED ONLY ———
const quickLinksNav = document.getElementById('quick-links');
const hintEl = document.getElementById('qlink-hint');
function getFaviconUrl(href){
  try{ const u=new URL(href); return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=64`; }catch{ return ''; }
}
function getHostnameLabel(url){
  try{ const h=new URL(url).hostname.replace(/^www\./,''); const base=h.split('.')[0]; return base.charAt(0).toUpperCase()+base.slice(1); }catch{ return url; }
}
function renderFrequentLinks(sites){
  if(!sites || !sites.length){
    // fallback: show 4 pinned defaults if no history yet — still 5 max, single row
    const fallback = [
      {url:'https://youtube.com', title:'YouTube'},
      {url:'https://github.com', title:'GitHub'},
      {url:'https://x.com', title:'X'},
      {url:'https://mail.google.com', title:'Gmail'},
      {url:'https://google.com', title:'Google'},
    ];
    sites = fallback;
  }
  const limited = sites.slice(0,5);
  quickLinksNav.innerHTML = limited.map(site=>{
    const href = site.url;
    let label = site.title ? site.title.split(' - ')[0].split(' | ')[0].trim() : '';
    if(!label || label.length>14) label=getHostnameLabel(href);
    if(label.length>14) label=label.slice(0,14);
    const fav=getFaviconUrl(href);
    return `<a href="${href}" class="qlink"><span class="qlink-icon"><img src="${fav}" width="24" height="24" alt="" onerror="this.outerHTML='<span class=&quot;fallback&quot; style=&quot;display:grid;place-items:center;width:24px;height:24px;font-weight:700;background:#fff;border-radius:4px;&quot;>'+'${label[0].toUpperCase()}'+'</span>'"></span><span class="qlink-label">${label}</span></a>`;
  }).join('');
  if(hintEl) hintEl.textContent = 'Most visited';
}
function loadFrequentAndRender(){
  if(typeof chrome!=='undefined' && chrome.topSites && chrome.topSites.get){
    try{
      chrome.topSites.get((sites)=>{
        if(chrome.runtime.lastError){
          console.warn('topSites', chrome.runtime.lastError);
          renderFrequentLinks([]);
          return;
        }
        const filtered = (sites||[]).filter(s=> s.url && !s.url.startsWith('chrome://') && !s.url.startsWith('chrome-extension://') && !s.url.startsWith('edge://'));
        renderFrequentLinks(filtered);
      });
    }catch(e){ console.warn(e); renderFrequentLinks([]); }
  } else {
    renderFrequentLinks([]);
  }
}
loadFrequentAndRender();

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

// —————————————————————
//  NEWS — Discover (scroll cube) — RSS2JSON + Google News
// —————————————————————
const newsGrid = document.getElementById('news-grid');
const newsStatus = document.getElementById('news-status');
const newsCategories = document.getElementById('news-categories');
const newsRefresh = document.getElementById('news-refresh');
let currentFeed = 'top';
const NEWS_CACHE_TTL = 10 * 60 * 1000; // 10 min

function getNewsCacheKey(feed){ return `bumblebee_news_v2_${feed}`; }
function formatTimeAgo(dateStr){
  try{
    const d = new Date(dateStr);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff/60000);
    if(mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins/60);
    if(hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs/24);
    return `${days}d ago`;
  }catch{ return ''; }
}
function extractImage(item){
  if(item.thumbnail) return item.thumbnail;
  if(item.enclosure){
    if(item.enclosure.thumbnail) return item.enclosure.thumbnail;
    if(item.enclosure.link) return item.enclosure.link;
    if(item.enclosure.url) return item.enclosure.url;
  }
  const m = item.description && item.description.match(/<img[^>]+src=["']([^"']+)["']/i);
  if(m) return m[1];
  const m2 = item.content && item.content.match(/<img[^>]+src=["']([^"']+)["']/i);
  if(m2) return m2[1];
  return '';
}
const newsDots = document.getElementById('news-dots');
let newsObserver = null;
function updateNewsDots(){
  if(!newsGrid || !newsDots) return;
  const cards = newsGrid.querySelectorAll('.news-card');
  if(!cards.length){ newsDots.innerHTML=''; return; }
  if(newsDots.childElementCount !== cards.length){
    newsDots.innerHTML = Array.from(cards).map((_,i)=>`<span class="news-dot${i===0?' active':''}" data-index="${i}"></span>`).join('');
    newsDots.querySelectorAll('.news-dot').forEach(dot=>{
      dot.addEventListener('click', ()=>{
        const idx = parseInt(dot.dataset.index);
        cards[idx].scrollIntoView({behavior:'smooth', inline:'start', block:'nearest'});
      });
    });
    // use IntersectionObserver for active dot — far cheaper than scroll+getBoundingClientRect
    if(newsObserver) newsObserver.disconnect();
    newsObserver = new IntersectionObserver((entries)=>{
      let best = null, bestRatio = 0;
      entries.forEach(e=>{ if(e.isIntersecting && e.intersectionRatio > bestRatio){ bestRatio = e.intersectionRatio; best = e.target; } });
      if(best){
        const idx = Array.from(cards).indexOf(best);
        newsDots.querySelectorAll('.news-dot').forEach((d,i)=> d.classList.toggle('active', i===idx));
      }
    }, { root: newsGrid, threshold: [0.5, 0.75, 1.0] });
    cards.forEach(c=> newsObserver.observe(c));
  }
}
function renderNews(items){
  if(!newsGrid) return;
  if(!items || !items.length){
    newsGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:24px; color:var(--text-tertiary);">No headlines right now — try another category or refresh.</div>`;
    if(newsDots) newsDots.innerHTML='';
    return;
  }
  newsGrid.innerHTML = items.map(item=>{
    const img = extractImage(item);
    const title = (item.title || '').replace(/</g,'&lt;');
    const desc = (item.description || '').replace(/<[^>]*>/g,'').slice(0,110).replace(/</g,'&lt;');
    const link = item.link || '#';
    const source = (item.author || (()=>{ try{ return new URL(link).hostname.replace('www.',''); }catch{ return 'News'; }})()).slice(0,22);
    const time = formatTimeAgo(item.pubDate);
    const thumb = img ? `<img class="news-card-thumb" src="${img}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">` : `<div class="news-card-thumb" style="display:grid;place-items:center; font-size:18px; color:var(--text-tertiary);">📰</div>`;
    const catLabel = currentFeed==='top' ? 'TOP NEWS' : currentFeed.toUpperCase();
    return `<a class="news-card" href="${link}" target="_blank" rel="noopener">
      <div class="news-card-thumb-wrap">${thumb}<span class="news-card-pill">${catLabel}</span></div>
      <div class="news-card-body">
        <div class="news-card-title">${title}</div>
        ${desc ? `<div class="news-card-desc">${desc}…</div>` : ''}
        <div class="news-card-meta"><span class="news-card-source">${source}</span><span>•</span><span>${time}</span></div>
      </div>
    </a>`;
  }).join('');
  // dots
  setTimeout(updateNewsDots, 50);
}
async function fetchNews(feed='top'){
  currentFeed = feed;
  if(newsStatus){ newsStatus.textContent='Loading headlines…'; newsStatus.classList.remove('hidden'); }
  // cache check
  try{
    const cached = localStorage.getItem(getNewsCacheKey(feed));
    if(cached){
      const {ts, data} = JSON.parse(cached);
      if(Date.now()-ts < NEWS_CACHE_TTL && data && data.length){
        renderNews(data);
        if(newsStatus) newsStatus.classList.add('hidden');
        // still fetch fresh in background
      }
    }
  }catch{}
  const rssMap = {
    top: 'https://feeds.bbci.co.uk/news/rss.xml',
    technology: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
    sports: 'https://feeds.bbci.co.uk/sport/rss.xml',
    business: 'https://feeds.bbci.co.uk/news/business/rss.xml',
    entertainment: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
  };
  const rssUrl = rssMap[feed] || rssMap.top;
  const api = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
  try{
    const res = await fetch(api);
    if(!res.ok) throw new Error('news fetch failed');
    const json = await res.json();
    const items = (json.items || []).slice(0,8);
    renderNews(items);
    try{ localStorage.setItem(getNewsCacheKey(feed), JSON.stringify({ts: Date.now(), data: items})); }catch{}
    if(newsStatus) newsStatus.classList.add('hidden');
  }catch(e){
    console.warn('news', e);
    // fallback to cached or show error but keep UI
    try{
      const cached = localStorage.getItem(getNewsCacheKey(feed));
      if(cached){
        const {data} = JSON.parse(cached);
        if(data && data.length){ renderNews(data); if(newsStatus) newsStatus.classList.add('hidden'); return; }
      }
    }catch{}
    if(newsStatus) newsStatus.textContent = 'Could not load news — check connection or try refresh.';
    // show demo fallback so cube is not empty
    renderNews([
      {title:'Welcome to your Discover — news will appear here once online', link:'https://news.google.com', pubDate: new Date().toISOString(), author:'Bumblebee', description:''},
    ]);
  }
}
if(newsCategories){
  newsCategories.addEventListener('click', (e)=>{
    const btn = e.target.closest('.news-pill');
    if(!btn) return;
    newsCategories.querySelectorAll('.news-pill').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    fetchNews(btn.dataset.feed);
  });
}
if(newsRefresh) newsRefresh.addEventListener('click', ()=> fetchNews(currentFeed));
// dots now via IntersectionObserver — no scroll handler needed (was causing jank)
// initial
fetchNews('top');

// keep sticky readable in light scheme: if white, add subtle border
