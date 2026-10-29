"""Offline asset production only. No inference tools are deployed with the game."""
import pathlib,json,subprocess,concurrent.futures,wave,math,sys
from array import array
ROOT=pathlib.Path(__file__).resolve().parents[2]
CACHE=pathlib.Path('/private/tmp/moonlight-audio-preview-20261028')
EXE=CACHE/'sherpa-onnx-v2.0.1-osx-arm64-shared/bin/sherpa-onnx-offline-tts'
approved=json.loads((ROOT/'design/approved-audio/narration-manifest.json').read_text())
scenes=[{'key':key,'text':{lang:approved[lang][key]['text'] for lang in ['en','zh']}} for key in approved['en']]
if len(sys.argv)>1:scenes=[scene for scene in scenes if scene['key'] in sys.argv[1:]]
out=ROOT/'public/audio/narration';manifest={}
def render(lang):
 (out/lang).mkdir(parents=True,exist_ok=True)
 stats=dict(approved[lang])
 for scene in scenes:
  key=scene['key'];target=out/lang/(key+'.wav');m=CACHE/lang
  cmd=[str(EXE),'--print-args=false','--num-threads=2','--sid=0','--speed='+('.95' if lang=='en' else '.96'),'--tts-silence-scale=.45','--vits-noise-scale=.45','--vits-noise-scale-w=.65','--vits-model='+str(m/('model.int8.onnx' if lang=='zh' else 'model.onnx')),'--vits-lexicon='+str(m/'lexicon.txt'),'--vits-tokens='+str(m/'tokens.txt'),'--output-filename='+str(target),scene['text'][lang]]
  r=subprocess.run(cmd,capture_output=True,text=True,timeout=40)
  if r.returncode:raise RuntimeError(r.stderr[-1500:])
  with wave.open(str(target),'rb') as w:rate=w.getframerate();data=array('h');data.frombytes(w.readframes(w.getnframes()))
  active=[i for i in range(0,len(data),220) if max(abs(v) for v in data[i:i+220])>150]
  if active:data=data[max(0,active[0]-int(.09*rate)):min(len(data),active[-1]+int(.15*rate))]
  peak=max(abs(v) for v in data);rms=math.sqrt(sum(v*v for v in data)/len(data));gain=min(22000/max(1,peak),(32768*10**(-21/20))/max(1,rms))
  data=array('h',(round(v*gain) for v in data))
  with wave.open(str(target),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(data.tobytes())
  seconds=len(data)/rate
  limit={'nightfall':4.6,'verdict':7.5,'dawn':7.5,'dawn-peaceful':7.5,'dawn-deaths':7.5}.get(key,14 if key=='seer' else 19 if key=='witch' else 30)
  if seconds>limit:raise RuntimeError(f'Clip exceeds phase budget: {lang}/{key}: {seconds}')
  encoded=target.with_suffix('.new.m4a');encoded.unlink(missing_ok=True)
  subprocess.run(['/usr/bin/afconvert','-f','m4af','-d','aac ','-b','80000',str(target),str(encoded)],check=True)
  encoded.replace(target.with_suffix('.m4a'))
  target.unlink();stats[key]={'text':scene['text'][lang],'duration':round(seconds,3),'bytes':target.with_suffix('.m4a').stat().st_size}
  print(lang,key,round(seconds,2),flush=True)
 return lang,stats
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 for lang,stats in pool.map(render,['en','zh']):manifest[lang]=stats
(ROOT/'design/approved-audio/narration-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
