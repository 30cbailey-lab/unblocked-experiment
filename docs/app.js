// 3D Minecraft-like game with Three.js - Full Survival Mode
(function(){
  const BLOCK_SIZE = 1;
  const CHUNK_SIZE = 16;
  const WORLD_HEIGHT = 32;
  
  const BLOCKS = {
    air: { color: 0x000000, name: 'Air' },
    grass: { color: 0x5eba1a, name: 'Grass', hardness: 0.6 },
    dirt: { color: 0x8B6F47, name: 'Dirt', hardness: 0.5 },
    stone: { color: 0x707070, name: 'Stone', hardness: 1.5 },
    wood: { color: 0x8B5A2B, name: 'Wood', hardness: 2 },
    sand: { color: 0xDEB887, name: 'Sand', hardness: 0.5 },
    water: { color: 0x1E90FF, name: 'Water', hardness: -1 },
    leaves: { color: 0x2D8A2D, name: 'Leaves', hardness: 0.2 },
    coal: { color: 0x1a1a1a, name: 'Coal Ore', hardness: 3 },
    iron: { color: 0xc0c0c0, name: 'Iron Ore', hardness: 3 },
  };
  
  // Crafting recipes
  const RECIPES = {
    'wood->planks': { input: { wood: 1 }, output: { planks: 4 } },
    'planks->sticks': { input: { planks: 2 }, output: { sticks: 4 } },
    'planks->crafting': { input: { planks: 4 }, output: { crafting_table: 1 } },
    'sticks->torches': { input: { sticks: 1, coal: 1 }, output: { torches: 4 } },
  };
  
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

  function generateHeight(x, z) {
    // Simple Minecraft-like terrain: rolling hills
    const hills = perlin(x * 0.05, z * 0.05) * 6;
    const detail = perlin(x * 0.1, z * 0.1) * 2;
    return Math.floor(26 + hills + detail);
  }
  
  function createTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Grass
    ctx.fillStyle = '#5eba1a';
    ctx.fillRect(0, 0, 64, 32);
    ctx.fillStyle = '#3d7b13';
    ctx.fillRect(0, 32, 64, 32);
    
    // Dirt
    ctx.fillStyle = '#8B6F47';
    ctx.fillRect(64, 0, 64, 64);
    for(let i = 0; i < 30; i++) {
      ctx.fillStyle = 'rgba(139, 111, 71, 0.5)';
      ctx.fillRect(64 + Math.random() * 64, Math.random() * 64, 3, 3);
    }
    
    // Stone
    ctx.fillStyle = '#707070';
    ctx.fillRect(128, 0, 64, 64);
    for(let i = 0; i < 40; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#505050' : '#909090';
      ctx.fillRect(128 + Math.random() * 64, Math.random() * 64, 2, 2);
    }
    
    // Wood
    ctx.fillStyle = '#8B5A2B';
    ctx.fillRect(192, 0, 64, 64);
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    for(let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(192 + 32, 32, 20 - i * 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // Sand
    ctx.fillStyle = '#DEB887';
    ctx.fillRect(0, 64, 64, 64);
    for(let i = 0; i < 50; i++) {
      ctx.fillStyle = 'rgba(200, 180, 100, 0.6)';
      ctx.fillRect(Math.random() * 64, 64 + Math.random() * 64, 2, 2);
    }
    
    // Water
    ctx.fillStyle = '#1E90FF';
    ctx.fillRect(64, 64, 64, 64);
    ctx.strokeStyle = '#4169E1';
    ctx.lineWidth = 1;
    for(let y = 64; y < 128; y += 8) {
      ctx.beginPath();
      ctx.moveTo(64, y);
      for(let x = 64; x < 128; x += 4) {
        ctx.lineTo(x, y + Math.sin(x / 8) * 2);
      }
      ctx.stroke();
    }
    
    // Leaves
    ctx.fillStyle = '#2D8A2D';
    ctx.fillRect(128, 64, 64, 64);
    for(let i = 0; i < 60; i++) {
      ctx.fillStyle = i % 3 === 0 ? '#228B22' : '#3CB371';
      ctx.fillRect(128 + Math.random() * 64, 64 + Math.random() * 64, 3, 3);
    }
    
    // Coal (dark gray)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(192, 64, 64, 64);
    for(let i = 0; i < 50; i++) {
      ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
      ctx.fillRect(192 + Math.random() * 64, 64 + Math.random() * 64, 2, 2);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }
  
  const texture = createTexture();
  
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
  
  // More realistic lighting: hemisphere + directional sun light
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  hemi.position.set(0, 200, 0);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.0);
  sun.position.set(100, 100, 100);
  sun.castShadow = false; // keep shadows off by default for performance
  scene.add(sun);

  // Day/night cycle state (0..1 where 0 = midnight, 0.5 = noon)
  let timeOfDay = 0.6; // start near daytime
  const daySpeed = 0.0005; // speed of cycle
  const dayColor = new THREE.Color(0x87ceeb);
  const nightColor = new THREE.Color(0x0a0a2a);

  const ambient = new THREE.AmbientLight(0xffffff, 0.12);
  scene.add(ambient);
  
  const player = {
    pos: new THREE.Vector3(8, 20, 8),
    vel: new THREE.Vector3(0, 0, 0),
    speed: 0.2,
    jumpForce: 0.4,
    gravity: 0.015,
    isGrounded: false,
    selectedBlock: 'grass',
    health: 20,
    hunger: 20,
    miningProgress: {},
    inventory: { grass: 32, dirt: 32, stone: 16, wood: 16, sand: 16, leaves: 8, coal: 4, iron: 2, planks: 0, sticks: 0 },
  };
  
  const keys = {};
  const raycaster = new THREE.Raycaster();
  const chunks = new Map();
  const blocks = new Map();
  
  // Track if game is started
  let gameStarted = false;

  const NON_SOLID = new Set(['air','water','leaves']);

  function isSolidBlockAt(ix, iy, iz){
    const b = blocks.get(getBlockKey(ix, iy, iz));
    return !!b && !NON_SOLID.has(b);
  }

  function aabbIntersects(x, y, z, halfWidth, height){
    const minX = x - halfWidth;
    const maxX = x + halfWidth;
    const minY = y;
    const maxY = y + height;
    const minZ = z - halfWidth;
    const maxZ = z + halfWidth;

    const ix0 = Math.floor(minX);
    const ix1 = Math.floor(maxX);
    const iy0 = Math.floor(minY);
    const iy1 = Math.floor(maxY - 0.001);
    const iz0 = Math.floor(minZ);
    const iz1 = Math.floor(maxZ);

    for(let ix = ix0; ix <= ix1; ix++){
      for(let iy = Math.max(0, iy0); iy <= Math.min(WORLD_HEIGHT-1, iy1); iy++){
        for(let iz = iz0; iz <= iz1; iz++){
          if(isSolidBlockAt(ix, iy, iz)) return true;
        }
      }
    }
    return false;
  }
  
  function getBlockKey(x, y, z){
    return x + ',' + y + ',' + z;
  }
  
  function generateTrees(chunkX, chunkZ, terrain) {
    for(let x = 0; x < CHUNK_SIZE; x++){
      for(let z = 0; z < CHUNK_SIZE; z++){
        const worldX = chunkX * CHUNK_SIZE + x;
        const worldZ = chunkZ * CHUNK_SIZE + z;
        const height = terrain[x][z];
        
        // Sparse tree generation on grass areas
        if(Math.random() < 0.06 && height > 20) {
          const trunkHeight = 5;
          
          // Trunk
          for(let y = height; y < height + trunkHeight; y++) {
            const key = getBlockKey(worldX, y, worldZ);
            blocks.set(key, 'wood');
          }
          
          // Foliage
          const foliageStart = height + trunkHeight - 2;
          for(let fy = foliageStart; fy < foliageStart + 3; fy++) {
            for(let fx = -2; fx <= 2; fx++) {
              for(let fz = -2; fz <= 2; fz++) {
                if(Math.abs(fx) + Math.abs(fz) <= 2) {
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
        
        const height = generateHeight(worldX, worldZ);
        terrain[x][z] = Math.max(5, Math.min(31, height)); // Clamp to world bounds
        
        for(let y = 0; y < WORLD_HEIGHT; y++){
          let blockType = 'air';
          const groundLevel = terrain[x][z];
          
          if(y < groundLevel - 4) {
            blockType = 'stone';
          } else if(y < groundLevel - 1) {
            blockType = Math.random() < 0.15 ? 'coal' : 'stone';
          } else if(y < groundLevel) {
            blockType = 'dirt';
          } else if(y === groundLevel) {
            blockType = 'grass';
          }
          
          if(blockType !== 'air'){
            const key = getBlockKey(worldX, y, worldZ);
            blocks.set(key, blockType);
          }
        }
      }
    }
    generateTrees(chunkX, chunkZ, terrain);
  }
  
  const geometryCache = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
  const materialCache = {};
  
  function getMaterial(blockType) {
    if(!materialCache[blockType]) {
      if(blockType === 'air') return null;
      // Use a PBR-like material for better visuals but keep it cheap
      const baseColor = new THREE.Color(BLOCKS[blockType].color);
      const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: blockType === 'stone' || blockType === 'coal' || blockType === 'iron' ? 0.7 : 0.9,
        metalness: blockType === 'iron' ? 0.2 : 0.0,
        map: texture,
        flatShading: false,
      });

      // Slightly tweak leaves and water
      if(blockType === 'leaves'){
        material.roughness = 0.8;
        material.transparent = true;
        material.opacity = 0.95;
      }
      if(blockType === 'water'){
        material.roughness = 0.25;
        material.metalness = 0.0;
        material.transparent = true;
        material.opacity = 0.7;
        material.color = new THREE.Color(0x3da6ff);
      }

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
    if(num >= 1 && num <= 9){
      const blockTypes = ['grass', 'dirt', 'stone', 'wood', 'sand', 'water', 'leaves', 'coal', 'iron'];
      player.selectedBlock = blockTypes[num - 1];
      updateHotbar();
    }
    
    if(e.key === 'c') openCraftingMenu();
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
            updateHUD();
          }
        } else if(e.button === 2){
          const key = getBlockKey(x, y, z);
          if(blocks.has(key)){
            blocks.delete(key);
            const blockType = blocks.get(key);
            player.inventory[blockType] = (player.inventory[blockType] || 0) + 1;
            scene.remove(hit.object);
            updateHUD();
          }
        }
      }
    }
  });
  
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  
  function updateHotbar(){
    document.querySelectorAll('.hotbar-slot').forEach(slot => {
      slot.classList.remove('selected');
    });
    const blockTypes = ['grass', 'dirt', 'stone', 'wood', 'sand', 'water', 'leaves', 'coal', 'iron'];
    const idx = blockTypes.indexOf(player.selectedBlock) + 1;
    const elem = document.getElementById('block-' + idx);
    if(elem) elem.classList.add('selected');
  }
  
  function updateHUD() {
    const health = document.getElementById('health-value');
    const hunger = document.getElementById('hunger-value');
    if(health) health.textContent = player.health;
    if(hunger) hunger.textContent = player.hunger;
  }
  
  function openCraftingMenu() {
    const menu = document.getElementById('crafting-menu');
    if(menu) {
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
  }
  
  const btn = document.getElementById('startBtn');
  if(btn){
    btn.addEventListener('click', () => {
      const overlay = document.getElementById('overlay');
      const hud = document.getElementById('hud');
      if(overlay) overlay.style.display = 'none';
      if(hud) hud.style.display = 'block';
      gameStarted = true;
      renderer.domElement.requestPointerLock();
    });
  }

    // Crafting button handlers
    document.querySelectorAll('.craft-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const recipeKey = btn.getAttribute('data-recipe');
        const recipe = RECIPES[recipeKey];
        if(!recipe) return;
        // check ingredients
        let ok = true;
        for(const [k,v] of Object.entries(recipe.input)){
          if((player.inventory[k] || 0) < v) { ok = false; break; }
        }
        if(!ok) return;
        // consume
        for(const [k,v] of Object.entries(recipe.input)){
          player.inventory[k] -= v;
        }
        for(const [k,v] of Object.entries(recipe.output)){
          player.inventory[k] = (player.inventory[k] || 0) + v;
        }
        updateHUD();
      });
    });
  
  function update(){
    // advance day/night cycle
    timeOfDay += daySpeed;
    if(timeOfDay > 1) timeOfDay -= 1;
    const angle = timeOfDay * Math.PI * 2;
    const sunY = Math.sin(angle);
    const sunX = Math.cos(angle);
    sun.position.set(sunX * 100, sunY * 100, Math.sin(angle * 0.5) * 50);
    const intensity = Math.max(0.15, sunY);
    sun.intensity = intensity;
    hemi.intensity = 0.3 * Math.max(0.1, sunY + 0.2);
    ambient.intensity = 0.08 + (0.12 * Math.max(0, sunY));
    scene.background = dayColor.clone().lerp(nightColor, 1 - Math.max(0, sunY));
    scene.fog.color.copy(scene.background);

    // Camera-relative movement
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(0, camera.rotation.y, 0));
    const right = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, camera.rotation.y, 0));

    // Reset horizontal velocity
    player.vel.x = 0;
    player.vel.z = 0;
    
    // Apply movement from pressed keys
    if(keys['w'] || keys['W']) { player.vel.addScaledVector(forward, player.speed); }
    if(keys['s'] || keys['S']) { player.vel.addScaledVector(forward, -player.speed); }
    if(keys['a'] || keys['A']) { player.vel.addScaledVector(right, -player.speed); }
    if(keys['d'] || keys['D']) { player.vel.addScaledVector(right, player.speed); }

    // Hunger decay
    if(Math.random() < 0.001) {
      player.hunger = Math.max(0, player.hunger - 0.1);
      if(player.hunger === 0 && Math.random() < 0.01) {
        player.health = Math.max(0, player.health - 0.5);
      }
    }

    // Apply gravity
    player.vel.y -= player.gravity;

    const halfWidth = 0.3;
    const height = 1.8;

    // X axis collision
    const tryX = player.pos.x + player.vel.x;
    if(!aabbIntersects(tryX, player.pos.y, player.pos.z, halfWidth, height)){
      player.pos.x = tryX;
    } else {
      player.vel.x = 0;
    }

    // Z axis collision
    const tryZ = player.pos.z + player.vel.z;
    if(!aabbIntersects(player.pos.x, player.pos.y, tryZ, halfWidth, height)){
      player.pos.z = tryZ;
    } else {
      player.vel.z = 0;
    }

    // Y axis collision
    const tryY = player.pos.y + player.vel.y;
    if(player.vel.y <= 0){
      if(aabbIntersects(player.pos.x, tryY, player.pos.z, halfWidth, height)){
        const footY = Math.floor(player.pos.y - 0.01);
        let landY = -Infinity;
        for(let yy = footY; yy >= 0; yy--){
          if(isSolidBlockAt(Math.floor(player.pos.x), yy, Math.floor(player.pos.z))){ 
            landY = yy; 
            break; 
          }
        }
        if(landY !== -Infinity){
          player.pos.y = landY + 1;
        } else {
          player.pos.y = Math.max(player.pos.y, 0);
        }
        player.vel.y = 0;
        player.isGrounded = true;
      } else {
        player.pos.y = tryY;
        player.isGrounded = false;
      }
    } else {
      if(aabbIntersects(player.pos.x, tryY, player.pos.z, halfWidth, height)){
        player.vel.y = 0;
      } else {
        player.pos.y = tryY;
        player.isGrounded = false;
      }
    }
    
    if(player.pos.y < 0) {
      player.health -= 5;
      player.pos.set(8, 20, 8);
    }
    
    if(player.health <= 0) {
      player.health = 20;
      player.hunger = 20;
      player.pos.set(8, 20, 8);
    }
    
    camera.position.copy(player.pos);
    updateHUD();
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
