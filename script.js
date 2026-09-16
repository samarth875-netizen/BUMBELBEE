// Bumblebee Cinematic New Tab — v2
// Movable / closable / minimizable video sticker + sticky note

const bgVideo = document.getElementById('bb-ambient-film');
const frameVideo = document.getElementById('bb-tv-film');
const playBtn = document.getElementById('bb-key-play-toggle');
const muteBtn = document.getElementById('bb-key-mute-toggle');
const scrubTrack = document.getElementById('bb-scrub-rail');
const scrubFill = document.getElementById('bb-scrub-juice');
const scrubThumb = document.getElementById('bb-scrub-knob');
const timeLabel = document.getElementById('bb-timecode');
const audioBadge = document.getElementById('bb-audio-chip');
const videoNotice = document.getElementById('bb-missing-reel-toast');

// ——— Tiny live weather — top-left, Silicon Valley fallback ———
const weatherIcon = document.getElementById('bb-corner-weather-glyph');
const weatherTemp = document.getElementById('bb-corner-weather-deg');
const weatherDesc = document.getElementById('bb-corner-weather-words');
const weatherLoc = document.getElementById('bb-corner-weather-city');
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
  const weatherEl = document.getElementById('bb-corner-weather');
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
const clockEl = document.getElementById('bb-lock-time');
const dateEl = document.getElementById('bb-lock-dateline');
const greetingEl = document.getElementById('bb-lock-hello');
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
const searchForm = document.getElementById('bb-find-bar');
const searchInput = document.getElementById('bb-find-field');
const suggestionsBox = document.getElementById('bb-find-droplist');
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
  if(!list.length){ suggestionsBox.classList.add('bb-is-hidden'); searchForm.classList.remove('bb-find-open'); return; }
  suggestionsBox.innerHTML = list.map((text,i)=>`
    <div class="bb-find-row" data-index="${i}" role="option">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <span class="bb-find-row-text">${text.replace(/</g,'&lt;')}</span>
      <span class="bb-find-row-arrow">↗</span>
    </div>
  `).join('');
  suggestionsBox.querySelectorAll('.bb-find-row').forEach(el=>{
    el.addEventListener('click', ()=> navigateToQuery(el.querySelector('.bb-find-row-text').textContent));
    el.addEventListener('mousemove', ()=>{
      suggestionsBox.querySelectorAll('.bb-find-row').forEach(x=>x.classList.remove('bb-is-lit'));
      el.classList.add('bb-is-lit'); selectedIndex = parseInt(el.dataset.index);
    });
  });
  suggestionsBox.classList.remove('bb-is-hidden');
  searchForm.classList.add('bb-find-open');
}
function hideSuggestions(){
  suggestionsBox.classList.add('bb-is-hidden');
  searchForm.classList.remove('bb-find-open');
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
  const items=suggestionsBox.querySelectorAll('.bb-find-row');
  if(suggestionsBox.classList.contains('bb-is-hidden') || !items.length) return;
  if(e.key==='ArrowDown'){
    e.preventDefault();
    selectedIndex=Math.min(selectedIndex+1, items.length-1);
    items.forEach((el,i)=>el.classList.toggle('bb-is-lit', i===selectedIndex));
    if(selectedIndex>=0) searchInput.value=currentSuggestions[selectedIndex];
  } else if(e.key==='ArrowUp'){
    e.preventDefault();
    selectedIndex=Math.max(selectedIndex-1, -1);
    items.forEach((el,i)=>el.classList.toggle('bb-is-lit', i===selectedIndex));
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
  if(currentSuggestions.length) { suggestionsBox.classList.remove('bb-is-hidden'); searchForm.classList.add('bb-find-open'); }
});

// ——— Quick links: 5 MOST-VISITED ONLY ———
const quickLinksNav = document.getElementById('bb-visit-tray');
const hintEl = document.getElementById('bb-visit-hint');
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
    return `<a href="${href}" class="bb-visit-tile"><span class="bb-visit-tile-art"><img src="${fav}" width="24" height="24" alt="" onerror="this.outerHTML='<span class=&quot;bb-visit-tile-fallback&quot; style=&quot;display:grid;place-items:center;width:24px;height:24px;font-weight:700;background:#fff;border-radius:4px;&quot;>'+'${label[0].toUpperCase()}'+'</span>'"></span><span class="bb-visit-tile-name">${label}</span></a>`;
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
  playBtn.querySelector('.bb-glyph-play').style.display=paused?'block':'none';
  playBtn.querySelector('.bb-glyph-pause').style.display=paused?'none':'block';
  muteBtn.querySelector('.bb-glyph-muted').style.display=muted?'block':'none';
  muteBtn.querySelector('.bb-glyph-loud').style.display=muted?'none':'block';
  if(!muted&&!paused){ audioBadge.textContent='live • sound'; audioBadge.classList.add('bb-is-live'); }
  else if(muted){ audioBadge.textContent='muted'; audioBadge.classList.remove('bb-is-live'); }
  else { audioBadge.textContent='paused'; audioBadge.classList.remove('bb-is-live'); }
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
function checkMissing(){ if(bgError&&frameError){ videoNotice.classList.remove('bb-is-hidden'); bgVideo.style.display='none'; document.getElementById('bb-tv-film').style.display='none'; document.getElementById('bb-retro-tube').style.background='linear-gradient(135deg,#1a1a0a,#0A0A0A)'; } }
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
const videoFrame=document.getElementById('bb-tv-shell');
const frameHeader=document.getElementById('bb-tv-topbar');
const frameRestore=document.getElementById('bb-bringback-tv');
const stickyNote=document.getElementById('bb-paper-note');
const stickyHeader=document.getElementById('bb-note-topbar');
const stickyRestore=document.getElementById('bb-bringback-note');

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
    if(e.target.closest('.bb-pip')) return; // don't drag when clicking traffic lights
    dragging=true; frame.classList.add('bb-is-held');
    const rect=frame.getBoundingClientRect();
    startX=e.clientX; startY=e.clientY;
    origLeft=rect.left; origTop=rect.top;
    // switch to left/top positioning if was right/bottom
    frame.style.left=rect.left+'px'; frame.style.top=rect.top+'px';
    frame.style.right='auto'; frame.style.bottom='auto';
    e.preventDefault();
  });
  header.addEventListener('touchstart', (e)=>{
    if(e.target.closest('.bb-pip')) return;
    dragging=true; frame.classList.add('bb-is-held');
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
    dragging=false; frame.classList.remove('bb-is-held');
    try{ localStorage.setItem(posKey, JSON.stringify({left:frame.style.left, top:frame.style.top})); }catch{}
  }
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('touchend', endDrag);
}

makeDraggable(videoFrame, frameHeader, FRAME_POS_KEY);
makeDraggable(stickyNote, stickyHeader, STICKY_POS_KEY);

// ——— Video frame traffic lights ———
function applyFrameState(state){
  videoFrame.classList.remove('bb-is-folded','bb-is-big','bb-is-gone-tv');
  frameRestore.classList.add('bb-is-hidden');
  if(state==='minimized') videoFrame.classList.add('bb-is-folded');
  else if(state==='maximized') videoFrame.classList.add('bb-is-big');
  else if(state==='closed'){ videoFrame.classList.add('bb-is-gone-tv'); frameRestore.classList.remove('bb-is-hidden'); }
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
document.querySelectorAll('#bb-tv-shell .bb-pip').forEach(btn=>{
  btn.addEventListener('click',(e)=>{
    e.stopPropagation();
    const action=btn.dataset.action;
    if(action==='close') applyFrameState('closed');
    else if(action==='minimize'){
      const isMin=videoFrame.classList.contains('bb-is-folded');
      applyFrameState(isMin ? 'normal' : 'minimized');
    }
    else if(action==='expand'){
      const isMax=videoFrame.classList.contains('bb-is-big');
      applyFrameState(isMax ? 'normal' : 'maximized');
    }
  });
});
frameRestore.addEventListener('click', ()=>applyFrameState('normal'));

// double-click header to toggle maximize/minimize
frameHeader.addEventListener('dblclick',(e)=>{
  if(e.target.closest('.bb-pip')) return;
  const isMax=videoFrame.classList.contains('bb-is-big');
  applyFrameState(isMax ? 'normal' : 'maximized');
});

// ——— Sticky note ———
const stickyText=document.getElementById('bb-note-scribble');
const stickyBody=document.getElementById('bb-note-pad-area');
const colorDots=document.getElementById('bb-paint-swatches');
const stickyCount=document.getElementById('bb-note-charcount');
const stickyClear=document.getElementById('bb-note-clear');

try{
  const savedText=localStorage.getItem(STICKY_TEXT_KEY);
  if(savedText) stickyText.value=savedText;
  const savedColor=localStorage.getItem(STICKY_COLOR_KEY);
  if(savedColor){ stickyNote.style.background=savedColor; document.querySelectorAll('.bb-paint-dot').forEach(d=>d.classList.toggle('bb-is-lit', d.dataset.color===savedColor)); }
  const savedState=localStorage.getItem(STICKY_STATE_KEY);
  if(savedState==='closed'){ stickyNote.classList.add('bb-is-gone-note'); stickyRestore.classList.remove('bb-is-hidden'); }
  else if(savedState==='minimized') stickyNote.classList.add('bb-is-folded');
  else if(savedState==='maximized') stickyNote.classList.add('bb-is-big');
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
  const dot=e.target.closest('.bb-paint-dot'); if(!dot) return;
  const color=dot.dataset.color;
  stickyNote.style.background=color;
  document.querySelectorAll('.bb-paint-dot').forEach(d=>d.classList.remove('bb-is-lit'));
  dot.classList.add('bb-is-lit');
  try{ localStorage.setItem(STICKY_COLOR_KEY, color); }catch{}
});

function applyStickyState(state){
  stickyNote.classList.remove('bb-is-folded','bb-is-big','bb-is-gone-note');
  stickyRestore.classList.add('bb-is-hidden');
  if(state==='minimized') stickyNote.classList.add('bb-is-folded');
  else if(state==='maximized') stickyNote.classList.add('bb-is-big');
  else if(state==='closed'){ stickyNote.classList.add('bb-is-gone-note'); stickyRestore.classList.remove('bb-is-hidden'); }
  try{ localStorage.setItem(STICKY_STATE_KEY, state); }catch{}
}
document.querySelectorAll('#bb-paper-note .bb-pip').forEach(btn=>{
  btn.addEventListener('click',(e)=>{
    e.stopPropagation();
    const action=btn.dataset.sticky;
    if(action==='close') applyStickyState('closed');
    else if(action==='minimize'){ const isMin=stickyNote.classList.contains('bb-is-folded'); applyStickyState(isMin?'normal':'minimized'); }
    else if(action==='expand'){ const isMax=stickyNote.classList.contains('bb-is-big'); applyStickyState(isMax?'normal':'maximized'); }
  });
});
stickyRestore.addEventListener('click', ()=>applyStickyState('normal'));
stickyHeader.addEventListener('dblclick',(e)=>{
  if(e.target.closest('.bb-pip')) return;
  const isMax=stickyNote.classList.contains('bb-is-big');
  applyStickyState(isMax?'normal':'maximized');
});

// —————————————————————
//  NEWS — Discover (scroll cube) — RSS2JSON + Google News
// —————————————————————
const newsGrid = document.getElementById('bb-discover-reel');
const newsStatus = document.getElementById('bb-discover-status');
const newsCategories = document.getElementById('bb-discover-topics');
const newsRefresh = document.getElementById('bb-discover-retry');
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
const newsDots = document.getElementById('bb-reel-bubbles');
let newsObserver = null;
function updateNewsDots(){
  if(!newsGrid || !newsDots) return;
  const cards = newsGrid.querySelectorAll('.bb-story-card');
  if(!cards.length){ newsDots.innerHTML=''; return; }
  if(newsDots.childElementCount !== cards.length){
    newsDots.innerHTML = Array.from(cards).map((_,i)=>`<span class="bb-reel-bubble${i===0?' bb-is-lit':''}" data-index="${i}"></span>`).join('');
    newsDots.querySelectorAll('.bb-reel-bubble').forEach(dot=>{
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
        newsDots.querySelectorAll('.bb-reel-bubble').forEach((d,i)=> d.classList.toggle('bb-is-lit', i===idx));
      }
    }, { root: newsGrid, threshold: [0.5, 0.75, 1.0] });
    cards.forEach(c=> newsObserver.observe(c));
  }
}
function renderNews(items){
  if(!newsGrid) return;
  if(!items || !items.length){
    newsGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:24px; color:var(--bb-ink-faint);">No headlines right now — try another category or refresh.</div>`;
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
    const thumb = img ? `<img class="bb-story-art" src="${img}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">` : `<div class="bb-story-art" style="display:grid;place-items:center; font-size:18px; color:var(--bb-ink-faint);">📰</div>`;
    const catLabel = currentFeed==='top' ? 'TOP NEWS' : currentFeed.toUpperCase();
    return `<a class="bb-story-card" href="${link}" target="_blank" rel="noopener">
      <div class="bb-story-art-frame">${thumb}<span class="bb-story-kicker">${catLabel}</span></div>
      <div class="bb-story-copy">
        <div class="bb-story-headline">${title}</div>
        ${desc ? `<div class="bb-story-blurb">${desc}…</div>` : ''}
        <div class="bb-story-byline"><span class="bb-story-outlet">${source}</span><span>•</span><span>${time}</span></div>
      </div>
    </a>`;
  }).join('');
  // dots
  setTimeout(updateNewsDots, 50);
}
async function fetchNews(feed='top'){
  currentFeed = feed;
  if(newsStatus){ newsStatus.textContent='Loading headlines…'; newsStatus.classList.remove('bb-is-hidden'); }
  // cache check
  try{
    const cached = localStorage.getItem(getNewsCacheKey(feed));
    if(cached){
      const {ts, data} = JSON.parse(cached);
      if(Date.now()-ts < NEWS_CACHE_TTL && data && data.length){
        renderNews(data);
        if(newsStatus) newsStatus.classList.add('bb-is-hidden');
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
    if(newsStatus) newsStatus.classList.add('bb-is-hidden');
  }catch(e){
    console.warn('news', e);
    // fallback to cached or show error but keep UI
    try{
      const cached = localStorage.getItem(getNewsCacheKey(feed));
      if(cached){
        const {data} = JSON.parse(cached);
        if(data && data.length){ renderNews(data); if(newsStatus) newsStatus.classList.add('bb-is-hidden'); return; }
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
    const btn = e.target.closest('.bb-topic-chip');
    if(!btn) return;
    newsCategories.querySelectorAll('.bb-topic-chip').forEach(b=>b.classList.remove('bb-is-lit'));
    btn.classList.add('bb-is-lit');
    fetchNews(btn.dataset.feed);
  });
}
if(newsRefresh) newsRefresh.addEventListener('click', ()=> fetchNews(currentFeed));
// dots now via IntersectionObserver — no scroll handler needed (was causing jank)
// initial
fetchNews('top');

// keep sticky readable in light scheme: if white, add subtle border
