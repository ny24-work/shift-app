const KEY='shiftAppV4Complete';
let currentRole='manager', currentName='', currentMonthKey='';

function makeMonthKeys(){
  const now=new Date();
  return [0,1,2].map(add=>{
    const d=new Date(now.getFullYear(), now.getMonth()+add, 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  });
}
let monthKeys=makeMonthKeys();
currentMonthKey=monthKeys[0];

function monthName(k){return `${k.slice(0,4)}年${Number(k.slice(5,7))}月`}
function daysInMonth(k){return new Date(Number(k.slice(0,4)), Number(k.slice(5,7)), 0).getDate()}
function yOf(k){return Number(k.slice(0,4))}
function mOf(k){return Number(k.slice(5,7))-1}

const defaultData={
  pass:{manager:'0000',developer:'9999',staff:''},
  months:{},
  shifts:{
    A:{time:'5:00〜14:00',hours:8,break:1},
    B:{time:'5:00〜11:00',hours:6,break:0},
    C:{time:'5:30〜10:30',hours:5,break:0},
    D:{time:'6:30〜11:00',hours:4.5,break:0},
    E:{time:'6:00〜10:30',hours:4.5,break:0},
    F:{time:'タイミー',hours:5,break:0}
  },
  need:{base:2,60:3,80:4,100:5,120:6},
  maxConsecutive:5,
  staffs:[
    {name:'安藤',maxDays:21,can:['A'],priority:['A'],memo:'A固定'},
    {name:'永持',maxDays:21,can:['A'],priority:['A'],memo:'A固定'},
    {name:'宮本',maxDays:21,can:['B','D'],priority:['B','D'],memo:'B/D'},
    {name:'井阪',maxDays:12,can:['B'],priority:['B'],memo:'B'},
    {name:'吉田',maxDays:21,can:['C','B','E'],priority:['C','B','E'],memo:'C優先'},
    {name:'西岡',maxDays:20,can:['D'],priority:['D'],memo:'D固定'},
    {name:'中西',maxDays:6,can:['A'],priority:['A'],memo:'補助'},
    {name:'西島',maxDays:4,can:['A'],priority:['A'],memo:'補助'}
  ]
};

function monthTemplate(k){
  const d=daysInMonth(k);
  let meals=Array(d).fill(0);
  if(k===monthKeys[0] && d===31){
    meals=[65,60,97,63,72,71,65,69,71,107,67,68,74,130,100,87,66,33,47,56,91,100,76,52,53,68,76,56,72,77,78];
  }
  return {meals,requests:{},schedule:{}};
}
function ensureData(obj){
  if(!obj) obj=structuredClone(defaultData);
  if(!obj.pass) obj.pass={manager:'0000',developer:'9999',staff:''};
  if(!obj.months) obj.months={};
  monthKeys.forEach(k=>{
    if(!obj.months[k]) obj.months[k]=monthTemplate(k);
    const d=daysInMonth(k);
    if(!obj.months[k].meals || obj.months[k].meals.length!==d) obj.months[k].meals=Array(d).fill(0);
    if(!obj.months[k].requests) obj.months[k].requests={};
    if(!obj.months[k].schedule) obj.months[k].schedule={};
  });
  return obj;
}
let data=load();
function load(){try{return ensureData(JSON.parse(localStorage.getItem(KEY)))}catch(e){return ensureData(structuredClone(defaultData))}}
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function $(id){return document.getElementById(id)}
function md(){return data.months[currentMonthKey]}
function dow(k,d){return ['日','月','火','水','木','金','土'][new Date(yOf(k),mOf(k),d).getDay()]}
function needPeople(m){let n=data.need.base;if(m>=60)n=data.need[60];if(m>=80)n=data.need[80];if(m>=100)n=data.need[100];if(m>=120)n=data.need[120];return n}
function isWork(v){return ['A','B','C','D','E','F'].includes(v)}
function shiftCls(v){return v==='休'?'off':isWork(v)?'shift'+v:''}

function init(){
  ['monthSelect','mealMonthSelect','scheduleMonthSelect'].forEach(id=>{
    if($(id)) $(id).innerHTML=monthKeys.map(k=>`<option value="${k}">${monthName(k)}</option>`).join('');
  });
  $('loginName').innerHTML=data.staffs.map(s=>`<option>${s.name}</option>`).join('');
  toggleLoginName();
  renderAll();
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
}
function toggleLoginName(){
  if($('role').value==='staff') $('loginNameBox').classList.remove('hidden');
  else $('loginNameBox').classList.add('hidden');
}
function login(){
  currentRole=$('role').value;
  currentName=$('loginName').value;
  const p=$('pass').value;
  if(data.pass[currentRole] && p!==data.pass[currentRole]){alert('パスワードが違います');return}
  $('login').classList.add('hidden');$('app').classList.remove('hidden');
  $('who').textContent=currentRole==='manager'?'店長・管理者':currentRole==='developer'?'西岡・開発者':currentName+' さん';
  document.querySelectorAll('.admin').forEach(el=>el.style.display=currentRole==='staff'?'none':'');
  if(currentRole==='staff') showTab('request');
  renderAll();
}
function demoLogin(){ $('role').value='manager'; $('pass').value=data.pass.manager; login(); }
function showTab(id){
  document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
  $(id).classList.remove('hidden');
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===id));
  renderAll();
}
function changeMonth(k){ currentMonthKey=k; renderAll(); }
function renderAll(){
  ['monthSelect','mealMonthSelect','scheduleMonthSelect'].forEach(id=>{if($(id))$(id).value=currentMonthKey});
  if($('monthLabel')) $('monthLabel').textContent=monthName(currentMonthKey);
  renderHome();renderRequests();renderMeals();renderStaffs();renderRules();renderPasswords();renderSchedule();
}
function renderHome(){
  let c={},h={};data.staffs.forEach(s=>{c[s.name]=0;h[s.name]=0});
  Object.values(md().schedule||{}).forEach(day=>Object.entries(day).forEach(([n,v])=>{
    if(isWork(v)&&v!=='F'){c[n]=(c[n]||0)+1;h[n]=(h[n]||0)+(data.shifts[v]?.hours||0)}
  }));
  $('homeCards').innerHTML=data.staffs.map(s=>`<div class='card'><b>${s.name}</b><br><span class='muted'>${c[s.name]||0}日 / ${h[s.name]||0}時間</span><br><span class='pill'>${s.memo||''}</span></div>`).join('');
  $('warnings').innerHTML=getWarnings().join('<br>') || '<span class=good>不足・警告はありません。</span>';
}
function getWarnings(){
  let w=[],D=daysInMonth(currentMonthKey);
  for(let d=1;d<=D;d++){
    let need=needPeople(md().meals[d-1]||0), actual=0;
    Object.values(md().schedule[d]||{}).forEach(v=>{if(isWork(v))actual++});
    if(Object.keys(md().schedule).length&&actual<need)w.push(`<span class=bad>${d}日：人数不足 ${actual}/${need}</span>`);
  }
  return w;
}
function renderRequests(){
  let names=currentRole==='staff'?[currentName]:data.staffs.map(s=>s.name);
  $('requestArea').innerHTML=monthKeys.map(k=>`<div class=card><h3>${monthName(k)}</h3>`+names.map(n=>{
    let req=data.months[k].requests[n]||[],days='';
    for(let d=1;d<=daysInMonth(k);d++) days+=`<label class=reqDay><input type=checkbox data-month="${k}" data-req="${n}" value="${d}" ${req.includes(d)?'checked':''}>${d}日</label>`;
    return `<h4>${n}</h4>${days}`;
  }).join('')+`</div>`).join('');
}
function saveRequests(){
  document.querySelectorAll('[data-req]').forEach(cb=>{
    let k=cb.dataset.month,n=cb.dataset.req,d=Number(cb.value);
    data.months[k].requests[n]||=[];
    data.months[k].requests[n]=data.months[k].requests[n].filter(x=>x!==d);
    if(cb.checked)data.months[k].requests[n].push(d);
  });
  save();alert('希望休を保存しました');
}
function renderMeals(){
  let D=daysInMonth(currentMonthKey),h='<tr><th>日</th>';
  for(let d=1;d<=D;d++) h+=`<th class="${dow(currentMonthKey,d)==='日'?'sun':dow(currentMonthKey,d)==='土'?'sat':''}">${d}<br>${dow(currentMonthKey,d)}</th>`;
  h+='</tr><tr><th>食数</th>';
  for(let d=1;d<=D;d++) h+=`<td><input class=smallInput type=number data-meal=${d} value="${md().meals[d-1]||0}"></td>`;
  h+='</tr><tr><th>必要</th>';
  for(let d=1;d<=D;d++) h+=`<td>${needPeople(md().meals[d-1]||0)}</td>`;
  $('mealTable').innerHTML=h+'</tr>';
}
function saveMeals(){
  document.querySelectorAll('[data-meal]').forEach(i=>md().meals[Number(i.dataset.meal)-1]=Number(i.value||0));
  save();renderAll();alert('食数を保存しました');
}
function fillMealsZero(){
  if(confirm('表示月の食数を全部0にしますか？')){md().meals=Array(daysInMonth(currentMonthKey)).fill(0);save();renderAll();}
}
function renderStaffs(){
  $('staffArea').innerHTML=data.staffs.map((s,i)=>`<div class=card><div class=grid>
  <div><label>名前</label><input data-staff=${i} data-key=name value="${s.name}"></div>
  <div><label>上限日数</label><input type=number data-staff=${i} data-key=maxDays value="${s.maxDays}"></div>
  <div><label>入れる勤務</label><input data-staff=${i} data-key=can value="${s.can.join(',')}"></div>
  <div><label>優先勤務順</label><input data-staff=${i} data-key=priority value="${s.priority.join(',')}"></div>
  <div><label>メモ</label><input data-staff=${i} data-key=memo value="${s.memo||''}"></div>
  </div></div>`).join('');
}
function saveStaffs(){
  document.querySelectorAll('[data-staff]').forEach(i=>{
    let s=data.staffs[Number(i.dataset.staff)],k=i.dataset.key;
    if(k==='maxDays')s[k]=Number(i.value);
    else if(k==='can'||k==='priority')s[k]=i.value.split(',').map(x=>x.trim().toUpperCase()).filter(Boolean);
    else s[k]=i.value.trim();
  });
  save();init();alert('保存しました');
}
function addStaff(){data.staffs.push({name:'新スタッフ',maxDays:10,can:['B'],priority:['B'],memo:''});save();renderStaffs();}
function renderRules(){
  $('shiftArea').innerHTML=Object.entries(data.shifts).map(([k,v])=>`<div class=grid>
    <div><label>${k} 時間</label><input data-shift=${k} data-key=time value="${v.time}"></div>
    <div><label>${k} 勤務時間</label><input type=number step=0.5 data-shift=${k} data-key=hours value="${v.hours}"></div>
    <div><label>${k} 休憩</label><input type=number step=0.5 data-shift=${k} data-key=break value="${v.break||0}"></div>
  </div>`).join('');
  $('baseNeed').value=data.need.base;$('need60').value=data.need[60];$('need80').value=data.need[80];$('need100').value=data.need[100];$('need120').value=data.need[120];$('maxConsecutive').value=data.maxConsecutive;
}
function saveRules(){
  document.querySelectorAll('[data-shift]').forEach(i=>{let s=i.dataset.shift,k=i.dataset.key;data.shifts[s][k]=k==='time'?i.value:Number(i.value)});
  data.need.base=Number($('baseNeed').value);data.need[60]=Number($('need60').value);data.need[80]=Number($('need80').value);data.need[100]=Number($('need100').value);data.need[120]=Number($('need120').value);data.maxConsecutive=Number($('maxConsecutive').value);
  save();renderAll();alert('ルール保存しました');
}
function renderPasswords(){if($('managerPass')){$('managerPass').value=data.pass.manager;$('developerPass').value=data.pass.developer}}
function savePasswords(){data.pass.manager=$('managerPass').value;data.pass.developer=$('developerPass').value;save();alert('パスワードを保存しました')}
function chooseShift(s){return(s.priority||s.can||['B']).find(x=>(s.can||[]).includes(x))||(s.can||['B'])[0]}
function generateSchedule(){
  let D=daysInMonth(currentMonthKey),month=md(),wc={},hh={},con={};
  data.staffs.forEach(s=>{wc[s.name]=0;hh[s.name]=0;con[s.name]=0});
  let schedule={};
  for(let d=1;d<=D;d++){
    schedule[d]={};
    data.staffs.forEach(s=>{if((month.requests[s.name]||[]).includes(d)){schedule[d][s.name]='休';con[s.name]=0}else schedule[d][s.name]=''});
    let assigned=[],need=needPeople(month.meals[d-1]||0);
    while(assigned.length<need){
      let cand=data.staffs.filter(s=>!assigned.includes(s.name)&&schedule[d][s.name]!=='休'&&wc[s.name]<s.maxDays&&con[s.name]<data.maxConsecutive&&(s.can||[]).length);
      if(!cand.length){schedule[d]['タイミー']='F';break}
      cand.sort((a,b)=>(wc[a.name]-wc[b.name])||(hh[a.name]-hh[b.name])||(con[a.name]-con[b.name]));
      let s=cand[0],sh=chooseShift(s);
      schedule[d][s.name]=sh;assigned.push(s.name);wc[s.name]++;hh[s.name]+=data.shifts[sh]?.hours||0;con[s.name]++;
    }
    data.staffs.forEach(s=>{if(!['A','B','C','D','E'].includes(schedule[d][s.name]))con[s.name]=0});
  }
  month.schedule=schedule;save();renderAll();alert(monthName(currentMonthKey)+'のシフト案を作成しました');
}
function renderSchedule(){
  let D=daysInMonth(currentMonthKey),names=[...data.staffs.map(s=>s.name),'タイミー'];
  $('scheduleTitle').textContent=monthName(currentMonthKey)+' 勤務予定表';
  let h='<tr><th class=nameCell>名前</th>';
  for(let d=1;d<=D;d++) h+=`<th class="${dow(currentMonthKey,d)==='日'?'sun':dow(currentMonthKey,d)==='土'?'sat':''}">${d}<br>${dow(currentMonthKey,d)}<br><span class=muted>${md().meals[d-1]||0}</span></th>`;
  h+='<th>日数</th><th>時間</th></tr>';
  names.forEach(n=>{
    let days=0,hrs=0;h+=`<tr><td class=nameCell>${n}</td>`;
    for(let d=1;d<=D;d++){
      let v=(md().schedule[d]||{})[n]||'';
      if(isWork(v)){days++;hrs+=data.shifts[v]?.hours||0}
      h+=`<td class="${shiftCls(v)}" contenteditable="${currentRole!=='staff'}" onblur="editCell(${d},'${n}',this.textContent)">${v}</td>`;
    }
    h+=`<td>${days}</td><td>${hrs}</td></tr>`;
  });
  h+='<tr><th class=nameCell>実績/必要</th>';
  for(let d=1;d<=D;d++){let actual=0;names.forEach(n=>{if(isWork((md().schedule[d]||{})[n]))actual++});let need=needPeople(md().meals[d-1]||0);h+=`<td class="${actual>=need?'good':'bad'}">${actual}/${need}</td>`}
  h+='<td></td><td></td></tr>';$('scheduleTable').innerHTML=h;
  $('printLegend').innerHTML=Object.entries(data.shifts).map(([k,v])=>`${k}：${v.time}（${v.hours}h）`).join('　');
}
function editCell(day,name,val){val=val.trim().toUpperCase();if(!md().schedule[day])md().schedule[day]={};md().schedule[day][name]=val;save();renderHome();}
function exportCSV(){
  let D=daysInMonth(currentMonthKey),names=[...data.staffs.map(s=>s.name),'タイミー'],rows=[['名前',...Array.from({length:D},(_,i)=>`${i+1}日`),'日数','時間']];
  names.forEach(n=>{let row=[n],days=0,hrs=0;for(let d=1;d<=D;d++){let v=(md().schedule[d]||{})[n]||'';row.push(v);if(isWork(v)){days++;hrs+=data.shifts[v]?.hours||0}}row.push(days,hrs);rows.push(row)});
  downloadText('shift-'+currentMonthKey+'.csv','\ufeff'+rows.map(r=>r.map(x=>`"${String(x).replaceAll('"','""')}"`).join(',')).join('\n'),'text/csv');
}
function exportBackup(){downloadText('shift-backup.json',JSON.stringify(data,null,2),'application/json')}
function importBackup(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{data=ensureData(JSON.parse(r.result));save();init();alert('読み込みました')};r.readAsText(f)}
function downloadText(name,text,type){let a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click()}
function resetAll(){if(confirm('全部初期化する？')){localStorage.removeItem(KEY);data=load();init();alert('初期化しました')}}

init();
