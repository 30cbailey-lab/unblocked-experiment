// Minecraft 3D Clone - Simple Working Version
(function() {
  const BLOCK_SIZE = 1;
  const CHUNK_SIZE = 16;
  const WORLD_HEIGHT = 32;
  const RENDER_DISTANCE = 1; // chunks in each direction
  
  const BLOCK_TYPES = {
    air: 0x000000,
    grass: 0x5eba1a,
    dirt: 0x8B6F47,
    stone: 0x707070,
    wood: 0x8B5A2B,
    sand: 0xDEB887,
    water: 0x1E90FF,
    leaves: 0x2D8A2D,
    coal: 0x1a1a1a,
    iron: 0xc0c0c0,
  };
  
  const BLOCK_NAMES = ['grass', 'dirt', 'stone', 'wood', 'sand', 'water', 'leaves', 'coal', 'iron'];
  
  const RECIPES = {
    'wood->planks': { input: { wood: 1 }, output: { planks: 4 } },
    'planks->sticks': { input: { planks: 2 }, output: { sticks: 4 } },
    'planks->crafting': { input: { planks: 4 }, output: { crafting_table: 1 } },
    'sticks->torches': { input: { sticks: 1, coal: 1 }, output: { torches: 4 } },
  };
  
  // Simple hash function for noise
  function hash(x, y) {
    let h = 0;
    h = ((h << 5) - h) ^ x;
    h = ((h << 5) - h) ^ y;
    return h;
  }
  
  function noise(x, y) {
    return Math.abs(Math.sin(hash(Math.floor(x), Math.floor(y)))) * 10;
  }
  
  function perlin(x, y) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    
    const n0 = Math.sin(xi * 12.9898 + yi * 78.233) * 43758.5453;
    const n1 = Math.sin((xi+1) * 12.9898 + yi * 78.233) * 43758.5453;
    const n2 = Math.sin(xi * 12.9898 + (yi+1) * 78.233) * 43758.5453;
    const n3 = Math.sin((xi+1) * 12.9898 + (yi+1) * 78.233) * 43758.5453;
    
    const u = (n0 - Math.floor(n0)) + xf * ((n1 - Math.floor(n1)) - (n0 - Math.floor(n0)));
    const v = (n2 - Math.floor(n2)) + yf * ((n3 - Math.floor(n3)) - (n2 - Math.floor(n2)));
    
    return u + v * 0.5;
  }
  
  // Three.js setup
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 200, 400);
  
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(50, 30, 50);
  
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(1, window.devicePixelRatio));
  renderer.shadowMap.enabled = false;
  document.body.appendChild(renderer.domElement);
  
  // Lighting
  const light1 = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
  scene.add(light1);
  
  const light2 = new THREE.DirectionalLight(0xffffff, 0.6);
  light2.position.set(100, 100, 100);
  scene.add(light2);
  
  // Player object
  const player = {
    pos: new THREE.Vector3(50, 30, 50),
    vel: new THREE.Vector3(0, 0, 0),
    speed: 0.15,
    jumpForce: 0.35,
    gravity: 0.012,
    isGrounded: false,
    selectedBlock: 'grass',
    health: 20,
    hunger: 20,
    inventory: { grass: 64, dirt: 64, stone: 32, wood: 32, sand: 32, leaves: 16, coal: 8, iron: 4, planks: 0, sticks: 0 },
  };
  
  // Input tracking
  const keys = {};
  const blocks = new Map(); // "x,y,z" -> blockType
  const chunks = new Map(); // "cx,cz" -> group
  const raycaster = new THREE.Raycaster();
  
  function getBlockKey(x, y, z) {
    return Math.floor(x) + ',' + Math.floor(y) + ',' + Math.floor(z);
  }
  
  function getChunkKey(cx, cz) {
    return cx + ',' + cz;
  }
  
  function getTerrainHeight(x, z) {
    // Simple terrain: rolling hills between 20-28
    const h = perlin(x * 0.05, z * 0.05);
    return Math.floor(20 + h * 8);
  }
  
  function generateChunk(cx, cz) {
    const terrain = [];
    
    // First pass: build height map
    for(let x = 0; x < CHUNK_SIZE; x++) {
      terrain[x] = [];
      for(let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = cx * CHUNK_SIZE + x;
        const worldZ = cz * CHUNK_SIZE + z;
        terrain[x][z] = getTerrainHeight(worldX, worldZ);
      }
    }
    
    // Second pass: place blocks
    for(let x = 0; x < CHUNK_SIZE; x++) {
      for(let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = cx * CHUNK_SIZE + x;
        const worldZ = cz * CHUNK_SIZE + z;
        const groundHeight = terrain[x][z];
        
        for(let y = 0; y < WORLD_HEIGHT; y++) {
          let blockType = null;
          
          if(y < groundHeight - 4) {
            blockType = 'stone';
          } else if(y < groundHeight - 1) {
            blockType = Math.random() < 0.1 ? 'coal' : 'stone';
          } else if(y < groundHeight) {
            blockType = 'dirt';
          } else if(y === groundHeight) {
            blockType = 'grass';
          }
          
          if(blockType) {
            const key = getBlockKey(worldX, y, worldZ);
            blocks.set(key, blockType);
          }
        }
        
        // Add trees
        if(Math.random() < 0.08 && terrain[x][z] > 20) {
          const th = terrain[x][z];
          for(let y = th; y < th + 5; y++) {
            blocks.set(getBlockKey(worldX, y, worldZ), 'wood');
          }
          for(let dy = 0; dy < 3; dy++) {
            for(let dx = -2; dx <= 2; dx++) {
              for(let dz = -2; dz <= 2; dz++) {
                if(Math.abs(dx) + Math.abs(dz) <= 2) {
                  blocks.set(getBlockKey(worldX + dx, th + 4 + dy, worldZ + dz), 'leaves');
                }
              }
            }
          }
        }
      }
    }
  }
  
  const sharedGeometry = new THREE.BoxGeometry(1, 1, 1);
  const materials = {};
  
  function getMaterial(blockType) {
    if(!materials[blockType]) {
      materials[blockType] = new THREE.MeshPhongMaterial({ 
        color: BLOCK_TYPES[blockType] || 0xffffff,
        flatShading: true,
      });
    }
    return materials[blockType];
  }
  
  function createBlockMesh(x, y, z, blockType) {
    const mesh = new THREE.Mesh(sharedGeometry, getMaterial(blockType));
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    mesh.userData = { x, y, z, blockType };
    return mesh;
  }
  
  function loadChunk(cx, cz) {
    const key = getChunkKey(cx, cz);
    if(chunks.has(key)) return;
    
    generateChunk(cx, cz);
    const group = new THREE.Group();
    
    for(let x = 0; x < CHUNK_SIZE; x++) {
      for(let z = 0; z < CHUNK_SIZE; z++) {
        for(let y = 0; y < WORLD_HEIGHT; y++) {
          const worldX = cx * CHUNK_SIZE + x;
          const worldZ = cz * CHUNK_SIZE + z;
          const blockKey = getBlockKey(worldX, y, worldZ);
          const blockType = blocks.get(blockKey);
          
          if(blockType) {
            const mesh = createBlockMesh(worldX, y, worldZ, blockType);
            group.add(mesh);
          }
        }
      }
    }
    
    scene.add(group);
    chunks.set(key, group);
  }
  
  function unloadChunk(cx, cz) {
    const key = getChunkKey(cx, cz);
    const group = chunks.get(key);
    if(group) {
      scene.remove(group);
      chunks.delete(key);
    }
  }
  
  function updateChunks() {
    const playerChunkX = Math.floor(player.pos.x / CHUNK_SIZE);
    const playerChunkZ = Math.floor(player.pos.z / CHUNK_SIZE);
    
    for(let cx = playerChunkX - RENDER_DISTANCE; cx <= playerChunkX + RENDER_DISTANCE; cx++) {
      for(let cz = playerChunkZ - RENDER_DISTANCE; cz <= playerChunkZ + RENDER_DISTANCE; cz++) {
        loadChunk(cx, cz);
      }
    }
  }
  
  function isSolid(x, y, z) {
    if(y < 0 || y >= WORLD_HEIGHT) return false;
    const blockType = blocks.get(getBlockKey(x, y, z));
    return blockType && blockType !== 'air' && blockType !== 'water' && blockType !== 'leaves';
  }
  
  function checkCollision(x, y, z, w, h) {
    const minX = Math.floor(x - w);
    const maxX = Math.floor(x + w);
    const minY = Math.floor(y);
    const maxY = Math.floor(y + h - 0.01);
    const minZ = Math.floor(z - w);
    const maxZ = Math.floor(z + w);
    
    for(let ix = minX; ix <= maxX; ix++) {
      for(let iy = Math.max(0, minY); iy <= Math.min(WORLD_HEIGHT - 1, maxY); iy++) {
        for(let iz = minZ; iz <= maxZ; iz++) {
          if(isSolid(ix, iy, iz)) return true;
        }
      }
    }
    return false;
  }
  
  function update() {
    // Movement
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), camera.rotation.y);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), camera.rotation.y);
    
    player.vel.x = 0;
    player.vel.z = 0;
    
    if(keys['w']) player.vel.addScaledVector(forward, player.speed);
    if(keys['s']) player.vel.addScaledVector(forward, -player.speed);
    if(keys['a']) player.vel.addScaledVector(right, -player.speed);
    if(keys['d']) player.vel.addScaledVector(right, player.speed);
    
    // Gravity
    player.vel.y -= player.gravity;
    
    // Collision
    const w = 0.3;
    const h = 1.8;
    
    const nextX = player.pos.x + player.vel.x;
    if(!checkCollision(nextX, player.pos.y, player.pos.z, w, h)) {
      player.pos.x = nextX;
    }
    
    const nextZ = player.pos.z + player.vel.z;
    if(!checkCollision(player.pos.x, player.pos.y, nextZ, w, h)) {
      player.pos.z = nextZ;
    }
    
    const nextY = player.pos.y + player.vel.y;
    if(player.vel.y < 0) {
      if(checkCollision(player.pos.x, nextY, player.pos.z, w, h)) {
        player.pos.y = Math.floor(player.pos.y) + 1;
        player.vel.y = 0;
        player.isGrounded = true;
      } else {
        player.pos.y = nextY;
        player.isGrounded = false;
      }
    } else {
      if(checkCollision(player.pos.x, nextY, player.pos.z, w, h)) {
        player.vel.y = 0;
      } else {
        player.pos.y = nextY;
      }
      player.isGrounded = false;
    }
    
    if(player.pos.y < 0) {
      player.health -= 5;
      player.pos.set(50, 30, 50);
    }
    
    if(player.health <= 0) {
      player.health = 20;
      player.hunger = 20;
      player.pos.set(50, 30, 50);
    }
    
    // Hunger
    if(Math.random() < 0.0005) {
      player.hunger = Math.max(0, player.hunger - 0.1);
      if(player.hunger === 0) {
        player.health = Math.max(0, player.health - 0.1);
      }
    }
    
    camera.position.copy(player.pos);
    updateChunks();
    updateHUD();
  }
  
  function updateHUD() {
    document.getElementById('health-value').textContent = Math.floor(player.health);
    document.getElementById('hunger-value').textContent = Math.floor(player.hunger);
  }
  
  // Event listeners
  document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if(e.key === ' ') {
      e.preventDefault();
      if(player.isGrounded) {
        player.vel.y += player.jumpForce;
        player.isGrounded = false;
      }
    }
    
    const num = parseInt(e.key);
    if(num >= 1 && num <= 9) {
      player.selectedBlock = BLOCK_NAMES[num - 1];
      updateHotbar();
    }
    
    if(e.key === 'c' || e.key === 'C') {
      const menu = document.getElementById('crafting-menu');
      if(menu) menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
  });
  
  document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
  });
  
  document.addEventListener('mousemove', (e) => {
    if(document.pointerLockElement) {
      camera.rotation.order = 'YXZ';
      camera.rotation.y -= e.movementX * 0.005;
      camera.rotation.x -= e.movementY * 0.005;
      
      if(camera.rotation.x > Math.PI / 2) camera.rotation.x = Math.PI / 2;
      if(camera.rotation.x < -Math.PI / 2) camera.rotation.x = -Math.PI / 2;
    }
  });
  
  renderer.domElement.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
  });
  
  renderer.domElement.addEventListener('mousedown', (e) => {
    if(!document.pointerLockElement) return;
    
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    if(intersects.length > 0) {
      const hit = intersects[0];
      const data = hit.object.userData;
      
      if(e.button === 0) { // place
        const normal = hit.face.normal;
        const nx = Math.round(normal.x);
        const ny = Math.round(normal.y);
        const nz = Math.round(normal.z);
        
        const newX = data.x + nx;
        const newY = data.y + ny;
        const newZ = data.z + nz;
        
        if(player.inventory[player.selectedBlock] > 0) {
          const key = getBlockKey(newX, newY, newZ);
          blocks.set(key, player.selectedBlock);
          player.inventory[player.selectedBlock]--;
          
          const mesh = createBlockMesh(newX, newY, newZ, player.selectedBlock);
          scene.add(mesh);
        }
      } else if(e.button === 2) { // break
        const key = getBlockKey(data.x, data.y, data.z);
        const blockType = blocks.get(key);
        if(blockType) {
          blocks.delete(key);
          player.inventory[blockType] = (player.inventory[blockType] || 0) + 1;
          scene.remove(hit.object);
        }
      }
    }
  });
  
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  
  function updateHotbar() {
    document.querySelectorAll('.hotbar-slot').forEach((slot, idx) => {
      slot.classList.remove('selected');
    });
    const idx = BLOCK_NAMES.indexOf(player.selectedBlock) + 1;
    document.getElementById('block-' + idx)?.classList.add('selected');
  }
  
  // Start button
  document.getElementById('startBtn')?.addEventListener('click', () => {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('hud').style.display = 'block';
    renderer.domElement.requestPointerLock();
  });
  
  // Crafting
  document.querySelectorAll('.craft-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-recipe');
      const recipe = RECIPES[key];
      if(!recipe) return;
      
      for(const [k, v] of Object.entries(recipe.input)) {
        if((player.inventory[k] || 0) < v) return;
      }
      
      for(const [k, v] of Object.entries(recipe.input)) {
        player.inventory[k] -= v;
      }
      for(const [k, v] of Object.entries(recipe.output)) {
        player.inventory[k] = (player.inventory[k] || 0) + v;
      }
      
      updateHUD();
    });
  });
  
  // Main loop
  function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
  }
  
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  
  // Initial load
  updateChunks();
  animate();
})();
