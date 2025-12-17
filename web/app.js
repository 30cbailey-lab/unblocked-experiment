// 3D Minecraft-like game with Three.js - Enhanced with textures, trees, and better terrain
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
    leaves: { color: 0x228B22, name: 'Leaves' },
  };
  
  // Simple 2D Perlin-like noise function
  function noise(x, z) {
    const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }
  
  function perlin(x, z) {
    const xi = Math.floor(x);
    const zi = Math.floor(z);
    const xf = x - xi;
    const zf = z - zi;
    
    const u = xf * xf * (3 - 2 * xf);
    const v = zf * zf * (3 - 2 * zf);
    
    const n0 = noise(xi, zi);
    const n1 = noise(xi + 1, zi);
    const ix0 = n0 + u * (n1 - n0);
    
    const n2 = noise(xi, zi + 1);
    const n3 = noise(xi + 1, zi + 1);
    const ix1 = n2 + u * (n3 - n2);
    
    return ix0 + v * (ix1 - ix0);
  }
  
  // Create canvas-based texture
  function createTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Grass block
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#1a3d0a';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 64, 64);
    for(let i = 0; i < 8; i++) {
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(i * 8, i * 8, 4, 4);
    }
    
    // Dirt block
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(64, 0, 64, 64);
    ctx.strokeStyle = '#5a2e0a';
    ctx.lineWidth = 1;
    ctx.strokeRect(64, 0, 64, 64);
    
    // Stone block
    ctx.fillStyle = '#808080';
    ctx.fillRect(128, 0, 64, 64);
    ctx.fillStyle = 'rgba(100,100,100,0.5)';
    for(let i = 0; i < 20; i++) {
      ctx.fillRect(128 + Math.random() * 64, Math.random() * 64, 3, 3);
    }
    
    // Wood block
    ctx.fillStyle = '#654321';
    ctx.fillRect(192, 0, 64, 64);
    ctx.strokeStyle = '#3d2817';
    for(let i = 0; i < 5; i++) {
      ctx.strokeRect(192, 0 + i * 13, 64, 2);
    }
    
    // Sand block
    ctx.fillStyle = '#f4d03f';
    ctx.fillRect(0, 64, 64, 64);
    ctx.fillStyle = 'rgba(200,180,0,0.3)';
    for(let i = 0; i < 30; i++) {
      ctx.fillRect(Math.random() * 64, 64 + Math.random() * 64, 2, 2);
    }
    
    // Water block
    ctx.fillStyle = '#4287f5';
    ctx.fillRect(64, 64, 64, 64);
    ctx.strokeStyle = '#2a5aa5';
    for(let i = 0; i < 4; i++) {
      ctx.strokeRect(64 + i * 16, 64 + i * 16, 64 - i * 32, 64 - i * 32);
    }
    
    // Leaves block
    ctx.fillStyle = '#228B22';
    ctx.fillRect(128, 64, 64, 64);
    ctx.fillStyle = 'rgba(0,255,0,0.2)';
    for(let i = 0; i < 40; i++) {
      ctx.fillRect(128 + Math.random() * 64, 64 + Math.random() * 64, 3, 3);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }
  
  const texture = createTexture();
  
  // Three.js setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 150, 300);
  
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(8, 20, 8);
  
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(1, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = false;
  document.body.appendChild(renderer.domElement);
  
  // Lighting
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(100, 100, 100);
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
    inventory: { grass: 64, dirt: 64, stone: 32, wood: 32, sand: 32, water: 32, leaves: 16 },
  };
  
  const keys = {};
  const raycaster = new THREE.Raycaster();
  
  // World
  const chunks = new Map();
  const blocks = new Map();
  
  function getBlockKey(x, y, z){
    return x + ',' + y + ',' + z;
  }
  
  function generateTrees(chunkX, chunkZ, terrain) {
    for(let x = 0; x < CHUNK_SIZE; x++){
      for(let z = 0; z < CHUNK_SIZE; z++){
        const worldX = chunkX * CHUNK_SIZE + x;
        const worldZ = chunkZ * CHUNK_SIZE + z;
        const height = terrain[x][z];
        
        // 15% chance for tree
        if(Math.random() < 0.15 && height > 30 && height < 35) {
          const trunkHeight = 5;
          for(let y = height; y < height + trunkHeight; y++) {
            const key = getBlockKey(worldX, y, worldZ);
            blocks.set(key, 'wood');
          }
          
          // Leaves
          const foliageStart = height + trunkHeight - 2;
          const foliageRadius = 3;
          for(let fy = foliageStart; fy < foliageStart + 4; fy++) {
            for(let fx = -foliageRadius; fx <= foliageRadius; fx++) {
              for(let fz = -foliageRadius; fz <= foliageRadius; fz++) {
                if(Math.abs(fx) + Math.abs(fz) <= foliageRadius) {
                  const key = getBlockKey(worldX + fx, fy, worldZ + fz);
                  if(!blocks.has(key)) blocks.set(key, 'leaves');
                }
              }
            }
          }
        }
      }
    }
  }
  
  function generateTerrain(chunkX, chunkZ){
    const terrain = [];
    for(let x = 0; x < CHUNK_SIZE; x++){
      terrain[x] = [];
      for(let z = 0; z < CHUNK_SIZE; z++){
        const worldX = chunkX * CHUNK_SIZE + x;
        const worldZ = chunkZ * CHUNK_SIZE + z;
        
        // Improved Perlin-like noise for terrain
        const n1 = perlin(worldX * 0.05, worldZ * 0.05) * 10;
        const n2 = perlin(worldX * 0.1, worldZ * 0.1) * 5;
        const height = Math.floor(28 + n1 + n2);
        terrain[x][z] = height;
        
        for(let y = 0; y < WORLD_HEIGHT; y++){
          let blockType = 'air';
          if(y < height - 2) blockType = 'stone';
          else if(y < height - 1) blockType = 'dirt';
          else if(y < height) blockType = 'grass';
          else if(y < height + 1 && height < 27) blockType = 'sand';
          
          if(blockType !== 'air'){
            const key = getBlockKey(worldX, y, worldZ);
            blocks.set(key, blockType);
          }
        }
      }
    }
    generateTrees(chunkX, chunkZ, terrain);
  }
  
  // Reuse geometry and materials
  const geometryCache = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  const materialCache = {};
  
  function getMaterial(blockType) {
    if(!materialCache[blockType]) {
      if(blockType === 'air') return null;
      // Simple UV mapping for texture atlas
      const uvMap = {
        grass: 0, dirt: 1, stone: 2, wood: 3, sand: 4, water: 5, leaves: 6
      };
      const material = new THREE.MeshLambertMaterial({ 
        color: BLOCKS[blockType].color,
        map: texture
      });
      materialCache[blockType] = material;
    }
    return materialCache[blockType];
  }
  
  function createBlockMesh(x, y, z, blockType){
    if(!BLOCKS[blockType] || blockType === 'air') return null;
    const material = getMaterial(blockType);
    if(!material) return null;
    
    const mesh = new THREE.Mesh(geometryCache, material);
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
  
  // Load initial chunks
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
    if(num >= 1 && num <= 7){
      const blockTypes = ['grass', 'dirt', 'stone', 'wood', 'sand', 'water', 'leaves'];
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
    const blockTypes = ['grass', 'dirt', 'stone', 'wood', 'sand', 'water', 'leaves'];
    const idx = blockTypes.indexOf(player.selectedBlock) + 1;
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
