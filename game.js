import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const $ = (id) => document.getElementById(id);
const canvas = $('world');
const scene = new THREE.Scene();
const skyDay = new THREE.Color('#a9c7c0');
scene.background = skyDay.clone();
scene.fog = new THREE.Fog(0xa9c7c0, 34, 88);
const camera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, .1, 150);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.13;
scene.add(new THREE.HemisphereLight(0xe4f1d8, 0x64745a, 2.0));
const sun = new THREE.DirectionalLight(0xffe6bc, 2.2);
sun.position.set(-25, 38, 18); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -35; sun.shadow.camera.right = 35; sun.shadow.camera.top = 35; sun.shadow.camera.bottom = -35;
scene.add(sun);
const mat = (color, roughness = 1) => new THREE.MeshStandardMaterial({ color, roughness, flatShading: true });
const materials = {
  trunk: mat('#76523a'), leaf: [mat('#45694c'), mat('#547652'), mat('#668558')],
  rock: [mat('#858b7e'), mat('#a0a092'), mat('#737b73')], berry: mat('#8b493e'),
  wood: mat('#a87c4c'), stone: mat('#8e9287'), roof: mat('#775643'),
  grass: mat('#65835b'), water: new THREE.MeshStandardMaterial({color:'#75a9a0',roughness:.3,transparent:true,opacity:.8}),
  sand: mat('#c5b88a'), dirt: mat('#8b8b65'),
};
let worldSeed = 57291;
const rand = () => { worldSeed = (worldSeed * 1664525 + 1013904223) >>> 0; return worldSeed / 4294967296; };
const heightAt = (x,z) => .48*Math.sin(x*.09)*Math.cos(z*.08)+.28*Math.sin((x+z)*.16)+.14*Math.cos(z*.27-x*.12);
const terrainGeo = new THREE.PlaneGeometry(150, 150, 100, 100);
terrainGeo.rotateX(-Math.PI/2);
const positions = terrainGeo.attributes.position, colors = [];
const grassA = new THREE.Color('#718b60'), grassB = new THREE.Color('#8a986e'), dirtC = new THREE.Color('#92916d');
for (let i=0;i<positions.count;i++) {
  const x=positions.getX(i), z=positions.getZ(i), h=heightAt(x,z);
  positions.setY(i,h);
  const n=rand()*.10, c=grassA.clone().lerp(grassB,Math.max(0,Math.sin(x*.045+z*.035)*.35+.3)).lerp(dirtC,Math.max(0,Math.abs(h)*.22));
  c.offsetHSL(0,n*.5,n-.04); colors.push(c.r,c.g,c.b);
}
terrainGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3)); terrainGeo.computeVertexNormals();
const ground = new THREE.Mesh(terrainGeo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true}));
ground.receiveShadow=true; scene.add(ground);
function addWater(x,z,rx,rz){const g=new THREE.CircleGeometry(1,36);g.rotateX(-Math.PI/2);const m=new THREE.Mesh(g,materials.water);m.position.set(x,heightAt(x,z)+.02,z);m.scale.set(rx,rz,1);m.receiveShadow=true;scene.add(m);}
addWater(-17,11,7,4.7); addWater(21,-18,8,5); addWater(5,34,4,2.7);
// Shoreline stepping stones and distant rocky ridges give the island a clear silhouette.
for(let i=0;i<34;i++){const a=i/34*Math.PI*2,r=64+rand()*9,x=Math.cos(a)*r,z=Math.sin(a)*r;const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(3+rand()*4,0),materials.rock[i%3]);rock.position.set(x,heightAt(x,z)+2,z);rock.scale.y=.8;rock.castShadow=true;scene.add(rock);}
const worldItems=[];
function makeTree(x,z,scale=1){
  const group=new THREE.Group();group.position.set(x,heightAt(x,z),z);group.scale.setScalar(scale);
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.2,.34,2,6),materials.trunk);trunk.position.y=1;trunk.castShadow=true;group.add(trunk);
  for(let i=0;i<3;i++){const crown=new THREE.Mesh(new THREE.ConeGeometry(1.05-i*.16,1.8,7),materials.leaf[(Math.floor(rand()*3))]);crown.position.y=2.1+i*.7;crown.castShadow=true;group.add(crown);}
  group.userData.kind='tree';scene.add(group);worldItems.push({kind:'tree',obj:group,x,z,alive:true});
}
function makeRock(x,z,scale=1){const group=new THREE.Group();group.position.set(x,heightAt(x,z),z);group.scale.setScalar(scale);const m=new THREE.Mesh(new THREE.DodecahedronGeometry(.8,0),materials.rock[Math.floor(rand()*3)]);m.position.y=.55;m.scale.set(1,.8,1.2);m.castShadow=true;group.add(m);scene.add(group);worldItems.push({kind:'rock',obj:group,x,z,alive:true});}
function makeBush(x,z){const g=new THREE.Group();g.position.set(x,heightAt(x,z),z);const b=new THREE.Mesh(new THREE.IcosahedronGeometry(.57,1),mat('#668255'));b.position.y=.5;b.castShadow=true;g.add(b);for(let i=0;i<3;i++){const berry=new THREE.Mesh(new THREE.SphereGeometry(.09,7,6),materials.berry);berry.position.set((rand()-.5)*.6,.65+rand()*.4,(rand()-.5)*.6);g.add(berry);}scene.add(g);worldItems.push({kind:'berry',obj:g,x,z,alive:true});}
// Keep the first clearing open; the forest grows denser toward the valley and edges.
for(let i=0;i<105;i++){let x,z;do{x=(rand()-.5)*88;z=(rand()-.5)*88;}while(Math.hypot(x,z)<9||Math.hypot(x+17,z-11)<9||Math.hypot(x-21,z+18)<9);makeTree(x,z,.72+rand()*.62);}
for(let i=0;i<31;i++){let x=(rand()-.5)*70,z=(rand()-.5)*70;if(Math.hypot(x,z)>6)makeRock(x,z,.7+rand()*.65);}
for(let i=0;i<24;i++){let x=(rand()-.5)*64,z=(rand()-.5)*64;if(Math.hypot(x,z)>7)makeBush(x,z);}

// A quiet hamlet and forgotten stone circle hint at the larger world beyond this first playable valley.
function box(parent,w,h,d,material,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function buildHouse(x,z,ruin=false){const g=new THREE.Group();g.position.set(x,heightAt(x,z),z);const stone=mat(ruin?'#858578':'#b4a47f'), wood=mat('#79583d'), roof=mat(ruin?'#77786b':'#8c6246');
  box(g,4,2.4,3.8,stone,0,1.2,0);box(g,.12,2.2,1.1,wood,0,1.1,1.96);
  const roofMesh=new THREE.Mesh(new THREE.ConeGeometry(3.2,1.8,4),roof);roofMesh.rotation.y=Math.PI/4;roofMesh.position.y=3;roofMesh.scale.set(1,.7,.85);roofMesh.castShadow=true;g.add(roofMesh);
  box(g,.75,1.4,.16,wood,0,.7,2.0);
  if(ruin){g.rotation.y=.18;g.children[0].rotation.z=.12;box(g,.22,.35,1.2,materials.rock[0],2.1,2.2,0);}
  scene.add(g);return g;
}
buildHouse(11,-8);buildHouse(15,-9);buildHouse(-30,25,true);buildHouse(-34,28,true);
const villagers=[];
for(let i=0;i<5;i++){const f=new THREE.Group();f.position.set(13+Math.cos(i*1.25)*5,heightAt(13+Math.cos(i*1.25)*5,-8+Math.sin(i*1.25)*4),-8+Math.sin(i*1.25)*4);const body=new THREE.Mesh(new THREE.CapsuleGeometry(.24,.6,3,6),mat(i%2?'#b47f59':'#788e75'));body.position.y=.65;body.castShadow=true;f.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.22,8,7),mat('#d6b79a'));head.position.y=1.2;f.add(head);scene.add(f);villagers.push(f);}

const inventory={wood:0,stone:0,berries:2,fish:0,fiber:0,axe:0,pickaxe:0,torch:0};
const player={x:0,z:0,yaw:0,health:100,hunger:100,energy:100,xp:0,level:1,day:1,time:8,selected:0};
const saveKey='mundo-esquecido-save-v1';
let built=[];
try{const saved=JSON.parse(localStorage.getItem(saveKey)||'null');if(saved){Object.assign(player,saved.player||{});Object.assign(inventory,saved.inventory||{});built=saved.built||[];}}catch(e){console.warn('Save could not be read',e);}
const playerGroup=new THREE.Group();
const tunic=mat('#bd8051'), pants=mat('#45544b'), skin=mat('#d8b695'), dark=mat('#433b31');
const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.35,.52,4,8),tunic);torso.position.y=1.05;torso.castShadow=true;playerGroup.add(torso);
const head=new THREE.Mesh(new THREE.SphereGeometry(.24,10,8),skin);head.position.y=1.7;head.castShadow=true;playerGroup.add(head);
const hair=new THREE.Mesh(new THREE.SphereGeometry(.245,9,6,0,Math.PI*2,0,Math.PI*.52),dark);hair.position.y=1.77;playerGroup.add(hair);
const legL=new THREE.Mesh(new THREE.CapsuleGeometry(.12,.48,3,6),pants),legR=legL.clone();legL.position.set(-.17,.43,0);legR.position.set(.17,.43,0);playerGroup.add(legL,legR);
const armL=new THREE.Mesh(new THREE.CapsuleGeometry(.1,.45,3,6),tunic),armR=armL.clone();armL.position.set(-.43,1.05,0);armR.position.set(.43,1.05,0);playerGroup.add(armL,armR);
scene.add(playerGroup);
const lantern=new THREE.PointLight(0xffcb70,0,15,2);playerGroup.add(lantern);lantern.position.set(0,1.5,0);
function restoreBuilds(){for(const b of built)createBuilding(b.type,b.x,b.z,b.rot,false);}
function save(){try{localStorage.setItem(saveKey,JSON.stringify({player,inventory,built}));$('save-indicator').textContent='● SALVO';$('save-indicator').style.color='#d8e5c4';}catch(e){$('save-indicator').textContent='SALVAMENTO INDISPONÍVEL';}}
restoreBuilds();

const structureDefs=[
 {type:'hut',name:'Cabana',icon:'⌂',cost:{wood:12,stone:4},desc:'Um abrigo simples e acolhedor.'},
 {type:'fire',name:'Fogueira',icon:'♨',cost:{wood:5,stone:3},desc:'Aquece e ilumina ao anoitecer.'},
 {type:'chest',name:'Baú',icon:'▣',cost:{wood:6},desc:'Guarde suas descobertas.'},
 {type:'fence',name:'Cerca',icon:'╫',cost:{wood:4},desc:'Um trecho de cerca de madeira.'},
 {type:'lamp',name:'Lampião',icon:'♧',cost:{wood:2,stone:1},desc:'Uma luz para a noite.'},
 {type:'garden',name:'Horta',icon:'❀',cost:{wood:3,berries:1},desc:'Um pequeno canteiro fértil.'}
];
function createBuilding(type,x,z,rot=0,record=true){
 const g=new THREE.Group();g.position.set(x,heightAt(x,z),z);g.rotation.y=rot;
 if(type==='hut'){box(g,3.8,2.4,3.4,mat('#a08057'),0,1.2,0);box(g,1,1.7,.12,mat('#594a38'),0,.85,1.76);const roof=new THREE.Mesh(new THREE.ConeGeometry(3.1,1.6,4),mat('#77553d'));roof.rotation.y=Math.PI/4;roof.position.y=3;roof.scale.set(1,.7,.85);roof.castShadow=true;g.add(roof);}
 if(type==='fire'){const logs=mat('#69452e');for(let i=0;i<3;i++){const l=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,1.25,6),logs);l.rotation.z=Math.PI/2;l.rotation.y=i*Math.PI/3;l.position.y=.17;l.castShadow=true;g.add(l);}const flame=new THREE.Mesh(new THREE.ConeGeometry(.32,.85,7),new THREE.MeshBasicMaterial({color:'#ff9b48'}));flame.position.y=.58;g.add(flame);const light=new THREE.PointLight(0xff9d55,1.2,10);light.position.y=1;g.add(light);}
 if(type==='chest'){box(g,.95,.62,.7,mat('#8b6038'),0,.35,0);box(g,1,.12,.74,mat('#b08b50'),0,.72,0);box(g,.13,.18,.04,mat('#d7bb72'),0,.53,.38);}
 if(type==='fence'){box(g,1.8,.12,.13,mat('#937047'),0,.65,0);box(g,1.8,.12,.13,mat('#937047'),0,.3,0);for(const x0 of [-.8,0,.8])box(g,.13,1,.15,mat('#6c5034'),x0,.5,0);}
 if(type==='lamp'){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.07,.1,1.8,6),mat('#75543b'));pole.position.y=.9;g.add(pole);const l=new THREE.PointLight(0xffd48a,1.5,12);l.position.y=1.8;g.add(l);const orb=new THREE.Mesh(new THREE.SphereGeometry(.18,8,7),new THREE.MeshBasicMaterial({color:'#ffda91'}));orb.position.y=1.8;g.add(orb);}
 if(type==='garden'){box(g,1.8,.2,1.2,mat('#765337'),0,.14,0);for(let i=0;i<5;i++){const sprout=new THREE.Mesh(new THREE.ConeGeometry(.13,.45,5),mat('#79a65e'));sprout.position.set(-.7+i*.35,.43,0);g.add(sprout);}}
 scene.add(g);if(record)built.push({type,x,z,rot});return g;
}
const costs=(cost)=>Object.entries(cost).map(([k,v])=>`${v} ${itemNames[k]||k}`).join(' · ');
const itemNames={wood:'madeira',stone:'pedra',berries:'frutas',fish:'peixes',fiber:'fibras',axe:'machado',pickaxe:'picareta',torch:'tochas'};
const recipes=[
 {key:'axe',name:'Machado de pedra',icon:'🪓',cost:{wood:3,stone:2},desc:'Corte madeira com mais eficiência.'},
 {key:'pickaxe',name:'Picareta simples',icon:'⛏️',cost:{wood:2,stone:4},desc:'Quebre rochas e minere.'},
 {key:'torch',name:'Tocha',icon:'🔦',cost:{wood:2,fiber:1},desc:'Leve luz para lugares escuros.'}
];
const itemInfo=[['wood','🪵','Madeira'],['stone','🪨','Pedra'],['berries','🫐','Frutas'],['fish','🐟','Peixe'],['fiber','🌿','Fibra'],['axe','🪓','Machado'],['pickaxe','⛏️','Picareta'],['torch','🔦','Tocha']];
const hotbarItems=['axe','pickaxe','torch','berries'];
function refreshInventory(){
 $('resource-grid').innerHTML=itemInfo.map(([key,icon,name])=>`<div class="resource"><span class="emoji">${icon}</span><div><b>${name}</b><small>${inventory[key]||0} ${key==='wood'||key==='stone'?'unid.':'unid.'}</small></div></div>`).join('');
 $('recipe-list').innerHTML=recipes.map(r=>`<div class="recipe"><div><b>${r.icon} ${r.name}</b><small>${costs(r.cost)}</small></div><button data-craft="${r.key}" ${canAfford(r.cost)?'':'disabled'}>CRIAR</button></div>`).join('');
 document.querySelectorAll('[data-craft]').forEach(b=>b.onclick=()=>craft(b.dataset.craft));
 $('hotbar').innerHTML=hotbarItems.map((key,i)=>{const entry=itemInfo.find(a=>a[0]===key);return `<button class="slot ${player.selected===i?'selected':''}" data-slot="${i}"><span class="item-icon">${entry[1]}</span><span class="item-count">${inventory[key]||0}</span></button>`;}).join('');
 document.querySelectorAll('[data-slot]').forEach(b=>b.onclick=()=>{player.selected=Number(b.dataset.slot);refreshInventory();});
 $('selected-name').textContent=player.selected===3?'Frutas':itemInfo.find(a=>a[0]===hotbarItems[player.selected])[2];
}
function canAfford(cost){return Object.entries(cost).every(([k,n])=>(inventory[k]||0)>=n);}
function craft(key){const r=recipes.find(a=>a.key===key);if(!r||!canAfford(r.cost)){notify('Faltam materiais para fabricar isso.');return;}for(const[k,n]of Object.entries(r.cost))inventory[k]-=n;inventory[key]=(inventory[key]||0)+1;gainXP(8);refreshInventory();save();notify(`${r.name} fabricado!`);}
function gainXP(n){player.xp+=n;if(player.xp>=player.level*50){player.xp-=player.level*50;player.level++;notify(`Você alcançou o nível ${player.level}!`);} $('level').textContent=player.level;$('xp-fill').style.width=`${Math.min(100,player.xp/(player.level*50)*100)}%`;}
function notify(text){const t=$('toast');t.textContent=text;t.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>t.classList.remove('show'),2100);}
refreshInventory();

let target=null;

function distance(x1,z1,x2,z2){return Math.hypot(x1-x2,z1-z2);}
function nearestTarget(){let best=null,bd=4.2;for(const item of worldItems){if(!item.alive)continue;const d=distance(player.x,player.z,item.x,item.z);if(d<bd){bd=d;best={...item,d};}}
 for(const v of villagers){const d=distance(player.x,player.z,v.position.x,v.position.z);if(d<3.2&&(!best||d<best.d))best={kind:'villager',obj:v,d};}
 let waterDist=Infinity;for(const [x,z,r]of [[-17,11,7],[21,-18,8],[5,34,4]]){const d=distance(player.x,player.z,x,z);waterDist=Math.min(waterDist,d-r*.7);}if(waterDist<2.1&&(!best||waterDist<best.d))best={kind:'water',d:waterDist};
 return best;
}
function updateTarget(){target=nearestTarget();const labels={tree:'Árvore · madeira',rock:'Rocha · pedra',berry:'Arbusto · frutas',villager:'Morador · conversar',water:'Água · pescar'};const label=$('target-label');label.textContent=target?labels[target.kind]:'';label.classList.toggle('visible',!!target);$('interact-text').textContent=target?.kind==='villager'?'CONVERSAR':target?.kind==='water'?'PESCAR':target?'COLETAR':'USAR';}
function interact(){updateTarget();if(!target){if(inventory.berries>0){eatBerries();return;}notify('Explore a região e aproxime-se de algo para interagir.');return;}
 if(target.kind==='villager'){notify('Mara: “As ruínas guardam histórias. Construa uma fogueira antes do anoitecer.”');gainXP(2);return;}
 if(target.kind==='water'){if(inventory.fiber<1){notify('Você precisa de 1 fibra para improvisar uma linha de pesca.');return;}inventory.fiber--;inventory.fish++;player.energy=Math.max(0,player.energy-5);gainXP(10);notify('Você pescou um peixe fresco!');refreshInventory();save();return;}
 const item=target;let amount=1;if(item.kind==='tree'){amount=inventory.axe?3:2;inventory.wood+=amount;}else if(item.kind==='rock'){amount=inventory.pickaxe?3:1;inventory.stone+=amount;}else if(item.kind==='berry'){amount=2+Math.floor(Math.random()*2);inventory.berries+=amount;}
 if(item.kind!=='berry'||item.alive){item.alive=false;scene.remove(item.obj);}
 player.energy=Math.max(0,player.energy-(item.kind==='berry'?1:4));gainXP(item.kind==='berry'?4:7);refreshInventory();save();notify(`+${amount} ${itemNames[item.kind==='tree'?'wood':item.kind==='rock'?'stone':'berries']} · recurso coletado`);
}
function eatBerries(){if(!inventory.berries){notify('Você não tem frutas para comer.');return;}inventory.berries--;player.hunger=Math.min(100,player.hunger+24);player.energy=Math.min(100,player.energy+8);refreshInventory();save();notify('Frutas deliciosas! Fome restaurada.');}
const creatures=[];
function makeWolf(x,z){const g=new THREE.Group();const fur=mat('#74796d'),belly=mat('#a29a80');const body=new THREE.Mesh(new THREE.CapsuleGeometry(.29,.62,3,7),fur);body.rotation.z=Math.PI/2;body.position.y=.57;g.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.24,8,7),fur);head.position.set(0,.72,.48);g.add(head);for(const side of [-1,1]){const ear=new THREE.Mesh(new THREE.ConeGeometry(.09,.25,5),fur);ear.position.set(side*.13,.95,.48);g.add(ear);const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.07,.28,2,5),belly);leg.position.set(side*.19,.22,.2);g.add(leg);}g.position.set(x,heightAt(x,z),z);g.traverse(o=>{if(o.isMesh)o.castShadow=true;});scene.add(g);creatures.push({obj:g,x,z,hp:3,phase:Math.random()*6,attack:0});}
for(let i=0;i<5;i++){const a=i/5*Math.PI*2;makeWolf(Math.cos(a)*25,heightAt(0,0)+Math.sin(a)*25);creatures[i].z=Math.sin(a)*25;creatures[i].obj.position.z=creatures[i].z;}
function attack(){if(player.energy<8){notify('Você está sem energia. Descanse um pouco.');return;}player.energy-=8;const wolf=creatures.find(c=>c.hp>0&&distance(player.x,player.z,c.x,c.z)<3.2);if(wolf){wolf.hp--;wolf.obj.rotation.y=player.yaw+Math.PI;gainXP(6);if(wolf.hp<=0){scene.remove(wolf.obj);inventory.fiber+=1;notify('Criatura afastada · +1 fibra');refreshInventory();}else notify('Acerto! A criatura recuou.');save();}else{notify('Seu golpe corta o ar. Aproxime-se de uma criatura.');}}

let buildMode=false,buildChoice=null,buildRotation=0,ghost=null;
function renderBuildCards(){ $('build-list').innerHTML=structureDefs.map(d=>`<button class="build-card" data-build="${d.type}"><span class="emoji">${d.icon}</span><b>${d.name}</b><small>${d.desc}</small><div class="cost">${costs(d.cost)}</div></button>`).join('');document.querySelectorAll('[data-build]').forEach(b=>b.onclick=()=>beginBuild(b.dataset.build)); }
function beginBuild(type){buildChoice=structureDefs.find(s=>s.type===type);if(!canAfford(buildChoice.cost)){notify(`Materiais necessários: ${costs(buildChoice.cost)}`);return;}closePanels();buildMode=true;buildRotation=0;$('build-selected').textContent=buildChoice.name;$('build-confirm').classList.add('open');$('target-label').classList.remove('visible');if(ghost)scene.remove(ghost);ghost=new THREE.Group();const outline=new THREE.Mesh(new THREE.BoxGeometry(buildChoice.type==='hut'?3.8:1.6,buildChoice.type==='hut'?3:.8,buildChoice.type==='hut'?3.4:1.2),new THREE.MeshBasicMaterial({color:0xe9c878,wireframe:true,transparent:true,opacity:.65}));outline.position.y=buildChoice.type==='hut'?1.5:.4;ghost.add(outline);scene.add(ghost);notify('Estrutura pronta para posicionar.');}
function placeBuild(){if(!buildMode||!buildChoice)return;if(!canAfford(buildChoice.cost)){notify('Faltam materiais.');return;}for(const[k,n]of Object.entries(buildChoice.cost))inventory[k]-=n;const x=player.x+Math.sin(player.yaw)*3.2,z=player.z+Math.cos(player.yaw)*3.2;createBuilding(buildChoice.type,x,z,buildRotation);if(ghost)scene.remove(ghost);ghost=null;buildMode=false;$('build-confirm').classList.remove('open');gainXP(12);refreshInventory();save();notify(`${buildChoice.name} construída!`);}

let modal=null;
function openPanel(id){closePanels();modal=$(id);$('panel-backdrop').classList.add('open');modal.classList.add('open');if(id==='build-panel')renderBuildCards();if(id==='inventory-panel')refreshInventory();if(id==='map-panel')drawMap();}
function closePanels(){document.querySelectorAll('.panel.open').forEach(p=>p.classList.remove('open'));$('panel-backdrop').classList.remove('open');modal=null;}
document.querySelectorAll('.close-panel').forEach(b=>b.onclick=closePanels);$('panel-backdrop').onclick=closePanels;
$('inventory-button').onclick=()=>openPanel('inventory-panel');$('build-button').onclick=()=>openPanel('build-panel');$('map-button').onclick=()=>openPanel('map-panel');$('menu-button').onclick=()=>openPanel('menu-panel');$('resume-button').onclick=closePanels;
$('interact-button').addEventListener('pointerdown',e=>{e.preventDefault();interact();});$('attack-button').addEventListener('pointerdown',e=>{e.preventDefault();attack();});$('jump-button').addEventListener('pointerdown',e=>{e.preventDefault();if(player.energy<4){notify('Sem energia para pular.');return;}jumpTime=.42;player.energy-=4;});
$('place-build').onclick=placeBuild;$('cancel-build').onclick=()=>{buildMode=false;buildChoice=null;$('build-confirm').classList.remove('open');if(ghost)scene.remove(ghost);ghost=null;};$('rotate-build').onclick=()=>{buildRotation+=Math.PI/4;if(ghost)ghost.rotation.y=buildRotation;};
$('save-button').onclick=()=>{save();notify('Progresso salvo neste aparelho.');};
$('quality-select').onchange=e=>{const low=e.target.value==='low',mid=e.target.value==='medium';renderer.setPixelRatio(Math.min(devicePixelRatio,low?.8:mid?1:1.5));renderer.shadowMap.enabled=!low;sun.shadow.mapSize.set(low?512:1024,low?512:1024);sun.shadow.needsUpdate=true;notify('Qualidade gráfica atualizada.');};
$('distance-select').onchange=e=>{scene.fog.far=Number(e.target.value);notify('Distância de visão atualizada.');};
$('reset-button').onclick=()=>{if(confirm('Apagar seu progresso e começar uma nova aventura?')){localStorage.removeItem(saveKey);location.reload();}};
function drawMap(){const c=$('minimap'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#80936f';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#c2b887';ctx.fillRect(0,0,c.width,35);ctx.fillStyle='#8c9275';ctx.fillRect(0,285,c.width,35);ctx.fillStyle='#679a97';for(const[x,z,r]of [[-17,11,7],[21,-18,8],[5,34,4]]){ctx.beginPath();ctx.ellipse(240+x*3,160+z*2.7,r*3,r*2.2,-.25,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#456b4d';for(const it of worldItems.filter(i=>i.kind==='tree')){ctx.beginPath();ctx.arc(240+it.x*3,160+it.z*2.7,2.4,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#d2b564';ctx.fillRect(240+11*3-3,160-8*2.7-3,6,6);ctx.fillStyle='#8c6660';for(const b of built){ctx.fillRect(240+b.x*3-2,160+b.z*2.7-2,4,4);}ctx.fillStyle='#fbebaa';ctx.beginPath();ctx.arc(240+player.x*3,160+player.z*2.7,6,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#25352b';ctx.lineWidth=2;ctx.stroke();}

let stick={x:0,y:0,id:null},look={id:null,x:0,y:0},keys={},jumpTime=0,attackFlash=0;
const stickZone=$('stick-zone'),stickRing=stickZone.querySelector('.stick-ring'),knob=$('stick-knob');
function setStick(e){const r=stickRing.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=36,len=Math.hypot(dx,dy),k=len>max?max/len:1;stick.x=dx*k/max;stick.y=dy*k/max;knob.style.transform=`translate(${dx*k}px,${dy*k}px)`;}
stickZone.addEventListener('pointerdown',e=>{e.preventDefault();stick.id=e.pointerId;stickZone.setPointerCapture(e.pointerId);setStick(e);});
stickZone.addEventListener('pointermove',e=>{if(stick.id===e.pointerId)setStick(e);});
function clearStick(e){if(stick.id!==e.pointerId)return;stick.id=null;stick.x=stick.y=0;knob.style.transform='translate(0,0)';}
stickZone.addEventListener('pointerup',clearStick);stickZone.addEventListener('pointercancel',clearStick);
canvas.addEventListener('pointerdown',e=>{if(e.clientX<innerWidth*.45||e.clientY>innerHeight-115)return;look.id=e.pointerId;look.x=e.clientX;look.y=e.clientY;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(look.id!==e.pointerId)return;const dx=e.clientX-look.x,dy=e.clientY-look.y;cameraYaw-=dx*.006;cameraPitch=THREE.MathUtils.clamp(cameraPitch+dy*.004,.12,.95);look.x=e.clientX;look.y=e.clientY;});
canvas.addEventListener('pointerup',e=>{if(look.id===e.pointerId)look.id=null;});canvas.addEventListener('pointercancel',e=>{if(look.id===e.pointerId)look.id=null;});
window.addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='KeyE')interact();if(e.code==='KeyI')openPanel('inventory-panel');if(e.code==='KeyB')openPanel('build-panel');if(e.code==='Space'&&!e.repeat)jumpTime=.4;if(e.code==='KeyF')attack();});window.addEventListener('keyup',e=>keys[e.code]=false);
let cameraYaw=player.yaw, cameraPitch=.42, cameraDistance=8;
const clockOrigin=player.time;
function updateVitals(){for(const [id,val]of [['health',player.health],['food',player.hunger],['energy',player.energy]]){$(`${id}-fill`).style.width=`${Math.max(0,val)}%`;$(`${id}-text`).textContent=Math.round(val);}}
function updateClock(dt){player.time+=dt*.035;if(player.time>=24){player.time-=24;player.day++;}const h=Math.floor(player.time),m=Math.floor((player.time-h)*60);$('clock').textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;$('day-count').textContent=`DIA ${player.day}`;
 const daylight=THREE.MathUtils.clamp((Math.sin((player.time-6)/12*Math.PI)+.08)*1.12,0,1),night=1-daylight;
 const sky=new THREE.Color('#a9c7c0').lerp(new THREE.Color('#172431'),night*.88);scene.background=sky;scene.fog.color.copy(sky);sun.intensity=.22+daylight*2.15;sun.color.set(daylight>.25?'#ffe5bd':'#8296c0');sun.position.set(Math.cos(player.time/24*Math.PI*2)*38,10+daylight*42,Math.sin(player.time/24*Math.PI*2)*38);$('weather-icon').textContent=daylight<.24?'☾':'☀';lantern.intensity=daylight<.25&&inventory.torch>0?.6:0;}
let elapsed=0, lastSaved=0, lastVitals=0, lastTarget=0, lastUI=0;
function update(dt){elapsed+=dt;const forward=(stick.y*-1)+(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0),side=stick.x+(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0),len=Math.hypot(forward,side);
 let moving=false;if(len>.08&&!buildMode&&!modal){const f=forward/Math.max(1,len),s=side/Math.max(1,len),dx=Math.sin(cameraYaw)*f+Math.cos(cameraYaw)*s,dz=Math.cos(cameraYaw)*f-Math.sin(cameraYaw)*s,speed=player.energy<=0?2.1:4.15;player.x=THREE.MathUtils.clamp(player.x+dx*speed*dt,-68,68);player.z=THREE.MathUtils.clamp(player.z+dz*speed*dt,-68,68);player.yaw=Math.atan2(dx,dz);moving=true;}
 playerGroup.position.set(player.x,heightAt(player.x,player.z)+(jumpTime>0?Math.sin((.42-jumpTime)/.42*Math.PI)*1.4:0),player.z);playerGroup.rotation.y=player.yaw;if(jumpTime>0)jumpTime=Math.max(0,jumpTime-dt);
 const walk=moving?Math.sin(elapsed*10)*.55:0;legL.rotation.x=walk;legR.rotation.x=-walk;armL.rotation.x=-walk*.6;armR.rotation.x=walk*.6;
 const horizontal=Math.cos(cameraPitch)*cameraDistance;camera.position.set(player.x-Math.sin(cameraYaw)*horizontal,heightAt(player.x,player.z)+1.4+Math.sin(cameraPitch)*cameraDistance,player.z-Math.cos(cameraYaw)*horizontal);camera.lookAt(player.x,heightAt(player.x,player.z)+1.15,player.z);
 if(ghost){const x=player.x+Math.sin(player.yaw)*3.2,z=player.z+Math.cos(player.yaw)*3.2;ghost.position.set(x,heightAt(x,z),z);ghost.rotation.y=buildRotation;}
 updateClock(dt);player.hunger=Math.max(0,player.hunger-dt*.075);if(moving)player.energy=Math.max(0,player.energy-dt*1.35);else player.energy=Math.min(100,player.energy+dt*2.4);if(player.hunger<=0){player.health=Math.max(1,player.health-dt*1.3);}if(player.health<100&&player.hunger>45)player.health=Math.min(100,player.health+dt*.11);
 const dark=player.time>19||player.time<5;
 for(const c of creatures){if(c.hp<=0)continue;const d=distance(player.x,player.z,c.x,c.z);c.phase+=dt;const alert=dark||d<8;if(alert){const dx=player.x-c.x,dz=player.z-c.z,dd=Math.max(.01,Math.hypot(dx,dz));if(d>1.3){c.x+=dx/dd*dt*(dark?1.5:1.9);c.z+=dz/dd*dt*(dark?1.5:1.9);c.obj.rotation.y=Math.atan2(dx,dz);}else if(elapsed>c.attack){player.health=Math.max(1,player.health-8);c.attack=elapsed+2.4;notify('Uma criatura feriu você! Afaste-se ou ataque.');}}else{c.x+=Math.sin(c.phase*.45)*dt*.22;c.z+=Math.cos(c.phase*.37)*dt*.22;}c.obj.position.set(c.x,heightAt(c.x,c.z),c.z);}
 if(elapsed-lastTarget>.2){updateTarget();lastTarget=elapsed;}if(elapsed-lastVitals>.3){updateVitals();lastVitals=elapsed;}if(elapsed-lastSaved>12){save();lastSaved=elapsed;}if(elapsed-lastUI>1){if(modal==='map-panel')drawMap();lastUI=elapsed;}
}
function frame(now){requestAnimationFrame(frame);const dt=Math.min(.05,(now-(frame.last||now))/1000);frame.last=now;update(dt);renderer.render(scene,camera);}
requestAnimationFrame(frame);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));});
$('location').textContent='FLORESTA ANTIGA';updateVitals();$('level').textContent=player.level;$('xp-fill').style.width=`${player.xp/(player.level*50)*100}%`;
setTimeout(()=>{$('loading').classList.add('done');setTimeout(()=>$('loading').remove(),650);notify('Bem-vindo! Colete materiais e crie seu refúgio.');},500);
window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('Offline cache unavailable',e)));
