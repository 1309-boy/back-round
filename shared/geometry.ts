import { W,H,R, type Wall } from './data.ts';
export const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export const length=(x:number,y:number)=>Math.hypot(x,y);
export const distance=(a:any,b:any)=>Math.hypot(a.x-b.x,a.y-b.y);
export const unit=(x:number,y:number)=>{const l=Math.hypot(x,y)||1;return {x:x/l,y:y/l};};
export const toward=(a:any,b:any)=>unit(b.x-a.x,b.y-a.y);
export function cardinal(a:any,b:any){const dx=b.x-a.x,dy=b.y-a.y;return Math.abs(dx)>=Math.abs(dy)?{x:dx>=0?1:-1,y:0}:{x:0,y:dy>=0?1:-1};}
export function circleRect(p:any,r:number,w:Wall){return Math.hypot(p.x-clamp(p.x,w.x,w.x+w.w),p.y-clamp(p.y,w.y,w.y+w.h))<r;}
export const inside=(p:any,w:Wall)=>p.x>=w.x&&p.x<=w.x+w.w&&p.y>=w.y&&p.y<=w.y+w.h;
export function pointSegment(p:any,a:any,b:any){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;const t=l?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/l,0,1):0;return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);}
export function rayRect(a:any,b:any,w:Wall):number|null {
  let min=0,max=1;for(const k of ['x','y'] as const){const d=b[k]-a[k],lo=w[k],hi=w[k]+(k==='x'?w.w:w.h);if(Math.abs(d)<1e-9){if(a[k]<lo||a[k]>hi)return null;}else{let t1=(lo-a[k])/d,t2=(hi-a[k])/d;if(t1>t2)[t1,t2]=[t2,t1];min=Math.max(min,t1);max=Math.min(max,t2);if(min>max)return null;}}return min;
}
export function raySegment(a:any,b:any,c:any,d:any):number|null {const rx=b.x-a.x,ry=b.y-a.y,sx=d.x-c.x,sy=d.y-c.y,den=rx*sy-ry*sx;if(Math.abs(den)<1e-8)return null;const t=((c.x-a.x)*sy-(c.y-a.y)*sx)/den,u=((c.x-a.x)*ry-(c.y-a.y)*rx)/den;return t>=0&&t<=1&&u>=0&&u<=1?t:null;}
export function ends(g:any){return [{x:g.x-g.dy*g.width/2,y:g.y+g.dx*g.width/2},{x:g.x+g.dy*g.width/2,y:g.y-g.dx*g.width/2}];}
export function circleBarrier(p:any,r:number,g:any){const [a,b]=ends(g);return pointSegment(p,a,b)<r+g.thickness/2;}
export function intersectsShape(shape:any,p:any,r=R){
  if(shape.kind==='circle')return distance(shape,p)<=shape.radius+r;
  if(shape.kind==='line')return pointSegment(p,shape,shape.end)<=shape.width/2+r;
  const d=distance(shape,p);if(d>shape.radius+r)return false;if(d<r)return true;const u=toward(shape,p);return u.x*shape.dx+u.y*shape.dy>=Math.cos(shape.angle+Math.asin(Math.min(1,r/d)));
}
export function raycast(a:any,d:any,walls:Wall[],radius=0){const far={x:a.x+d.x*2400,y:a.y+d.y*2400};let t=1,wall:Wall|null=null;for(const w of walls){const v=rayRect(a,far,{...w,x:w.x-radius,y:w.y-radius,w:w.w+2*radius,h:w.h+2*radius});if(v!==null&&v<t){t=v;wall=w;}}
 const p={x:a.x+(far.x-a.x)*t,y:a.y+(far.y-a.y)*t};return {...p,wall,face:wall?wallFace(p,wall):'none'};
}
export function wallFace(_p:any,w:Wall){return w.w>=w.h?`horizontal:${w.y+w.h/2}`:`vertical:${w.x+w.w/2}`;}
export function freePosition(p:any,walls:Wall[],glass:any[]=[],r=R){return p.x>=20+r&&p.x<=W-20-r&&p.y>=20+r&&p.y<=H-20-r&&!walls.some(w=>circleRect(p,r,w))&&!glass.some(g=>!g.dead&&circleBarrier(p,r,g));}
