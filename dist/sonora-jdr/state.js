export const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
export const categories = ['Portes','Pas','Météo','Nature','Lieux','Créatures','Combat','Objets','Magie','Voix','Musique','Autres'];
export const createConfig = () => ({
  version: 1,
  master: 80,
  ambience: 100,
  effects: 100,
  permanentIds: [],
  campaigns: [],
  sessions: [],
  scenes: [],
  zones: [],
  activeSessionId: null,
  activeSceneId: null,
  lastUpdated: Date.now()
});
export function inferTags(filename) {
  const name = filename.replace(/\.[^.]+$/,'').toLowerCase();
  const rules = [
    ['Portes', /door|porte|knock|toc|b[eé]lier|hinge|grinc/],
    ['Pas', /step|foot|walk|run|pas|marche|course|hoof|sabot/],
    ['Météo', /rain|pluie|thunder|tonnerre|vent|wind|storm|orage|neige/],
    ['Nature', /bird|oiseau|wolf|loup|forest|for[eê]t|river|rivi[eè]re|branche/],
    ['Lieux', /tavern|taverne|market|march[eé]|crowd|foule|ville|city/],
    ['Combat', /sword|[eé]p[eé]e|fight|battle|combat|arrow|fl[eè]che/],
    ['Magie', /magic|spell|sort|magie/],
    ['Créatures', /monster|monstre|dragon|creature|cr[eé]ature/]
  ];
  const tags = [];
  for (const [tag,re] of rules) if (re.test(name)) tags.push(tag);
  for (const [tag,re] of [['Bois',/wood|bois|plank|parquet/],['Métal',/metal|m[eé]tal|iron|fer/],['Pierre',/stone|pierre/],['Phalanges',/knuckle|phalange|knock|toc/],['Pluie',/rain|pluie/],['Vent',/wind|vent/],['Nuit',/night|nuit/],['Forêt',/forest|for[eê]t/],['Intérieur',/indoor|interieur|int[eé]rieur/],['Extérieur',/outdoor|ext[eé]rieur/]]) {
    if(re.test(name)) tags.push(tag);
  }
  return tags;
}
export const cleanTitle = filename => filename.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
export const soundMeta = (file) => {
  const tags = inferTags(file.name);
  return { id:uid(), title:cleanTitle(file.name),filename:file.name,category:categories.find(c=>tags.includes(c))||'Autres',tags,volume:80,createdAt:Date.now(),mime:file.type||'audio/*',size:file.size };
};
export function repairConfig(cfg) {
  const fresh = createConfig();
  if (!cfg || typeof cfg!=='object') return fresh;
  return {...fresh,...cfg,
    permanentIds:Array.isArray(cfg.permanentIds)?cfg.permanentIds:[],
    campaigns:Array.isArray(cfg.campaigns)?cfg.campaigns:[],
    sessions:Array.isArray(cfg.sessions)?cfg.sessions:[],
    scenes:Array.isArray(cfg.scenes)?cfg.scenes:[],
    zones:Array.isArray(cfg.zones)?cfg.zones:[]};
}
