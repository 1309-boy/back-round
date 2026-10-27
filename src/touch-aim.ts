import {W,H} from '../shared/data.ts';
export const AIM_STICK_RADIUS=42,AIM_CANCEL_RADIUS=140,AIM_DEAD_ZONE=4;
export function aimFromDrag(origin:{x:number;y:number},dx:number,dy:number){
  const distance=Math.hypot(dx,dy),dragged=distance>AIM_DEAD_ZONE;
  if(!Number.isFinite(distance))return {x:origin.x,y:origin.y,dragged:false,cancelled:true,knobX:0,knobY:0};
  const nx=distance?dx/distance:1,ny=distance?dy/distance:0;
  let range=Math.hypot(W,H)*Math.min(1,distance/AIM_STICK_RADIUS)**2;
  if(nx>0)range=Math.min(range,(W-origin.x)/nx);else if(nx<0)range=Math.min(range,-origin.x/nx);
  if(ny>0)range=Math.min(range,(H-origin.y)/ny);else if(ny<0)range=Math.min(range,-origin.y/ny);
  const knob=Math.min(24,distance);
  return {x:origin.x+nx*range,y:origin.y+ny*range,dragged,cancelled:distance>AIM_CANCEL_RADIUS,knobX:nx*knob,knobY:ny*knob};
}
