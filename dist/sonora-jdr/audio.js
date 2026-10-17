import {getSound} from './db.js';

// Toutes les lectures passent par Web Audio : plusieurs boucles peuvent être superposées.
export class AudioMixer {
  constructor(onChange=()=>{}) {
    this.context=null; this.masterNode=null; this.ambientNode=null; this.effectsNode=null;
    this.config={master:80,ambience:100,effects:100};
    this.groups=new Map(); this.voices=new Map(); this.cache=new Map();
    this.onChange=onChange; this.duckTimeout=null;
  }
  async unlock() {
    if (!this.context) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error('Web Audio n’est pas pris en charge par ce navigateur.');
      this.context=new AudioCtx();
      this.masterNode=this.context.createGain();
      this.ambientNode=this.context.createGain();
      this.effectsNode=this.context.createGain();
      this.ambientNode.connect(this.masterNode);
      this.effectsNode.connect(this.masterNode);
      this.masterNode.connect(this.context.destination);
      this.applyVolumes();
    }
    if(this.context.state==='suspended') await this.context.resume();
  }
  async buffer(soundId) {
    if(this.cache.has(soundId)) return this.cache.get(soundId);
    const task=(async()=>{
      const file=await getSound(soundId);
      if(!file?.blob) throw new Error('Fichier audio introuvable.');
      const data=await file.blob.arrayBuffer();
      return this.context.decodeAudioData(data);
    })();
    this.cache.set(soundId,task);
    try {return await task;} catch(error) {this.cache.delete(soundId);throw error;}
  }
  setConfig(config) {
    this.config={master:config.master??80,ambience:config.ambience??100,effects:config.effects??100};
    this.applyVolumes();
  }
  applyVolumes() {
    if(!this.context)return;
    const now=this.context.currentTime;
    this.masterNode.gain.setTargetAtTime((this.config.master||0)/100,now,.025);
    this.ambientNode.gain.setTargetAtTime((this.config.ambience||0)/100,now,.025);
    this.effectsNode.gain.setTargetAtTime((this.config.effects||0)/100,now,.025);
  }
  group(key,channel='effects',level=100) {
    const route=key+'::'+channel;
    if(this.groups.has(route)) return this.groups.get(route);
    const node=this.context.createGain();
    node.gain.value=level/100;
    node.connect(channel==='ambient'?this.ambientNode:this.effectsNode);
    const group={key,node,channel,level}; this.groups.set(route,group);return group;
  }
  setGroupLevel(key,level) {
    if(!this.context)return;
    for(const group of this.groups.values())if(group.key===key){
      group.level=level;group.node.gain.setTargetAtTime(Math.max(0,level)/100,this.context.currentTime,.025);
    }
  }
  setVoiceLevel(soundId,percent) {
    for(const voice of this.voices.values())if(voice.soundId===soundId) {
      voice.baseVolume=percent;voice.soundGain.gain.setTargetAtTime((percent/100)*(voice.entryVolume/100),this.context.currentTime,.025);
    }
  }
  setEntryLevel(key,soundId,percent) {
    for(const voice of this.voices.values())if(voice.groupKey===key&&voice.soundId===soundId) {
      voice.entryVolume=percent;
      voice.soundGain.gain.setTargetAtTime((voice.baseVolume/100)*(percent/100),this.context.currentTime,.025);
    }
  }
  async play(sound,{groupKey='fx',channel='effects',loop=false,level=100,entryVolume=100,important=false,validate=()=>true}={}) {
    await this.unlock();
    const decoded=await this.buffer(sound.id);
    if(!validate())return null;
    if(loop && this.isPlaying(groupKey,sound.id,true)) return null;
    const group=this.group(groupKey,channel,level);
    const source=this.context.createBufferSource();source.buffer=decoded;source.loop=loop;
    const soundGain=this.context.createGain();
    const envelope=this.context.createGain();
    soundGain.gain.value=((sound.volume??80)/100)*(entryVolume/100);
    envelope.gain.value=0;
    source.connect(soundGain);soundGain.connect(envelope);envelope.connect(group.node);
    const id=Math.random().toString(36).slice(2)+Date.now();
    const voice={id,soundId:sound.id,groupKey,source,soundGain,envelope,loop,entryVolume,baseVolume:sound.volume??80};
    this.voices.set(id,voice);
    const t=this.context.currentTime;
    envelope.gain.setValueAtTime(0,t);
    envelope.gain.linearRampToValueAtTime(1,t+Math.min(loop?.55:.02,decoded.duration/3));
    source.onended=()=>{this.voices.delete(id);try{source.disconnect();soundGain.disconnect();envelope.disconnect();}catch{}this.onChange();};
    source.start();
    if(important) this.duck(Math.min(decoded.duration,9));
    this.onChange();return id;
  }
  duck(seconds=3) {
    if(!this.context)return;
    const t=this.context.currentTime;
    const n=this.ambientNode.gain;
    const normal=(this.config.ambience??100)/100;
    n.gain.cancelScheduledValues(t);
    n.gain.setTargetAtTime(normal*.33,t,.10);
    clearTimeout(this.duckTimeout);
    this.duckTimeout=setTimeout(()=>n.gain.setTargetAtTime(normal,this.context.currentTime,.6),Math.max(.3,seconds)*1000);
  }
  isPlaying(groupKey,soundId,loopOnly=false) {
    return [...this.voices.values()].some(v=>v.groupKey===groupKey&&v.soundId===soundId&&(!loopOnly||v.loop));
  }
  playingIds() {return new Set([...this.voices.values()].map(v=>v.soundId));}
  stopVoice(id,fade=.25) {
    const voice=this.voices.get(id);if(!voice||!this.context)return;
    const t=this.context.currentTime;
    try {
      voice.envelope.gain.cancelScheduledValues(t);
      voice.envelope.gain.setValueAtTime(voice.envelope.gain.value,t);
      voice.envelope.gain.linearRampToValueAtTime(0,t+fade);
      voice.source.stop(t+fade+.015);
    } catch {}
    this.voices.delete(id);this.onChange();
  }
  stopMatching(groupKey,soundId,fade=.25) {
    for(const voice of [...this.voices.values()])if(voice.groupKey===groupKey&&voice.soundId===soundId)this.stopVoice(voice.id,fade);
  }
  stopGroup(key,fade=.35) {
    for(const voice of [...this.voices.values()])if(voice.groupKey===key)this.stopVoice(voice.id,fade);
  }
  stopAll(fade=.2) {
    for(const voice of [...this.voices.values()])this.stopVoice(voice.id,fade);
  }
  stopSound(soundId) {for(const voice of [...this.voices.values()])if(voice.soundId===soundId)this.stopVoice(voice.id);}
  clearCached(id) {this.cache.delete(id);}
}
