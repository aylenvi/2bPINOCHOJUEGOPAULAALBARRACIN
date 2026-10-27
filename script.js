'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),overlay=document.getElementById('overlay');
const W=800,H=480;let state='start',level=1,hearts=3,keys=0,character='pinocchio',muted=false,last=0,elapsed=0,invuln=0,game={},audio=null;
const held=new Set();let jumpRequest=false;
const cfg={speed:195,jump:440,gravity:1050};
function sound(freq=520,dur=.12,type='sine'){if(muted)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();let o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);g.gain.setValueAtTime(.09,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+dur);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+dur)}catch(e){}}
function panel(title,body,buttons){overlay.classList.add('show');overlay.innerHTML='';const p=document.createElement('div');p.className='panel';const h=document.createElement('h2');h.textContent=title;p.append(h);const d=document.createElement('p');d.textContent=body;p.append(d);for(const [name,action] of buttons){const b=document.createElement('button');b.textContent=name;b.onclick=action;p.append(b)}overlay.append(p)}
function hide(){overlay.classList.remove('show');overlay.innerHTML=''}
function hud(){document.getElementById('level').textContent=`Misión ${level}/5`;document.getElementById('hearts').textContent='❤️'.repeat(hearts)+'🖤'.repeat(3-hearts);document.getElementById('keys').textContent=`🗝️ ${keys}/5`}
function start(){state='start';level=1;hearts=3;keys=0;hud();panel('🐳 ¡ESCAPAMOS DE LA BALLENA!','Cinco aventuras, cinco llaves mágicas. ¡Rescatemos a Gepetto!', [['¡JUGAR!',choose]])}
function choose(){panel('Elegí tu personaje','¿Con quién vas a jugar?', [['🤥 PINOCHO',()=>{character='pinocchio';begin(1)}],['🦗 PEPE GRILLO',()=>{character='grillo';begin(1)}]])}
function begin(n){level=n;state='play';elapsed=0;invuln=0;held.clear();jumpRequest=false;hide();if(n===1)initMaze();if(n===2)initPlatform(2);if(n===3)initMemory();if(n===4)initPlatform(4);if(n===5)initBoss();hud();}
function complete(){if(state!=='play')return;state='transition';keys++;sound(740,.22);setTimeout(()=>sound(960,.25),180);hud();if(level===5){win();return}panel('🗝️ ¡MISIÓN SUPERADA!',`¡Conseguiste la llave ${keys} de 5!`,[['SIGUIENTE MISIÓN ▶',()=>begin(level+1)]])}
function hurt(reset){if(state!=='play'||invuln>0)return;hearts--;sound(180,.28,'sawtooth');hud();if(hearts<=0){state='lost';panel('💔 ¡PERDISTE!','Se terminaron los corazones. ¡Podés intentarlo de nuevo!',[['VOLVER A EMPEZAR',start]]);return}invuln=1.6;if(reset)reset()}
function win(){state='won';panel('🎉 ¡GANASTE!','¡Pinocho, Pepe Grillo y Gepetto escaparon de la ballena! ¡Conseguiste las 5 llaves mágicas!\nJuego creado por los alumnos de 2.º B del Instituto Modelo Paula Albarracín.',[['VOLVER A JUGAR',()=>begin(1)],['ELEGIR OTRO PERSONAJE',choose]])}
const maze=[
'####################',
'#S    #      #     #',
'# ### # #### # ### #',
'# #   #    #   #   #',
'# # ###### ##### # #',
'# #      #       # #',
'# ###### ####### # #',
'#      #       # # #',
'###### ####### # # #',
'#            #     #',
'# ####### ## ##### #',
'#       #          #',
'# ### # ####### ## #',
'#   # #         # E#',
'####################'];
const cell=28,ox=120,oy=30;
function initMaze(){game={x:ox+1.5*cell,y:oy+1.5*cell,r:9,small:0,coins:[{c:5,r:1},{c:10,r:9},{c:17,r:11}],hazards:[{x:ox+8.5*cell,y:oy+9.5*cell,t:0},{x:ox+13.5*cell,y:oy+5.5*cell,t:1}]}; // coins are placed in reachable corridors
 game.coins=[{c:5,r:1},{c:10,r:9},{c:17,r:11}].filter(q=>maze[q.r][q.c]===' ');
 // use guaranteed reachable positions
 game.coins=[{c:5,r:1},{c:10,r:9},{c:17,r:11}];
}
function wall(x,y,r=9){for(const [dx,dy] of [[-r,-r],[r,-r],[-r,r],[r,r]]){const c=Math.floor((x+dx-ox)/cell),row=Math.floor((y+dy-oy)/cell);if(row<0||row>=maze.length||c<0||c>=maze[0].length||maze[row][c]==='#')return true}return false}
function updateMaze(dt){let dx=(held.has('ArrowRight')?1:0)-(held.has('ArrowLeft')?1:0),dy=(held.has('ArrowDown')?1:0)-(held.has('ArrowUp')?1:0);let len=Math.hypot(dx,dy)||1;dx=dx/len*cfg.speed*dt;dy=dy/len*cfg.speed*dt;if(!wall(game.x+dx,game.y))game.x+=dx;if(!wall(game.x,game.y+dy))game.y+=dy;
 for(let i=game.coins.length-1;i>=0;i--){let q=game.coins[i];if(Math.hypot(game.x-(ox+(q.c+.5)*cell),game.y-(oy+(q.r+.5)*cell))<19){game.coins.splice(i,1);game.small++;sound(650)}}
 for(const h of game.hazards){h.x+=Math.sin(elapsed*2+h.t)*.35;if(Math.hypot(game.x-h.x,game.y-h.y)<19)hurt(()=>{game.x=ox+1.5*cell;game.y=oy+1.5*cell})}
 if(game.small===3&&Math.hypot(game.x-(ox+18.5*cell),game.y-(oy+13.5*cell))<23)complete()}
function initPlatform(n){game={x:42,y:315,vx:0,vy:0,w:24,h:36,onGround:false,checkpoint:42,platforms:[],waveX:-100};if(n===2){game.platforms=[{x:0,y:390,w:110},{x:142,y:345,w:85},{x:267,y:310,w:83},{x:393,y:355,w:88},{x:520,y:315,w:88},{x:650,y:385,w:150}]}else{game.platforms=[{x:0,y:395,w:115},{x:155,y:355,w:90},{x:280,y:315,w:90},{x:415,y:365,w:80},{x:530,y:320,w:95},{x:660,y:385,w:140}]}}
function platformReset(){game.x=42;game.y=315;game.vy=0;game.waveX=-100}
function updatePlatform(dt){let dir=(held.has('ArrowRight')?1:0)-(held.has('ArrowLeft')?1:0);game.vx=dir*cfg.speed;game.x=Math.max(0,Math.min(W-game.w,game.x+game.vx*dt));if((jumpRequest||held.has('Space'))&&game.onGround){game.vy=-cfg.jump;game.onGround=false;sound(400,.08)}jumpRequest=false;const oldBottom=game.y+game.h;game.vy+=cfg.gravity*dt;game.y+=game.vy*dt;game.onGround=false;for(const p of game.platforms){let py=p.y+(level===2?Math.sin(elapsed*1.5+p.x)*5:0);if(game.vy>=0&&oldBottom<=py+10&&game.y+game.h>=py&&game.x+game.w>p.x+5&&game.x<p.x+p.w-5){game.y=py-game.h;game.vy=0;game.onGround=true}}
 if(level===4){game.waveX+=dt*72;if(game.x<game.waveX+18)hurt(platformReset)}if(game.y>H-20)hurt(platformReset);if(game.x>748&&game.onGround)complete()}
const symbols=['🤥','🦗','👴','🧚','🐳','🗝️'];
function initMemory(){let cards=[...symbols,...symbols].map((s,i)=>({s,id:i,open:true,matched:false}));for(let i=cards.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]]}game={cards,first:null,second:null,lock:true,showUntil:performance.now()+5000,hideAt:0,matches:0}}
function cardAt(x,y){const cw=104,ch=94,gap=17,left=154,top=54;for(let i=0;i<12;i++){let col=i%4,row=Math.floor(i/4);if(x>=left+col*(cw+gap)&&x<=left+col*(cw+gap)+cw&&y>=top+row*(ch+gap)&&y<=top+row*(ch+gap)+ch)return i}return -1}
function memoryClick(x,y){if(state!=='play'||level!==3||game.lock)return;let i=cardAt(x,y);if(i<0)return;const c=game.cards[i];if(c.open||c.matched)return;c.open=true;sound(460,.08);if(game.first===null){game.first=i;return}game.second=i;game.lock=true;if(game.cards[game.first].s===c.s){game.cards[game.first].matched=true;c.matched=true;game.matches++;sound(800,.15);game.first=null;game.second=null;game.lock=false;if(game.matches===6)complete()}else game.hideAt=performance.now()+900}
function updateMemory(){const now=performance.now();if(game.showUntil&&now>=game.showUntil){game.cards.forEach(c=>c.open=false);game.showUntil=0;game.lock=false}if(game.hideAt&&now>=game.hideAt){game.cards[game.first].open=false;game.cards[game.second].open=false;game.first=null;game.second=null;game.hideAt=0;game.lock=false}}
function initBoss(){game={x:45,y:360,vx:0,vy:0,w:24,h:36,onGround:true,shots:[],attack:0,survived:0,bossDone:false,hasKey:false}}
function updateBoss(dt){const dir=(held.has('ArrowRight')?1:0)-(held.has('ArrowLeft')?1:0);game.x=Math.max(5,Math.min(758,game.x+dir*cfg.speed*dt));if((jumpRequest||held.has('Space'))&&game.onGround){game.vy=-cfg.jump;game.onGround=false;sound(420,.08)}jumpRequest=false;game.vy+=cfg.gravity*dt;game.y+=game.vy*dt;if(game.y>=360){game.y=360;game.vy=0;game.onGround=true}if(!game.bossDone){game.attack+=dt;if(game.attack>1.25){game.attack=0;game.survived++;let yy=game.survived%3===0?365:game.survived%3===1?320:385;game.shots.push({x:685,y:yy,v:-220});sound(200,.15,'triangle')}for(const s of game.shots){s.x+=s.v*dt;if(game.x<s.x+22&&game.x+game.w>s.x-12&&game.y<s.y+15&&game.y+game.h>s.y-15)hurt(()=>{game.x=45;game.y=360;game.vy=0})}game.shots=game.shots.filter(s=>s.x>-20);if(game.survived>=9&&game.shots.length===0)game.bossDone=true}else if(!game.hasKey&&game.x>565){game.hasKey=true;sound(850,.2)}if(game.hasKey&&game.x>745)complete()}
function background(){let grd=ctx.createLinearGradient(0,0,0,H);grd.addColorStop(0,level===4?'#101b46':'#105e82');grd.addColorStop(1,level===4?'#39436a':'#102d58');ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);for(let i=0;i<30;i++){let x=(i*97+Math.sin(elapsed+i)*10)%W,y=(i*59-elapsed*17*(i%3+1))%H;if(y<0)y+=H;ctx.globalAlpha=.15;ctx.strokeStyle='#e0ffff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,4+i%8,0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1}
function text(s,x,y,size=24,color='white',align='left'){ctx.fillStyle=color;ctx.font=`bold ${size}px system-ui`;ctx.textAlign=align;ctx.fillText(s,x,y);ctx.textAlign='left'}
function hero(x,y,scale=1){if(invuln>0&&Math.floor(elapsed*10)%2===0)return;ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.font='30px serif';ctx.textAlign='center';ctx.fillText(character==='pinocchio'?'🤥':'🦗',0,0);ctx.restore()}
function drawMaze(){text('🔑 Juntá 3 llaves pequeñas y llegá a la puerta',400,22,19,'#fff3a1','center');for(let r=0;r<maze.length;r++)for(let c=0;c<maze[r].length;c++){ctx.fillStyle=maze[r][c]==='#'?'#7d5680':'#164867';ctx.fillRect(ox+c*cell,oy+r*cell,cell-1,cell-1)}for(const q of game.coins)text('🔑',ox+(q.c+.5)*cell,oy+(q.r+.7)*cell,19,'white','center');for(const h of game.hazards)text('🪼',h.x,h.y+9,28,'white','center');text(game.small===3?'🚪':'🔒',ox+18.5*cell,oy+13.8*cell,22,'white','center');hero(game.x,game.y+9,.9);text(`${game.small}/3 llaves pequeñas`,400,466,18,'#fff3a1','center')}
function drawPlatform(){ctx.fillStyle=level===2?'#8cde59':'#204b85';ctx.fillRect(0,425,W,55);if(level===2)for(let i=0;i<24;i++)text('◡',i*35,455,25,'#d5ff67');for(const p of game.platforms){const y=p.y+(level===2?Math.sin(elapsed*1.5+p.x)*5:0);ctx.fillStyle=level===2?'#f5a14e':'#a77a4d';ctx.fillRect(p.x,y,p.w,15);text(level===2?'🐟':'🪵',p.x+p.w/2,y+3,32,'white','center')}if(level===4){ctx.fillStyle='#3db5e5a0';ctx.fillRect(0,0,Math.max(0,game.waveX),H);text('🌊',game.waveX,310,50)}text('🚪',753,365,37);hero(game.x+game.w/2,game.y+26,1.15);text(level===2?'¡Saltá sobre los peces! Evitá el ácido.':'¡La ola te persigue! Saltá por las tablas.',400,35,22,'#fff4a4','center')}
function drawMemory(){text('🃏 Encontrá las 6 parejas',400,35,23,'#fff5aa','center');const cw=104,ch=94,gap=17,left=154,top=54;game.cards.forEach((c,i)=>{let x=left+(i%4)*(cw+gap),y=top+Math.floor(i/4)*(ch+gap);ctx.fillStyle=c.matched?'#b5f4ae':c.open?'#fff1cb':'#bd79d8';ctx.beginPath();ctx.roundRect(x,y,cw,ch,13);ctx.fill();text(c.open||c.matched?c.s:'❔',x+cw/2,y+62,43,'#222','center')});text(game.showUntil?'¡Memorizá las cartas!':'Parejas encontradas: '+game.matches+'/6',400,462,20,'#fff3a1','center')}
function drawBoss(){ctx.fillStyle='#2c8d9e';ctx.fillRect(0,400,W,80);text('🪼',665+Math.sin(elapsed*2)*35,260,105,'white','center');for(const s of game.shots)text('⚡',s.x,s.y+12,40,'#ffff75','center');text('👴',765,370,36,'white','center');if(game.bossDone)text(game.hasKey?'🚪':'🗝️',610,375,36,'white','center');hero(game.x+game.w/2,game.y+27,1.2);text(game.bossDone?'¡Recogé la llave y encontrá a Gepetto!':`¡Esquivá los rayos! Ataques: ${Math.min(game.survived,9)}/9`,400,40,22,'#fff3a1','center')}
function draw(){background();if(state==='start'){text('🐳',400,290,170,'white','center');return}if(!game||!game.x&&level!==3)return;if(level===1)drawMaze();if(level===2||level===4)drawPlatform();if(level===3)drawMemory();if(level===5)drawBoss()}
function frame(t){let dt=Math.min((t-last)/1000||0,.035);last=t;if(state==='play'){elapsed+=dt;invuln=Math.max(0,invuln-dt);if(level===1)updateMaze(dt);if(level===2||level===4)updatePlatform(dt);if(level===3)updateMemory();if(level===5)updateBoss(dt)}draw();requestAnimationFrame(frame)}
window.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space',' '].includes(e.key)){e.preventDefault();let k=e.key===' '?'Space':e.key;held.add(k);if(k==='Space'||k==='ArrowUp')jumpRequest=true}});window.addEventListener('keyup',e=>held.delete(e.key===' '?'Space':e.key));window.addEventListener('blur',()=>held.clear());
document.querySelectorAll('[data-key]').forEach(b=>{const k=b.dataset.key;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held.add(k);if(k==='Space'||k==='ArrowUp')jumpRequest=true;b.classList.add('pressed')});const up=e=>{held.delete(k);b.classList.remove('pressed')};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up)});
canvas.addEventListener('pointerdown',e=>{const rect=canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*W/rect.width,y=(e.clientY-rect.top)*H/rect.height;if(level===3)memoryClick(x,y)});
document.getElementById('mute').onclick=()=>{muted=!muted;document.getElementById('mute').textContent=muted?'🔇':'🔊'};
start();requestAnimationFrame(frame);
