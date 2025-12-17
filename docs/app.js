// 3D Minecraft-like game with Three.js
(function(){
  const BLOCK_SIZE = 1;
  const CHUNK_SIZE = 16;
  const WORLD_HEIGHT = 32;
  
  const BLOCKS = {
    air: { color: 0x000000, name: 'Air' },
    grass: { color: 0x2d5016, name: 'Grass' },
    dirt: { color: 0x8B4513, name: 'Dirt' },
    stone: { color: 0x808080, name: 'Stone' },
    wood: { color: 0x654321, name: 'Wood' },
    sand: { color: 0xf4d03f, name: 'Sand' },
    water: { color: 0x4287f5, name: 'Water' },
  };
  
  // Three.js setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 200, 400);
  
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(8, 20, 8);
  
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  // reduce pixel ratio for performance on low-end devices
  renderer.setPixelRatio(Math.min(1, window.devicePixelRatio || 1));
  // disable shadows to improve fps
  renderer.shadowMap.enabled = false;
  document.body.appendChild(renderer.domElement);
  
  // Lighting
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(100, 100, 100);
  light.castShadow = true;
  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 2048;
  scene.add(light);
  
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);
  
  // Player
  const player = {
    pos: new THREE.Vector3(8, 20, 8),
    vel: new THREE.Vector3(0, 0, 0),
    speed: 0.2,
    jumpForce: 0.4,
    gravity: 0.015,
    isGrounded: false,
    selectedBlock: 'grass',
    inventory: { grass: 64, dirt: 64, stone: 32, wood: 32, sand: 32, water: 32 },
  };
  
  const keys = {};
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  
  // World
  const chunks = new Map();
  const blocks = new Map();
  
  function getBlockKey(x, y, z){
    return x + ',' + y + ',' + z;
  }
  
  function generateTerrain(chunkX, chunkZ){
    for(let x = 0; x < CHUNK_SIZE; x++){
      for(let z = 0; z < CHUNK_SIZE; z++){
        const worldX = chunkX * CHUNK_SIZE + x;
        const worldZ = chunkZ * CHUNK_SIZE + z;
        
        const height = Math.floor(32 + Math.sin(worldX * 0.1) * 5 + Math.cos(worldZ * 0.1) * 5);
        
        for(let y = 0; y < WORLD_HEIGHT; y++){
          let blockType = 'air';
          if(y < height - 2) blockType = 'stone';
          else if(y < height - 1) blockType = 'dirt';
          else if(y < height) blockType = 'grass';
          else if(y < height + 1 && Math.random() > 0.7) blockType = 'sand';
          
          if(blockType !== 'air'){
            const key = getBlockKey(worldX, y, worldZ);
            blocks.set(key, blockType);
          }
        }
      }
    }
  }
  
  // reuse geometries and materials to avoid allocating thousands of objects
  const geometryCache = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  const materialCache = {};
  function createBlockMesh(x, y, z, blockType){
    if(!BLOCKS[blockType] || blockType === 'air') return null;
    if(!materialCache[blockType]){
      materialCache[blockType] = new THREE.MeshLambertMaterial({ color: BLOCKS[blockType].color });
    }
    const mesh = new THREE.Mesh(geometryCache, materialCache[blockType]);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    mesh.userData = { x: x, y: y, z: z, blockType: blockType };
    return mesh;
  }
  
  function loadChunk(chunkX, chunkZ){
    const key = chunkX + ',' + chunkZ;
    if(chunks.has(key)) return;
    
    generateTerrain(chunkX, chunkZ);
    const group = new THREE.Group();
    
    for(let x = 0; x < CHUNK_SIZE; x++){
      for(let z = 0; z < CHUNK_SIZE; z++){
        for(let y = 0; y < WORLD_HEIGHT; y++){
          const worldX = chunkX * CHUNK_SIZE + x;
          const worldZ = chunkZ * CHUNK_SIZE + z;
          const blockKey = getBlockKey(worldX, y, worldZ);
          const blockType = blocks.get(blockKey);
          
          if(blockType && blockType !== 'air'){
            const mesh = createBlockMesh(worldX, y, worldZ, blockType);
            if(mesh) group.add(mesh);
          }
        }
      }
    }
    
    scene.add(group);
    chunks.set(key, group);
  }
  
  // load a smaller initial area to reduce geometry on startup
  for(let cx = -1; cx <= 1; cx++){
    for(let cz = -1; cz <= 1; cz++){
      loadChunk(cx, cz);
    }
  }
  
  document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if(e.key === ' '){
      e.preventDefault();
      if(player.isGrounded){
        player.vel.y += player.jumpForce;
        player.isGrounded = false;
      }
    }
    
    const num = parseInt(e.key);
    if(num >= 1 && num <= 6){
      const blockTypes = ['grass', 'dirt', 'stone', 'wood', 'sand', 'water'];
      player.selectedBlock = blockTypes[num - 1];
      updateHotbar();
    }
  });
  
  document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });
  
  document.addEventListener('mousemove', (e) => {
    if(document.pointerLockElement){
      camera.rotation.order = 'YXZ';
      camera.rotation.y -= e.movementX * 0.005;
      camera.rotation.x -= e.movementY * 0.005;
      
      if(camera.rotation.x > Math.PI / 2) camera.rotation.x = Math.PI / 2;
      if(camera.rotation.x < -Math.PI / 2) camera.rotation.x = -Math.PI / 2;
    }
  });
  
  document.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
  });
  
  renderer.domElement.addEventListener('mousedown', (e) => {
    if(!document.pointerLockElement) return;
    
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    if(intersects.length > 0){
      const hit = intersects[0];
      if(hit.object.userData && hit.object.userData.blockType){
        const userData = hit.object.userData;
        const x = userData.x, y = userData.y, z = userData.z, blockType = userData.blockType;
        
        if(e.button === 0){
          const dir = hit.face.normal;
          const newX = x + dir.x, newY = y + dir.y, newZ = z + dir.z;
          
          if(player.inventory[player.selectedBlock] > 0){
            const key = getBlockKey(newX, newY, newZ);
            blocks.set(key, player.selectedBlock);
            player.inventory[player.selectedBlock]--;
            
            const mesh = createBlockMesh(newX, newY, newZ, player.selectedBlock);
            if(mesh) scene.add(mesh);
          }
        } else if(e.button === 2){
          const key = getBlockKey(x, y, z);
          blocks.delete(key);
          player.inventory[blockType] = (player.inventory[blockType] || 0) + 1;
          scene.remove(hit.object);
        }
      }
    }
  });
  
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  
  function updateHotbar(){
    document.querySelectorAll('.hotbar-slot').forEach(slot => {
      slot.classList.remove('selected');
    });
    const idx = ['grass', 'dirt', 'stone', 'wood', 'sand', 'water'].indexOf(player.selectedBlock) + 1;
    const elem = document.getElementById('block-' + idx);
    if(elem) elem.classList.add('selected');
  }
  
  const btn = document.getElementById('startBtn');
  if(btn){
    btn.addEventListener('click', () => {
      const overlay = document.getElementById('overlay');
      const hud = document.getElementById('hud');
      if(overlay) overlay.style.display = 'none';
      if(hud) hud.style.display = 'block';
      renderer.domElement.requestPointerLock();
    });
  }
  
  function update(){
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, camera.rotation.y, 0));
    const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, camera.rotation.y, 0));
    
    if(keys['w']) player.pos.addScaledVector(forward, player.speed);
    if(keys['s']) player.pos.addScaledVector(forward, -player.speed);
    if(keys['a']) player.pos.addScaledVector(right, -player.speed);
    if(keys['d']) player.pos.addScaledVector(right, player.speed);
    
    player.vel.y -= player.gravity;
    player.pos.y += player.vel.y;
    
    const checkX = getBlockKey(Math.floor(player.pos.x), Math.floor(player.pos.y), Math.floor(player.pos.z));
    if(blocks.has(checkX)){
      player.pos.y = Math.floor(player.pos.y) + 2;
      player.vel.y = 0;
      player.isGrounded = true;
    } else {
      player.isGrounded = false;
    }
    
    if(player.pos.y < 0) player.pos.set(8, 20, 8);
    
    camera.position.copy(player.pos);
  }
  
  function animate(){
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
  }
  
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  
  animate();
})();
