import {GameError,createRoom,joinRoom,authorize,advance,act,snapshot,inviteCode,token} from './game.mjs';
export function service(repository,{allowTest=false,clock=Date.now}={}){
 return async function handle(request){
  const headers={'Cache-Control':'no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff'};
  const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  try{
   if(request.method!=='POST')return respond({error:'Use POST.'},405);
   const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return respond({error:'Cross-origin requests are not permitted.'},403);
   if(!request.headers.get('content-type')?.startsWith('application/json'))return respond({error:'Use JSON.'},415);
   if(Number(request.headers.get('content-length')||0)>16384)return respond({error:'Request is too large.'},413);
   const text=await request.text();if(Buffer.byteLength(text)>16384)return respond({error:'Request is too large.'},413);
   let data;try{data=JSON.parse(text);}catch{return respond({error:'Invalid JSON.'},400);}
   if(!data||typeof data!=='object'||Array.isArray(data))return respond({error:'Invalid request.'},400);
   const now=clock();
   if(data.op==='create'){
    const secret=token();for(let attempt=0;attempt<5;attempt++){const code=inviteCode(),room=createRoom(code,data.nickname,secret,now);if(await repository.create(code,room))return respond({token:secret,...snapshot(room,0,now)},201);}throw new GameError('Please try creating a match again.',503);
   }
   const code=typeof data.code==='string'?data.code.trim().toUpperCase():'';if(!/^[A-HJ-NP-Z2-9]{10}$/.test(code))throw new GameError('Enter the ten-character invite code.',400);
   let secret=data.token;
   const result=await repository.transaction(code,room=>{
    if(!room)throw new GameError('Match not found.',404);if(room.expiresAt<=now)throw new GameError('This match has expired.',410);
    if(data.op==='join'){secret=token();joinRoom(room,data.nickname,secret);return {token:secret,...snapshot(room,1,now)};}
    const seat=authorize(room,secret);const timedOut=advance(room,now);
    if(data.op==='action'){try{act(room,seat,data.action,now,allowTest);}catch(error){if(timedOut&&error instanceof GameError)return {requestError:{message:error.message,status:error.status}};throw error;}}else if(data.op!=='state')throw new GameError('Unknown operation.',400);
    return snapshot(room,seat,now);
   });if(result.requestError)return respond({error:result.requestError.message},result.requestError.status);return respond(result,data.op==='join'?201:200);
  }catch(error){if(error instanceof GameError)return respond({error:error.message},error.status);console.error('Hangman service error:',error.name);return respond({error:'The connection service is unavailable. Please retry.'},503);}
 };
}
export class MemoryRepository{
 constructor(){this.rooms=new Map();this.locks=new Map();}
 async create(code,room){if(this.rooms.has(code))return false;this.rooms.set(code,structuredClone(room));return true;}
 async transaction(code,fn){const prior=this.locks.get(code)||Promise.resolve();let release;const tail=new Promise(r=>release=r);this.locks.set(code,tail);await prior;try{const original=this.rooms.get(code),room=original?structuredClone(original):null;const result=await fn(room);if(room)this.rooms.set(code,room);return result;}finally{release();if(this.locks.get(code)===tail)this.locks.delete(code);}}
}
