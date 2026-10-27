import test from 'node:test';
import assert from 'node:assert/strict';
import {aimFromDrag} from '../src/touch-aim.ts';
import {W,H} from '../shared/data.ts';
test('skill joystick aims from the moving character rather than the button screen position',()=>{
 const a=aimFromDrag({x:170,y:380},14,-7),b=aimFromDrag({x:270,y:380},14,-7);
 assert.ok(a.x>170&&a.y<380);assert.ok(Math.abs((a.x-170)/(380-a.y)-2)<1e-9);
 assert.ok(Math.abs((b.x-a.x)-100)<1e-9);assert.equal(a.y,b.y);
});
test('joystick targeting clips to the arena boundary without changing the requested direction',()=>{
 const a=aimFromDrag({x:W-15,y:H/2},42,21);
 assert.equal(a.x,W);assert.ok(Math.abs((a.y-H/2)-7.5)<1e-9);
});
test('dead zone permits tapping, far drag cancels, and thumb movement remains bounded',()=>{
 assert.equal(aimFromDrag({x:170,y:380},2,1).dragged,false);
 const a=aimFromDrag({x:170,y:380},141,0);assert.equal(a.cancelled,true);assert.equal(a.knobX,24);
 assert.equal(aimFromDrag({x:170,y:380},NaN,0).cancelled,true);
});
