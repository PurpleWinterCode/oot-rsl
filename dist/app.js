'use strict';
const D=window.RSL_DATA, KEY='oot-rsl-race-notes-v1';
const blank=()=>({version:1,name:'',values:{},verified:{},notes:{},rows:{paths:5,foolish:3,sometimes:5},showAll:false});
let state=blank(),storageOK=true;
try{const raw=localStorage.getItem(KEY);if(raw){const p=JSON.parse(raw);if(p.version===1&&p.values&&p.notes&&p.verified)state={...blank(),...p,rows:{...blank().rows,...p.rows}};}}catch(e){storageOK=false;}
const $=s=>document.querySelector(s),el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
function save(){window.dispatchEvent(new Event('rsl-save'));try{localStorage.setItem(KEY,JSON.stringify(state));storageOK=true;$('#save-state').textContent='Enregistré';}catch(e){storageOK=false;$('#save-state').textContent='Sauvegarde indisponible : exporte tes notes';}}
function field(key,type='text',options=[],placeholder='…',area='notes'){
 let n;if(type==='select'||type==='bool'){n=el('select');n.append(new Option('Inconnu',''));const choices=type==='bool'?['Activé','Désactivé']:options;choices.forEach(x=>n.append(new Option(x,x)));}else n=el('input');
 if(n.tagName==='INPUT'){n.type=type;n.placeholder=placeholder;if(type==='number')n.min='0';}
 n.setAttribute('aria-label',key);n.dataset.key=key;const saved=state[area][key]??'';if(type==='number'&&saved!==''&&!Number.isFinite(Number(saved)))n.type='text';if(n.tagName==='SELECT'&&saved!==''&&!Array.from(n.options).some(o=>o.value===String(saved)))n.append(new Option(saved+' · ancienne valeur',saved));n.value=saved;
 n.addEventListener('input',()=>{state[area][key]=n.value;save();if(area==='values'){syncSettings();applyVisibility();updateCountLimits();}else if(key.startsWith('dungeon:'))updateDungeonBosses();});return n;
}
function check(key,area='notes',label=key){const n=el('input');n.type='checkbox';n.checked=state[area][key]===true;n.setAttribute('aria-label',label);n.addEventListener('change',()=>{state[area][key]=n.checked;save();if(area==='verified'){syncSettings();updateProgress();filterSettings();applyVisibility();}});return n;}
D.settings.find(s=>s.id==='left6').name='Shuffle GS';
Object.assign(D.settings.find(s=>s.id==='right7'),{optionLabels:{Vanilla:'Off',Affordable:'10 rubis',Expensive:'Prix d’origine',Random:'Prix aléatoires'},help:'Off : seuls les 3 Scrubs de base sont des checks. 10 rubis : tous mélangés, 10 chacun. Prix d’origine (Expensive) : tous mélangés, tarifs vanilla. Prix aléatoires : tous mélangés, 0–99 rubis.'});
const PRE_RACE=['right27','right26','right25','right24','right15','right23'];
const BOSS_OPTIONS=['aucun','Gohma','King Dodongo','Barinade','Phantom Ganon','Volvagia','Morpha','Bongo Bongo','Twinrova'];
const panels=[];
function panel(view,title,color,rule=null,wide=false){const p=el('section','panel'+(wide?' wide':''));p.style.setProperty('--accent',color);const head=el('div','panel-head');head.append(el('h2','',title));p.append(head);const notice=el('div','hidden-notice','Bloc masqué par le setting — notes conservées');notice.hidden=true;p.append(notice);const body=el('div','panel-body');p.append(body);$('#view-'+view).append(p);if(rule)panels.push({p,notice,rule});return body;}
function table(body,headers){const wrap=el('div','table-scroll'),t=el('table'),h=el('thead'),tr=el('tr');headers.forEach(x=>tr.append(el('th','',x)));h.append(tr);t.append(h,el('tbody'));wrap.append(t);body.append(wrap);return t.tBodies[0];}
function row(tb,items){const r=el('tr');items.forEach(item=>{const td=el('td');if(typeof item==='string'){td.textContent=item;td.className='label-cell';}else td.append(item);r.append(td);});tb.append(r);return r;}
function list(view,title,items,color,rule){const b=panel(view,title,color,rule),wrap=el('div','check-list');items.forEach((name,i)=>{const l=el('label','check-item');l.append(el('span','',name),check(title+':'+i,'notes',name+' effectué'));wrap.append(l);});b.append(wrap);return b;}
function destinations(view,title,items,color,rule){const b=panel(view,title,color,rule),tb=table(b,['Entrée / origine','Destination ou note']);items.forEach((name,i)=>row(tb,[name,field(title+':'+i,'text',[],'Destination…')]));return b;}
function inactive(id,values=['Désactivé','Off']){return state.verified[id]===true&&values.includes(state.values[id]);}
const MIN_ROWS={paths:5,foolish:3,sometimes:5};
function pathChoices(){const options=['Gohma','KD','Jabu','PG','Volvagia','Morpha','Bongo','Twinrova','hero'];if(['désactivé','off','false'].includes(String(state.values.left19??'').toLowerCase()))options.push('time');if(raceActive('right27'))options.push('gold');return options;}
function updatePaths(){document.querySelectorAll('[data-path-choice]').forEach(n=>{const saved=state.notes[n.dataset.key]??'';n.replaceChildren(new Option('Inconnu',''));pathChoices().forEach(x=>n.append(new Option(x,x)));if(saved&&!pathChoices().includes(saved)){const o=new Option(saved+' · indisponible',saved);o.disabled=true;n.append(o);}n.value=saved;});}
function dynamic(title,id,headers,color){const b=panel('race',title,color),tb=table(b,headers);state.rows[id]=Math.max(MIN_ROWS[id],state.rows[id]);
 const makeRow=i=>row(tb,headers.map((x,j)=>{const n=field(id+':'+i+':'+j,id==='paths'&&j===1?'select':'text',id==='paths'&&j===1?pathChoices():[],x+'…');if(id==='paths'&&j===1)n.dataset.pathChoice='true';return n;}));
 for(let i=0;i<state.rows[id];i++)makeRow(i);
 const controls=el('div','row-controls'),add=el('button','add-row','+ Ligne'),remove=el('button','add-row','− Ligne');remove.setAttribute('aria-label','Retirer la dernière ligne de '+title);
 const sync=()=>remove.disabled=state.rows[id]<=MIN_ROWS[id];sync();
 add.addEventListener('click',()=>{makeRow(state.rows[id]++);sync();save();});
 remove.addEventListener('click',()=>{if(state.rows[id]<=MIN_ROWS[id])return;state.rows[id]--;tb.lastElementChild.remove();sync();save();});controls.append(add,remove);b.append(controls);return b;}
const SIMPLE_INDOORS=new Set(['MK ToT','KAK Pot front','KAK Pot back','KAK Pot back in','KAK Windmill','KF Link']);
function buildEntrances(title,items,setting,color){
 const b=panel('entrances',title,color,()=>settingOff(setting));b.parentElement.dataset.entranceSetting=setting;
 const choices=el('datalist');choices.id='destinations-'+title;[title==='Indoors'?'Great Fairy':'Generic grotto',...items].forEach(v=>choices.append(new Option(v,v)));b.append(choices);const grid=el('div','entrance-grid');items.forEach((name,i)=>{const cell=el('div','entrance-cell');cell.dataset.entranceName=name;cell.dataset.originalIndex=i;const empty=check(title+'-empty:'+i,'notes',name+' : rien dedans'),heading=el('label','entrance-heading');empty.title='Rien dedans';heading.append(el('span','',name),empty);cell.classList.toggle('entrance-empty',empty.checked);empty.addEventListener('change',()=>{cell.classList.toggle('entrance-empty',empty.checked);sortEntrances(grid);});const destination=field(title+':'+i,'text',[],'Destination…');destination.setAttribute('list',choices.id);cell.append(heading,destination);grid.append(cell);});b.append(grid);sortEntrances(grid);
}
function sortEntrances(grid){Array.from(grid.children).sort((a,b)=>Number(a.classList.contains('entrance-empty'))-Number(b.classList.contains('entrance-empty'))||Number(a.dataset.originalIndex)-Number(b.dataset.originalIndex)).forEach(cell=>grid.append(cell));}
function updateEntrances(){
 const view=$('#view-entrances'),blocks=Array.from(view.querySelectorAll('.panel'));view.classList.toggle('single-entrance',blocks.filter(p=>!p.hidden).length===1);
 const simple=String(state.values.right4).toLowerCase()==='simple';view.querySelectorAll('[data-entrance-name]').forEach(cell=>{cell.hidden=cell.closest('[data-entrance-setting="right4"]')&&simple&&SIMPLE_INDOORS.has(cell.dataset.entranceName);});
}
function freestandingInactive(category){const mode=String(state.values.right5??'').toLowerCase();return mode!==''&&mode!=='inconnu'&&mode!=='all'&&mode!==category.toLowerCase();}
function groupedFreestanding(){
 const zones={'KF Sarias House':'Kokiri Forest','KF Kokiri Shop':'Kokiri Forest','LW Beyond Mido':'Lost Woods','LH Lab':'Lake Hylia','Graveyard Dampes Grave':'Graveyard','DMC Pierre Platform':'Death Mountain Crater','DMC Central Nearby':'Death Mountain Crater','DMT Cow Grotto':'Death Mountain','GV Octorok Grotto':'Gerudo Valley'};
 const groups=new Map();for(const g of D.freestanding){const zone=zones[g.name]||g.name;if(!groups.has(zone))groups.set(zone,{name:zone,category:g.category,spots:new Map()});const target=groups.get(zone);
 for(const location of g.locations){if(location==='KF Shop Invisible Rupee'||location.startsWith('Fire Temple Moving Fire Room Recovery Heart'))continue;const base=location.replace(/ \d+$/,'').replace(/ (?:Green|Blue|Red) Rupee/,' Rupee');if(!target.spots.has(base))target.spots.set(base,[]);target.spots.get(base).push(location);}}
 const fire=groups.get('Fire Temple');if(fire){fire.spots.set('Fire room pillars',['Fire room pillars 1','Fire room pillars 2']);fire.spots.set('Fire room corner',['Fire room corner 1']);}
 return Array.from(groups.values());
}
const FIRE_SPLIT={'Fire room pillars':['Fire room pillars 1','Fire room pillars 2'],'Fire room corner':['Fire room corner 1']};
function migrateFireChecks(){if(state.notes['fire-split-migrated'])return;const old=[1,2,3].map(i=>state.notes['freestanding:Fire Temple Moving Fire Room Recovery Heart '+i]===true),count=old.filter(Boolean).length;
 for(const [name,members] of Object.entries(FIRE_SPLIT)){if(count===3)for(const m of members)state.notes['freestanding:'+m]=true;if(count>0&&count<3)state.notes['fire-split-review:'+name]=true;}
 state.notes['fire-split-migrated']=true;
}
function freestandingLabel(name){
 const overrides={'KF Behind Midos Rupee':'Behind Midos House Rupee','KF End of Bridge Rupee':'Pillar Bridge Rupee','KF Top of Sarias Recovery Heart':'Top of Sarias house','KF Sarias Recovery Heart':'Inside Sarias house'};
 return overrides[name]||name.replace(/^(?:Deku Tree|Dodongos Cavern|Forest Temple|Fire Temple|Water Temple|Shadow Temple|Spirit Temple|Ganons Castle|Bottom of the Well|Gerudo Training Ground|Ice Cavern|Graveyard|KF|LW|LH|DMT|GC|DMC|ZR|ZF|GV) /,'');
}
function freestandingAge(name){
 const child=['KF Behind Midos Rupee','KF Boulder Maze Rupee','KF End of Bridge Rupee','KF Top of Sarias Recovery Heart','KF Near Ramp Rupee','KF Near Midos Rupee','LW Water Rupee','LH Underwater Rupee','DMT Rock Rupee','GC Spinning Pot Rupee Drop','GC Spinning Pot PoH Drop Rupee','DMC Lower Rupee','Bottom of the Well Coffin Recovery Heart','Bottom of the Well Center Room Pit Fall Rupee'];
 const adult=['KF Bean Platform Rupee Circle Rupee','DMC Pierre Rupee Circle Rupee','ZR Waterfall Rupee','Ice Cavern Map Room Recovery Heart','ZF Bottom Freestanding Rupee','Fire Temple Eye Switch Room Recovery Heart','Fire room pillars','Fire room corner','Water Temple River Recovery Heart','Spirit Temple Shifting Wall Recovery Heart','Ganons Castle Fire Trial Recovery Heart','Ganons Castle Shadow Trial Recovery Heart','Ice Cavern Block Room Rupee'];
 const both=['KF Sarias Recovery Heart','LH Lab Dive Rupee','DMT Cow Grotto Rupee Circle Rupee','DMT Cow Grotto Recovery Heart','GV Octorok Grotto Rupee','LW Under Boulder Rupee','Graveyard Dampe Race Rupee','Deku Tree Walk the Plank Recovery Heart','Deku Tree Leap Recovery Heart','Deku Tree 2-3-1 Scrubs Recovery Heart','Dodongos Cavern Lizalfos Hidden Recovery Heart','Dodongos Cavern Lizalfos Recovery Heart','Dodongos Cavern Behind Block Recovery Heart','Forest Temple Well Recovery Heart','Forest Temple Courtyard Recovery Heart','Fire Temple Elevator Room Recovery Heart','Ganons Castle Spirit Trial Recovery Heart','Gerudo Training Ground Beamos Recovery Heart','Ice Cavern Freestanding Rupee'];
 return child.includes(name)?'child':(adult.includes(name)||name.startsWith('Shadow Temple '))?'adult':both.includes(name)?'both':'unknown';
}
function buildFreestanding(){
 migrateFireChecks();
 for(const group of groupedFreestanding()){
 const b=panel('freestanding',group.name,group.category==='Dungeon'?'#bba0e3':'#9ac98c',()=>freestandingInactive(group.category));b.parentElement.dataset.category=group.category;
 const total=Array.from(group.spots.values()).reduce((n,m)=>n+m.length,0);b.parentElement.querySelector('.panel-head').append(el('span','',String(total)));
 const wrap=el('div','check-list');for(const [name,members] of group.spots){const label=el('label','check-item'),c=el('input');c.type='checkbox';const displayName=freestandingLabel(name),age=freestandingAge(name);c.setAttribute('aria-label',displayName+' effectué');c.dataset.freestandingGroup=name;
 const sync=()=>{const done=members.filter(x=>state.notes['freestanding:'+x]===true).length;c.checked=done===members.length;const review=state.notes['fire-split-review:'+name]===true;c.indeterminate=review||(done>0&&done<members.length);c.title=review?'Ancienne progression partielle : à confirmer pour cet emplacement':done+' / '+members.length+' effectués';};c.syncFreestanding=sync;sync();
 c.addEventListener('change',()=>{for(const member of members){state.notes['freestanding:'+member]=c.checked;if(state.checks?.done)state.checks.done[member]=c.checked;}delete state.notes['fire-split-review:'+name];save();sync();});label.append(el('span','',displayName+' ('+age+') ('+members.length+')'),c);wrap.append(label);}b.append(wrap);
 }
}
function settingOff(id){return ['off','désactivé','false','vanilla','none'].includes(String(state.values[id]??'').trim().toLowerCase());}
function raceActive(id){const v=String(state.values[id]??'').trim().toLowerCase();return !['','inconnu','off','désactivé','false','vanilla','none'].includes(v);}
function dungeonActive(){return ['right2','right12','right22'].some(raceActive);}
function isGanonsCastle(name){return /^ganon(?:'s)? castle$/i.test(String(name).trim());}
function dungeonTarget(i){if(!raceActive('right2'))return D.dungeons[i];const simple=String(state.values.right2).toLowerCase()==='simple';if(simple&&isGanonsCastle(D.dungeons[i]))return D.dungeons[i];const saved=state.notes['dungeon:'+i];return simple&&isGanonsCastle(saved)?'':saved;}
function dungeonContainsGanon(i){return isGanonsCastle(dungeonTarget(i));}
function updateDungeonDestinations(){const simple=String(state.values.right2).toLowerCase()==='simple';D.dungeons.forEach((name,i)=>{const n=document.querySelector('[data-key="dungeon:'+i+'"]');if(!n)return;const fixed=simple&&isGanonsCastle(name);for(const o of n.options)o.disabled=simple&&!fixed&&isGanonsCastle(o.value);n.disabled=fixed;n.value=fixed?name:(simple&&isGanonsCastle(state.notes['dungeon:'+i])?'':state.notes['dungeon:'+i]??'');n.title=fixed?"Ganon's Castle est fixe en mode Simple":'';});}
function updateDungeonBosses(){updateDungeonDestinations();document.querySelectorAll('[data-boss-index]').forEach(n=>{const i=Number(n.dataset.bossIndex),fixed=dungeonContainsGanon(i),saved=state.notes['boss:'+i]??'';
 n.replaceChildren(new Option('Inconnu',''));BOSS_OPTIONS.forEach(x=>n.append(new Option(x,x)));
 if(fixed){n.append(new Option('Ganon','Ganon'));n.value='Ganon';n.disabled=true;n.title="Ganon est toujours le boss de Ganon's Castle";}
 else{if(saved&&!Array.from(n.options).some(o=>o.value===saved))n.append(new Option(saved+' · ancienne valeur',saved));n.value=saved;n.disabled=false;n.title='';}
 });}
function compactRaceLayout(){
 const race=$('#view-race'),sections=Array.from(race.querySelectorAll('.panel'));
 const byTitle=title=>sections.find(p=>p.querySelector('h2').textContent===title);
 const top=el('div','race-top-strip');top.append(byTitle('Paths / WotH'),race.querySelector('.race-top-pair'));race.prepend(top);
 const hints=el('div','race-columns');hints.append(byTitle('Always hints'),byTitle('Sometimes hints'));race.append(hints);
 const encounters=el('div','race-encounters');encounters.append(byTitle('Donjons'),byTitle('Trials'),byTitle('Warps / Owl'));race.append(encounters);
 const checks=el('div','race-columns');for(const title of ['Scrubs','Cows']){const p=byTitle(title);p.classList.add('double-checks');checks.append(p);}race.append(checks);
 const shops=byTitle('Shops · objets & prix');shops.classList.add('race-shops');race.append(shops);

}
function buildNotes(){['race','entrances','freestanding'].forEach(v=>$('#view-'+v).replaceChildren());panels.length=0;
 const paths=dynamic('Paths / WotH','paths',['Zone','Path / WotH','Objet / note'],'#89bce7');paths.parentElement.classList.add('race-full');
 const foolish=dynamic('Foolish','foolish',['Zone','Note'],'#df9592');
 let b=panel('race','Départs & notes','#aac2c8');const departures=b.parentElement;
 ['Spawn Enfant','Spawn Adulte'].forEach((x,i)=>{const r=el('div','field-row'),label=el('label','',x),n=field('spawn:'+i);n.id='spawn-'+i;label.htmlFor=n.id;r.append(label,n);b.append(r);});
 const note=el('textarea','full-note');note.placeholder='Notes de route, checks à revoir…';note.setAttribute('aria-label','Notes libres');note.value=state.notes.free??'';note.addEventListener('input',()=>{state.notes.free=note.value;save();});b.append(note);
 const top=el('div','race-top-pair');$('#view-race').insertBefore(top,foolish.parentElement);top.append(foolish.parentElement,departures);
 b=panel('race','Donjons','#bba0e3',()=>!dungeonActive(),true);b.parentElement.id='dungeons-panel';b.parentElement.classList.add('race-full');
 let tb=table(b,['Dans','Il y a','Soul obtenue','Boss','Fini']);const heads=tb.parentElement.querySelector('thead tr').children;
 heads[1].dataset.hideRule='dungeon';heads[2].dataset.hideRule='souls';heads[3].dataset.hideRule='boss';
 D.dungeons.forEach((x,i)=>{const boss=field('boss:'+i,'select',BOSS_OPTIONS);boss.dataset.bossIndex=i;boss.setAttribute('aria-label','Boss dans '+x);const done=check('dungeon-done:'+i,'notes',x+' fini');
 const r=row(tb,[x,field('dungeon:'+i,'select',D.dungeons),check('soul:'+i,'notes','Soul '+x+' obtenue'),boss,done]);r.classList.toggle('dungeon-finished',done.checked);done.addEventListener('change',()=>r.classList.toggle('dungeon-finished',done.checked));
 r.children[1].dataset.hideRule='dungeon';r.children[2].dataset.hideRule='souls';r.children[3].dataset.hideRule='boss';r.children[4].className='check-cell';});
 b=panel('race','Always hints','#dfb76b');tb=table(b,['Check','Items / notes','Fait']);D.always.forEach((x,i)=>{const items=el('div','item-fields'),two=/^(Masks|Frogs|OOT)/i.test(x);const names=/^Masks/.test(x)?['Skull mask','Mask of Truth']:/^Frogs/.test(x)?['Frogs game','Frogs SoS']:/^OOT/.test(x)?['Ocarina','Chant']:['Item'];const first=field('always:'+i,'text',[],names[0]+'…');first.title=names[0]+' · x pour ignorer ce check';items.append(first);if(two){const second=field('always-second:'+i,'text',[],names[1]+'…');second.title=names[1]+' · x pour ignorer ce check';items.append(second);}const r=row(tb,[x.replace(/^Frogs 2$/,'Frogs'),items,check('always-done:'+i,'notes',x+' fait')]);r.children[2].className='check-cell';});
 dynamic('Sometimes hints','sometimes',['Check / zone','Item 1','Item 2'],'#dfb76b');
 b=panel('race','Shops · objets & prix','#e6b66d',()=>settingOff('right6'),true);b.parentElement.classList.add('race-full');const shops=el('div','shops-grid');
 D.shops.forEach((x,i)=>{const shop=el('div','shop-group');shop.append(el('h3','',x));for(let j=0;j<4;j++){const r=el('div','shop-item'),item=field(j===0?'shop:'+i:'shop:'+i+':item:'+j,'text',[],'Item '+(j+1)+'…'),price=field('shop:'+i+':price:'+j,'number',[],'Prix');item.setAttribute('aria-label',x+' item '+(j+1));price.setAttribute('aria-label',x+' prix '+(j+1));r.append(item,price);shop.append(r);}shops.append(shop);});b.append(shops);
 list('race','Scrubs',D.scrubs,'#9ac98c',()=>settingOff('right7'));
 list('race','Cows',D.cows,'#9ac98c',()=>settingOff('right14'));
 b=panel('race','Warps / Owl','#9ac98c',()=>settingOff('left15')&&settingOff('left21'));b.parentElement.id='warps-owl-panel';const warpGrid=el('div','warp-grid');
 D.warps.forEach((name,i)=>{const owl=i>=6,label=el('label','warp-cell');label.dataset.warpSetting=owl?'left21':'left15';const input=field((owl?'Owl drops:':'Warp songs:')+(owl?i-6:i),'text',[],'Destination…');input.setAttribute('aria-label',name+' destination');label.append(el('span','',name),input);warpGrid.append(label);});b.append(warpGrid);
 b=panel('race','Trials','#c991b9');tb=table(b,['Trial','Présence','Terminé']);const trials=tb;['Forest','Fire','Water','Spirit','Shadow','Light'].forEach((x,i)=>{const presence=field('trial:'+x,'select',['Requis','Non requis']),done=check('trial-done:'+x,'notes',x+' trial terminé'),r=row(trials,[x,presence,done]);r.dataset.trialIndex=i;const sync=()=>{const absent=presence.value==='Non requis';r.classList.toggle('trial-not-required',absent);done.disabled=absent;Array.from(trials.children).sort((a,b)=>Number(a.classList.contains('trial-not-required'))-Number(b.classList.contains('trial-not-required'))||Number(a.dataset.trialIndex)-Number(b.dataset.trialIndex)).forEach(n=>trials.append(n));};presence.addEventListener('input',sync);sync();});
 buildEntrances('Indoors',D.indoors,'right4','#89bce7');
 buildEntrances('Grottos',D.grottos,'right3','#dfb76b');
 compactRaceLayout();buildFreestanding();applyVisibility();
}
function formatProbability(p){if(p===null)return 'conditionnel';return p>0&&p<0.01?'<0,01 %':new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(p)+' %';}
function configureSettingField(n,s){
 if(n.tagName==='SELECT'&&s.probabilities){for(const o of n.options){if(!o.value)continue;if(Object.hasOwn(s.probabilities,o.value)){o.textContent=(s.optionLabels?.[o.value]??o.value)+' · '+formatProbability(s.probabilities[o.value])+(s.baseWeights?' (base)':'');}else if(o.value!==n.value){o.textContent=o.value+' · hors preset';o.disabled=true;}}}
 if(n.type==='number'){n.step='1';if(s.min!==undefined)n.min=s.min;if(s.max!==undefined)n.max=s.max;}
 const probabilities=s.probabilities?Object.entries(s.probabilities).map(([v,p])=>v+' : '+formatProbability(p)).join(' / '):'';
 n.title=[s.help,probabilities].filter(Boolean).join('\n');
}
function updateCountLimits(){for(const s of D.settings){if(!s.countByValue)continue;const fields=document.querySelectorAll('[data-key="'+s.id+':count"]');for(const n of fields){const range=s.countByValue[state.values[s.id]];n.disabled=!range;n.min=range?.min??0;n.removeAttribute('max');if(range?.max!==undefined)n.max=range.max;n.step='1';n.placeholder=range?(range.min===undefined?'≤ '+range.max:range.min+'–'+range.max):'—';n.title=range?'Limite : '+n.placeholder:'Sans quantité pour cette condition';if(range?.weights){const total=Object.values(range.weights).reduce((a,b)=>a+b,0);n.title+='\n'+Object.entries(range.weights).map(([v,w])=>v+' : '+formatProbability(w/total*100)).join(' / ');}}}}
function buildSettings(){const list=$('#settings-list'),pre=$('#pre-race-settings');list.replaceChildren();pre.replaceChildren();document.querySelectorAll('.inline-settings').forEach(n=>n.remove());
 const entrances=el('div','inline-settings'),rupees=el('div','inline-settings');entrances.id='entrance-settings';rupees.id='rupee-settings';$('#view-entrances').prepend(entrances);$('#view-freestanding').prepend(rupees);
 const checks=el('div','inline-settings checks-settings');$('#view-checks').prepend(checks);
 const placements=[{target:checks,prefix:'checks-setting-',settings:['left19','left6','right7','right5','right6','right8','right9','right14','right15','right16','right17','right19','right20','right21','left11','left14'].map(id=>({...D.settings.find(s=>s.id===id),name:id==='right7'?'Scrubs':D.settings.find(s=>s.id===id).name}))},{target:list,prefix:'setting-',settings:D.settings},{target:pre,prefix:'pre-setting-',settings:PRE_RACE.map(id=>D.settings.find(s=>s.id===id))},{target:entrances,prefix:'entrance-setting-',settings:['right4','right3'].map(id=>D.settings.find(s=>s.id===id))},{target:rupees,prefix:'rupee-setting-',settings:[D.settings.find(s=>s.id==='right5')]}];
 placements.forEach(({target,prefix,settings})=>settings.forEach(s=>{ 
 const r=el('div','setting'+(state.verified[s.id]?' verified':''));r.dataset.id=s.id;r.dataset.search=s.name.toLowerCase();
 const c=check(s.id,'verified',s.name+' vérifié'),content=el('div'),label=el('label','setting-name',s.name),n=field(s.id,s.type,s.options??[],s.type==='text'?'Valeur / note…':'…','values');
 n.id=prefix+s.id;n.classList.add('setting-value');n.setAttribute('aria-label',s.name+' valeur');label.htmlFor=n.id;label.title=s.help??'';
 if(s.type==='bool'&&s.probabilities?.['Activé']!==undefined){label.append(el('span','setting-probability',formatProbability(s.probabilities['Activé'])));}
 if(s.type==='number'&&s.min!==undefined){label.append(el('span','setting-probability',s.min+'–'+s.max));}
 configureSettingField(n,s);content.append(label,n);
 if(s.extras.length){const ex=el('div','extra-fields');s.extras.forEach(e=>{const lab=el('label','',e.label),f=field(s.id+':'+e.key,e.type,e.options??[],'…','values');configureSettingField(f,e);lab.title=e.help??'';lab.append(f);ex.append(lab);});content.append(ex);}
 r.append(c,content);target.append(r);
 }));updateCountLimits();updateProgress();filterSettings();}

function syncSettings(){document.querySelectorAll('.setting').forEach(r=>{const id=r.dataset.id,verified=state.verified[id]===true;r.classList.toggle('verified',verified);r.querySelector('input[type=checkbox]').checked=verified;r.querySelectorAll('[data-key]').forEach(n=>n.value=state.values[n.dataset.key]??'');});}
function updateProgress(){const n=D.settings.filter(x=>state.verified[x.id]).length;$('#progress').value=n;$('#progress-count').textContent=n+' / '+D.settings.length;$('#settings-count').textContent=n+'/'+D.settings.length;}
function filterSettings(){const query=$('#settings-search').value.toLowerCase().trim(),pending=$('#pending-only').checked;document.querySelectorAll('#settings-list .setting').forEach(r=>{r.hidden=(!r.dataset.search.includes(query))||(pending&&state.verified[r.dataset.id]);});}
function applyVisibility(){let count=0;for(const x of panels){const hide=x.rule(),race=x.p.closest('#view-race');if(hide)count++;x.p.hidden=hide;x.notice.hidden=true;}
 const columnRules={dungeon:()=>!raceActive('right2'),souls:()=>!raceActive('right22'),boss:()=>!raceActive('right12')};
 document.querySelectorAll('[data-hide-rule]').forEach(cell=>{cell.hidden=columnRules[cell.dataset.hideRule]();});
 document.querySelectorAll('[data-warp-setting]').forEach(n=>n.hidden=settingOff(n.dataset.warpSetting));
 updateDungeonBosses();updateEntrances();updatePaths();$('#hidden-count').textContent=count?count+' blocs masqués · notes conservées':'Tous les blocs sont accessibles';}

function noteLabel(key){if(key.startsWith('freestanding:'))return 'Rupees & Hearts / '+key.slice(13);const input=document.querySelector('[data-key=\"'+CSS.escape(key)+'\"]');if(!input)return key;const section=input.closest('section');const row=input.closest('tr');const title=section?.querySelector('h2')?.textContent||'';const label=row?.querySelector('.label-cell')?.textContent||input.getAttribute('aria-label')||key;return title+' / '+label;}
function setView(view){if(view==='freestanding')document.querySelectorAll('[data-freestanding-group]').forEach(n=>n.syncFreestanding?.());document.querySelectorAll('nav button').forEach(b=>{const selected=b.dataset.view===view;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});document.querySelectorAll('.view').forEach(v=>v.hidden=v.id!=='view-'+view);document.body.classList.toggle('settings-view',view==='settings');document.body.classList.toggle('pre-race-view',view==='pre-race');$('.show-all').hidden=true;document.body.classList.toggle('checks-view',view==='checks'||view==='skulls');window.dispatchEvent(new CustomEvent('rsl-view',{detail:view}));}
$('#race-name').value=state.name;$('#race-name').addEventListener('input',e=>{state.name=e.target.value;save();});$('#show-all').checked=state.showAll;$('#show-all').addEventListener('change',e=>{state.showAll=e.target.checked;save();applyVisibility();});$('#settings-search').addEventListener('input',filterSettings);$('#pending-only').addEventListener('change',filterSettings);document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$('#reset').addEventListener('click',()=>$('#reset-dialog').showModal());$('#cancel-reset').addEventListener('click',()=>$('#reset-dialog').close());$('#confirm-reset').addEventListener('click',()=>{state=blank();save();$('#race-name').value='';$('#show-all').checked=false;$('#settings-search').value='';$('#pending-only').checked=false;buildNotes();buildSettings();setView('race');$('#reset-dialog').close();});
$('#export').addEventListener('click',()=>{const lines=[['Race',state.name],['Setting','Vérifié','Valeur','Détails']];D.settings.forEach(s=>lines.push([s.name,state.verified[s.id]?'Oui':'Non',state.values[s.id]??'',s.extras.map(e=>e.label+': '+(state.values[s.id+':'+e.key]??'')).join(' / ')]));lines.push([],['Notes','Valeur']);Object.entries(state.notes).forEach(([k,v])=>lines.push([noteLabel(k),String(v)]));if(state.checks){lines.push([],['Inventaire','Quantité']);Object.entries(state.checks.inventory??{}).forEach(([k,v])=>lines.push([k,v]));lines.push([],['Check','Fait']);Object.entries(state.checks.done??{}).forEach(([k,v])=>lines.push([k,v?'Oui':'Non']));lines.push(['Âge de départ',state.checks.startAge??'child']);}const quote=x=>'"'+String(x??'').replaceAll('"','""')+'"';const blob=new Blob(['\ufeff'+lines.map(r=>r.map(quote).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=(state.name||'OOT-RSL').replace(/[^a-zA-Z0-9_-]/g,'-')+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
buildNotes();buildSettings();setView('race');if(!storageOK)$('#save-state').textContent='Sauvegarde indisponible : exporte tes notes';
