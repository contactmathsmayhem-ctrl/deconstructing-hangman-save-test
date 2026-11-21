// Inserted inside the connected duo controller so messages use its existing session.
let messagePanel=null,messageListKey='',messageSending=false,messageReadPending=0;
function unreadMessages(){
 if(!networkState)return 0;
 return (networkState.messages||[]).filter(m=>m.from!==networkState.seat&&m.id>(networkState.messageRead||0)).length;
}
function updateMessageBadges(){
 const unread=unreadMessages(),messages=networkState?.messages||[];
 document.querySelectorAll('#duoPreview .duo-message').forEach((button,index)=>{
  const incoming=button.dataset.messageDirection?button.dataset.messageDirection==='incoming':index===1;
  const count=messages.filter(m=>incoming?m.from!==networkState?.seat:m.from===networkState?.seat).length;
  if(!button.querySelector('.duo-message-count')){
   button.textContent='';const dots=document.createElement('span');dots.textContent='•••';dots.setAttribute('aria-hidden','true');button.appendChild(dots);
   const badge=document.createElement('span');badge.className='duo-message-count';badge.setAttribute('aria-hidden','true');
   badge.style.cssText='position:absolute!important;right:2px!important;top:-12px!important;display:inline-grid!important;place-items:center!important;min-width:38px!important;height:30px!important;padding:0 3px!important;border:2px solid #310b45!important;border-radius:18px!important;background:#baff18!important;color:#210b31!important;font:bold 21px/1 Arial!important;box-sizing:border-box!important;z-index:2!important;';
   button.style.position='relative';button.style.overflow='visible';button.appendChild(badge);
  }
  const badge=button.querySelector('.duo-message-count');badge.textContent=count?'('+Math.min(2,count)+')':'';
  badge.style.setProperty('display',count?'inline-grid':'none','important');
  button.setAttribute('aria-label',incoming?'Messages from '+networkNames.peter+(count?', '+count+' messages':'')+(unread?', '+unread+' unread':', all read'):'Send a message to '+networkNames.peter+(count?', '+count+' sent messages':''));
 });
}
function ensureMessagePanel(){
 if(messagePanel)return;
 const style=document.createElement('style');style.textContent=`
 #duoMessages[hidden]{display:none!important}
 #duoMessages{position:fixed;inset:0;z-index:2147483100;background:#160a26ed;display:grid;place-items:center;padding:12px;box-sizing:border-box}
 #duoMessages .message-card{box-sizing:border-box;width:min(620px,96vw);max-height:92dvh;overflow:auto;padding:20px;border:3px solid #baff18;border-radius:24px;background:#310b45;color:white;font:18px/1.4 Arial}
 #duoMessages h2{margin:0 0 12px;color:#baff18;font-size:24px}
 #duoMessages .message-list{max-height:35dvh;overflow:auto;margin-bottom:14px}
 #duoMessages .message-item{padding:10px;margin:8px 0;border:1px solid #af77ce;border-radius:12px;background:#200b31}
 #duoMessages .message-item.mine{background:#452060}
 #duoMessages .message-item p{white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0}
 #duoMessages textarea{box-sizing:border-box;width:100%;min-height:85px;font:18px Arial;padding:10px;border-radius:10px}
 #duoMessages button{min-height:44px;margin:8px 6px 0 0;padding:9px 16px;border:2px solid #baff18;border-radius:12px;background:#baff18;color:#210b31;font:bold 17px Arial}
 #duoMessages button:disabled{opacity:.55}
 #duoMessages .message-error{color:#ffced8;min-height:1.4em}
 #duoMessages .message-hint{font-size:15px;color:#e9d4f8}
 `;document.head.appendChild(style);
 messagePanel=document.createElement('section');messagePanel.id='duoMessages';messagePanel.hidden=true;
 messagePanel.setAttribute('role','dialog');messagePanel.setAttribute('aria-modal','true');messagePanel.setAttribute('aria-labelledby','duoMessageTitle');
 messagePanel.innerHTML='<div class="message-card"><h2 id="duoMessageTitle"></h2><div id="duoMessageList" class="message-list"></div><form id="duoMessageForm"><label for="duoMessageDraft" id="duoMessageLabel">Your message</label><textarea id="duoMessageDraft" maxlength="280" placeholder="Type a message…"></textarea><div class="message-hint">Up to 280 characters. Only the latest two messages from each player are kept.</div><div id="duoMessageError" class="message-error" role="status"></div><button id="duoMessageSend" type="submit">SEND</button><button id="duoMessageDismiss" type="button">Mark messages as read and close</button></form></div>';
 document.body.appendChild(messagePanel);
 document.getElementById('duoMessageDismiss').onclick=()=>closeMessages(true);
 document.getElementById('duoMessageForm').onsubmit=async event=>{
  event.preventDefault();const input=document.getElementById('duoMessageDraft'),error=document.getElementById('duoMessageError');
  const text=input.value.trim();if(!text){error.textContent='Type a message first.';input.focus();return;}
  if(messageSending)return;
  if(networkBusy){error.textContent='Please try again in a moment.';return;}
  messageSending=true;document.getElementById('duoMessageSend').disabled=true;error.textContent='Sending…';
  let sent=false;
  try{await networkAction('message',{text},()=>{sent=true;input.value='';document.getElementById('duoMessageLabel').textContent='Your message';error.textContent='Sent.';});}
  finally{messageSending=false;document.getElementById('duoMessageSend').disabled=false;if(!sent)error.textContent='Message was not sent. Please try again.';}
 };
 messagePanel.addEventListener('keydown',event=>{
  if(event.key==='Escape'){event.preventDefault();closeMessages(true);}
  if(event.key==='Tab'){
   const controls=[...messagePanel.querySelectorAll('button,textarea')].filter(el=>!el.disabled);const first=controls[0],last=controls[controls.length-1];
   if(event.shiftKey&&document.activeElement===first){last.focus();event.preventDefault();}
   else if(!event.shiftKey&&document.activeElement===last){first.focus();event.preventDefault();}
  }
 });
}
function renderMessages(){
 updateMessageBadges();if(!messagePanel||messagePanel.hidden||!networkState)return;
 document.getElementById('duoMessageTitle').textContent='MESSAGES WITH '+networkNames.peter;
 const messages=networkState.messages||[],key=JSON.stringify(messages);
 if(key===messageListKey)return;messageListKey=key;
 const list=document.getElementById('duoMessageList');list.replaceChildren();
 if(!messages.length){const empty=document.createElement('p');empty.textContent='No messages yet. Say hello!';list.appendChild(empty);}
 for(const entry of messages){
  const mine=entry.from===networkState.seat,card=document.createElement('article');card.className='message-item'+(mine?' mine':'');
  const author=document.createElement('strong');author.textContent=mine?'You':networkNames.peter;
  const text=document.createElement('p');text.textContent=entry.text;card.appendChild(author);card.appendChild(text);
  if(!mine){const reply=document.createElement('button');reply.type='button';reply.className='duo-message-reply';reply.textContent='REPLY';reply.onclick=()=>{document.getElementById('duoMessageLabel').textContent='Reply to '+networkNames.peter;document.getElementById('duoMessageDraft').focus();};card.appendChild(reply);}
  list.appendChild(card);
 }
 list.scrollTop=list.scrollHeight;
}
function openMessages(compose){
 if(!network){alert('Connect with your friend to exchange messages.');return;}
 if(networkState?.phase==='question'){networkNotice('Finish this question first; your messages will wait.');return;}
 ensureMessagePanel();messagePanel.hidden=false;messageListKey='';renderMessages();
 document.getElementById('duoMessageError').textContent='';
 (compose?document.getElementById('duoMessageDraft'):document.getElementById('duoMessageDismiss')).focus();
}
function closeMessages(markRead=false){
 if(!messagePanel)return;
 if(markRead&&networkState){messageReadPending=Math.max(messageReadPending,...(networkState.messages||[]).filter(m=>m.from!==networkState.seat).map(m=>m.id));}
 messagePanel.hidden=true;document.querySelector('#duoPreview .duo-message')?.focus();flushMessageRead();
}
function flushMessageRead(){
 if(!network||networkBusy||!messageReadPending)return;
 const through=messageReadPending;messageReadPending=0;
 networkAction('dismissMessages',{through},()=>updateMessageBadges()).then(()=>{if((networkState?.messageRead||0)<through)messageReadPending=Math.max(messageReadPending,through);});
}
function syncMessages(){
 if(networkState?.phase==='question'&&messagePanel&&!messagePanel.hidden)closeMessages(false);
 renderMessages();flushMessageRead();
}
function resetMessages(){if(messagePanel)messagePanel.remove();messagePanel=null;messageListKey='';messageReadPending=0;messageSending=false;}
