export class Sound {
  ctx:AudioContext|null=null; enabled=true;
  unlock(){if(!this.ctx)this.ctx=new AudioContext();if(this.ctx.state==='suspended')void this.ctx.resume();}
  tick(){if(!this.enabled||!this.ctx)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='triangle';o.frequency.setValueAtTime(1650,t);o.frequency.exponentialRampToValueAtTime(550,t+.035);g.gain.setValueAtTime(.065,t);g.gain.exponentialRampToValueAtTime(.001,t+.045);o.connect(g);g.connect(this.ctx.destination);o.start(t);o.stop(t+.05);}
  select(){if(!this.enabled||!this.ctx)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.setValueAtTime(560,t);g.gain.setValueAtTime(.025,t);g.gain.exponentialRampToValueAtTime(.001,t+.055);o.connect(g);g.connect(this.ctx.destination);o.start();o.stop(t+.06);}
}
