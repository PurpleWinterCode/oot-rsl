import {getConfig,putConfig,getAllSounds,getSound,putSound,deleteSound,replaceAll} from './db.js';
import {uid,categories,createConfig,repairConfig,soundMeta} from './state.js';
import {AudioMixer} from './audio.js';
import {integratedCatalog} from './catalog.js';

const root=document.getElementById('app');
const h=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const pct=(n,d=100)=>Math.max(0,Math.min(d,Number(n)||0));
const byName=(a,b)=>a.title.localeCompare(b.title,'fr');
const icons={session:'▦',library:'▤',permanent:'♧',zones:'◈',mixer:'☷',settings:'⚙'};
const nav=[['session','Session'],['library','Bibliothèque'],['permanent','Permanents'],['zones','Zones'],['mixer','Mixage']];
let cfg=createConfig();
let sounds=new Map();
const ui={page:'session',modal:null,search:'',category:'Toutes',filters:new Set(),campaignId:null,tab:'',toast:null,importing:0};
const mixer=new AudioMixer(()=>refreshIndicators());
const runtime={activeZones:new Set(),timers:new Map(),lastEvents:new Map(),playingSceneId:null};
let pendingSave=null,toastTimer=null;
function save(){cfg.lastUpdated=Date.now();clearTimeout(pendingSave);pendingSave=setTimeout(()=>putConfig(cfg).catch(error=>notify('Erreur d’enregistrement : '+error.message,true)),180)}
async function saveNow(){clearTimeout(pendingSave);cfg.lastUpdated=Date.now();await putConfig(cfg);}
function snd(id){return sounds.get(id)}
function sess(id){return cfg.sessions.find(x=>x.id===id)}
function camp(id){return cfg.campaigns.find(x=>x.id===id)}
function scn(id){return cfg.scenes.find(x=>x.id===id)}
function zne(id){return cfg.zones.find(x=>x.id===id)}
function activeSession(){return sess(cfg.activeSessionId)}
function activeScene(){return scn(cfg.activeSceneId)}
function entriesFor(scene){return (scene?.tracks||[]).filter(e=>snd(e.soundId))}
function listSounds(){return [...sounds.values()].sort(byName)}
function tagsList(){const set=new Set();for(const s of sounds.values())for(const t of s.tags||[])set.add(t);return [...set].sort((a,b)=>a.localeCompare(b,'fr'))}
function safeName(id){return h(snd(id)?.title||'Son supprimé')}
function notify(message,error=false){ui.toast={message,error};clearTimeout(toastTimer);renderToast();toastTimer=setTimeout(()=>{ui.toast=null;renderToast()},4300)}
function renderToast(){document.querySelector('#toast-holder')?.replaceChildren();const holder=document.querySelector('#toast-holder');if(holder&&ui.toast){const el=document.createElement('div');el.className='toast'+(ui.toast.error?' error':'');el.textContent=ui.toast.message;holder.append(el)}}
function clipSlider(value,type,id='',extra=''){return `<div class="mutebar"><input aria-label="Volume" type="range" min="0" max="100" value="${pct(value)}" data-slider="${h(type)}" data-id="${h(id)}" data-extra="${h(extra)}"/><output>${pct(value)}%</output></div>`}
function btn(label,action,params='',type='sm',klass=''){return `<button type="button" class="btn ${type} ${klass}" data-action="${action}" ${params}>${label}</button>`}
function chip(label,klass=''){return `<span class="pill ${klass}">${h(label)}</span>`}
function groupSection(title,content,action=''){return `<div class="section-head"><h2>${h(title)}</h2>${action}</div>${content}`}
function empty(title,subtitle,action=''){return `<div class="empty"><span class="symbol">♫</span><strong>${h(title)}</strong><p>${h(subtitle)}</p>${action}</div>`}
function pageHead(kicker,title,desc,right=''){return `<div class="topbar"><div><div class="eyebrow">${h(kicker)}</div><h1 class="h-title">${h(title)}</h1><p class="sub">${h(desc)}</p></div><div class="top-actions">${right}</div></div>`}
function render(){
 const keep=document.scrollingElement?.scrollTop??0;
 const title=activeSession();
 root.innerHTML=`<div class="shell">
 <aside class="sidebar"><div class="brand"><div class="logo">◉</div><div><strong>SONORA</strong><small>JDR SOUNDBOARD</small></div></div><nav class="side-nav">${nav.map(([id,name])=>`<button class="nav-btn ${ui.page===id?'active':''}" data-action="nav" data-id="${id}"><span class="nav-icon">${icons[id]}</span>${name}</button>`).join('')}<button class="nav-btn ${ui.page==='settings'?'active':''}" data-action="nav" data-id="settings"><span class="nav-icon">${icons.settings}</span>Réglages</button></nav><div class="side-foot">${title?`<strong>${h(title.name)}</strong><br/>Session en cours`:'<strong>Prêt pour votre aventure</strong><br/>Importez quelques bruitages pour commencer.'}<div class="divider"></div>Les données et sons restent sur cet appareil, y compris hors connexion après installation.</div></aside>
 <main class="main">${ui.page==='session'?renderSession():ui.page==='library'?renderLibrary():ui.page==='permanent'?renderPermanent():ui.page==='zones'?renderZones():ui.page==='mixer'?renderMixer():renderSettings()}<div class="footer-status">Sonora JDR · Données locales · ${sounds.size} fichier${sounds.size>1?'s':''} audio · <span id="sound-indicator">${mixer.voices.size} lecture(s)</span></div></main>
 <nav class="mobile-nav">${[...nav,['settings','Réglages']].map(([id,name])=>`<button class="nav-btn ${ui.page===id?'active':''}" data-action="nav" data-id="${id}"><span class="nav-icon">${icons[id]}</span>${id==='library'?'Biblio':name}</button>`).join('')}</nav>
 </div>${ui.modal?renderModal():''}<div id="toast-holder"></div><input type="file" id="file-input" accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac,.aac" multiple hidden/><input type="file" id="restore-input" accept=".json,application/json" hidden/>`;
 renderToast();
 if(ui.modal) document.querySelector('.modal input:not([type=hidden]),.modal select')?.focus({preventScroll:true});
 document.scrollingElement.scrollTop=keep;
}
function refreshIndicators(){const el=document.getElementById('sound-indicator');if(el)el.textContent=`${mixer.voices.size} lecture(s)`;document.querySelectorAll('[data-playing-for]').forEach(el=>{const {group,sound}=el.dataset;const playing=mixer.isPlaying(group,sound);el.classList.toggle('active',playing);el.textContent=playing?'■ Stop':'▶ Boucle';});}
function tile(sound,{scope='library',compact=false,canAdd=false}={}){
 const pin=cfg.permanentIds.includes(sound.id);
 const group='manual:'+sound.id;
 return `<article class="sound-tile"><div class="tile-top"><div class="sound-icon">♫</div><div class="grow"><div class="soundname">${h(sound.title)}</div><div class="soundsub truncate">${h(sound.category)} · ${formatSize(sound.size)}</div></div>${pin?'<span title="Permanent" class="pill green">★</span>':''}</div>
 ${compact?'':`<div class="tagrow" style="margin-top:11px">${(sound.tags||[]).slice(0,5).map(t=>`<span class="tag">${h(t)}</span>`).join('')}</div>`}
 <div class="tile-actions">
 ${btn('▶ Écouter','play',`data-id="${sound.id}"`)}
 ${btn(mixer.isPlaying(group,sound.id)?'■ Stop':'↻ Boucle','toggle-loop',`data-id="${sound.id}" data-playing-for="true" data-group="${group}" data-sound="${sound.id}"`,'sm',mixer.isPlaying(group,sound.id)?'active':'')}
 ${btn(pin?'★ Retirer':'☆ Permanent','pin',`data-id="${sound.id}"`)}
 ${canAdd?btn('＋ Scène','quick-add-scene',`data-id="${sound.id}"`):''}
 ${scope==='library'?btn('✎ Modifier','edit-sound',`data-id="${sound.id}"`):''}
 </div></article>`;
}
function formatSize(n){if(!Number.isFinite(n))return 'Audio';return n<1024*1024?`${Math.round(n/1024)} Ko`:`${(n/1024/1024).toFixed(1)} Mo`}
function renderLibrary(){
 const all=listSounds();
 const filtered=all.filter(s=>(ui.category==='Toutes'||s.category===ui.category)&&(ui.filters.size===0||[...ui.filters].every(t=>(s.tags||[]).includes(t)))&&(!ui.search||`${s.title} ${s.filename} ${s.category} ${(s.tags||[]).join(' ')}`.toLocaleLowerCase().includes(ui.search.toLocaleLowerCase())));
 const tagHtml=tagsList().map(t=>`<button type="button" class="tag tag-button ${ui.filters.has(t)?'selected':''}" data-action="tag" data-value="${h(t)}">${h(t)}</button>`).join('');
 const importing=ui.importing>0?`<div class="hint">Import en cours : ${ui.importing} fichier(s) restant(s)…</div>`:'';
 return `${pageHead('Votre collection','Bibliothèque sonore','Importez, classez et retrouvez vos bruitages par combinaisons de tags.',btn('＋ Importer des sons','import','','sm primary')+btn('⚙','nav','data-id="settings"','icon-only'))}
 ${importing}<div class="card"><div class="filterbox"><input class="search" id="search-sounds" aria-label="Recherche" placeholder="Rechercher un son, une matière, une action…" value="${h(ui.search)}"/><select id="category-filter" aria-label="Catégorie"><option value="Toutes">Toutes les catégories</option>${categories.map(c=>`<option value="${h(c)}" ${ui.category===c?'selected':''}>${h(c)}</option>`).join('')}</select></div>
 <div class="tagrow" style="margin-top:12px">${tagHtml||'<small>Les tags de vos sons apparaîtront ici.</small>'}</div>${ui.filters.size?`<div style="margin-top:12px">${btn('Effacer les tags ✕','clear-tags')}</div>`:''}</div>
 ${groupSection(`Résultats (${filtered.length})`,filtered.length?`<div class="sound-list">${filtered.map(s=>tile(s,{canAdd:true})).join('')}</div>`:empty('Aucun bruitage',sounds.size?'Modifiez vos filtres ou importez de nouveaux fichiers.':'Importez vos premiers sons ou installez les exemples de démonstration.',btn('Importer','import','','sm primary')+btn('Sons de démonstration','install-demo')))}
 ${sounds.size?'<p class="footnote">Astuce : les tags sont cumulés. « Porte » + « Bois » n’affiche que les sons qui possèdent ces deux tags.</p>':''}`;
}
function renderPermanent(){const list=cfg.permanentIds.map(snd).filter(Boolean).sort(byName);return `${pageHead('À portée de main','Sons permanents','Vos bruitages génériques sont disponibles pendant toutes les campagnes.',btn('＋ Ajouter depuis la bibliothèque','nav','data-id="library"','sm primary'))}
 ${list.length?`<div class="sound-list">${list.map(s=>tile(s,{compact:true,canAdd:true})).join('')}</div>`:empty('Aucun son permanent','Depuis la bibliothèque, cliquez sur « Permanent » pour placer ici vos sons les plus utiles.',btn('Ouvrir la bibliothèque','nav','data-id="library"','sm primary'))}`}
function renderSession(){
 const selectedCamp=camp(ui.campaignId)||camp(activeSession()?.campaignId)||cfg.campaigns[0];
 const sessions=cfg.sessions.filter(x=>x.campaignId===selectedCamp?.id).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
 const selected=activeSession()?.campaignId===selectedCamp?.id?activeSession():sessions[0];
 const scenes=cfg.scenes.filter(s=>s.sessionId===selected?.id).sort((a,b)=>(a.order||0)-(b.order||0));
 const scene=cfg.activeSceneId&&scn(cfg.activeSceneId)?.sessionId===selected?.id?activeScene():scenes[0];
 const sceneActive=scene&&runtime.playingSceneId===scene.id;
 const activeCount=[...runtime.activeZones].length;
 return `${pageHead('Table du maître du jeu','Préparer et jouer','Vos campagnes, sessions, scènes et bruitages prêts à lancer.',btn('■ Couper tous les sons','stop-all','','sm warn')+btn('＋ Campagne','new-campaign','','sm primary'))}
 <div class="stats"><div class="stat-card"><div class="stat">${cfg.campaigns.length}</div><small>Campagnes</small></div><div class="stat-card"><div class="stat">${cfg.sessions.length}</div><small>Sessions</small></div><div class="stat-card"><div class="stat">${activeCount}</div><small>Zones actives</small></div></div>
 ${!cfg.campaigns.length?`<div style="margin-top:20px">${empty('Créez votre première campagne','Vous pourrez ensuite préparer vos sessions et les sons nécessaires à chaque scène.',btn('Créer une campagne','new-campaign','','sm primary'))}</div>`:
 `<div class="section-head"><h2>Campagne</h2>${btn('＋ Nouvelle','new-campaign')}</div>
 <div class="tabsline">${cfg.campaigns.map(c=>`<button type="button" class="btn sm ${selectedCamp?.id===c.id?'active':''}" data-action="select-campaign" data-id="${c.id}">${h(c.name)}</button>`).join('')}${selectedCamp?btn('✎','edit-campaign',`data-id="${selectedCamp.id}"`):''}</div>
 <div class="grid-one-two" style="margin-top:16px">
 <div class="stack"><div class="card"><div class="card-title"><h3>Sessions</h3>${btn('＋ Créer','new-session',`data-id="${selectedCamp.id}"`,'sm primary')}</div><div class="stack">${sessions.length?sessions.map(s=>`<button class="listchoice ${selected?.id===s.id?'active':''}" data-action="select-session" data-id="${s.id}"><span>▦</span><span class="grow"><strong style="font-size:.86rem">${h(s.name)}</strong><small style="display:block;margin-top:5px">${cfg.scenes.filter(t=>t.sessionId===s.id).length} scènes</small></span>${selected?.id===s.id?'✓':''}</button>`).join(''):'<small>Aucune session dans cette campagne.</small>'}</div>${selected?`<div class="divider"></div><div class="btn-row">${btn('Dupliquer','duplicate-session',`data-id="${selected.id}"`)}${btn('✎','edit-session',`data-id="${selected.id}"`)}${btn('Supprimer','delete-session',`data-id="${selected.id}"`,'sm warn')}</div>`:''}</div>
 <div class="card highlight"><h3>Accès direct</h3><p class="card-desc">Gardez vos sons fréquents disponibles, même pendant les transitions entre scènes.</p><div class="btn-row">${btn(`★ Permanents (${cfg.permanentIds.length})`,'nav','data-id="permanent"')}${btn('◈ Zones sonores','nav','data-id="zones"')}</div></div></div>
 <div class="stack">${selected?`<div class="card"><div class="card-title"><div><h3>${h(selected.name)}</h3><small>${h(selected.description||'Préparez les étapes de votre séance.')}</small></div>${btn('＋ Scène','new-scene',`data-id="${selected.id}"`,'sm primary')}</div>
 ${scenes.length?`<div class="tabsline">${scenes.map(t=>`<button class="btn sm ${scene?.id===t.id?'active':''}" data-action="select-scene" data-id="${t.id}">${h(t.name)}</button>`).join('')}</div>`:empty('Aucune scène préparée','Ajoutez une scène, puis ses sons de fond et ses effets.',btn('Créer une scène','new-scene',`data-id="${selected.id}"`,'sm primary'))}</div>
 ${scene?renderScene(scene,sceneActive):''}`:empty('Pas encore de session','Créez une session pour planifier ses différentes scènes.',btn('Créer une session','new-session',`data-id="${selectedCamp.id}"`,'sm primary'))}</div></div>`}`;
}
function renderScene(scene,isActive){
 const entries=entriesFor(scene), loops=entries.filter(e=>e.role==='loop'), fx=entries.filter(e=>e.role!=='loop');
 return `<div class="card ${isActive?'highlight':''}"><div class="card-title"><div><h3>${h(scene.name)}</h3><small>${h(scene.description||'Sons préparés pour cette scène.')}</small></div>${chip(isActive?'En diffusion':'Prête',isActive?'green':'')}</div>
 <div class="btn-row">${btn(isActive?'■ Arrêter la scène':'▶ Activer la scène','activate-scene',`data-id="${scene.id}"`,'sm',isActive?'warn':'primary')}${btn('＋ Sons','pick-scene-sounds',`data-id="${scene.id}"`)}${btn('✎ Scène','edit-scene',`data-id="${scene.id}"`)}${btn('Supprimer','delete-scene',`data-id="${scene.id}"`,'sm warn')}</div>
 ${entries.length?`<div class="divider"></div><div class="zone-entries-title">Boucles d’ambiance (${loops.length})</div>${loops.length?loops.map(e=>renderSceneTrack(scene,e,isActive)).join(''):'<p class="footnote">Aucune boucle : définissez un son comme « Ambiance ».</p>'}
 <div class="zone-entries-title">Bruitages ponctuels (${fx.length})</div>${fx.length?fx.map(e=>renderSceneTrack(scene,e,isActive)).join(''):'<p class="footnote">Aucun effet ponctuel dans cette scène.</p>'}`:'<div class="hint">Ajoutez des sons depuis la bibliothèque. Pour chaque son, choisissez s’il doit tourner en boucle ou être déclenché manuellement.</div>'}</div>`;
}
function renderSceneTrack(scene,e,isActive){
 const group='scene:'+scene.id;
 return `<div class="zone-entry"><div class="zone-entry-title"><div class="grow">${safeName(e.soundId)}</div>${chip(e.role==='loop'?'Ambiance':'Effet',e.role==='loop'?'green':'gold')}
 ${e.role==='loop'?btn('⇄ Effet','track-role',`data-id="${scene.id}" data-extra="${e.soundId}" data-value="fx"`):btn('⇄ Boucle','track-role',`data-id="${scene.id}" data-extra="${e.soundId}" data-value="loop"`)}
 ${btn('✕','remove-track',`data-id="${scene.id}" data-extra="${e.soundId}"`,'sm ghost')}</div>
 ${clipSlider(e.volume??100,'track-volume',scene.id,e.soundId)}
 ${e.role==='fx'?btn('▶ Jouer','scene-play',`data-id="${scene.id}" data-extra="${e.soundId}"`):''}</div>`;
}
function renderZones(){
 return `${pageHead('Ambiances vivantes','Zones sonores','Superposez des ambiances continues et des événements déclenchés aléatoirement.',btn('＋ Nouvelle zone','new-zone','','sm primary'))}
 <div class="hint"><strong>Exemple :</strong> activez « Forêt nocturne » et « Pluie » simultanément. Les boucles tournent et chaque zone peut lancer ses événements aléatoires selon sa fréquence et ses probabilités.</div>
 ${cfg.zones.length?`<div class="cards">${cfg.zones.map(renderZone).join('')}</div>`:empty('Aucune zone sonore','Créez une zone, ajoutez des ambiances en boucle et des événements aléatoires avec leur probabilité.',btn('Créer une zone','new-zone','','sm primary'))}`;
}
function renderZone(zone){
 const active=runtime.activeZones.has(zone.id);
 const entries=(zone.entries||[]).filter(e=>snd(e.soundId));
 const amb=entries.filter(e=>e.role==='loop');const events=entries.filter(e=>e.role!=='loop');
 const weight=events.reduce((a,e)=>a+(Number(e.weight)||1),0);
 return `<div class="card zone-card ${active?'active-zone':''}">
 <div class="card-title"><div class="zone-head"><div class="zone-badge">◈</div><div><h3>${h(zone.name)}</h3><small>${amb.length} boucle(s) · ${events.length} événement(s)</small></div></div>${chip(active?'Active':'Inactive',active?'green':'')}</div>
 <div class="btn-row zone-controls">${btn(active?'■ Désactiver':'▶ Activer','toggle-zone',`data-id="${zone.id}"`,'sm',active?'warn':'primary')}${btn('⚄ Tirage','random-zone',`data-id="${zone.id}"`)}${btn('＋ Sons','pick-zone-sounds',`data-id="${zone.id}"`)}${btn('✎','edit-zone',`data-id="${zone.id}"`)}${btn('✕','delete-zone',`data-id="${zone.id}"`,'sm ghost')}</div>
 <div style="margin-top:14px"><div class="card-title"><small>Volume de la zone</small><small>${zone.auto?'Aléatoire auto':'Tirage manuel'} · ${zone.minSeconds||30}–${zone.maxSeconds||90} s</small></div>${clipSlider(zone.volume??80,'zone-volume',zone.id)}</div>
 ${entries.length?`<div class="divider"></div>${entries.map(e=>`<div class="zone-entry"><div class="zone-entry-title"><span class="grow">${safeName(e.soundId)}</span>${chip(e.role==='loop'?'Boucle':`Poids ${e.weight||1}`,e.role==='loop'?'green':'gold')}${btn('⇄','zone-role',`data-id="${zone.id}" data-extra="${e.soundId}"`,'sm ghost')}${btn('✕','remove-zone-sound',`data-id="${zone.id}" data-extra="${e.soundId}"`,'sm ghost')}</div>${clipSlider(e.volume??100,'entry-volume',zone.id,e.soundId)}${e.role!=='loop'?`<div class="inline-fields" style="margin-top:7px"><label style="align-self:center">Poids de tirage (sur ${weight})</label><input aria-label="Poids ${safeName(e.soundId)}" type="number" min="1" max="100" value="${pct(e.weight||1,100)||1}" data-entry-weight="${zone.id}" data-sound-id="${e.soundId}"/></div>`:''}</div>`).join('')}`:'<p class="card-desc">Ajoutez vos premiers sons à cette zone. Les sons « Boucle » jouent en continu ; les « Événements » sont tirés au hasard.</p>'}
 </div>`;
}
function renderMixer(){
 const playing=[...mixer.voices.values()];
 return `${pageHead('Contrôle en direct','Table de mixage','Réglez chaque source, une zone entière ou toutes les pistes en même temps.',btn('■ Arrêt général','stop-all','','sm warn'))}
 <div class="cards"><div class="card highlight"><div class="card-title"><h3>Volume général</h3>${chip(`${cfg.master}%`,'green')}</div>${clipSlider(cfg.master,'master')}<p class="footnote">Ce curseur affecte absolument toutes les lectures.</p></div>
 <div class="card"><div class="card-title"><h3>Canaux audio</h3></div><div class="mixer-row"><label>Ambiances</label><input aria-label="Volume ambiances" data-slider="ambience" type="range" min="0" max="100" value="${pct(cfg.ambience)}"/><output>${pct(cfg.ambience)}%</output></div><div class="mixer-row"><label>Effets</label><input aria-label="Volume effets" data-slider="effects" type="range" min="0" max="100" value="${pct(cfg.effects)}"/><output>${pct(cfg.effects)}%</output></div><small>Les événements importants peuvent atténuer temporairement les ambiances.</small></div></div>
 ${groupSection(`Zones en cours (${runtime.activeZones.size})`,runtime.activeZones.size?`<div class="cards">${[...runtime.activeZones].map(id=>zne(id)).filter(Boolean).map(z=>`<div class="card"><div class="card-title"><h3>${h(z.name)}</h3>${btn('■','toggle-zone',`data-id="${z.id}"`,'sm warn')}</div>${clipSlider(z.volume??80,'zone-volume',z.id)}</div>`).join('')}</div>`:empty('Aucune zone en cours','Activez une zone pour retrouver son volume ici.',btn('Ouvrir les zones','nav','data-id="zones"')))}
 ${groupSection(`Lectures actives (${playing.length})`,playing.length?`<div class="card stack">${playing.map(v=>`<div class="item-row"><div class="sound-icon">♫</div><div class="grow"><div class="soundname">${safeName(v.soundId)}</div><small>${v.loop?'En boucle':'Ponctuel'} · ${h(v.groupKey.replace(':',' · '))}</small></div>${btn('■ Stop','stop-voice',`data-id="${v.id}"`,'sm warn')}</div>`).join('')}</div>`:empty('Aucune lecture active','Lancez des sons depuis votre bibliothèque, une scène ou une zone.'))}`;
}
function renderSettings(){return `${pageHead('Préférences','Réglages et sauvegardes','Gérez votre collection locale et conservez-en une copie à l’extérieur.',btn('＋ Importer','import','','sm primary'))}
 <div class="cards"><div class="card"><h3>Fichiers audio</h3><p class="card-desc">Importez vos propres MP3, WAV, OGG, M4A ou autres formats compatibles avec le navigateur. Les fichiers restent dans le stockage local du navigateur.</p><div class="btn-row">${btn('Importer mes sons','import','','sm primary')}${btn('Installer le pack CC0 ('+integratedCatalog.length+' sons)','install-library','','sm primary')}${btn('Installer 6 exemples synthétiques','install-demo')}</div><div class="divider"></div><p class="card-desc"><strong>${sounds.size}</strong> sons présents · ${formatSize([...sounds.values()].reduce((n,s)=>n+(s.size||0),0))} environ</p></div>
 <div class="card"><h3>Sauvegarde complète</h3><p class="card-desc">Exporte les campagnes, sessions, tags, zones <strong>et les fichiers audio</strong> dans un JSON autonome. Le fichier peut être volumineux.</p><div class="btn-row">${btn('↓ Exporter une sauvegarde','backup-export','','sm primary')}${btn('↑ Restaurer','backup-import')}</div><p class="footnote">La restauration remplace toutes les données locales actuelles. Conservez des copies régulières : un navigateur peut effacer son stockage.</p></div>
 <div class="card"><h3>Installation mobile</h3><p class="card-desc">Une fois le projet hébergé en HTTPS (par exemple sur GitHub Pages), ouvrez-le sur Android puis choisissez « Installer l’application » dans Chrome. Les sons déjà importés seront accessibles hors ligne.</p>${btn('Demander stockage persistant','persist-storage')}<p class="footnote">L’installation sur iPhone passe par Safari → Partager → Sur l’écran d’accueil. Les navigateurs imposent des limites de stockage variables.</p></div>
 <div class="card"><h3>Fonctionnement</h3><p class="card-desc">Les tags sont cumulables, les sons ne sont stockés qu'une fois. Une scène rassemble des boucles et effets ; une zone contient des boucles et des événements à poids variables. Les sessions ne lancent pas automatiquement des sons au chargement.</p>${btn('Afficher le guide rapide','help')}</div></div>`}
function renderModal(){
 const m=ui.modal, close=btn('✕','close-modal','','sm ghost'), yes=(label='Enregistrer')=>`<button type="submit" class="btn primary">${h(label)}</button>`;
 let title='',desc='',body='';
 const form=(name,content,submit='Enregistrer')=>`<form data-form="${name}" class="form-grid">${content}<div class="modal-foot">${btn('Annuler','close-modal')}${yes(submit)}</div></form>`;
 const input=(label,name,value='',required=true,place='')=>`<div class="field"><label for="form-${name}">${h(label)}</label><input id="form-${name}" name="${name}" value="${h(value)}" ${required?'required':''} placeholder="${h(place)}"/></div>`;
 const details=(label,name,value)=>`<div class="field"><label for="form-${name}">${h(label)}</label><textarea id="form-${name}" name="${name}" rows="2">${h(value)}</textarea></div>`;
 if(m.type==='campaign'){
   const entity=camp(m.id);title=entity?'Modifier la campagne':'Nouvelle campagne';desc='Regroupez plusieurs sessions sous un même univers.';
   body=form('campaign',input('Nom de la campagne','name',entity?.name||'',true,'Ex. Dragonlance')+(entity?`<div class="delete-line">${btn('Supprimer cette campagne','delete-campaign',`data-id="${entity.id}"`,'sm warn')}</div>`:''),entity?'Mettre à jour':'Créer la campagne');
 } else if(m.type==='session'){
   const entity=sess(m.id);title=entity?'Modifier la session':'Nouvelle session';desc='Une séance peut contenir plusieurs scènes.';
   body=form('session',input('Nom de la session','name',entity?.name||'',true,'Ex. Session 03 — La forêt')+details('Description (facultatif)','description',entity?.description||''),entity?'Enregistrer':'Créer la session');
 } else if(m.type==='scene'){
   const entity=scn(m.id);title=entity?'Modifier la scène':'Nouvelle scène';desc='Une scène contient des effets ponctuels et des ambiances en boucle.';
   body=form('scene',input('Nom de la scène','name',entity?.name||'',true,'Ex. Le marché de Vogler')+details('Description (facultatif)','description',entity?.description||''),entity?'Enregistrer':'Créer la scène');
 } else if(m.type==='sound'){
   const s=snd(m.id);title='Modifier un bruitage';desc=s.filename;
   body=form('sound',input('Titre','title',s.title)+`<div class="field"><label>Catégorie principale</label><select name="category">${categories.map(c=>`<option ${c===s.category?'selected':''}>${h(c)}</option>`).join('')}</select></div>`+input('Tags (séparés par une virgule)','tags',(s.tags||[]).join(', '),false,'Porte, Bois, Phalanges')+`<div class="inline-fields"><div class="field"><label>Volume du son (0–100)</label><input name="volume" type="number" min="0" max="100" value="${pct(s.volume??80)}"/></div><div class="field check"><input type="checkbox" name="important" id="flagImportant" ${s.important?'checked':''}/><label for="flagImportant">Effet important (baisse temporairement les ambiances)</label></div></div><div class="delete-line">${btn('Supprimer le fichier','delete-sound',`data-id="${s.id}"`,'sm warn')}</div>`);
 } else if(m.type==='zone'){
   const entity=zne(m.id);title=entity?'Modifier la zone':'Nouvelle zone';desc='Par exemple : forêt, grotte, taverne, météo, présence ennemie…';
   body=form('zone',input('Nom','name',entity?.name||'',true,'Ex. Forêt nocturne')+`<div class="field check"><input type="checkbox" name="auto" id="auto" ${entity?.auto?'checked':''}/><label for="auto">Déclencher automatiquement des événements aléatoires</label></div>`+`<div class="inline-fields"><div class="field"><label>Intervalle minimum (secondes)</label><input type="number" name="minSeconds" min="3" max="3600" value="${entity?.minSeconds??45}"/></div><div class="field"><label>Intervalle maximum (secondes)</label><input type="number" name="maxSeconds" min="3" max="3600" value="${entity?.maxSeconds??120}"/></div></div><p class="footnote">Chaque événement est tiré au hasard avec un poids configurable. Les ambiances tournent en boucle.</p>`,entity?'Enregistrer':'Créer la zone');
 } else if(m.type==='scene-sounds'||m.type==='zone-sounds'){
   const scene=m.type==='scene-sounds'?scn(m.id):zne(m.id);
   const existing=new Set((m.type==='scene-sounds'?scene.tracks:scene.entries||[]).map(e=>e.soundId));
   title='Choisir les sons';desc=`${scene.name} — chaque son est référencé sans duplication du fichier.`;
   body=`<form data-form="pick-sounds" class="form-grid"><div class="multi-pick">${sounds.size?listSounds().map(s=>`<label class="pick-row"><input type="checkbox" name="ids" value="${s.id}" ${existing.has(s.id)?'checked':''}/><span class="grow"><strong>${h(s.title)}</strong><small style="display:block">${h(s.category)} · ${h((s.tags||[]).join(', '))}</small></span></label>`).join(''):'<div class="hint">Importez d’abord des fichiers dans la bibliothèque.</div>'}</div><div class="modal-foot">${btn('Annuler','close-modal')}${yes('Appliquer la sélection')}</div></form>`;
 } else if(m.type==='help'){
   title='Guide rapide';desc='Les cinq étapes pour animer une session.';
   body=`<div class="help-section"><h3>1. Importez vos fichiers</h3><p class="card-desc">Bibliothèque → Importer. Les tags déduits du nom sont proposés, puis vous pouvez les corriger.</p><h3>2. Choisissez vos permanents</h3><p class="card-desc">Les portes, coups et pas utiles à tout moment restent dans un onglet accessible instantanément.</p><h3>3. Créez campagne, session, scène</h3><p class="card-desc">Ajoutez des sons à chaque scène et désignez les « Ambiances » (boucles) et les « Effets » (joués sur demande).</p><h3>4. Configurez les zones</h3><p class="card-desc">Ajoutez des événements avec leurs poids relatifs, et des boucles d'ambiance. Plusieurs zones peuvent jouer ensemble.</p><h3>5. Mixez et sauvegardez</h3><p class="card-desc">Réglez les volumes dans « Mixage ». Faites régulièrement une sauvegarde intégrale depuis « Réglages ».</p><div class="modal-foot">${btn('Fermer','close-modal','','sm primary')}</div></div>`;
 }
 return `<div class="modal-bg" data-backdrop="true"><section class="modal" role="dialog" aria-modal="true" aria-label="${h(title)}"><div class="modal-head"><div><h2>${h(title)}</h2><p class="sub">${h(desc)}</p></div>${close}</div>${body}</section></div>`;
}
function setPage(page){ui.page=page;if(page==='library')ui.search='';render();}
function modal(type,id=null){ui.modal={type,id};render()}
function timerCancel(zoneId){clearTimeout(runtime.timers.get(zoneId));runtime.timers.delete(zoneId)}
function stopZone(id){runtime.activeZones.delete(id);timerCancel(id);mixer.stopGroup('zone:'+id);render()}
async function startZone(id){
 const zone=zne(id);if(!zone)return;
 runtime.activeZones.add(id);render();
 for(const e of (zone.entries||[]).filter(e=>e.role==='loop')){
   if(!runtime.activeZones.has(id))return;
   const s=snd(e.soundId);if(s)try{await mixer.play(s,{groupKey:'zone:'+id,channel:'ambient',loop:true,level:zone.volume??80,entryVolume:e.volume??100,validate:()=>runtime.activeZones.has(id)});}catch(err){notify(err.message,true)}
 }
 if(runtime.activeZones.has(id)&&zone.auto)scheduleZone(id);
}
function scheduleZone(id){
 timerCancel(id);
 const zone=zne(id);if(!zone||!zone.auto||!runtime.activeZones.has(id)||!(zone.entries||[]).some(e=>e.role!=='loop'&&snd(e.soundId)))return;
 const min=Math.max(3,Number(zone.minSeconds)||45);
 const max=Math.max(min,Number(zone.maxSeconds)||120);
 const delay=(min+Math.random()*(max-min))*1000;
 runtime.timers.set(id,setTimeout(async()=>{
   if(!runtime.activeZones.has(id))return;
   await playZoneRandom(id,true);
   if(runtime.activeZones.has(id))scheduleZone(id);
 },delay));
}
async function playZoneRandom(id,automated=false){
 const zone=zne(id);if(!zone)return;
 const choices=(zone.entries||[]).filter(e=>e.role!=='loop'&&snd(e.soundId));
 if(!choices.length){notify('Cette zone ne contient aucun événement aléatoire.',true);return;}
 const pool=choices; // Les probabilités sont toujours proportionnelles aux poids, même après un tirage identique.
 const total=pool.reduce((sum,e)=>sum+Math.max(1,Number(e.weight)||1),0);
 let pick=Math.random()*total;
 const entry=pool.find(e=>(pick-=Math.max(1,Number(e.weight)||1))<0)||pool.at(-1);
 if(automated&&[...mixer.voices.values()].filter(v=>v.groupKey==='zone:'+id&&!v.loop).length>=2)return;
 try{await mixer.play(snd(entry.soundId),{groupKey:'zone:'+id,channel:'effects',level:zone.volume??80,entryVolume:entry.volume??100,important:snd(entry.soundId).important,validate:()=>!automated||runtime.activeZones.has(id)});if(automated&&!runtime.activeZones.has(id))return;notify('Zone « '+zone.name+' » : '+snd(entry.soundId).title)}catch(err){notify(err.message,true)}
}
function stopScene(){if(runtime.playingSceneId)mixer.stopGroup('scene:'+runtime.playingSceneId);runtime.playingSceneId=null}
async function startScene(id){const scene=scn(id);if(!scene)return;stopScene();runtime.playingSceneId=id;cfg.activeSceneId=id;cfg.activeSessionId=scene.sessionId;save();render();for(const e of entriesFor(scene).filter(e=>e.role==='loop')){if(runtime.playingSceneId!==id)return;try{await mixer.play(snd(e.soundId),{groupKey:'scene:'+id,loop:true,channel:'ambient',entryVolume:e.volume??100,validate:()=>runtime.playingSceneId===id})}catch(err){notify(err.message,true)}}}
function cleanRefs(id){cfg.permanentIds=cfg.permanentIds.filter(x=>x!==id);for(const c of cfg.scenes)c.tracks=(c.tracks||[]).filter(e=>e.soundId!==id);for(const z of cfg.zones)z.entries=(z.entries||[]).filter(e=>e.soundId!==id)}
function reorderStateAfterSessionChange(id){stopScene();cfg.activeSessionId=id;cfg.activeSceneId=cfg.scenes.find(s=>s.sessionId===id)?.id||null;ui.campaignId=sess(id)?.campaignId||ui.campaignId;save();render()}
async function handleAction(target){
 const {action,id,extra,value}=target.dataset;
 try{
 switch(action){
  case 'nav':setPage(id);break;
  case 'import':document.querySelector('#file-input')?.click();break;
  case 'new-campaign':modal('campaign');break;
  case 'edit-campaign':modal('campaign',id);break;
  case 'new-session':ui.campaignId=id;modal('session');break;
  case 'edit-session':modal('session',id);break;
  case 'new-scene':cfg.activeSessionId=id;modal('scene');break;
  case 'edit-scene':modal('scene',id);break;
  case 'new-zone':modal('zone');break;
  case 'edit-zone':modal('zone',id);break;
  case 'edit-sound':modal('sound',id);break;
  case 'help':modal('help');break;
  case 'close-modal':ui.modal=null;render();break;
  case 'select-campaign':{ui.campaignId=id;const next=cfg.sessions.find(s=>s.campaignId===id);stopScene();cfg.activeSessionId=next?.id||null;cfg.activeSceneId=cfg.scenes.find(s=>s.sessionId===next?.id)?.id||null;save();render();break;}
  case 'select-session':reorderStateAfterSessionChange(id);break;
  case 'select-scene':stopScene();cfg.activeSceneId=id;save();render();break;
  case 'activate-scene':runtime.playingSceneId===id?(stopScene(),render()):await startScene(id);break;
  case 'duplicate-session':{
   const old=sess(id);if(!old)return;const newId=uid();cfg.sessions.push({...old,id:newId,name:old.name+' (copie)',createdAt:Date.now()});
   for(const sc of cfg.scenes.filter(s=>s.sessionId===id))cfg.scenes.push({...sc,id:uid(),sessionId:newId,tracks:(sc.tracks||[]).map(e=>({...e}))});
   reorderStateAfterSessionChange(newId);notify('Session et scènes dupliquées.');break;}
  case 'delete-session':{
   if(!confirm('Supprimer cette session et toutes ses scènes ? Les fichiers audio seront conservés.'))return;
   if(runtime.playingSceneId&&scn(runtime.playingSceneId)?.sessionId===id)stopScene();
   cfg.sessions=cfg.sessions.filter(s=>s.id!==id);cfg.scenes=cfg.scenes.filter(s=>s.sessionId!==id);
   if(cfg.activeSessionId===id){cfg.activeSessionId=cfg.sessions[0]?.id||null;cfg.activeSceneId=cfg.scenes.find(s=>s.sessionId===cfg.activeSessionId)?.id||null;}
   save();render();notify('Session supprimée.');break;}
  case 'delete-campaign':{
   if(!confirm('Supprimer cette campagne, ses sessions et ses scènes ? Les sons restent dans la bibliothèque.'))return;
   stopScene();const ids=new Set(cfg.sessions.filter(s=>s.campaignId===id).map(s=>s.id));cfg.scenes=cfg.scenes.filter(s=>!ids.has(s.sessionId));cfg.sessions=cfg.sessions.filter(s=>s.campaignId!==id);cfg.campaigns=cfg.campaigns.filter(c=>c.id!==id);
   ui.campaignId=cfg.campaigns[0]?.id||null;cfg.activeSessionId=cfg.sessions[0]?.id||null;cfg.activeSceneId=cfg.scenes.find(s=>s.sessionId===cfg.activeSessionId)?.id||null;ui.modal=null;save();render();break;}
  case 'delete-scene':{
   if(!confirm('Supprimer cette scène ?'))return;if(runtime.playingSceneId===id)stopScene();const s=scn(id);cfg.scenes=cfg.scenes.filter(x=>x.id!==id);if(cfg.activeSceneId===id)cfg.activeSceneId=cfg.scenes.find(x=>x.sessionId===s?.sessionId)?.id||null;save();render();break;}
  case 'pick-scene-sounds':modal('scene-sounds',id);break;
  case 'pick-zone-sounds':modal('zone-sounds',id);break;
  case 'quick-add-scene':{
    const active=activeScene();if(!active){notify('Créez ou sélectionnez d’abord une scène.',true);return;}
    active.tracks??=[];if(!active.tracks.some(t=>t.soundId===id))active.tracks.push({soundId:id,role:'fx',volume:100});save();notify('Ajouté à « '+active.name+' ».');break;}
  case 'pin':cfg.permanentIds=cfg.permanentIds.includes(id)?cfg.permanentIds.filter(x=>x!==id):[...cfg.permanentIds,id];save();render();break;
  case 'tag':ui.filters.has(value)?ui.filters.delete(value):ui.filters.add(value);render();break;
  case 'clear-tags':ui.filters.clear();render();break;
  case 'play':if(snd(id))await mixer.play(snd(id),{groupKey:'effect:'+id,important:snd(id).important});break;
  case 'toggle-loop':{
    const group='manual:'+id;
    if(mixer.isPlaying(group,id,true))mixer.stopMatching(group,id);else if(snd(id))await mixer.play(snd(id),{groupKey:group,channel:'ambient',loop:true});
    refreshIndicators();break;}
  case 'scene-play':{
    const e=scn(id)?.tracks?.find(t=>t.soundId===extra);const s=snd(extra);
    if(s&&e)await mixer.play(s,{groupKey:'scene:'+id,channel:'effects',entryVolume:e.volume??100,important:s.important});break;}
  case 'track-role':{
    const sc=scn(id);const entry=sc?.tracks?.find(e=>e.soundId===extra);if(!entry)return;
    if(entry.role==='loop'&&runtime.playingSceneId===id)mixer.stopMatching('scene:'+id,extra);
    entry.role=value;if(entry.role==='loop'&&runtime.playingSceneId===id&&snd(extra))await mixer.play(snd(extra),{groupKey:'scene:'+id,channel:'ambient',loop:true,entryVolume:entry.volume??100});save();render();break;}
  case 'remove-track':{
    const sc=scn(id);if(!sc)return;mixer.stopMatching('scene:'+id,extra);sc.tracks=(sc.tracks||[]).filter(e=>e.soundId!==extra);save();render();break;}
  case 'toggle-zone':runtime.activeZones.has(id)?stopZone(id):await startZone(id);break;
  case 'random-zone':await playZoneRandom(id);break;
  case 'zone-role':{
    const zone=zne(id);const entry=zone?.entries?.find(e=>e.soundId===extra);if(!entry)return;
    if(entry.role==='loop')mixer.stopMatching('zone:'+id,extra);
    entry.role=entry.role==='loop'?'event':'loop';
    if(entry.role==='loop'&&runtime.activeZones.has(id)&&snd(extra))await mixer.play(snd(extra),{groupKey:'zone:'+id,channel:'ambient',loop:true,level:zone.volume??80,entryVolume:entry.volume??100});
    if(runtime.activeZones.has(id))scheduleZone(id);save();render();break;}
  case 'remove-zone-sound':{
    const zone=zne(id);if(!zone)return;mixer.stopMatching('zone:'+id,extra);zone.entries=(zone.entries||[]).filter(e=>e.soundId!==extra);if(runtime.activeZones.has(id))scheduleZone(id);save();render();break;}
  case 'delete-zone':{
    if(!confirm('Supprimer cette zone ? Les fichiers audio seront conservés.'))return;
    runtime.activeZones.delete(id);timerCancel(id);mixer.stopGroup('zone:'+id);cfg.zones=cfg.zones.filter(z=>z.id!==id);save();render();break;}
  case 'delete-sound':{
    if(!confirm('Supprimer définitivement ce fichier audio de la bibliothèque ? Il sera également retiré des scènes et des zones.'))return;
    mixer.stopSound(id);await deleteSound(id);sounds.delete(id);mixer.clearCached(id);cleanRefs(id);ui.modal=null;save();render();notify('Fichier supprimé.');break;}
  case 'stop-all':runtime.activeZones.forEach(timerCancel);runtime.activeZones.clear();stopScene();mixer.stopAll();render();notify('Toutes les lectures ont été arrêtées.');break;
  case 'stop-voice':mixer.stopVoice(id);render();break;
  case 'backup-export':await exportBackup();break;
  case 'backup-import':document.querySelector('#restore-input')?.click();break;
  case 'install-demo':await installDemo();break;
  case 'install-library':await installLibrary();break;
  case 'persist-storage':{
    if(!navigator.storage?.persist){notify('Option non prise en charge sur cet appareil.',true);return;}
    const ok=await navigator.storage.persist();notify(ok?'Stockage persistant autorisé.':'Le navigateur n’a pas accordé le stockage persistant.');break;}
 }
 }catch(err){console.error(err);notify(err.message||'Une erreur est survenue.',true)}
}
async function handleForm(form){
 const values=new FormData(form);const m=ui.modal;
 const name=(values.get('name')||'').toString().trim();
 const desc=(values.get('description')||'').toString().trim();
 if(['campaign','session','scene','zone'].includes(form.dataset.form)&&!name){notify('Saisissez un nom.',true);return;}
 switch(form.dataset.form){
  case 'campaign':{
   if(m.id)camp(m.id).name=name;else{const c={id:uid(),name,createdAt:Date.now()};cfg.campaigns.push(c);ui.campaignId=c.id;}
   break;}
  case 'session':{
   if(m.id)Object.assign(sess(m.id),{name,description:desc});
   else{const s={id:uid(),campaignId:ui.campaignId,name,description:desc,createdAt:Date.now()};cfg.sessions.push(s);cfg.activeSessionId=s.id;cfg.activeSceneId=null;}
   break;}
  case 'scene':{
   if(m.id)Object.assign(scn(m.id),{name,description:desc});
   else{const scene={id:uid(),sessionId:cfg.activeSessionId,name,description:desc,tracks:[],order:cfg.scenes.length};cfg.scenes.push(scene);cfg.activeSceneId=scene.id;}
   break;}
  case 'zone':{
   const min=Math.max(3,Number(values.get('minSeconds'))||45),max=Math.max(min,Number(values.get('maxSeconds'))||120);
   if(m.id){const z=zne(m.id);Object.assign(z,{name,auto:values.has('auto'),minSeconds:min,maxSeconds:max});if(runtime.activeZones.has(z.id))scheduleZone(z.id);}
   else cfg.zones.push({id:uid(),name,auto:values.has('auto'),minSeconds:min,maxSeconds:max,volume:80,entries:[]});
   break;}
  case 'sound':{
   const old=await getSound(m.id);if(!old){notify('Son introuvable.',true);return;}
   const tags=String(values.get('tags')||'').split(',').map(t=>t.trim()).filter(Boolean);
   const updated={...old,title:String(values.get('title')||old.title).trim(),category:String(values.get('category')||'Autres'),tags:[...new Set(tags)],volume:pct(values.get('volume')),important:values.has('important')};
   if(!updated.title){notify('Le titre est obligatoire.',true);return;}
   await putSound(updated);sounds.set(updated.id,Object.fromEntries(Object.entries(updated).filter(([k])=>k!=='blob')));mixer.setVoiceLevel(m.id,updated.volume);break;}
  case 'pick-sounds':{
   const ids=values.getAll('ids');if(m.type==='scene-sounds'){
    const s=scn(m.id);const old=new Map((s.tracks||[]).map(e=>[e.soundId,e]));
    for(const key of old.keys())if(!ids.includes(key))mixer.stopMatching('scene:'+s.id,key);
    s.tracks=ids.map(id=>old.get(id)||{soundId:id,role:'fx',volume:100});
   }else{
    const z=zne(m.id);const old=new Map((z.entries||[]).map(e=>[e.soundId,e]));
    for(const key of old.keys())if(!ids.includes(key))mixer.stopMatching('zone:'+z.id,key);
    z.entries=ids.map(id=>old.get(id)||{soundId:id,role:'event',weight:1,volume:100});
    if(runtime.activeZones.has(z.id))scheduleZone(z.id);
   }break;}
 }
 ui.modal=null;save();render();
}
async function importFiles(files){
 const good=[...files].filter(f=>f.type.startsWith('audio/')||/\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/i.test(f.name));
 if(!good.length){notify('Sélectionnez des fichiers audio compatibles.',true);return;}
 let added=0;ui.importing=good.length;render();
 for(const file of good){try{const record={...soundMeta(file),blob:file};await putSound(record);sounds.set(record.id,Object.fromEntries(Object.entries(record).filter(([key])=>key!=='blob')));added++;}catch(err){console.error(err);notify('Import impossible pour '+file.name+' : '+err.message,true)}ui.importing--;}
 render();notify(`${added} son(s) importé(s). Vous pouvez maintenant modifier leurs tags.`);
}
async function installLibrary(){
 const list=integratedCatalog.filter(s=>!sounds.has(s.id));
 if(!list.length){notify('Bibliothèque déjà installée.');return;}
 if(!confirm('Télécharger '+list.length+' bruitages CC0 sur cet appareil ?'))return;
 let ok=0,failed=0;ui.importing=list.length;render();
 for(const meta of list){try{const r=await fetch(meta.assetUrl);if(!r.ok)throw Error('HTTP '+r.status);const blob=await r.blob();const record={...meta,size:blob.size,createdAt:Date.now(),blob};await putSound(record);const {blob:unused,...info}=record;sounds.set(meta.id,info);ok++;}catch(e){failed++;console.error(meta.filename,e);}ui.importing--;if((ok+failed)%10===0){render();await new Promise(resolve=>setTimeout(resolve,0));}}
 render();notify(ok+' sons installés'+(failed?' · '+failed+' erreurs':'')+'.');
}
async function installDemo(){
 if(sounds.size>0&&!confirm('Ajouter 6 sons synthétiques de démonstration à votre bibliothèque ?'))return;
 const names=['porte_bois_phalanges.mp3','pluie_forte.mp3','vent_foret.mp3','pas_gravier.mp3','clochette_ancienne.mp3','tonnerre.mp3'];
 const files=[];
 for(const name of names){const url=new URL('./samples/'+name,import.meta.url);const response=await fetch(url);if(!response.ok)throw Error('Exemple introuvable : '+name);files.push(new File([await response.blob()],name,{type:'audio/mpeg'}));}
 await importFiles(files);
}
async function exportBackup(){
 notify('Préparation de la sauvegarde…');await saveNow();
 const records=await getAllSounds();const serialized=[];
 for(const rec of records){const blob=rec.blob;const buffer=new Uint8Array(await blob.arrayBuffer());
  let binary='';const blockSize=16384;for(let i=0;i<buffer.length;i+=blockSize)binary+=String.fromCharCode(...buffer.subarray(i,i+blockSize));
  const {blob:unused,...meta}=rec;serialized.push({...meta,data:btoa(binary)});
 }
 const content=JSON.stringify({format:'sonora-jdr-backup',version:1,date:new Date().toISOString(),config:cfg,sounds:serialized});
 const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download=`sonora-jdr-${new Date().toISOString().slice(0,10)}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
 notify('Sauvegarde complète exportée.');
}
async function restoreBackup(file){
 if(!file)return;
 const data=JSON.parse(await file.text());
 if(data.format!=='sonora-jdr-backup'||data.version!==1||!Array.isArray(data.sounds)||!data.config)throw Error('Ce fichier n’est pas une sauvegarde Sonora compatible.');
 if(!confirm(`Remplacer les données actuelles par cette sauvegarde (${data.sounds.length} sons) ? Cette opération est irréversible sans sauvegarde préalable.`))return;
 const restored=[];
 for(const item of data.sounds){if(typeof item.data!=='string'||typeof item.id!=='string'||typeof item.title!=='string')throw Error('Sauvegarde invalide ou incomplète.');
  const binary=atob(item.data);const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  const {data:unused,...meta}=item;restored.push({...meta,blob:new Blob([bytes],{type:meta.mime||'audio/*'})});
 }
 runtime.activeZones.forEach(timerCancel);runtime.activeZones.clear();stopScene();mixer.stopAll();
 await replaceAll(repairConfig(data.config),restored);cfg=repairConfig(data.config);sounds=new Map(restored.map(({blob,...meta})=>[meta.id,meta]));mixer.cache.clear();mixer.setConfig(cfg);ui.modal=null;ui.category='Toutes';ui.filters.clear();ui.search='';render();notify('Sauvegarde restaurée.');
}
root.addEventListener('click',async event=>{
 if(event.target.classList.contains('modal-bg')){ui.modal=null;render();return;}
 const target=event.target.closest('[data-action]');if(!target||target.disabled)return;
 await handleAction(target);
});
root.addEventListener('submit',async event=>{
 const form=event.target.closest('[data-form]');if(!form)return;
 event.preventDefault();try{await handleForm(form)}catch(error){console.error(error);notify('Impossible d’enregistrer : '+error.message,true)}
});
let searchTimer;
root.addEventListener('input',event=>{
 const el=event.target;
 if(el.id==='search-sounds'){
   ui.search=el.value;
   clearTimeout(searchTimer);
   const pos=el.selectionStart;
   searchTimer=setTimeout(()=>{render();const next=document.querySelector('#search-sounds');if(next){next.focus({preventScroll:true});next.setSelectionRange(pos,pos)}},260);
   return;
 }
 if(el.dataset.slider){
   const percent=pct(el.value),type=el.dataset.slider,id=el.dataset.id,extra=el.dataset.extra;
   const output=el.closest('.mutebar')?.querySelector('output')||el.parentElement.querySelector('output');
   if(output)output.textContent=percent+'%';
   if(['master','ambience','effects'].includes(type)){
     cfg[type]=percent;mixer.setConfig(cfg);
     const pill=el.closest('.card')?.querySelector('.pill');if(type==='master'&&pill)pill.textContent=percent+'%';
   }else if(type==='zone-volume'){
     const zone=zne(id);if(zone){zone.volume=percent;mixer.setGroupLevel('zone:'+id,percent);}
   }else if(type==='entry-volume'){
     const e=zne(id)?.entries?.find(e=>e.soundId===extra);if(e){e.volume=percent;mixer.setEntryLevel('zone:'+id,extra,percent);}
   }else if(type==='track-volume'){
     const e=scn(id)?.tracks?.find(e=>e.soundId===extra);if(e){e.volume=percent;mixer.setEntryLevel('scene:'+id,extra,percent);}
   }
   save();
 }
});
root.addEventListener('change',async event=>{
 const el=event.target;
 try{
   if(el.id==='category-filter'){ui.category=el.value;render()}
   if(el.dataset.entryWeight){const z=zne(el.dataset.entryWeight);const entry=z?.entries?.find(e=>e.soundId===el.dataset.soundId);if(entry){entry.weight=Math.max(1,Math.min(100,Number(el.value)||1));save();render()}}
   if(el.id==='file-input'){await importFiles(el.files);el.value=''}
   if(el.id==='restore-input'){await restoreBackup(el.files[0]);el.value=''}
 }catch(err){console.error(err);notify(err.message||'Impossible de lire le fichier.',true)}
});
root.addEventListener('dragover',e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();root.classList.add('dragging')}});
root.addEventListener('dragleave',e=>{if(!root.contains(e.relatedTarget))root.classList.remove('dragging')});
root.addEventListener('drop',async e=>{root.classList.remove('dragging');if(e.dataTransfer?.files.length){e.preventDefault();try{await importFiles(e.dataTransfer.files)}catch(err){notify(err.message,true)}}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&ui.modal){ui.modal=null;render()}});

async function main(){
 try{
   if(!window.indexedDB)throw Error('Le stockage IndexedDB n’est pas disponible sur ce navigateur.');
   cfg=repairConfig(await getConfig());
   const all=await getAllSounds();sounds=new Map(all.map(({blob,...meta})=>[meta.id,meta]));
   mixer.setConfig(cfg);
   ui.campaignId=activeSession()?.campaignId||cfg.campaigns[0]?.id||null;
   render();
   if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./service-worker.js').catch(console.warn);
 }catch(err){console.error(err);root.innerHTML=`<div class="boot"><h2>Sonora n’a pas pu démarrer</h2><p>${h(err.message)}</p><p>Ouvrez l’application via un serveur HTTP(S) et autorisez le stockage local.</p></div>`;}
}
main();
