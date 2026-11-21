const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const html=fs.readFileSync(path.join(__dirname,'dist/index.html'),'utf8');
function launch(saved){
 const errors=[],requests=[],vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!e.message.includes('CSS stylesheet'))errors.push(e.message);});
 const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://solo.test/index.html',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  w.ResizeObserver=class{observe(){}};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.Element.prototype.animate=()=>({cancel(){},onfinish:null});
  w.fetch=async url=>{requests.push(String(url));throw Error('Offline test');};
  w.localStorage.setItem('dh_player_nickname_v1','Solo tester');
  if(saved)w.localStorage.setItem('deconstructing_hangman_solo_v1_60ZY',JSON.stringify(saved));
 }});
 return {dom,w:dom.window,errors,requests};
}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
test('Solo home, accessible coming-soon dialog and all eight character choices work without Duo',async()=>{
 const app=launch();try{const {w}=app,d=w.document;await pause(30);
 assert.equal(d.querySelector('#gameWelcome .welcome-hit').classList.contains('welcome-solo'),true);
 assert.equal(d.querySelector('.coming-ribbon').textContent,'COMING SOON');
 d.querySelector('.welcome-friend').click();assert.equal(d.getElementById('soloComingSoon').hidden,false);assert.equal(d.getElementById('duoConnection'),null);assert.equal(d.getElementById('duoPreview'),null);
 d.getElementById('soloComingSoonClose').click();assert.equal(d.getElementById('soloComingSoon').hidden,true);
 w.__dhGalleryReady=()=>true;d.querySelector('.welcome-solo').click();assert.equal(d.getElementById('characterScreen').hidden,false);
 const frame=d.getElementById('characterFrame');
 for(const character of ['MR HOBO','MR FARMER','MISS WORLD','MISS BALLERINA','THE QUEEN','MR MUSCLES','MR SURFER','MISS NIGHTLIFE']){
  w.dispatchEvent(new w.MessageEvent('message',{source:frame.contentWindow,data:{type:'dh-character-picked',character}}));await pause(10);
  assert.equal(d.getElementById('freshName').textContent,character);assert.equal(d.getElementById('freshSolo').hidden,false);
  assert.equal(d.getElementById('freshWager').options.length,7);
 }
 assert.deepEqual(app.errors,[]);assert.equal(app.requests.some(url=>url.includes('/.netlify/functions/')),false);
 }finally{app.w.close();}
});
test('Solo question, wrong-answer deduction and refresh restore preserve progress',async()=>{
 const app=launch();let saved;try{const {w}=app,d=w.document;await pause(20);w.__dhGalleryReady=()=>true;d.querySelector('.welcome-solo').click();const frame=d.getElementById('characterFrame');w.dispatchEvent(new w.MessageEvent('message',{source:frame.contentWindow,data:{type:'dh-character-picked',character:'MR MUSCLES'}}));await pause(20);
 const wager=d.getElementById('freshWager');wager.selectedIndex=1;wager.dispatchEvent(new w.Event('change'));assert.equal(d.getElementById('freshLock').disabled,false);await d.getElementById('freshLock').onclick();await pause(30);
 const question=w.soloGetSavedV1().question;assert.ok(question);const before=w.soloGetSavedV1().balance;
 const buttons=[...d.querySelectorAll('#freshSolo .demo-question button')];assert.equal(buttons.length,4);buttons[(question.item.correct+1)%4].click();await pause(20);
 saved=w.soloGetSavedV1();assert.equal(saved.balance,before-question.cost);assert.ok(saved.lost.includes(question.part));assert.equal(saved.character,'MR MUSCLES');assert.deepEqual(app.errors,[]);
 }finally{app.w.close();}
 const restored=launch(saved);try{await pause(20);restored.w.openSolo('MR MUSCLES');await pause(3700);const current=restored.w.soloGetSavedV1();assert.equal(current.balance,saved.balance);assert.deepEqual(Array.from(current.lost),Array.from(saved.lost));assert.equal(restored.w.document.getElementById('freshName').textContent,'MR MUSCLES');assert.deepEqual(restored.errors,[]);}finally{restored.w.close();}
});
test('portable image paths exist and every character script parses',()=>{
 const {window}=new JSDOM(html);const docs=[window.document];let scripts=0;
 while(docs.length){const doc=docs.pop();for(const frame of doc.querySelectorAll('iframe[srcdoc],iframe[data-gallery-srcdoc]')){docs.push(new JSDOM(frame.getAttribute('srcdoc')||frame.getAttribute('data-gallery-srcdoc')).window.document);}
 for(const script of doc.querySelectorAll('script')){new (require('node:vm').Script)(script.textContent);scripts++;}
 for(const match of doc.documentElement.outerHTML.matchAll(/game-assets\/[a-f0-9]+\.[a-z]+/g))assert.ok(fs.existsSync(path.join(__dirname,'dist',match[0])));
 }
 assert.ok(scripts>=40);window.close();assert.equal(html.includes('"/game-assets/'),false);
});
