/* ===================== Programme Sport — app ===================== */
'use strict';
const WORKOUTS = window.WORKOUTS || [];
const WK = Object.fromEntries(WORKOUTS.map(w => [w.id, w]));
const STORE = 'ps_v1';

const TYPE_COLORS = {
  'Force':'#4ade80','Pliométrie':'#a78bfa','Vitesse':'#22d3ee','Agilité':'#fbbf24',
  'Mobilité':'#38bdf8','Récupération':'#94a3b8','Autre':'#64748b'
};
const typeColor = t => TYPE_COLORS[t] || '#64748b';
const famClass = f => f === 'Dig Deeper' ? 'fam-dig' : 'fam-tri';

const ALL_FOCUS = ['Corps entier','Haut du corps','Jambes','Fessiers','Pecs','Dos','Bras',
  'Explosivité','Vitesse','Agilité','Mobilité','Récupération'];

/* ---------- state ---------- */
let state = load();
function load(){
  try{ const s = JSON.parse(localStorage.getItem(STORE)); if(s) return s; }catch(e){}
  return { plan:{}, logs:[], theme:'dark' };
}
function save(){ localStorage.setItem(STORE, JSON.stringify(state)); }

/* ---------- date helpers ---------- */
const pad = n => String(n).padStart(2,'0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parseISO = s => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); };
const today = () => { const d=new Date(); d.setHours(0,0,0,0); return d; };
const DAYS_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const MONTHS_FR = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
function mondayOf(d){ const x=new Date(d); const wd=(x.getDay()+6)%7; x.setDate(x.getDate()-wd); x.setHours(0,0,0,0); return x; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function fmtDate(s){ const d=parseISO(s); return `${DAYS_FR[(d.getDay()+6)%7]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]}`; }
function uid(){ return Math.random().toString(36).slice(2,9); }

/* ---------- routing ---------- */
const views = ['dashboard','library','planner','journal','progress'];
function route(){
  let v = location.hash.replace('#','') || 'dashboard';
  if(!views.includes(v)) v='dashboard';
  views.forEach(x => document.getElementById('view-'+x).classList.toggle('hidden', x!==v));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.view===v));
  document.getElementById('tabs').classList.remove('open');
  window.scrollTo(0,0);
  ({dashboard:renderDashboard, library:renderLibrary, planner:renderPlanner,
    journal:renderJournal, progress:renderProgress}[v])();
}
window.addEventListener('hashchange', route);

/* ===================== DASHBOARD ===================== */
function allPlanEntries(){
  const out=[]; for(const [date,arr] of Object.entries(state.plan)) for(const e of arr) out.push({date,...e});
  return out;
}
function renderDashboard(){
  const logs = state.logs;
  const tISO = iso(today());
  // hero stats
  const wkStart = mondayOf(today());
  const wkLogs = logs.filter(l => parseISO(l.date) >= wkStart);
  const streak = weekStreak();
  document.getElementById('heroStats').innerHTML = [
    ['Séances', logs.length],
    ['Cette semaine', wkLogs.length],
    ['Série', streak + (streak>1?' sem.':' sem.')],
  ].map(([l,n])=>`<div class="stat"><div class="num">${n}</div><div class="lbl">${l}</div></div>`).join('');
  document.getElementById('heroSub').textContent = logs.length
    ? `Tu as complété ${logs.length} séance${logs.length>1?'s':''}. Continue comme ça 💪`
    : 'Planifie ta première séance dans le Planificateur.';

  // today's plan
  const tp = (state.plan[tISO]||[]);
  document.getElementById('todayPlan').innerHTML = tp.length ? tp.map(e=>{
    const w=WK[e.wid]; if(!w) return '';
    return `<div class="plan-item"><span class="dot" style="background:${typeColor(w.type)}"></span>
      <div class="meta"><b>${w.title}</b><span class="muted small">${w.type} · ${w.focus.join(', ')}</span></div>
      ${e.done?'<span class="badge" style="background:#4ade8022;color:#4ade80">✓ Fait</span>'
        :`<button class="btn sm primary" onclick="openLog('${e.wid}','${tISO}','${e.eid}')">Faire</button>`}</div>`;
  }).join('') : `<div class="today-empty">Rien de prévu aujourd'hui. <a class="link" href="#planner">Planifier une séance →</a></div>`;

  // week balance
  document.getElementById('weekBalance').innerHTML = balanceHTML(weekFocusCounts(wkStart));
  // heatmap
  document.getElementById('dashHeatmap').innerHTML = heatmapHTML(112);
}
function weekStreak(){
  if(!state.logs.length) return 0;
  const weeks = new Set(state.logs.map(l => iso(mondayOf(parseISO(l.date)))));
  let s=0, cur=mondayOf(today());
  while(weeks.has(iso(cur))){ s++; cur=addDays(cur,-7); }
  return s;
}
function weekFocusCounts(wkStart){
  const wkEnd = addDays(wkStart,7);
  const counts={};
  for(const [date,arr] of Object.entries(state.plan)){
    const d=parseISO(date); if(d<wkStart||d>=wkEnd) continue;
    for(const e of arr){ const w=WK[e.wid]; if(!w) continue; for(const f of w.focus) counts[f]=(counts[f]||0)+1; }
  }
  return counts;
}
function balanceHTML(counts){
  const keys = ['Haut du corps','Jambes','Fessiers','Corps entier','Explosivité','Vitesse','Agilité','Mobilité'];
  const shown = keys.filter(k => counts[k]);
  if(!Object.keys(counts).length) return `<p class="muted small">Aucune séance planifiée cette semaine.</p>`;
  return `<div class="balance">`+ keys.map(k=>{
    const n=counts[k]||0;
    return `<span class="bbadge ${n?'hit':''}">${k}${n?` <span class="n">×${n}</span>`:''}</span>`;
  }).join('') +`</div>`;
}
function heatmapHTML(nDays){
  const end = today(); const start = addDays(end, -(nDays-1));
  // align start to Monday
  const gridStart = mondayOf(start);
  const dayCount = {};
  state.logs.forEach(l => dayCount[l.date]=(dayCount[l.date]||0)+1);
  let cells='';
  for(let d=new Date(gridStart); d<=end; d=addDays(d,1)){
    const k=iso(d); const n=dayCount[k]||0;
    const lvl = n===0?'':n===1?'l1':n===2?'l2':'l3';
    cells+=`<div class="hm-cell ${lvl}" title="${fmtDate(k)}${n?` — ${n} séance${n>1?'s':''}`:''}"></div>`;
  }
  return `<div class="heatmap">${cells}</div>
    <div class="hm-legend">Moins <span class="hm-cell"></span><span class="hm-cell l1"></span>
    <span class="hm-cell l2"></span><span class="hm-cell l3"></span> Plus</div>`;
}

/* ===================== LIBRARY ===================== */
let libFilter = {type:'', family:'', focus:'', q:''};
function renderLibrary(){
  document.getElementById('libCount').textContent = WORKOUTS.length;
  const types = [...new Set(WORKOUTS.map(w=>w.type))];
  const fams = [...new Set(WORKOUTS.map(w=>w.family))];
  const focus = [...new Set(WORKOUTS.flatMap(w=>w.focus))].sort();
  const fbox = document.getElementById('libFilters');
  fbox.innerHTML =
    chipSet('family', fams) + `<span style="width:1px;background:var(--line);margin:0 2px"></span>`
    + chipSet('type', types) + `<span style="width:1px;background:var(--line);margin:0 2px"></span>`
    + chipSet('focus', focus);
  fbox.onclick = e => {
    const c=e.target.closest('.chip'); if(!c) return;
    const {group,val}=c.dataset;
    libFilter[group] = libFilter[group]===val ? '' : val;
    renderLibrary();
  };
  const search=document.getElementById('libSearch');
  search.oninput = () => { libFilter.q=search.value.toLowerCase(); drawLibList(); };
  search.value = libFilter.q;
  drawLibList();
}
function chipSet(group, vals){
  return vals.map(v=>`<button class="chip ${libFilter[group]===v?'on':''}" data-group="${group}" data-val="${v}">${v}</button>`).join('');
}
function drawLibList(){
  const f=libFilter;
  const list = WORKOUTS.filter(w=>{
    if(f.family && w.family!==f.family) return false;
    if(f.type && w.type!==f.type) return false;
    if(f.focus && !w.focus.includes(f.focus)) return false;
    if(f.q){
      const hay=(w.title+' '+w.subtitle+' '+w.days.flatMap(d=>d.exercises.map(e=>e.name)).join(' ')).toLowerCase();
      if(!hay.includes(f.q)) return false;
    }
    return true;
  });
  const el=document.getElementById('libList');
  if(!list.length){ el.innerHTML=`<p class="muted">Aucune séance ne correspond.</p>`; return; }
  el.innerHTML = list.map(wcard).join('');
}
function wcard(w){
  const col = typeColor(w.type);
  const exHTML = w.days.map(d=>{
    const label = w.days.length>1 ? `<div class="day-label">Jour ${d.day}</div>`:'';
    return label + d.exercises.map(e=>`<div class="ex-row"><span>${e.name}</span><span class="sets">${e.sets||''}</span></div>`).join('');
  }).join('');
  return `<div class="wcard">
    <div class="wcard-top">
      <h3>${w.title}</h3>
      <span class="badge ${famClass(w.family)}">${w.family}</span>
    </div>
    <div class="tags"><span class="tag type" style="color:${col};background:${col}22">${w.type}</span>
      ${w.focus.map(x=>`<span class="tag">${x}</span>`).join('')}</div>
    <div class="rest">${w.nExercises} exercices${w.days.length>1?` · ${w.days.length} jours`:''}${w.rest?` · ${w.rest}`:''}</div>
    <button class="expand" onclick="this.nextElementSibling.classList.toggle('open');this.textContent=this.nextElementSibling.classList.contains('open')?'▲ Masquer les exercices':'▼ Voir les ${w.nExercises} exercices'">▼ Voir les ${w.nExercises} exercices</button>
    <div class="ex-list">${exHTML}</div>
    <div class="wcard-actions">
      <button class="btn sm primary" onclick="planPrompt('${w.id}')">📅 Planifier</button>
      <button class="btn sm" onclick="openLog('${w.id}', iso(today()))">✓ Enregistrer</button>
    </div>
  </div>`;
}

/* ===================== PLANNER ===================== */
let weekOffset = 0;
function renderPlanner(){
  const base = mondayOf(today());
  const wkStart = addDays(base, weekOffset*7);
  const wkEnd = addDays(wkStart,6);
  document.getElementById('weekLabel').textContent =
    `${wkStart.getDate()} ${MONTHS_FR[wkStart.getMonth()]} – ${wkEnd.getDate()} ${MONTHS_FR[wkEnd.getMonth()]}`;
  const tISO = iso(today());
  let grid='';
  for(let i=0;i<7;i++){
    const d=addDays(wkStart,i); const k=iso(d);
    const isToday = k===tISO;
    const isPast = d<today() && !isToday;
    const entries = state.plan[k]||[];
    grid+=`<div class="day-col ${isToday?'today':''} ${isPast?'past':''}">
      <div class="day-top"><span class="day-name">${DAYS_FR[i]}</span><span class="day-num">${d.getDate()}</span></div>
      ${entries.map(e=>{const w=WK[e.wid];if(!w)return'';
        return `<div class="pchip ${e.done?'done':''}" onclick="planChipMenu('${k}','${e.eid}')">
          <span class="bar" style="background:${typeColor(w.type)}"></span>
          <span class="ptxt">${w.title}</span>${e.done?'✓':''}</div>`;}).join('')}
      <button class="day-add" onclick="planPromptDate('${k}')">+ Ajouter</button>
    </div>`;
  }
  document.getElementById('plannerGrid').innerHTML = grid;
  document.getElementById('plannerBalance').innerHTML = balanceHTML(weekFocusCounts(wkStart));
  renderTemplates();
}
document.getElementById('weekPrev').onclick=()=>{weekOffset--;renderPlanner();};
document.getElementById('weekNext').onclick=()=>{weekOffset++;renderPlanner();};
document.getElementById('weekToday').onclick=()=>{weekOffset=0;renderPlanner();};

const TEMPLATES = [
  {name:'Dig Deeper — Split muscu', plan:{0:'dig_upper1',1:'dig_lower1',3:'dig_upper2',4:'dig_total',6:'foam'}},
  {name:'Foot — Explosivité & Vitesse', plan:{0:'plyo_phase1',1:'speed_7ex',2:'gym_phase1',3:'cod_explosive',4:'strpower',6:'foam'}},
  {name:'Full Body 3 jours', plan:{0:'fullbody',2:'pro',4:'best',6:'foam'}},
  {name:'Vitesse & Agilité', plan:{0:'legspeed',1:'cod_cutfaster',3:'fullspeed_field',4:'quicker'}},
];
function renderTemplates(){
  document.getElementById('templateBtns').innerHTML =
    TEMPLATES.map((t,i)=>`<button class="btn sm" onclick="applyTemplate(${i})">${t.name}</button>`).join('');
}
function applyTemplate(i){
  const t=TEMPLATES[i];
  const wkStart = addDays(mondayOf(today()), weekOffset*7);
  if(!confirm(`Appliquer « ${t.name} » sur cette semaine ?\nLes séances planifiées non complétées de la semaine seront remplacées.`)) return;
  for(let d=0;d<7;d++){ const k=iso(addDays(wkStart,d));
    if(state.plan[k]) state.plan[k]=state.plan[k].filter(e=>e.done); }
  for(const [d,wid] of Object.entries(t.plan)){
    const k=iso(addDays(wkStart,Number(d)));
    (state.plan[k]=state.plan[k]||[]).push({eid:uid(),wid,done:false});
  }
  save(); renderPlanner(); toast('Programme appliqué ✔');
}

/* add workout to a date (from planner day) */
function planPromptDate(dateISO){ openPicker(wid=>{
  (state.plan[dateISO]=state.plan[dateISO]||[]).push({eid:uid(),wid,done:false});
  save(); renderPlanner(); toast('Ajouté au '+fmtDate(dateISO));
}); }
/* plan from library (pick a date) */
function planPrompt(wid){
  const d = prompt('Planifier « '+WK[wid].title+' » à quelle date ? (AAAA-MM-JJ)', iso(today()));
  if(!d) return;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)){ toast('Format de date invalide'); return; }
  (state.plan[d]=state.plan[d]||[]).push({eid:uid(),wid,done:false});
  save(); toast('Planifié le '+fmtDate(d));
}
function planChipMenu(dateISO,eid){
  const arr=state.plan[dateISO]||[]; const e=arr.find(x=>x.eid===eid); if(!e) return;
  const w=WK[e.wid];
  modal(`<h3>${w.title}</h3><p class="muted small">${fmtDate(dateISO)} · ${w.type}</p>
    <div class="modal-actions" style="justify-content:flex-start;flex-wrap:wrap;margin-top:16px">
      ${e.done?'<span class="muted">Séance déjà complétée ✓</span>'
        :`<button class="btn primary" onclick="openLog('${e.wid}','${dateISO}','${eid}')">✓ Marquer comme fait</button>`}
      <button class="btn" onclick="removePlan('${dateISO}','${eid}')">Retirer</button>
      <button class="btn ghost" onclick="closeModal()">Annuler</button>
    </div>`);
}
function removePlan(dateISO,eid){
  state.plan[dateISO]=(state.plan[dateISO]||[]).filter(x=>x.eid!==eid);
  if(!state.plan[dateISO].length) delete state.plan[dateISO];
  save(); closeModal(); renderPlanner(); if(location.hash.includes('dashboard'))renderDashboard();
}

/* ===================== workout picker modal ===================== */
function openPicker(onPick){
  const byFam={};
  WORKOUTS.forEach(w=>(byFam[w.family]=byFam[w.family]||[]).push(w));
  const body = Object.entries(byFam).map(([fam,list])=>`
    <div class="day-label">${fam}</div>
    ${list.map(w=>`<div class="mrow" data-id="${w.id}">
      <span><b>${w.title}</b><br><small>${w.type} · ${w.focus.join(', ')}</small></span>
      <span class="badge type" style="color:${typeColor(w.type)}">${w.nExercises} ex.</span></div>`).join('')}
  `).join('');
  modal(`<h3>Choisir une séance</h3>
    <input type="search" id="pickSearch" placeholder="Filtrer…" style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--line);background:var(--surface-2);color:var(--text);margin-bottom:10px">
    <div class="modal-list" id="pickList">${body}</div>
    <div class="modal-actions"><button class="btn ghost" onclick="closeModal()">Annuler</button></div>`);
  const list=document.getElementById('pickList');
  list.onclick=e=>{const r=e.target.closest('.mrow'); if(!r)return; closeModal(); onPick(r.dataset.id);};
  document.getElementById('pickSearch').oninput=ev=>{
    const q=ev.target.value.toLowerCase();
    list.querySelectorAll('.mrow').forEach(r=>{
      const w=WK[r.dataset.id];
      r.style.display=(w.title+w.type+w.focus.join()).toLowerCase().includes(q)?'':'none';
    });
  };
}

/* ===================== log editor ===================== */
function openLog(wid, dateISO, planEid){
  const w=WK[wid];
  const exs = w.days.flatMap(d=>d.exercises);
  const rows = exs.map((e,i)=>`
    <div class="log-ex-input">
      <span class="lname" title="${e.name}">${e.name}<br><small class="muted">${e.sets||''}</small></span>
      <input type="number" step="0.5" min="0" placeholder="kg" data-i="${i}" data-f="weight">
      <input type="number" step="1" min="0" placeholder="reps" data-i="${i}" data-f="reps">
    </div>`).join('');
  modal(`<h3>Enregistrer — ${w.title}</h3>
    <div class="row-2">
      <div class="field"><label>Date</label><input type="date" id="logDate" value="${dateISO||iso(today())}"></div>
      <div class="field"><label>Ressenti (RPE 1-10)</label><input type="number" id="logRpe" min="1" max="10" placeholder="7"></div>
    </div>
    <div class="field"><label>Exercices <span class="muted small">(charge & reps optionnels — pour suivre la progression)</span></label>
      <div style="max-height:280px;overflow:auto">${rows}</div></div>
    <div class="field"><label>Note</label><textarea id="logNote" placeholder="Sensations, fatigue, objectifs…"></textarea></div>
    <div class="modal-actions">
      <button class="btn ghost" onclick="closeModal()">Annuler</button>
      <button class="btn primary" id="saveLogBtn">Enregistrer la séance</button>
    </div>`);
  document.getElementById('saveLogBtn').onclick=()=>{
    const inputs=document.querySelectorAll('#modal .log-ex-input input');
    const perEx={};
    inputs.forEach(inp=>{const i=inp.dataset.i;(perEx[i]=perEx[i]||{})[inp.dataset.f]=inp.value?Number(inp.value):null;});
    const exercises = exs.map((e,i)=>({name:e.name, sets:e.sets, weight:perEx[i]?.weight??null, reps:perEx[i]?.reps??null}));
    const log={ id:uid(), date:document.getElementById('logDate').value||iso(today()),
      wid, title:w.title, type:w.type, family:w.family, focus:w.focus,
      exercises, rpe:Number(document.getElementById('logRpe').value)||null,
      note:document.getElementById('logNote').value.trim() };
    state.logs.push(log);
    if(planEid){ const arr=state.plan[log.date]||state.plan[dateISO]||[]; const pe=arr.find(x=>x.eid===planEid); if(pe){pe.done=true;pe.logId=log.id;} }
    save(); closeModal(); toast('Séance enregistrée 💪');
    route();
  };
}
/* generic add-log button (journal): pick workout then log */
document.getElementById('addLogBtn').onclick=()=>openPicker(wid=>openLog(wid, iso(today())));

/* ===================== JOURNAL ===================== */
function renderJournal(){
  const el=document.getElementById('journalList');
  const logs=[...state.logs].sort((a,b)=>b.date.localeCompare(a.date));
  if(!logs.length){ el.innerHTML=`<div class="card"><p class="empty">Aucune séance enregistrée.<br><br>
    <button class="btn primary" onclick="document.getElementById('addLogBtn').click()">+ Enregistrer ma première séance</button></p></div>`; return; }
  el.innerHTML = logs.map(l=>{
    const col=typeColor(l.type);
    const exLogged = l.exercises.filter(e=>e.weight||e.reps);
    const body = `${l.exercises.map(e=>`<div class="log-ex"><span class="en">${e.name}</span>
      <span class="v">${e.sets||''}</span>
      <span class="v">${[e.weight?e.weight+' kg':'', e.reps?e.reps+' reps':''].filter(Boolean).join(' · ')||'—'}</span></div>`).join('')}
      ${l.note?`<div class="log-note">« ${l.note} »</div>`:''}
      <div class="log-actions"><button class="btn sm" onclick="delLog('${l.id}')">🗑 Supprimer</button></div>`;
    return `<div class="log-card">
      <div class="log-top" onclick="this.parentElement.querySelector('.log-body').classList.toggle('open')">
        <div><div class="log-date">${fmtDate(l.date)}</div>
          <div class="log-title"><span class="bar" style="background:${col}"></span>${l.title}</div></div>
        <div style="text-align:right"><div class="log-rpe">${l.rpe?'RPE '+l.rpe:''}</div>
          <div class="muted small">${l.focus.join(', ')}</div></div>
      </div>
      <div class="log-body">${body}</div></div>`;
  }).join('');
}
function delLog(id){
  if(!confirm('Supprimer cette séance du journal ?')) return;
  const l=state.logs.find(x=>x.id===id);
  state.logs=state.logs.filter(x=>x.id!==id);
  // unlink from plan
  if(l){ for(const arr of Object.values(state.plan)) for(const e of arr) if(e.logId===id){e.done=false;delete e.logId;} }
  save(); renderJournal(); toast('Séance supprimée');
}

/* ===================== PROGRESS ===================== */
function renderProgress(){
  const logs=state.logs;
  const totalVol = logs.reduce((s,l)=>s+l.exercises.reduce((a,e)=>a+((e.weight||0)*(e.reps||0)),0),0);
  document.getElementById('progressStats').innerHTML = [
    ['Séances totales', logs.length],
    ['Cette semaine', logs.filter(l=>parseISO(l.date)>=mondayOf(today())).length],
    ['Série de semaines', weekStreak()],
    ['Volume (kg·reps)', totalVol? Math.round(totalVol).toLocaleString('fr-FR'):'—'],
  ].map(([l,n])=>`<div class="pstat"><div class="num">${n}</div><div class="lbl">${l}</div></div>`).join('');
  drawWeeklyChart(); drawTypeChart(); drawFocusChart(); setupExerciseChart();
}
function isoWeekKey(d){ const m=mondayOf(d); return iso(m); }
function drawWeeklyChart(){
  const cv=document.getElementById('chartWeekly');
  const nWeeks=12; const base=mondayOf(today());
  const labels=[], data=[];
  for(let i=nWeeks-1;i>=0;i--){ const wk=addDays(base,-i*7); labels.push(`${wk.getDate()}/${wk.getMonth()+1}`);
    data.push(state.logs.filter(l=>isoWeekKey(parseISO(l.date))===iso(wk)).length); }
  barChart(cv, labels, data, getAccent());
}
function drawTypeChart(){
  const cv=document.getElementById('chartType');
  const counts={}; state.logs.forEach(l=>counts[l.type]=(counts[l.type]||0)+1);
  const entries=Object.entries(counts);
  if(!entries.length){ clearCanvas(cv,'Aucune donnée'); return; }
  donutChart(cv, entries.map(([k,v])=>({label:k,value:v,color:typeColor(k)})));
}
function drawFocusChart(){
  const counts={}; state.logs.forEach(l=>l.focus.forEach(f=>counts[f]=(counts[f]||0)+1));
  const entries=Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const el=document.getElementById('chartFocus');
  if(!entries.length){ el.innerHTML='<p class="muted small">Enregistre des séances pour voir les groupes travaillés.</p>'; return; }
  const max=Math.max(...entries.map(e=>e[1]));
  el.innerHTML = entries.map(([k,v])=>`<div class="fbar"><span class="fname">${k}</span>
    <span class="ftrack"><span class="ffill" style="width:${v/max*100}%"></span></span><span class="fn">${v}</span></div>`).join('');
}
function setupExerciseChart(){
  const sel=document.getElementById('exerciseSelect');
  // exercises that have at least one weight or reps entry
  const names=new Set();
  state.logs.forEach(l=>l.exercises.forEach(e=>{ if(e.weight||e.reps) names.add(e.name); }));
  const arr=[...names].sort();
  if(!arr.length){ sel.innerHTML='<option>—</option>'; sel.disabled=true;
    clearCanvas(document.getElementById('chartExercise'),'Aucune charge/rep enregistrée');
    document.getElementById('exerciseHint').style.display='block'; return; }
  sel.disabled=false; document.getElementById('exerciseHint').style.display='none';
  const prev=sel.value;
  sel.innerHTML=arr.map(n=>`<option ${n===prev?'selected':''}>${n}</option>`).join('');
  sel.onchange=()=>drawExerciseChart(sel.value);
  drawExerciseChart(sel.value||arr[0]);
}
function drawExerciseChart(name){
  const pts=[];
  state.logs.filter(l=>l.exercises.some(e=>e.name===name))
    .sort((a,b)=>a.date.localeCompare(b.date))
    .forEach(l=>{ const e=l.exercises.find(x=>x.name===name);
      const val = e.weight || e.reps || 0; if(val) pts.push({x:l.date, y:val, isW:!!e.weight}); });
  const cv=document.getElementById('chartExercise');
  if(pts.length<1){ clearCanvas(cv,'Pas encore de données'); return; }
  const unit = pts[0].isW?'kg':'reps';
  lineChart(cv, pts.map(p=>p.x.slice(5)), pts.map(p=>p.y), getAccent(), unit);
}

/* ===================== canvas chart primitives ===================== */
function getAccent(){ return getComputedStyle(document.body).getPropertyValue('--accent').trim()||'#4ade80'; }
function prep(cv,h){ const dpr=window.devicePixelRatio||1; const w=cv.clientWidth||cv.parentElement.clientWidth-40;
  cv.width=w*dpr; cv.height=(h||cv.height)*dpr; const c=cv.getContext('2d'); c.scale(dpr,dpr); return {c,w,h:h||cv.clientHeight}; }
function gridColor(){ return getComputedStyle(document.body).getPropertyValue('--line').trim(); }
function txtColor(){ return getComputedStyle(document.body).getPropertyValue('--muted').trim(); }
function clearCanvas(cv,msg){ const {c,w,h}=prep(cv,cv.clientHeight||220); c.clearRect(0,0,w,h);
  c.fillStyle=txtColor(); c.font='13px Inter,sans-serif'; c.textAlign='center'; c.fillText(msg||'—',w/2,h/2); }
function barChart(cv,labels,data,color){
  const {c,w,h}=prep(cv,220); c.clearRect(0,0,w,h);
  const pad={l:26,r:8,t:12,b:22}; const max=Math.max(1,...data);
  const bw=(w-pad.l-pad.r)/data.length;
  c.strokeStyle=gridColor(); c.fillStyle=txtColor(); c.font='10px Inter'; c.textAlign='right';
  for(let g=0;g<=max;g+=Math.ceil(max/4)||1){ const y=h-pad.b-(g/max)*(h-pad.t-pad.b);
    c.globalAlpha=.5;c.beginPath();c.moveTo(pad.l,y);c.lineTo(w-pad.r,y);c.stroke();c.globalAlpha=1;
    c.fillText(g,pad.l-4,y+3); }
  data.forEach((v,i)=>{ const x=pad.l+i*bw+bw*0.18; const bh=(v/max)*(h-pad.t-pad.b);
    c.fillStyle=v?color:gridColor(); roundRect(c,x,h-pad.b-bh,bw*0.64,bh,4); c.fill();
    c.fillStyle=txtColor(); c.font='9px Inter'; c.textAlign='center'; c.fillText(labels[i],x+bw*0.32,h-8); });
}
function lineChart(cv,labels,data,color,unit){
  const {c,w,h}=prep(cv,240); c.clearRect(0,0,w,h);
  const pad={l:34,r:12,t:14,b:24}; const max=Math.max(...data),min=Math.min(...data);
  const rng=(max-min)||1; const span=max===min?max*0.2||1:rng;
  const lo=min-span*0.15, hi=max+span*0.15, R=hi-lo;
  const X=i=>pad.l+(data.length<=1?0.5:i/(data.length-1))*(w-pad.l-pad.r);
  const Y=v=>h-pad.b-((v-lo)/R)*(h-pad.t-pad.b);
  c.strokeStyle=gridColor();c.fillStyle=txtColor();c.font='10px Inter';c.textAlign='right';
  for(let g=0;g<=4;g++){ const val=lo+R*g/4; const y=Y(val);
    c.globalAlpha=.5;c.beginPath();c.moveTo(pad.l,y);c.lineTo(w-pad.r,y);c.stroke();c.globalAlpha=1;
    c.fillText(Math.round(val),pad.l-5,y+3); }
  // area
  c.beginPath(); data.forEach((v,i)=>{const x=X(i),y=Y(v); i?c.lineTo(x,y):c.moveTo(x,y);});
  c.lineTo(X(data.length-1),h-pad.b); c.lineTo(X(0),h-pad.b); c.closePath();
  c.fillStyle=color+'22'; c.fill();
  c.beginPath(); data.forEach((v,i)=>{const x=X(i),y=Y(v); i?c.lineTo(x,y):c.moveTo(x,y);});
  c.strokeStyle=color; c.lineWidth=2.5; c.stroke();
  data.forEach((v,i)=>{const x=X(i),y=Y(v); c.beginPath();c.arc(x,y,3.5,0,7);c.fillStyle=color;c.fill();
    c.fillStyle=txtColor();c.font='9px Inter';c.textAlign='center';
    if(data.length<=14||i%2===0)c.fillText(labels[i],x,h-8);});
  c.fillStyle=txtColor();c.textAlign='left';c.font='10px Inter';c.fillText(unit,pad.l,10);
}
function donutChart(cv,items){
  const {c,w,h}=prep(cv,220); c.clearRect(0,0,w,h);
  const cx=Math.min(w*0.4,120), cy=h/2, r=Math.min(cx,cy)-8, ir=r*0.6;
  const total=items.reduce((s,i)=>s+i.value,0); let a=-Math.PI/2;
  items.forEach(it=>{ const ang=it.value/total*Math.PI*2;
    c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,r,a,a+ang);c.closePath();c.fillStyle=it.color;c.fill();a+=ang;});
  c.globalCompositeOperation='destination-out';c.beginPath();c.arc(cx,cy,ir,0,7);c.fill();c.globalCompositeOperation='source-over';
  c.fillStyle=getComputedStyle(document.body).getPropertyValue('--text');c.font='700 20px Inter';c.textAlign='center';
  c.fillText(total,cx,cy+2);c.font='10px Inter';c.fillStyle=txtColor();c.fillText('séances',cx,cy+16);
  // legend
  let ly=cy-items.length*10; const lx=cx+r+24;
  items.forEach(it=>{ c.fillStyle=it.color; roundRect(c,lx,ly,11,11,3);c.fill();
    c.fillStyle=getComputedStyle(document.body).getPropertyValue('--text');c.textAlign='left';c.font='11px Inter';
    c.fillText(`${it.label} (${it.value})`,lx+17,ly+10); ly+=20; });
}
function roundRect(c,x,y,w,h,r){ r=Math.min(r,w/2,h/2); c.beginPath();
  c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);
  c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath(); }

/* ===================== modal / toast ===================== */
function modal(html){ const m=document.getElementById('modal'); m.innerHTML=html;
  document.getElementById('modalBackdrop').classList.remove('hidden'); }
function closeModal(){ document.getElementById('modalBackdrop').classList.add('hidden'); }
document.getElementById('modalBackdrop').onclick=e=>{ if(e.target.id==='modalBackdrop') closeModal(); };
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });
let toastT; function toast(msg){ let t=document.querySelector('.toast');
  if(!t){t=document.createElement('div');t.className='toast';document.body.appendChild(t);}
  t.textContent=msg; requestAnimationFrame(()=>t.classList.add('show'));
  clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),2200); }

/* ===================== theme / menu / data ===================== */
function applyTheme(){ document.body.dataset.theme=state.theme;
  document.getElementById('themeToggle').textContent = state.theme==='dark'?'🌙':'☀️';
  document.querySelector('meta[name=theme-color]').content = state.theme==='dark'?'#0e1116':'#f4f6fa'; }
document.getElementById('themeToggle').onclick=()=>{ state.theme=state.theme==='dark'?'light':'dark'; save(); applyTheme();
  if(location.hash.includes('progress'))renderProgress(); };
document.getElementById('menuToggle').onclick=()=>document.getElementById('tabs').classList.toggle('open');

document.getElementById('exportBtn').onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='programme-sport-'+iso(today())+'.json'; a.click(); toast('Sauvegarde exportée'); };
document.getElementById('importBtn').onclick=()=>document.getElementById('importFile').click();
document.getElementById('importFile').onchange=e=>{ const f=e.target.files[0]; if(!f)return;
  const r=new FileReader(); r.onload=()=>{ try{ const s=JSON.parse(r.result);
    if(s.logs&&s.plan){ state=s; save(); applyTheme(); route(); toast('Sauvegarde importée ✔'); }
    else toast('Fichier invalide'); }catch(err){ toast('Fichier illisible'); } }; r.readAsText(f); };
document.getElementById('resetBtn').onclick=()=>{ if(confirm('Effacer toutes tes données (plan + journal) ? Cette action est irréversible.')){
  state={plan:{},logs:[],theme:state.theme}; save(); route(); toast('Données réinitialisées'); } };

window.addEventListener('resize', ()=>{ if(location.hash.includes('progress')) renderProgress(); });

/* ===================== boot ===================== */
applyTheme();
route();
