import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {banks,wagers,characters} from './rules.mjs';
export class GameError extends Error {constructor(message,status=409){super(message);this.status=status;}}
const fail=(message,status)=>{throw new GameError(message,status)};
export const token=()=>randomBytes(32).toString('base64url');
export const digest=v=>createHash('sha256').update(v).digest('hex');
const equal=(a,b)=>a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function inviteCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return [...randomBytes(10)].map(b=>alphabet[b%32]).join('');}
export function nickname(value){if(typeof value!=='string')fail('Enter a nickname.',400);const name=value.trim();if(!name||name.length>32||/[\x00-\x1f<>]/.test(name))fail('Use a nickname of 1–32 plain-text characters.',400);return name;}
const player=(name,secret)=>({name:nickname(name),tokenHash:digest(secret),character:null,balance:90,lost:[],part:null,locked:false,answer:null,answered:false,closed:false,next:'choice'});
export function createRoom(code,name,secret,now=Date.now()){return {code,version:1,createdAt:now,expiresAt:now+6*3600000,phase:'lobby',round:1,difficulty:'MEDIUM',players:[player(name,secret),null],question:null,deadline:null,outcome:null,seen:[],used:{EASY:[],MEDIUM:[],HARD:[]}};}
export function authorize(room,secret){if(typeof secret!=='string'||secret.length>100)fail('Invalid player token.',401);const hash=digest(secret);const seat=room.players.findIndex(p=>p&&equal(p.tokenHash,hash));if(seat<0)fail('Invalid player token.',401);return seat;}
export function joinRoom(room,name,secret){if(room.players[1])fail('This match already has two players.');room.players[1]=player(name,secret);room.version++;}
function shuffle(values){const copy=values.slice();for(let i=copy.length-1;i>0;i--){const r=randomBytes(4).readUInt32BE()/4294967296;const j=Math.floor(r*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
function questionFor(room){const bank=banks[room.difficulty];if(room.used[room.difficulty].length>=bank.length)room.used[room.difficulty]=[];const left=bank.map((_,i)=>i).filter(i=>!room.used[room.difficulty].includes(i));const i=shuffle(left)[0];room.used[room.difficulty].push(i);const row=bank[i],answers=shuffle(row.slice(1,5));return {text:row[0],answers,correct:answers.indexOf(row[1]),explanation:row[5]};}
function clearRound(room){room.question=null;room.deadline=null;for(const p of room.players){p.part=null;p.locked=false;p.answer=null;p.answered=false;p.closed=false;}}
function startWagers(room){clearRound(room);room.phase='wager';}
function settle(room){if(room.phase!=='question'||!room.players.every(p=>p.answered))return;for(const p of room.players){if(p.answer===room.question.correct)continue;const row=wagers[p.character].find(r=>r[0]===p.part);p.balance-=row[1];if(!p.lost.includes(p.part))p.lost.push(p.part);}
const done=room.players.map(p=>p.lost.length===wagers[p.character].length);room.outcome=done[0]&&done[1]?'draw':done[0]?1:done[1]?0:null;if(typeof room.outcome==='number')room.players[room.outcome].balance+=20;room.phase='result';room.deadline=null;}
export function advance(room,now=Date.now()){if(room.phase!=='question'||now<room.deadline)return false;for(const p of room.players)if(!p.answered){p.answered=true;p.answer=-1;}settle(room);room.version++;return true;}
function finishChoices(room){if(!room.players.every(p=>p.next==='ready'))return;for(const p of room.players){p.lost=[];p.next='choice';}room.outcome=null;room.round++;startWagers(room);}
export function act(room,seat,action,now=Date.now(),allowTest=false,allowTestTopUp=false){
 if(room.expiresAt<=now)fail('This match has expired.',410);
 if(!action||typeof action.id!=='string'||!/^[-\w]{8,80}$/.test(action.id))fail('An action identifier is required.',400);
 const requestKey=seat+':'+action.id;
 if(room.seen.includes(requestKey))return;
 const p=room.players[seat];const kind=action.kind;
 if(['lock','answer','close','choice','rebuild','ready','character'].includes(kind)&&action.round!==room.round)fail('This round has changed. Refresh the match.');
 if(kind==='character'){
  if(!characters.includes(action.character))fail('Unknown character.',400);
  if(room.phase==='lobby'){p.character=action.character;if(room.players.every(x=>x?.character))startWagers(room);}
  else if(room.phase==='result'&&room.outcome!==null&&p.closed&&p.next==='new'){p.character=action.character;p.lost=[];p.next='ready';finishChoices(room);}
  else fail('A character cannot be changed during a round.');
 }else if(kind==='difficulty'){
  if(room.phase!=='wager'||room.players.some(x=>x.locked)||!banks[action.level])fail('Change difficulty before either wager is locked.');room.difficulty=action.level;
 }else if(kind==='lock'){
  if(room.phase!=='wager'||p.locked)fail('This wager is already locked.');const row=wagers[p.character]?.find(r=>r[0]===action.part);if(!row||p.lost.includes(action.part))fail('That item is unavailable.');if(row[1]>p.balance)fail('Not enough Slime Bucks.',402);p.part=action.part;p.locked=true;if(room.players.every(x=>x.locked)){room.question=questionFor(room);room.deadline=now+12000;room.phase='question';}
 }else if(kind==='answer'){
  if(room.phase!=='question'||p.answered||now>=room.deadline)fail('The answer is already locked or time is up.');if(!Number.isInteger(action.answer)||action.answer<0||action.answer>3)fail('Choose A, B, C or D.',400);p.answer=action.answer;p.answered=true;settle(room);
 }else if(kind==='close'){
  if(room.phase!=='result')fail('There is no result to close.');p.closed=true;if(room.outcome===null&&room.players.every(x=>x.closed)){room.round++;startWagers(room);}
 }else if(kind==='choice'){
  if(room.phase!=='result'||room.outcome===null||!p.closed||p.next!=='choice')fail('Finish the match result first.');if(!['same','new'].includes(action.choice))fail('Unknown rematch choice.',400);p.next=action.choice==='same'?'confirm':'new';
 }else if(kind==='rebuild'){
  if(p.next!=='confirm'||room.phase!=='result')fail('Choose the same character first.');p.next='rebuilding';p.rebuildAt=now;
 }else if(kind==='ready'){
  if(p.next!=='rebuilding'||now-p.rebuildAt<9600)fail('Finish rebuilding first.');p.next='ready';p.lost=[];finishChoices(room);
 }else if(kind==='message'){
  if(!room.players[1-seat])fail('Wait for your friend to join.');
  if(typeof action.text!=='string')fail('Type a message.',400);
  const text=action.text.replace(/\r\n?/g,'\n').trim();
  if(!text||[...text].length>280||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(text))fail('Use a message of 1–280 characters.',400);
  room.messageSeq=(room.messageSeq||0)+1;room.messages??=[];
  room.messages.push({id:room.messageSeq,from:seat,text,createdAt:now});room.messages=room.messages.slice(-40);
 }else if(kind==='dismissMessages'){
  if(!Number.isInteger(action.through)||action.through<0||action.through>(room.messageSeq||0))fail('Invalid message receipt.',400);
  p.messageRead=Math.max(p.messageRead||0,action.through);
 }else if(kind==='testTopUp'){

  if(!allowTestTopUp)fail('Test top-ups are disabled on this server.',403);if(p.balance>9999950)fail('The test balance limit has been reached.',400);p.balance+=50;
 }else if(kind==='testCredit'){
  if(!allowTest)fail('Test credits are disabled on this server.',403);if(!Number.isInteger(action.amount)||action.amount<1||action.amount>1000000||p.balance+action.amount>10000000)fail('Invalid test amount.',400);p.balance+=action.amount;
 }else fail('Unknown action.',400);
 room.seen.push(requestKey);room.seen=room.seen.slice(-128);room.version++;
}
export function snapshot(room,seat,now=Date.now()){
 const revealed=room.phase==='result';return {messages:room.messages||[],messageRead:room.players[seat].messageRead||0,code:room.code,version:room.version,round:room.round,phase:room.phase,difficulty:room.difficulty,deadline:room.deadline,serverNow:now,expiresAt:room.expiresAt,seat,availableWagers:room.players[seat].character?wagers[room.players[seat].character].filter(r=>!room.players[seat].lost.includes(r[0])):[],outcome:room.outcome,question:room.question?{text:room.question.text,answers:room.question.answers,...(revealed?{correct:room.question.correct,explanation:room.question.explanation}:{})}:null,players:room.players.map((p,i)=>p?{name:p.name,character:p.character,balance:i===seat?p.balance:null,lost:p.lost.slice(),locked:p.locked,part:i===seat||revealed?p.part:null,answered:p.answered,answer:i===seat||revealed?p.answer:null,closed:p.closed,next:p.next}:null)};
}
