// Original, quiet pentatonic chamber sketch. No remote audio or soundtrack samples.
export class AtelierMusic {
  constructor(enabled = () => true) { this.enabled=enabled; this.timer=null; this.context=null; this.notes=new Set(); this.unlocked=false; this.phrase=0; }
  start() { if(this.unlocked && this.timer!==null)return;this.unlocked=true; this.sync(); }
  sync() {
    if (!this.unlocked || !this.enabled() || document.hidden) { this.pause(); return; }
    const Audio=globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) return;
    try {
      if (!this.context) {
        this.context=new Audio(); this.master=this.context.createGain();
        this.master.gain.value=0; this.master.connect(this.context.destination);
        // A quiet, single echo gives the locally synthesized score a soft room.
        if(this.context.createDelay){this.echo=this.context.createDelay(2);this.echo.delayTime.value=.65;this.wet=this.context.createGain();this.wet.gain.value=.22;this.master.connect(this.echo);this.echo.connect(this.wet);this.wet.connect(this.context.destination);}
      }
      this.context.resume()?.catch(()=>{});
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(0.18,this.context.currentTime,1.2);
      if (this.timer===null) { this.next=this.context.currentTime+0.1; this.schedule(); }
    } catch { this.pause(); }
  }
  schedule() {
    if (!this.enabled() || document.hidden) {this.pause();return;}
    const c=this.context, progression=[[48,55,62,67],[45,52,60,64],[41,48,55,62],[43,50,57,62]];
    while(this.next<c.currentTime+2) {
      const beat=this.phrase++%32, chord=progression[Math.floor(beat/8)];
      if(beat%8===0) for(const note of chord.slice(0,3)) this.note(note,this.next,11,0.10,'sine');
      const melody=[0,2,3,2,1,3,2,1][beat%8];
      if(beat%8!==7)this.note(chord[melody]+12,this.next,4.8,0.22,'sine');
      if(beat%4===2)this.note(chord[1]+24,this.next+.35,3.5,.045,'triangle');
      this.next+=1.5;
    }
    this.timer=setTimeout(()=>{this.timer=null;this.schedule();},700);
  }
  note(midi,at,duration,volume,type) {
    const c=this.context,o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.value=440*2**((midi-69)/12);
    g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(volume,at+0.38);
    g.gain.exponentialRampToValueAtTime(0.0001,at+duration);
    o.connect(g).connect(this.master);o.start(at);o.stop(at+duration+0.05);
    this.notes.add(o);o.onended=()=>{o.disconnect();g.disconnect();this.notes.delete(o);};
  }
  pause() {
    clearTimeout(this.timer);this.timer=null;
    if(!this.context)return;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(0,this.context.currentTime,0.12);
    for(const o of this.notes) {try{o.stop(this.context.currentTime+0.5);}catch{}}
    this.notes.clear();
  }
}
