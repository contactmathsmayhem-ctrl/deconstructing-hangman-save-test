import {readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const source=new URL('../duo-connected-test-60zz14zk/',import.meta.url);
execFileSync(process.execPath,[new URL('scripts/assemble-game.mjs',source).pathname],{stdio:'inherit'});
let html=await readFile(new URL('public/index.html',source),'utf8');
for(const id of ['doubles-preview-route-60zz14h','welcome-navigation-diagnostics']){
 const pattern=new RegExp('<script id="'+id+'">[\\s\\S]*?<\\/script>');
 if(!pattern.test(html))throw Error('Missing expected script: '+id);
 html=html.replace(pattern,'');
}
html=html.replace(/<button class="welcome-hit welcome-friend"[\s\S]*?<\/button>/,
 '<button class="welcome-hit welcome-friend" type="button" aria-label="Challenge a friend — coming soon" onclick="window.showDuoComingSoon()"><span>CHALLENGE A FRIEND</span><small>Coming in a future update</small><em class="coming-ribbon" aria-hidden="true">COMING SOON</em></button>');
html=html.replace(/<button class="welcome-hit welcome-solo"[\s\S]*?<\/button>/,
 '<button class="welcome-hit welcome-solo" type="button" aria-label="Play Solo — choose your character" onclick="chooseMode(\'solo\')"><span>PLAY SOLO</span><small>Choose your character</small></button>');
html=html.replace(/(<button class="welcome-hit welcome-friend"[\s\S]*?<\/button>)(\s*)(<button class="welcome-hit welcome-solo"[\s\S]*?<\/button>)/,'$3$2$1');
html=html.replace(/<div class="fresh-note">[\s\S]*?<\/div>/,'');
html=html.replaceAll('/game-assets/','game-assets/');
html=html.replace('<title>','<meta name="hangman-edition" content="Solo Focus 01 — 2026-11-22"><title>');
const css=await readFile(new URL('./welcome.css',import.meta.url),'utf8');
const js=await readFile(new URL('./welcome.js',import.meta.url),'utf8');
html=html.replace('</head>','<style id="solo-focus-home">'+css+'</style></head>');
const end=html.lastIndexOf('</body>');if(end<0)throw Error('Missing closing body.');
html=html.slice(0,end)+'<script id="solo-focus-welcome">'+js+'</script>'+html.slice(end);
if(html.includes("op:'create'")||html.includes('doubles-preview-route-60zz14h'))throw Error('Duo controller remains active.');
const out=new URL('./dist/',import.meta.url);await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
await writeFile(new URL('index.html',out),html);
await cp(new URL('public/game-assets/',source),new URL('game-assets/',out),{recursive:true});
console.log('Built separate Solo Focus 01: '+Buffer.byteLength(html)+' HTML bytes.');
