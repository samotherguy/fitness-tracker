const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const KEY='form-v2';
const CHECK='<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CHEV='<svg class="chev" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ---------- library ----------
const MUSCLES=['Chest','Back','Shoulders','Arms','Legs','Glutes','Core'];
const exercises=[
 ['Barbell Bench Press','Chest','Barbell','Compound'],['Incline Dumbbell Press','Chest','Dumbbells','Compound'],['Cable Chest Press','Chest','Cable','Compound'],['Dumbbell Fly','Chest','Dumbbells','Isolation'],['Push-up','Chest','Bodyweight','Compound'],['Machine Chest Press','Chest','Machine','Compound'],
 ['Lat Pulldown','Back','Cable machine','Compound'],['Seated Cable Row','Back','Cable machine','Compound'],['Pull-up','Back','Bodyweight','Compound'],['Dumbbell Row','Back','Dumbbells','Compound'],['Deadlift','Back','Barbell','Compound'],['Rack Pull','Back','Barbell','Compound'],['Straight-arm Pulldown','Back','Cable','Isolation'],
 ['Machine Shoulder Press','Shoulders','Machine','Compound'],['Dumbbell Lateral Raise','Shoulders','Dumbbells','Isolation'],['Arnold Press','Shoulders','Dumbbells','Compound'],['Face Pull','Shoulders','Cable','Isolation'],
 ['Biceps Curl','Arms','Dumbbells','Isolation'],['Hammer Curl','Arms','Dumbbells','Isolation'],['Incline Dumbbell Curl','Arms','Dumbbells','Isolation'],['Cable Curl','Arms','Cable','Isolation'],['Cable Triceps Pushdown','Arms','Cable','Isolation'],['Overhead Triceps Extension','Arms','Cable','Isolation'],['Dumbbell Skull Crusher','Arms','Dumbbells','Isolation'],['Dips','Arms','Bodyweight','Compound'],
 ['Barbell Squat','Legs','Barbell','Compound'],['Leg Press','Legs','Machine','Compound'],['Romanian Deadlift','Legs','Barbell','Compound'],['Walking Lunge','Legs','Dumbbells','Compound'],['Bulgarian Split Squat','Legs','Dumbbells','Compound'],['Leg Curl','Legs','Machine','Isolation'],['Leg Extension','Legs','Machine','Isolation'],['Standing Calf Raise','Legs','Machine','Isolation'],['Goblet Squat','Legs','Kettlebell','Compound'],
 ['Hip Thrust','Glutes','Barbell','Compound'],['Glute Bridge','Glutes','Bodyweight','Compound'],['Cable Glute Kickback','Glutes','Cable','Isolation'],['Hip Abduction Machine','Glutes','Machine','Isolation'],['Sumo Squat','Glutes','Dumbbells','Compound'],
 ['Cable Crunch','Core','Cable','Isolation'],['Hanging Knee Raise','Core','Bodyweight','Isolation'],['Russian Twist','Core','Bodyweight','Isolation'],['Ab Wheel Rollout','Core','Bodyweight','Compound'],['Decline Sit-up','Core','Bodyweight','Isolation'],['Dead Bug','Core','Bodyweight','Isolation']
].map(x=>({name:x[0],muscle:x[1],equipment:x[2],type:x[3]}));
const muscleOf=name=>(exercises.find(e=>e.name===name)||{}).muscle||'Strength';

// Three full-body sessions a week: chest, back, legs, glutes, biceps, triceps, one ab move each.
const DEFAULT_PLANS=[
 {id:'fb-a',name:'Full Body A',day:'MON',items:[['Barbell Bench Press',3,8],['Lat Pulldown',3,10],['Goblet Squat',3,12],['Hip Thrust',3,10],['Biceps Curl',3,12],['Cable Triceps Pushdown',3,12],['Cable Crunch',3,15]]},
 {id:'fb-b',name:'Full Body B',day:'WED',items:[['Incline Dumbbell Press',3,10],['Seated Cable Row',3,10],['Leg Press',3,12],['Romanian Deadlift',3,10],['Hammer Curl',3,12],['Overhead Triceps Extension',3,12],['Hanging Knee Raise',3,12]]},
 {id:'fb-c',name:'Full Body C',day:'FRI',items:[['Cable Chest Press',3,12],['Dumbbell Row',3,10],['Walking Lunge',3,10],['Cable Glute Kickback',3,12],['Incline Dumbbell Curl',3,12],['Dumbbell Skull Crusher',3,12],['Russian Twist',3,20]]}
].map(p=>({...p,items:p.items.map(([name,sets,reps])=>({name,sets,reps}))}));
const WEEK=[0,-1,1,-1,2,-1,-1]; // Mon..Sun → plan index
const plans=()=>state.plans;
const planFocus=p=>[...new Set(p.items.map(i=>muscleOf(i.name)))].join(' · ')||'Empty';
const planDuration=p=>{const sets=p.items.reduce((a,i)=>a+i.sets,0),m=Math.round(sets*2.5/5)*5;return `${m}–${m+10} min`};

// ---------- state: localStorage is the cache, the server copy (per tailnet user) wins when newer ----------
const defaults={sessions:[],selectedPlan:0,active:null,restUntil:0,updatedAt:0};
let state=load(),me={login:'',name:''},search='',filter='All',syncTimer;
function normalize(s){s={...defaults,...s};if(!Array.isArray(s.plans)||!s.plans.length){s.plans=JSON.parse(JSON.stringify(DEFAULT_PLANS));s.selectedPlan=0}s.selectedPlan=Math.min(s.selectedPlan||0,s.plans.length-1);return s}
function load(){try{return normalize(JSON.parse(localStorage.getItem(KEY)||'{}'))}catch{return normalize({})}}
function save(){state.updatedAt=Date.now();localStorage.setItem(KEY,JSON.stringify(state));clearTimeout(syncTimer);syncTimer=setTimeout(push,400)}
async function push(){try{const r=await fetch('api/state',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(state)});if(!r.ok)throw 0}catch{state.dirty=true;localStorage.setItem(KEY,JSON.stringify(state))}}
// ponytail: last-writer-wins by updatedAt; one person on two phones with one offline can clobber the other. Merge sessions by id if that bites.
async function pull(){try{const r=await fetch('api/state');if(!r.ok)return;const d=await r.json();me=d.user||me;renderUser();
  const remote=d.state&&d.state.updatedAt||0,local=state.updatedAt||0;
  if(remote>local&&!state.dirty){state=normalize(d.state);localStorage.setItem(KEY,JSON.stringify(state));renderAll()}
  else if(local>remote||state.dirty){delete state.dirty;push()}}catch{}}
window.addEventListener('online',pull);

// ---------- helpers ----------
const fmt=n=>Math.round(n).toLocaleString();
const dayKey=d=>{d=new Date(d);return new Date(d.getFullYear(),d.getMonth(),d.getDate())};
const daysBetween=(a,b)=>Math.round((a-b)/86400000);
const doneSets=ex=>ex.sets.filter(s=>s.done&&s.reps>0);           // bodyweight sets count; weight may be 0
const setLabel=s=>`${s.weight>0?s.weight:'BW'}×${s.reps}`;
const sessionVolume=s=>s.items.reduce((v,e)=>v+doneSets(e).reduce((a,x)=>a+(Number(x.weight)||0)*x.reps,0),0);
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1800)}
// Sheets and screens push history entries so the iPhone edge swipe (and the browser back button) closes a sheet or goes back a screen.
function openSheet(html){$('#sheet-body').innerHTML=html;if($('#sheet').hidden)history.pushState({...history.state,sheet:true},'');$('#sheet').hidden=false;$('#sheet-body').scrollTop=0}
// closeSheet(then): `then` runs after the history pop has landed (back is async), or at once if no pop was needed.
let afterPop=null;
function closeSheet(then){if(!$('#sheet').hidden&&history.state&&history.state.sheet){afterPop=then||null;history.back();return}$('#sheet').hidden=true;if(then)then()}
window.addEventListener('popstate',e=>{const st=e.state||{};$('#sheet').hidden=true;const cur=$('.view.active').id.slice(5);let v=st.view||'home';if(v==='workout'&&!state.active)v='home';if(v!==cur){if(v==='workout')renderWorkout();else({home:renderHome,programme:renderProgramme,progress:renderProgress,library:renderLibrary})[v]();show(v,false)}const cb=afterPop;afterPop=null;if(cb)cb()});
$('#sheet').addEventListener('click',e=>{if(e.target.id==='sheet')closeSheet()});
$('#today-label').textContent=new Intl.DateTimeFormat('en',{weekday:'short',day:'numeric',month:'short'}).format(new Date());
function renderUser(){const h=new Date().getHours(),part=h<12?'Good morning':h<17?'Good afternoon':'Good evening';$('#greeting').textContent=me.name?`${part}, ${me.name.split(' ')[0]}`:part}
// iOS lifts fixed bars above the keyboard; hide them while typing so they don't cover the set being edited.
// The bars come back 300 ms after blur so the tap that caused the blur lands on what the user saw, not on a bar that reappeared under it.
let typingT;document.addEventListener('focusin',e=>{if(e.target.matches('input')){clearTimeout(typingT);document.body.classList.add('typing')}});
document.addEventListener('focusout',()=>{clearTimeout(typingT);typingT=setTimeout(()=>document.body.classList.remove('typing'),300)});

// ---------- cats: tap them ----------
const LINES={frito:['Mrrp.','Spot me?','One more set.','I counted. That was nine.','Frito approves.'],ramona:['Feather time!','Yarn later. Lift now.','Rest day? No.','Ramona is unimpressed. Lift heavier.','Chin up. Belly out.']};
let lastTap={};
function catTap(btn){
  const who=btn.dataset.cat,now=Date.now(),other=who==='frito'?'ramona':'frito';
  const party=lastTap[other]&&now-lastTap[other]<1200;lastTap[who]=now;
  const cats=party?$$('.hero-cats .cat'):[btn];
  const react=party?'react-bow':(who==='frito'?['react-jump','react-meow','react-bow'][Math.floor(Math.random()*3)]:['react-wiggle','react-meow','react-bow'][Math.floor(Math.random()*3)]);
  cats.forEach(c=>{c.classList.remove('react-jump','react-meow','react-bow','react-wiggle');void c.offsetWidth;c.classList.add(react);setTimeout(()=>c.classList.remove(react),react==='react-bow'?900:700)});
  const n=party?8:3+Math.floor(Math.random()*3);for(let i=0;i<n;i++){const h=document.createElement('span');h.className='heart';h.textContent=party?'🎉':['💗','💖','✨','🐾'][Math.floor(Math.random()*4)];h.style.left=(party?10+Math.random()*80:(who==='frito'?22:58)+Math.random()*20)+'%';h.style.setProperty('--r',(Math.random()*60-30)+'deg');h.style.animationDelay=(Math.random()*.25)+'s';$('.hero-cats').appendChild(h);setTimeout(()=>h.remove(),1500)}
  const cap=$('#cat-caption');cap.textContent=party?'Feather time! Both cats, all in.':`${who==='frito'?'Frito':'Ramona'}: ${LINES[who][Math.floor(Math.random()*LINES[who].length)]}`;cap.classList.add('show');clearTimeout(catTap.t);catTap.t=setTimeout(()=>cap.classList.remove('show'),1800);
}
$$('.hero-cats .cat').forEach(b=>b.addEventListener('click',()=>catTap(b)));
$('#live-cat').addEventListener('click',()=>{meow();toast(LINES.frito[Math.floor(Math.random()*LINES.frito.length)])});

// ---------- navigation ----------
function show(name,push=true){const cur=$('.view.active').id.slice(5);if(push&&cur!==name)history.pushState({view:name},'','#'+name);$$('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+name));$$('.tab').forEach(b=>b.classList.toggle('active',b.dataset.nav===name));window.scrollTo(0,0)}
function navigate(name){
  if(name==='workout'){if(!state.active)startWorkout(state.selectedPlan);else{renderWorkout();show('workout')}return}
  ({home:renderHome,programme:renderProgramme,progress:renderProgress,library:renderLibrary})[name]();show(name);
}
$$('[data-nav]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.nav)));
function renderAll(){renderHome();renderProgramme();renderLibrary();if($('#view-workout').classList.contains('active'))renderWorkout();if($('#view-progress').classList.contains('active'))renderProgress()}

// ---------- home ----------
function renderHome(){
  const p=plans()[state.selectedPlan],a=state.active;
  $('#next-tag').textContent=a?'IN PROGRESS':'UP NEXT';
  $('#next-workout-name').textContent=a?a.name:p.name;
  $('#next-workout-desc').textContent=a?a.focus:planFocus(p);
  $('#next-day-label').textContent=a?'Tap to continue':p.day;
  $('#next-workout-duration').textContent='⏱ '+planDuration(p);$('#next-workout-count').textContent='▤ '+(a?a.items:p.items).length+' exercises';
  $('#start-next-btn').textContent=a?'Continue workout':'Start workout';
  $('#stat-sessions').textContent=state.sessions.length;
  $('#stat-volume').innerHTML=fmt(state.sessions.reduce((s,x)=>s+x.volume,0))+' <small>kg</small>';
  $('#stat-prs').textContent=Object.keys(getPRs()).length;
  $('#stat-streak').innerHTML=streak()+' <small>'+(streak()===1?'day':'days')+'</small>';
  const today=(new Date().getDay()+6)%7,monday=dayKey(new Date());monday.setDate(monday.getDate()-today);
  const logged=new Set(state.sessions.filter(s=>new Date(s.date)>=monday).map(s=>(new Date(s.date).getDay()+6)%7));
  $('#week-strip').innerHTML=['M','T','W','T','F','S','S'].map((d,i)=>`<div class="week-day ${WEEK[i]>=0&&plans()[WEEK[i]]?'has-workout':''} ${i===today?'today':''} ${logged.has(i)?'logged':''}">${d}<b>${logged.has(i)?'✓':WEEK[i]>=0&&plans()[WEEK[i]]?esc(plans()[WEEK[i]].name.split(' ').pop()):'—'}</b></div>`).join('');
}
$('#start-next-btn').onclick=()=>navigate('workout');

// ---------- programme (editable) ----------
function renderProgramme(){
  const list=plans(),p=list[state.selectedPlan];
  $('#programme-tabs').innerHTML=list.map((x,i)=>`<button class="chip ${i===state.selectedPlan?'active':''}" data-plan="${i}">${esc(x.name)}</button>`).join('');
  $$('[data-plan]').forEach(b=>b.onclick=()=>{state.selectedPlan=+b.dataset.plan;save();renderProgramme()});
  $('#programme-detail').innerHTML=`<p class="eyebrow">${p.day} · ${planDuration(p)}</p><h2>${esc(p.name)}</h2><p>${planFocus(p)}</p>`+
    (p.items.map((it,i)=>`<div class="row"><button data-edit="${i}"><div><b><span class="row-num">${i+1}</span>${esc(it.name)}</b><small>${muscleOf(it.name)} · tap to swap or edit</small></div><span class="right">${it.sets} × ${it.reps}</span></button></div>`).join('')||empty('ramona_think','No exercises yet. Add some below.'))+
    `<button class="add-set" id="add-exercise">＋ Add exercise</button>`;
  $$('[data-edit]').forEach(b=>b.onclick=()=>editItem(+b.dataset.edit));
  $('#add-exercise').onclick=()=>pickExercise(name=>{p.items.push({name,sets:3,reps:10});save();renderProgramme();toast(`${name} added`)});
}
function editItem(i){
  const p=plans()[state.selectedPlan],it=p.items[i];
  const render=()=>{openSheet(`<p class="eyebrow">${muscleOf(it.name)} · ${esc(p.name)}</p><h2>${esc(it.name)}</h2>
    <div class="row"><b>Sets</b><div class="stepper"><button data-step="sets,-1" aria-label="Fewer sets">−</button><b>${it.sets}</b><button data-step="sets,1" aria-label="More sets">+</button></div></div>
    <div class="row"><b>Reps</b><div class="stepper"><button data-step="reps,-1" aria-label="Fewer reps">−</button><b>${it.reps}</b><button data-step="reps,1" aria-label="More reps">+</button></div></div>
    <button class="btn btn-ghost full" id="sheet-swap">Swap for another exercise</button>
    <button class="btn btn-pink full" id="sheet-done">Done</button>
    <button class="text-btn" id="sheet-remove">Remove from ${esc(p.name)}</button>`);
    $$('[data-step]').forEach(b=>b.onclick=()=>{const [k,d]=b.dataset.step.split(',');it[k]=Math.max(1,Math.min(k==='sets'?10:50,it[k]+ +d));save();render()});
    $('#sheet-swap').onclick=()=>pickExercise(name=>{it.name=name;save();renderProgramme();editItem(i)},muscleOf(it.name));
    $('#sheet-done').onclick=()=>{closeSheet();renderProgramme()};
    $('#sheet-remove').onclick=()=>{p.items.splice(i,1);save();closeSheet();renderProgramme()};
  };render();
}
// Exercise picker sheet. Same-muscle options first; search across everything.
function pickExercise(onPick,prefer){
  let q='',m=prefer||'All';
  const render=()=>{
    const list=exercises.filter(e=>(m==='All'||e.muscle===m)&&`${e.name} ${e.muscle} ${e.equipment}`.toLowerCase().includes(q.toLowerCase()));
    openSheet(`<h2>Choose exercise</h2><label class="search-box"><input id="pick-search" type="search" placeholder="Search" autocomplete="off" value="${esc(q)}"></label>
      <div class="chip-row">${['All',...MUSCLES].map(x=>`<button class="chip ${x===m?'active':''}" data-m="${x}">${x}</button>`).join('')}</div>
      <div class="list card">${list.map(e=>`<div class="row"><button data-pick="${esc(e.name)}"><div><b>${esc(e.name)}</b><small>${e.muscle} · ${e.equipment}</small></div>${CHEV}</button></div>`).join('')||empty('ramona_think','Nothing matches.')}</div>
      <button class="text-btn" id="sheet-close">Cancel</button>`);
    const inp=$('#pick-search');inp.oninput=()=>{q=inp.value;const pos=inp.selectionStart;render();$('#pick-search').focus();$('#pick-search').setSelectionRange(pos,pos)};
    $$('[data-m]').forEach(b=>b.onclick=()=>{m=b.dataset.m;render()});
    $$('[data-pick]').forEach(b=>b.onclick=()=>closeSheet(()=>onPick(b.dataset.pick)));
    $('#sheet-close').onclick=closeSheet;
  };render();
}
$('#reset-plans').onclick=()=>{openSheet(`<h2 class="center">Reset programme?</h2><p class="center">All three workouts go back to the default full-body plan. Your history stays.</p><button class="btn btn-pink full" id="sheet-yes">Reset</button><button class="text-btn" id="sheet-close">Cancel</button>`);$('#sheet-yes').onclick=()=>{state.plans=JSON.parse(JSON.stringify(DEFAULT_PLANS));state.selectedPlan=0;save();closeSheet();renderProgramme();toast('Programme reset')};$('#sheet-close').onclick=closeSheet};
$('#start-programme-btn').onclick=()=>{
  const a=state.active,p=plans()[state.selectedPlan];
  if(a&&a.planId!==p.id){openSheet(`<h2 class="center">Workout in progress</h2><p class="center">You're midway through ${esc(a.name)}. Finish or leave it before starting another.</p><button class="btn btn-pink full" id="sheet-continue">Continue ${esc(a.name)}</button><button class="text-btn" id="sheet-close">Cancel</button>`);$('#sheet-continue').onclick=()=>closeSheet(()=>navigate('workout'));$('#sheet-close').onclick=closeSheet;return}
  if(!p.items.length){toast('Add an exercise first');return}
  navigate('workout');
};

// ---------- workout ----------
function startWorkout(index){
  const p=plans()[index];if(!p.items.length){toast('Add an exercise first');navigate('programme');return}
  state.active={planId:p.id,name:p.name,focus:planFocus(p),startedAt:new Date().toISOString(),items:p.items.map(it=>({name:it.name,muscle:muscleOf(it.name),sets:Array.from({length:it.sets},()=>({weight:'',reps:String(it.reps),done:false}))}))};
  state.restUntil=0;save();renderWorkout();show('workout');
}
function previousFor(name){for(let i=state.sessions.length-1;i>=0;i--){const it=state.sessions[i].items.find(x=>x.name===name);if(it&&doneSets(it).length)return it}return null}
function renderWorkout(){
  const w=state.active;if(!w)return;
  $('#active-workout-title').textContent=w.name;
  $('#active-exercises').innerHTML=w.items.map((ex,ei)=>{
    const prev=previousFor(ex.name),prevLine=prev?'Last time: '+doneSets(prev).map(setLabel).join(' · '):'First time logging this one';
    return `<article class="card exercise-card"><div class="exercise-card-head"><div><h3>${esc(ex.name)}</h3><div class="muscle">${ex.muscle}</div></div><button class="text-btn" data-swap="${ei}">Swap</button></div><div class="prev-line">${prevLine}</div>
      <div class="set-head"><span>SET</span><span>KG</span><span>REPS</span><span></span></div>
      ${ex.sets.map((s,si)=>`<div class="set-row ${s.done?'done':''}"><span class="set-number">${si+1}</span>
        <input inputmode="decimal" type="number" min="0" step="0.5" placeholder="${prev&&prev.sets[si]&&prev.sets[si].weight>0?prev.sets[si].weight:'0'}" value="${esc(s.weight)}" data-e="${ei}" data-s="${si}" data-field="weight" aria-label="Weight in kg">
        <input inputmode="numeric" type="number" min="0" step="1" placeholder="0" value="${esc(s.reps)}" data-e="${ei}" data-s="${si}" data-field="reps" aria-label="Reps">
        <button class="set-check ${s.done?'done':''}" data-check="${ei}-${si}" aria-label="Complete set" aria-pressed="${s.done}">${CHECK}</button></div>`).join('')}
      <div class="exercise-actions"><button class="add-set" data-add="${ei}">＋ Add set</button><span class="muted">${ex.sets.filter(s=>s.done).length}/${ex.sets.length} done</span></div></article>`}).join('');
  $$('[data-e]').forEach(i=>i.addEventListener('input',()=>{w.items[+i.dataset.e].sets[+i.dataset.s][i.dataset.field]=i.value;save()}));
  $$('[data-check]').forEach(b=>b.onclick=()=>{const [e,s]=b.dataset.check.split('-').map(Number),set=w.items[e].sets[s];set.done=!set.done;
    if(set.done){const ph=b.closest('.set-row').querySelector('[data-field=weight]').placeholder;if(set.weight===''&&ph!=='0')set.weight=ph;state.restUntil=Date.now()+90000;meow()}
    save();renderWorkout()});
  $$('[data-add]').forEach(b=>b.onclick=()=>{const sets=w.items[+b.dataset.add].sets,last=sets[sets.length-1]||{weight:'',reps:'10'};sets.push({weight:last.weight,reps:last.reps,done:false});save();renderWorkout()});
  $$('[data-swap]').forEach(b=>b.onclick=()=>{const ex=w.items[+b.dataset.swap];pickExercise(name=>{ex.name=name;ex.muscle=muscleOf(name);ex.sets.forEach(s=>{s.done=false});save();renderWorkout();toast(`Swapped to ${name}`)},ex.muscle)});
  const all=w.items.flatMap(x=>x.sets),done=all.filter(s=>s.done).length,pct=all.length?Math.round(done/all.length*100):0;
  $('#completed-copy').textContent=`${done} of ${all.length} sets`;$('#workout-percent').textContent=pct+'%';$('#workout-progress-bar').style.width=pct+'%';
  renderRest();
}
function meow(){const c=$('#live-cat');c.classList.add('meowing');setTimeout(()=>c.classList.remove('meowing'),450)}
function renderRest(){
  const left=Math.ceil((state.restUntil-Date.now())/1000),bar=$('#rest-bar');
  if(state.restUntil&&left<=0){state.restUntil=0;save();toast('Rest over. Back to it!');if(navigator.vibrate)navigator.vibrate(200)}
  if(left>0){bar.innerHTML=`<div class="rest-running"><img src="cats/ramona_sleep.webp" alt="" data-zzz><b>${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}</b><span>Ramona says rest.</span><button class="text-btn" data-rest="30">+30s</button><button class="text-btn" data-rest="0">Skip</button></div>`}
  else bar.innerHTML=`<span class="label">Rest</span><button class="chip" data-rest="60">60s</button><button class="chip" data-rest="90">90s</button><button class="chip" data-rest="120">2 min</button>`;
  const z=$('[data-zzz]');if(z)z.onclick=()=>toast('Shh. Ramona is resting too.');
  $$('[data-rest]').forEach(b=>b.onclick=()=>{const s=+b.dataset.rest;state.restUntil=s===0?0:s===30?state.restUntil+30000:Date.now()+s*1000;save();renderRest()});
}
setInterval(()=>{if(state.restUntil)renderRest()},1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(state.restUntil)renderRest();pull()}});

$('#exit-workout').onclick=()=>{openSheet(`<h2 class="center">Leave workout?</h2><p class="center">Your unfinished sets won't be saved.</p><button class="btn btn-pink full" id="sheet-stay">Keep going</button><button class="text-btn" id="sheet-leave">Leave without saving</button>`);$('#sheet-stay').onclick=closeSheet;$('#sheet-leave').onclick=()=>{state.active=null;state.restUntil=0;save();closeSheet(()=>navigate('home'))}};
$('#finish-workout-btn').onclick=()=>{
  const w=state.active,vol=sessionVolume(w),n=w.items.flatMap(x=>x.sets).filter(s=>s.done).length;
  openSheet(`<div class="sheet-cats"><img src="cats/frito_bow.webp" alt=""><img src="cats/ramona_bow.webp" alt=""></div><p class="eyebrow center">Feather time!</p><h2 class="center">That's in the books.</h2><p class="center">${n} ${n===1?'set':'sets'} · ${fmt(vol)} kg moved${n?'':'. No sets ticked yet, so nothing will count.'}</p><button class="btn btn-pink full" id="sheet-save">Save workout</button><button class="text-btn" id="sheet-close">Keep editing</button>`);
  $('#sheet-close').onclick=closeSheet;
  $('#sheet-save').onclick=()=>{
    const items=w.items.map(e=>({name:e.name,muscle:e.muscle,sets:e.sets.map(s=>({weight:Number(s.weight)||0,reps:Number(s.reps)||0,done:!!s.done}))}));
    const session={id:Date.now(),name:w.name,planId:w.planId,date:new Date().toISOString(),startedAt:w.startedAt,items,volume:0};session.volume=sessionVolume(session);
    const before=getPRs();state.sessions.push(session);const after=getPRs();const newPRs=Object.keys(after).filter(k=>!before[k]||after[k].weight>before[k].weight);
    state.active=null;state.restUntil=0;state.selectedPlan=(Math.max(0,plans().findIndex(p=>p.id===w.planId))+1)%plans().length;save();
    closeSheet(()=>{toast(newPRs.length?`New PR: ${newPRs[0]}!`:'Workout saved. Nice work!');navigate('progress')});
  };
};

// ---------- progress ----------
function getPRs(){const prs={};state.sessions.forEach(ss=>ss.items.forEach(ex=>doneSets(ex).forEach(s=>{if(s.weight>0&&(!prs[ex.name]||s.weight>prs[ex.name].weight))prs[ex.name]={weight:s.weight,reps:s.reps,date:ss.date}})));return prs}
function streak(){
  const days=[...new Set(state.sessions.map(s=>+dayKey(s.date)))].sort((a,b)=>b-a);if(!days.length)return 0;
  if(daysBetween(+dayKey(new Date()),days[0])>1)return 0;
  let n=1;for(let i=1;i<days.length&&daysBetween(days[i-1],days[i])===1;i++)n++;return n;
}
const empty=(img,text)=>`<div class="empty-state"><img src="cats/${img}.webp" alt=""><span>${text}</span></div>`;
function renderProgress(){
  $('#progress-total-sessions').textContent=state.sessions.length;
  $('#progress-total-volume').innerHTML=fmt(state.sessions.reduce((a,s)=>a+s.volume,0))+' <small>kg</small>';
  const prs=getPRs();
  $('#pr-list').innerHTML=Object.keys(prs).length?Object.entries(prs).sort((a,b)=>b[1].weight-a[1].weight).map(([name,p])=>`<div class="row"><div><b>${esc(name)}</b><small>${new Date(p.date).toLocaleDateString('en',{day:'numeric',month:'short',year:'numeric'})}</small></div><div class="right">${p.weight} kg<small> × ${p.reps}</small></div></div>`).join(''):empty('ramona_think',"Ramona's thinking about yarn. Your best lifts will show up here.");
  $('#history-list').innerHTML=state.sessions.length?[...state.sessions].reverse().slice(0,10).map(s=>`<div class="row"><div><b>${esc(s.name)}</b><small>${new Date(s.date).toLocaleDateString('en',{weekday:'short',day:'numeric',month:'short'})} · ${s.items.filter(e=>doneSets(e).length).length} exercises</small></div><div class="right">${fmt(s.volume)} kg</div></div>`).join(''):empty('frito_think',"Frito's on watch. Finish a workout and it lands here.");
  const weeks={};state.sessions.forEach(s=>{const d=dayKey(s.date);d.setDate(d.getDate()-(d.getDay()+6)%7);weeks[+d]=(weeks[+d]||0)+s.volume});
  const keys=Object.keys(weeks).map(Number).sort((a,b)=>a-b).slice(-8),max=Math.max(1,...keys.map(k=>weeks[k]));
  $('#volume-chart').innerHTML=keys.length?keys.map(k=>`<div class="bar"><b>${fmt(weeks[k])}</b><i style="height:${Math.max(3,weeks[k]/max*100)}%"></i>${new Date(k).toLocaleDateString('en',{day:'numeric',month:'short'})}</div>`).join(''):empty('ramona_sleep','Nap time. Complete a workout to wake the chart.');
}

// ---------- library ----------
function renderLibrary(){
  const q=search.toLowerCase(),list=exercises.filter(e=>(filter==='All'||e.muscle===filter)&&`${e.name} ${e.muscle} ${e.equipment}`.toLowerCase().includes(q));
  $('#exercise-list').innerHTML=list.map(e=>`<div class="row"><button data-ex="${esc(e.name)}"><div><b>${esc(e.name)}</b><small>${e.muscle} · ${e.equipment} · ${e.type}</small></div>${CHEV}</button></div>`).join('')||empty('ramona_think','No exercises match. Ramona checked twice.');
  $$('[data-ex]').forEach(b=>b.onclick=()=>exerciseSheet(b.dataset.ex));
}
function exerciseSheet(name){
  const e=exercises.find(x=>x.name===name),pr=getPRs()[name];
  const hist=state.sessions.filter(s=>s.items.some(i=>i.name===name&&doneSets(i).length)).slice(-3).reverse();
  openSheet(`<p class="eyebrow">${e.muscle} · ${e.equipment} · ${e.type}</p><h2>${esc(name)}</h2>
    <div class="row"><div><b>Personal best</b></div><div class="right">${pr?`${pr.weight} kg<small> × ${pr.reps}</small>`:'—'}</div></div>
    ${hist.length?hist.map(s=>{const it=s.items.find(i=>i.name===name);return `<div class="row"><div><b>${esc(s.name)}</b><small>${new Date(s.date).toLocaleDateString('en',{day:'numeric',month:'short'})}</small></div><div class="right">${doneSets(it).map(setLabel).join(' · ')}</div></div>`}).join(''):empty('frito_think','Not logged yet.')}
    <button class="text-btn" id="sheet-close">Close</button>`);
  $('#sheet-close').onclick=closeSheet;
}
$('#library-filters').innerHTML=['All',...MUSCLES].map(m=>`<button class="chip ${m==='All'?'active':''}" data-filter="${m}">${m}</button>`).join('');
$('#exercise-search').addEventListener('input',e=>{search=e.target.value;renderLibrary()});
$('#library-filters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;filter=b.dataset.filter;$$('#library-filters .chip').forEach(x=>x.classList.toggle('active',x===b));renderLibrary()});

// ---------- settings ----------
$('#settings-btn').onclick=()=>{
  openSheet(`<h2>Settings</h2><div class="row"><div><b>Signed in</b><small>${esc(me.login||'this device only')}</small></div></div>
    <div class="row"><div><b>Where your data lives</b><small>${me.login?'Saved on Abhyuday\'s server under your tailnet account, so it follows you across devices.':'Saved in this browser only.'}</small></div></div>
    <div class="row"><div><b>Add to Home Screen</b><small>In Safari: Share → Add to Home Screen for the full-screen app.</small></div></div>
    <button class="btn btn-ghost full" id="sheet-export">Export data (JSON)</button><button class="text-btn" id="sheet-close">Close</button>`);
  $('#sheet-close').onclick=closeSheet;
  $('#sheet-export').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));a.download='form-workouts.json';a.click()};
};

// ---------- boot ----------
renderUser();renderHome();renderProgramme();renderLibrary();pull();
history.replaceState({view:'home'},'','#home');
if(state.active)navigate('workout');
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
