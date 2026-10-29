// Build-time release helper; reads installed runtime packages only. No network calls.
import {readFile,readdir,writeFile,access} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(), manifest=JSON.parse(await readFile('package.json','utf8'));
const packages=new Map();
async function findPackage(name,from){let dir=from;for(;;){const candidate=path.join(dir,'node_modules',name);try{await access(path.join(candidate,'package.json'));return candidate}catch{}const parent=path.dirname(dir);if(parent===dir)return null;dir=parent}}
async function visit(name,from){const dir=await findPackage(name,from);if(!dir)return;const pkg=JSON.parse(await readFile(path.join(dir,'package.json'),'utf8'));const key=pkg.name+'@'+pkg.version;if(packages.has(key))return;packages.set(key,{pkg,dir});for(const dep of Object.keys({...pkg.dependencies,...pkg.optionalDependencies}))await visit(dep,dir)}
for(const name of Object.keys(manifest.dependencies))await visit(name,root);
let result='MOONLIGHT — THIRD-PARTY NOTICES\n\nThis file retains notices for installed runtime packages and bundled assets.\nIt does not grant a license to Moonlight original source code.\n\n';
result+='ARTWORK\nFour AI-assisted character portraits generated for Moonlight; project prompts and source images are retained. No claim of exclusive copyright or third-party endorsement.\n\n';
result+=await readFile('public/audio/CREDITS.txt','utf8');
result+='\n\nMELOTTS MODEL NOTICE\n'+await readFile('public/audio/MELOTTS-LICENSE.txt','utf8');
const missing=[];
for(const [key,{pkg,dir}] of [...packages].sort(([a],[b])=>a.localeCompare(b))){
 const files=(await readdir(dir)).filter(name=>/^(?:licen[cs]e|copying|notice|ofl)(?:[._-]|$)/i.test(name));
 result+='\n\n'+'='.repeat(72)+'\n'+key+'\nDeclared license: '+String(pkg.license??'See upstream notices')+'\n';
 if(pkg.homepage)result+='Upstream: '+pkg.homepage+'\n';
 if(!files.length)missing.push(key);
 for(const file of files){try{result+='\n--- '+file+' ---\n'+await readFile(path.join(dir,file),'utf8')+'\n'}catch{}}
}
if(missing.length)throw Error('Missing notice files: '+missing.join(', '));
// Lucide's installed notice identifies Feather-derived portions as MIT.
// Retain the corresponding complete MIT terms as well as Lucide's ISC notice above.
const mit=await readFile('node_modules/react/LICENSE','utf8');
const permission=mit.slice(mit.indexOf('Permission is hereby granted'));
result+='\n\nFEATHER-DERIVED ICONS USED BY LUCIDE — MIT LICENSE\nCopyright (c) 2013-2022 Cole Bemis\n'+permission;
await writeFile('public/THIRD_PARTY_NOTICES.txt',result);
console.log('Retained notices for '+packages.size+' runtime packages plus fonts, audio and illustrations.');
