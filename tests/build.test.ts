import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
test('published entry uses content-versioned assets while the standalone game stays self contained',async()=>{
 const html=await readFile('dist/index.html','utf8'),jsPath=html.match(/src="\.\/assets\/(app\.[a-f0-9]{12}\.js)"/)?.[1],cssPath=html.match(/href="\.\/assets\/(app\.[a-f0-9]{12}\.css)"/)?.[1];
 assert.ok(jsPath);assert.ok(cssPath);
 assert.equal(await readFile('dist/assets/'+jsPath,'utf8'),await readFile('dist/assets/app.js','utf8'));
 assert.equal(await readFile('dist/assets/'+cssPath,'utf8'),await readFile('dist/assets/app.css','utf8'));
 const standalone=await readFile('dist/Back-round-beta.html','utf8');assert.ok(!standalone.includes('src="./assets/'));assert.ok(!standalone.includes('href="./assets/'));
});
