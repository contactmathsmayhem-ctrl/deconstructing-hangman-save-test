import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const partsDirectory=new URL('../game-payload/',import.meta.url);
const names=(await readdir(partsDirectory)).filter(n=>/^game\.html\.gz\.part\d{3}$/.test(n)).sort();
if(names.length!==11)throw Error('Expected all eleven game payload parts.');
const buffers=[];for(const name of names)buffers.push(await readFile(new URL(name,partsDirectory)));
const html=gunzipSync(Buffer.concat(buffers));
if(createHash('sha256').update(html).digest('hex')!=='5d328ec9f0964842f88c364575ec119c908f89ad74f0b1036efd8a58106e2090')throw Error('The game payload failed its integrity check.');
await mkdir(new URL('../public/',import.meta.url),{recursive:true});
// Keep large image bytes out of HTML attributes and inline script strings.
// The source payload hash above still validates the original approved artwork.
const assets=new Map();
function assetUrl(mime,base64){
 const bytes=Buffer.from(base64,'base64');
 const extension=({'image/png':'png','image/webp':'webp','image/jpeg':'jpg','image/gif':'gif','image/svg+xml':'svg'})[mime];
 if(!extension)throw Error('Unsupported embedded image: '+mime);
 const name=createHash('sha256').update(bytes).digest('hex')+'.'+extension;
 assets.set(name,bytes);return '/game-assets/'+name;
}
let optimized=html.toString('utf8').replace(/data:(image\/(?:png|webp|jpeg|gif|svg\+xml));base64,([A-Za-z0-9+/=]+)/g,(_,mime,data)=>assetUrl(mime,data));
// Four original character workshops store raw base64 in their parts maps.
// Preserve the surrounding quote encoding at every nested srcdoc level.
optimized=optimized.replace(/("|'|&(?:amp;)*quot;)((?:iVBORw0KGgo|PHN2Zy|PD94bW)[A-Za-z0-9+/=]{128,})\1/g,(_,quote,data)=>{
 const bytes=Buffer.from(data,'base64');
 const mime=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'image/png':/^\s*(?:<\?xml|<svg)/.test(bytes.toString('utf8',0,100))?'image/svg+xml':null;
 if(!mime)throw Error('Unrecognized character part image.');
 return quote+assetUrl(mime,data)+quote;
});
optimized=optimized.replaceAll("img.src='data:image/png;base64,'+parts[key]","img.src=parts[key]")
 .replaceAll("img.src='data:image/'+(key==='shoes'?'svg+xml':'png')+';base64,'+parts[key]","img.src=parts[key]");
if(optimized.length>1000000)throw Error('The game page still contains oversized embedded artwork.');
await mkdir(new URL('../public/game-assets/',import.meta.url),{recursive:true});
for(const [name,bytes]of assets)await writeFile(new URL('../public/game-assets/'+name,import.meta.url),bytes);
console.log('Extracted '+assets.size+' unchanged image files; page is '+optimized.length+' characters.');

// Temporary explicit top-up for this connected test deployment only.
optimized=optimized.replace("ad.textContent='WATCH AN AD FOR FIFTY'", "ad.textContent='ADD 50 FOR TESTING'")
 .replace("ad.onclick=openDuoAd;", "ad.onclick=()=>{if(network){networkAction('testTopUp',{});return;}openDuoAd();};")
 .replace("networkAction('testCredit',{amount:50}", "networkAction('testTopUp',{}")
 .replace('WATCH AN AD FOR FIFTY</button>', 'ADD 50 FOR TESTING</button>')
 .replace('Watch an ad for fifty, or visit the shop.', 'Use the temporary test top-up to add fifty Slime Bucks.')
 .replace("document.getElementById('duoLowAd').onclick=()=>{shortage.hidden=true;openDuoAd();};", "document.getElementById('duoLowAd').onclick=()=>{shortage.hidden=true;if(network){networkAction('testTopUp',{});return;}openDuoAd();};");
const messagesUI=await readFile(new URL('../client/messages.js',import.meta.url),'utf8');
optimized=optimized.replace("message.onclick=()=>alert('Messages will be available when your friend is connected.');", "message.dataset.messageDirection=isMine?'outgoing':'incoming';message.onclick=()=>openMessages(isMine);")
 .replace(' function playerNickname(){',messagesUI+'\n function playerNickname(){')
 .replace(' }\n function startOnlineClock(){', '  syncMessages();\n }\n function startOnlineClock(){')
 .replace("const previous=networkState;networkState=state;", "const previous=networkState;networkState=state;")
 .replace("function disconnectOnline(){networkGeneration++;", "function disconnectOnline(){resetMessages();networkGeneration++;")
 .replace("if(state.version===networkLastVersion){startOnlineClock();return;}", "if(state.version===networkLastVersion){syncMessages();startOnlineClock();return;}");
const diagnostics='<script id="welcome-navigation-diagnostics">\n(function(){\n const errors=[];let timer;\n window.addEventListener(\'error\',event=>{if(event.message)errors.push(event.message+\' (line \'+event.lineno+\')\');});\n window.addEventListener(\'unhandledrejection\',event=>errors.push(String(event.reason?.message||event.reason)));\n function report(){\n  const loading=document.documentElement.classList.contains(\'dh-selector-start\');\n  const welcome=document.getElementById(\'gameWelcome\');\n  const connection=document.getElementById(\'duoConnection\');\n  if(!loading&&(welcome?.hidden||connection&&!connection.hidden))return;\n  let box=document.getElementById(\'navigationError\');if(!box){box=document.createElement(\'div\');box.id=\'navigationError\';box.style.cssText=\'position:fixed;left:3%;right:3%;top:12px;z-index:2147483647;background:#310b45;color:white;border:3px solid #baff18;border-radius:14px;padding:18px;font:18px/1.5 Arial;white-space:pre-wrap\';document.body.appendChild(box);}\n  box.textContent=\'LOADING CHECK — ZK1\\n\'+(errors.length?errors.join(\'\\n\'):\'No script error recorded.\')+\'\\nGame scripts finished: \'+(window.__dhPageComplete?\'yes\':\'no\')+\'\\nConnection controls created: \'+(connection?\'yes\':\'no\')+\'\\nPlease send a screenshot of this message.\';\n }\n document.addEventListener(\'click\',event=>{if(event.target.closest?.(\'.welcome-hit\')){clearTimeout(timer);timer=setTimeout(report,20000);}},true);\n})();\n</script>\n';
const page=optimized.replace('<head>','<head>'+diagnostics).replace('</body>', '<script>window.__dhPageComplete=true;</script></body>');
await writeFile(new URL('../public/index.html',import.meta.url),page);
console.log('Restored exact 60ZZ14ZK game HTML: '+html.length+' bytes.');
