import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const manifest=JSON.parse(await readFile('dist/client/.vite/manifest.json','utf8'));
const seen=new Set();
function visit(key){assert(manifest[key],`Missing module ${key}`);if(seen.has(key))return;seen.add(key);for(const p of manifest[key].imports??[])visit(p);for(const p of manifest[key].dynamicImports??[])visit(p)}
visit('demo.html');
// Vite's module-preload helper can fetch static JS assets; game APIs/transport/storage are forbidden.
for(const key of seen){const source=await readFile('dist/client/'+manifest[key].file,'utf8');assert(!/socket\.io|moonlight\.seat|localStorage|sessionStorage|\/api\/|WebSocket|XMLHttpRequest/.test(source),`Demo imports game/network/storage code: ${key}`)}
const notices=await readFile('dist/client/THIRD_PARTY_NOTICES.txt','utf8');
for(const required of ['Kevin MacLeod','MyShell.ai','SIL OPEN FONT LICENSE','Lucide','ISC License','FEATHER-DERIVED ICONS','react@','socket.io-client@'])assert(notices.includes(required),`Missing ${required}`);
const entry=JSON.parse(await readFile('submission/entry.json','utf8'));
assert(entry.title && entry.url==='https://moonlight-werewolf-party.onrender.com/' && entry.description.length<500);
const image=await readFile('submission/'+entry.cover);assert.equal(image.readUInt16BE(0),0xffd8);
let dimensions;for(let offset=2;offset<image.length;){if(image[offset++]!==0xff)continue;let marker=image[offset++];while(marker===0xff)marker=image[offset++];if(marker===0xd9||marker===0xda)break;const length=image.readUInt16BE(offset);if([0xc0,0xc1,0xc2].includes(marker)){dimensions={height:image.readUInt16BE(offset+3),width:image.readUInt16BE(offset+5)};break}offset+=length}
assert(dimensions&&dimensions.width>=1200&&dimensions.width/dimensions.height===1.5,'Cover must be at least 1200px and 3:2');
console.log('PASS: separate demo graph has no game transport/storage/API; complete notices shipped; four submission items valid.',{demoModules:seen.size,cover:dimensions,descriptionCharacters:entry.description.length});
