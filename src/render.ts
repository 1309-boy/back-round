import { W,H,R,MAPS,CHARACTERS,type CharacterId } from '../shared/data.ts';
import { clamp,ends } from '../shared/geometry.ts';
export function drawArena(ctx:any,s:any,me=0,options:any={}){
  const canvas=ctx.canvas,width=canvas.width,height=canvas.height,scale=Math.min(width/W,height/H),ox=(width-W*scale)/2,oy=(height-H*scale)/2;
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,width,height);ctx.fillStyle='#080b0e';ctx.fillRect(0,0,width,height);ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
  const frozen=s.frozen||!!s.stop;ctx.fillStyle=frozen?'#1d3028':'#151b20';ctx.fillRect(0,0,W,H);
  const local=(owner:number)=>owner===me;
  const attackColor=(owner:number)=>local(owner)?'#50a8ff':'#ff626d';
  const rgba=(owner:number,a:number)=>local(owner)?`rgba(68,153,255,${a})`:`rgba(255,72,95,${a})`;
  for(const w of MAPS[s.mapIndex].walls){ctx.fillStyle=w.jump?'#53616a':'#353e45';ctx.fillRect(w.x,w.y,w.w,w.h);}
  function shape(a:any,alpha=.17){ctx.fillStyle=rgba(a.owner,alpha);ctx.strokeStyle=rgba(a.owner,.7);ctx.lineWidth=1.5;ctx.beginPath();
    if(a.kind==='sector'){const angle=Math.atan2(a.dy,a.dx);ctx.moveTo(a.x,a.y);ctx.arc(a.x,a.y,a.radius,angle-a.angle,angle+a.angle);ctx.closePath();}
    else if(a.kind==='circle'){ctx.arc(a.x,a.y,a.radius,0,Math.PI*2);}
    else{const dx=a.end.x-a.x,dy=a.end.y-a.y,len=Math.hypot(dx,dy)||1,px=-dy/len*a.width/2,py=dx/len*a.width/2;ctx.moveTo(a.x+px,a.y+py);ctx.lineTo(a.end.x+px,a.end.y+py);ctx.lineTo(a.end.x-px,a.end.y-py);ctx.lineTo(a.x-px,a.y-py);ctx.closePath();}ctx.fill();ctx.stroke();}
  if(options.rianAim){const a=options.rianAim,p=a.origin,angle=Math.atan2(a.direction.y,a.direction.x),radius=78;
    ctx.fillStyle='rgba(80,168,255,.18)';ctx.strokeStyle='rgba(135,199,255,.7)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.arc(p.x,p.y,radius,angle-Math.PI/4,angle+Math.PI/4);ctx.closePath();ctx.fill();
    ctx.beginPath();for(const sign of [-1,1]){ctx.moveTo(p.x-radius*.707,p.y-sign*radius*.707);ctx.lineTo(p.x+radius*.707,p.y+sign*radius*.707);}ctx.stroke();
    if(a.kind==='pull'){ctx.strokeStyle=a.blocked?'#ff626d':'#72efb2';ctx.lineWidth=3;ctx.setLineDash([7,7]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(a.end.x,a.end.y);ctx.stroke();ctx.setLineDash([]);}
    else{ctx.strokeStyle='rgba(80,168,255,.2)';ctx.lineWidth=R*2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(a.end.x,a.end.y);ctx.stroke();ctx.strokeStyle='rgba(120,198,255,.8)';ctx.lineWidth=1.5;ctx.stroke();ctx.beginPath();ctx.arc(a.end.x,a.end.y,R,0,Math.PI*2);ctx.stroke();}
  }
  for(const a of s.attacks)shape(a.followOwner?{...a,x:s.players[a.owner].x,y:s.players[a.owner].y}:a,.12+.16*(1-clamp(a.windup/a.total,0,1)));
  for(const b of s.bombs){if(b.fuse<=.8)shape({...b,kind:'circle'},.15+(.8-b.fuse)*.17);ctx.fillStyle='#191e25';ctx.strokeStyle=attackColor(b.owner);ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,b.y,11,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=attackColor(b.owner);ctx.fillRect(b.x-3,b.y-3,6,6);ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.fillText(b.fuse.toFixed(1),b.x,b.y-19);}
  for(const link of s.links)for(const line of link.lines){if(link.windup>0){shape({...line,owner:link.owner});}else{ctx.strokeStyle=link.ultimate?'#f3d66c':attackColor(link.owner);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(line.x,line.y);ctx.lineTo(line.end.x,line.end.y);ctx.stroke();ctx.strokeStyle=rgba(link.owner,.12);ctx.lineWidth=line.width;ctx.stroke();}}
  for(const d of s.discs){ctx.fillStyle=d.ultimate?'#f5d75e':attackColor(d.owner);ctx.beginPath();ctx.arc(d.x,d.y,5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#0b1117';ctx.lineWidth=2;ctx.stroke();}
  for(const p of s.players)if(p.grapple){const g=p.grapple;ctx.strokeStyle=local(p.id)?'#99d9fc':'#ffafb3';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(g.x,g.y);ctx.stroke();ctx.fillStyle=ctx.strokeStyle;ctx.fillRect(g.x-3,g.y-3,6,6);}
  for(const b of s.projectiles){ctx.strokeStyle=attackColor(b.owner);ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(b.x-b.dx*15,b.y-b.dy*15);ctx.lineTo(b.x,b.y);ctx.stroke();}
  ctx.lineCap='butt';
  for(const g of s.barriers){const[a,b]=ends(g);ctx.strokeStyle=g.ultimate?'#f3d579':local(g.owner)?'#b0eaff':'#ffaab1';ctx.lineWidth=g.thickness;ctx.globalAlpha=g.active||g.kind==='shield'?.82:.35;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.globalAlpha=1;ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke();
    if(g.kind==='shield'){ctx.fillStyle='#f3f8ff';for(let j=0;j<g.hp;j++)ctx.fillRect(g.x-7+j*9,g.y-4,5,8);}}
  for(const p of s.players){const c=CHARACTERS[p.character as CharacterId];if(!c)continue;ctx.globalAlpha=p.hp>0?1:.32;
    if(p.ult>=100){ctx.strokeStyle='#ffe175';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,R+6,0,Math.PI*2);ctx.stroke();}
    if(p.invulnerable>0){ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(p.x,p.y,R+10,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
    ctx.fillStyle=c.color;ctx.beginPath();ctx.arc(p.x,p.y,R,0,Math.PI*2);ctx.fill();ctx.strokeStyle=local(p.id)?'#edfcff':'#181b22';ctx.lineWidth=2;ctx.stroke();
    ctx.strokeStyle='rgba(10,18,27,.65)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(p.x+Math.cos(p.angle)*7,p.y+Math.sin(p.angle)*7);ctx.lineTo(p.x+Math.cos(p.angle)*15,p.y+Math.sin(p.angle)*15);ctx.stroke();
    if(p.stun>0){ctx.strokeStyle='#f5e497';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y-23,13,4,0,0,Math.PI*2);ctx.stroke();}
    if(options.labels!==false){ctx.font='600 12px system-ui,sans-serif';ctx.textAlign='center';ctx.fillStyle=local(p.id)?'#eaf5ff':'#ffc6c9';ctx.fillText(s.names?.[p.id]||c.name,p.x,p.y-30);}
    const bx=p.x-28,by=p.y+25;
    if(p.character==='rian'){ctx.fillStyle='#142a2a';ctx.fillRect(bx,by-6,56,3);ctx.fillStyle='#83f9cf';ctx.fillRect(bx,by-6,56*clamp(p.charge/10,0,1),3);}
    ctx.fillStyle='#080c11';ctx.fillRect(bx-1,by-1,58,8);ctx.fillStyle=local(p.id)?'#a1e2d8':'#eb9099';ctx.fillRect(bx,by,56*clamp(p.hp/p.maxHp,0,1),6);
    ctx.fillStyle='#080c11';ctx.fillRect(bx-1,by+9,58,5);ctx.fillStyle='#639ed6';ctx.fillRect(bx,by+10,56*clamp(p.stamina/100,0,1),3);ctx.globalAlpha=1;
  }
  for(const e of s.effects){const alpha=clamp(e.life*3,0,1);ctx.globalAlpha=alpha;
    if(e.kind==='contact'){ctx.fillStyle=rgba(e.owner,.1);ctx.strokeStyle=attackColor(e.owner);ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,e.radius,0,Math.PI*2);ctx.fill();ctx.stroke();}
    if(e.kind==='hit'){ctx.fillStyle='#fff';ctx.font='bold 17px monospace';ctx.textAlign='center';ctx.fillText(String(e.amount),e.x,e.y-36-(.5-e.life)*35);ctx.strokeStyle=attackColor(e.owner);ctx.lineWidth=2;for(let j=0;j<6;j++){const a=j/6*Math.PI*2,r=19+(.5-e.life)*24;ctx.beginPath();ctx.moveTo(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r);ctx.lineTo(e.x+Math.cos(a)*(r+7),e.y+Math.sin(a)*(r+7));ctx.stroke();}}
    if(e.kind==='slash'){ctx.strokeStyle=attackColor(e.owner);ctx.lineWidth=3;const a=Math.atan2(e.dy,e.dx);ctx.beginPath();ctx.arc(e.x,e.y,e.radius*.8,a-e.angle,a+e.angle);ctx.stroke();}
    if(e.kind==='explosion'){ctx.fillStyle=rgba(e.owner,.13);ctx.strokeStyle=attackColor(e.owner);ctx.lineWidth=3;ctx.beginPath();ctx.arc(e.x,e.y,e.radius*(1-e.life*.5),0,Math.PI*2);ctx.fill();ctx.stroke();}
    if(e.kind==='dash'){ctx.strokeStyle='#b5dae4';ctx.lineWidth=12;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x-e.dx*28,e.y-e.dy*28);ctx.stroke();}
    if(e.kind==='gravity'||e.kind==='pull'){ctx.strokeStyle=attackColor(e.owner);ctx.lineWidth=18;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.end.x,e.end.y);ctx.stroke();}
    if(e.kind==='swap'||e.kind==='dodge'||e.kind==='respawn'){ctx.strokeStyle=e.kind==='dodge'?'#fff':attackColor(e.owner);ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,22+(1-alpha)*27,0,Math.PI*2);ctx.stroke();}
    if(e.kind==='shatter'||e.kind==='glasshit'){ctx.strokeStyle='#c8edf7';ctx.lineWidth=2;for(let j=0;j<8;j++){const a=j*.8,r=12+(1-alpha)*35;ctx.beginPath();ctx.moveTo(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r);ctx.lineTo(e.x+Math.cos(a)*r+6,e.y+Math.sin(a)*r-8);ctx.stroke();}}
    if(e.kind==='network'){ctx.strokeStyle='#f4d770';ctx.lineWidth=3;for(const line of e.lines){ctx.beginPath();ctx.moveTo(line.x,line.y);ctx.lineTo(line.end.x,line.end.y);ctx.stroke();}}
    if(e.kind==='rewind'){ctx.strokeStyle='#afffe2';ctx.lineWidth=3;ctx.strokeRect(30+(1-alpha)*60,30+(1-alpha)*40,W-60-(1-alpha)*120,H-60-(1-alpha)*80);}
    ctx.globalAlpha=1;
  }
  if(options.crosshair){const{x,y}=options.crosshair;ctx.strokeStyle='#d5e4ef';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-7,y);ctx.lineTo(x-3,y);ctx.moveTo(x+3,y);ctx.lineTo(x+7,y);ctx.moveTo(x,y-7);ctx.lineTo(x,y-3);ctx.moveTo(x,y+3);ctx.lineTo(x,y+7);ctx.stroke();}
  ctx.restore();
}

