# 3D Minecraft
A full 3D Minecraft clone in your browser. Built with Three.js, no downloads needed.

Web files live in the `web/` folder:

- `web/index.html` — entry page
- `web/style.css` — styles & HUD
- `web/app.js` — full 3D game engine with terrain generation, physics, mining & building

Run the game:

```bash
# from the repository root
python3 -m http.server 8000 --directory web

# then open http://localhost:8000 in your browser
```

**Controls:**
- **WASD** — Move forward/backward/strafe
- **Mouse** — Look around (click to lock pointer)
- **Space** — Jump
- **1-6** — Select block (Grass, Dirt, Stone, Wood, Sand, Water)
- **Left Click** — Place selected block
- **Right Click** — Break block (instant)

**Features:**
- Full 3D terrain with multiple block types
- First-person camera with smooth mouse look
- Gravity, jumping, and collision detection
- Inventory system (infinite blocks for now)
- Chunk-based world generation
- Real-time block placing and breaking
- Shadows and realistic lighting

Have fun building your world!
# unblocked-experiment
new unblocked website for schoool
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>2D Minecraft Clone</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <canvas id="gameCanvas"></canvas>
  <script src="script.js"></script>
</body>
</html>
body {
  margin: 0;
  overflow: hidden; /* Makes the game full-screen */
}
canvas {
  display: block;
  background-color: #87CEEB; /* Sky blue background */
}
// 2D Minecraft-like game using Canvas
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Fullscreen the canvas
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Block constants
const BLOCK_SIZE = 50; // Size of each block
const rows = Math.floor(canvas.height / BLOCK_SIZE); // Number of rows
const cols = Math.floor(canvas.width / BLOCK_SIZE); // Number of columns

// Create a block grid
let grid = [];
for (let r = 0; r < rows; r++) {
  grid[r] = [];
  for (let c = 0; c < cols; c++) {
    grid[r][c] = r >= rows / 2 ? '#8B4513' : '#FFFFFF'; // Dirt for lower half
  }
}

// Draw the grid
function drawGrid() {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = grid[r][c]; // Block color
      ctx.fillRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    }
  }
}

// Handle mouse click to "add a block" (grass)
canvas.addEventListener('click', (e) => {
  const x = Math.floor(e.clientX / BLOCK_SIZE);
  const y = Math.floor(e.clientY / BLOCK_SIZE);
  if (y < rows && x < cols && grid[y][x] === '#FFFFFF') {
    grid[y][x] = '#228B22'; // Grass color
  }
  drawGrid();
});

// Loop
drawGrid();
