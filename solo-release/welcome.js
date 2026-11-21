(function(){
 const welcome=document.getElementById('gameWelcome');
 const teaser=welcome.querySelector('.welcome-friend');
 const modal=document.createElement('section');modal.id='soloComingSoon';modal.hidden=true;
 modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','soloComingSoonTitle');
 modal.innerHTML='<div class="coming-soon-card"><h2 id="soloComingSoonTitle">CHALLENGE A FRIEND</h2><p>Coming in a future update.</p><p>Enjoy Solo while we get it ready!</p><button type="button" id="soloComingSoonClose">BACK TO GAME</button></div>';
 document.body.appendChild(modal);
 function close(){modal.hidden=true;teaser.focus();}
 window.showDuoComingSoon=function(){modal.hidden=false;document.getElementById('soloComingSoonClose').focus();};
 document.getElementById('soloComingSoonClose').onclick=close;
 modal.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}if(event.key==='Tab'){event.preventDefault();document.getElementById('soloComingSoonClose').focus();}});
 const soloMode=window.chooseMode;
 window.chooseMode=function(mode){if(mode==='friend'){window.showDuoComingSoon();return;}return soloMode(mode);};
})();
