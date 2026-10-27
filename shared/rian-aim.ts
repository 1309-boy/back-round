import { R,MAPS } from './data.ts';
import { cardinal,distance,raycast,ends,raySegment,rayRect } from './geometry.ts';

/** Read-only prediction using the same wall clearance and targeting as skill 2. */
export function rianAimPreview(state:any,seat:number,aim:{x:number;y:number}){
  const p=state.players[seat],q=state.players[1-seat],walls=MAPS[state.mapIndex].walls;
  const glass=state.barriers.filter((g:any)=>!g.dead);
  const direction=cardinal(p,aim);
  if(distance(aim,q)<=R+5){
    const blocked=walls.some(w=>rayRect(p,q,w)!==null)||glass.some((g:any)=>{const[a,b]=ends(g);return raySegment(p,q,a,b)!==null;});
    return {kind:'pull',origin:{x:p.x,y:p.y},end:{x:q.x,y:q.y},direction,blocked};
  }
  const hit=raycast(p,direction,walls,R+1);let end={x:hit.x,y:hit.y};
  for(const g of glass){const[a,b]=ends(g),t=raySegment(p,end,a,b);if(t!==null)end={x:p.x+(end.x-p.x)*t-direction.x*(R+7),y:p.y+(end.y-p.y)*t-direction.y*(R+7)};}
  return {kind:'move',origin:{x:p.x,y:p.y},end,direction,blocked:false};
}
