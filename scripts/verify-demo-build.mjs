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
console.log('PASS: separate demo graph has no game transport/storage/API; complete notices shipped.',{demoModules:seen.size});
