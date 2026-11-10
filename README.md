# CodeBot Quest 🤖

> A browser-based 3D coding game where students write **real JavaScript** to guide a robot through a grid world.

![CodeBot Quest Screenshot](public/screenshot.png)

## 🎮 What is CodeBot Quest?

CodeBot Quest teaches programming concepts through actual code — not drag-and-drop blocks. Students control a robot by writing JavaScript, using real language constructs like `for` loops, `while` loops, `if/else`, functions, and variables.

**Learning objectives:**
- Sequencing (telling a computer what to do in order)
- `for` loops (repeating actions a known number of times)
- `while` loops (repeating until a condition is met)
- `if/else` statements (making decisions)
- Functions (reusing code)
- Combining all of the above

---

## 🚀 How to Run

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev

# 3. Open in browser
# → http://localhost:5173
```

### Run Tests
```bash
npm test
```

### Build for Production
```bash
npm run build
```

---

## 🕹️ Gameplay

1. Read the level description in the right panel
2. Write JavaScript in the code editor
3. Press **▶ Run** (or `Ctrl+Enter`) to watch the robot execute your code
4. If the robot crashes or misses the goal, edit your code and try again
5. Collect all required gems and reach the 🟡 goal tile to win!

### Robot API

| Function | Description |
|---|---|
| `moveForward()` | Move 1 tile in the facing direction |
| `turnLeft()` | Rotate 90° counter-clockwise |
| `turnRight()` | Rotate 90° clockwise |
| `collectGem()` | Pick up a gem on the current tile |
| `isPathClear()` | Returns `true` if the tile ahead is passable |
| `onGem()` | Returns `true` if standing on a gem |
| `atGoal()` | Returns `true` if standing on the goal tile |

Use any JavaScript: `for`, `while`, `if/else`, `let`, `function`, etc.

---

## 📚 Level Progression

| Level | Concept | Challenge |
|---|---|---|
| 1 | Sequencing | Walk straight to the goal |
| 2 | Sequencing | Navigate a corner |
| 3 | Sequencing | Collect a gem then reach the goal |
| 4 | `for` loops | Long corridor |
| 5 | `for` loops | Staircase pattern |
| 6 | `while` loops | Unknown-length corridor |
| 7 | `if` | Collect gems scattered along a path |
| 8 | `if/else` | Navigate around a wall |
| 9 | Functions | Reusable square-walking function |
| 10 | Combined | Full maze with gems and walls |

Progress is saved automatically in the browser's localStorage.

---

## ➕ How to Add a New Level

1. Create a new file: `src/levels/levelNN.json`

```json
{
  "id": 11,
  "title": "My New Level",
  "concept": "Variables",
  "description": "Use a variable to store how many steps to take.",
  "hint": "let steps = 5; for (let i = 0; i < steps; i++) { moveForward(); }",
  "grid": [
    "S....G",
    "......",
    "......"
  ],
  "legend": { "S": "start", "G": "goal", ".": "floor", "#": "wall", "*": "gem" },
  "startDirection": "east",
  "requireAllGems": false,
  "maxSteps": 100,
  "starterCode": "// Your code here\n"
}
```

**Grid characters:**
- `S` — Robot start position (exactly one per level)
- `G` — Goal tile (exactly one per level)
- `.` — Walkable floor
- `#` — Wall (impassable)
- `*` — Gem (collectible)

2. Add the import to `src/levels/index.js`:

```js
import level11 from './level11.json';
export const LEVELS = [ /* existing... */, level11 ];
```

That's it! No other code changes needed.

---

## 🏗️ Architecture

```
src/
├── main.js              ← App entry, wires everything together
├── style.css
├── game/
│   ├── scene.js         ← Three.js scene, camera, lights, render loop
│   ├── world.js         ← Builds floor/walls/gems/goal from level JSON
│   ├── robot.js         ← Robot mesh + animation helpers
│   └── animator.js      ← Plays back the recorded action list
├── engine/
│   ├── simulation.js    ← Pure logic: grid, robot state, API rules (no Three.js)
│   └── worker.js        ← Runs student code against simulation, returns actions
├── ui/
│   ├── editor.js        ← CodeMirror 6 setup
│   ├── panels.js        ← Level info, hints, buttons, messages
│   ├── progress.js      ← localStorage save/load
│   ├── sound.js         ← Web Audio API sound effects
│   └── confetti.js      ← Win celebration effect
└── levels/
    ├── index.js          ← Exports all levels in order
    └── level01–10.json
```

**Key design principle:** Game logic (in `engine/`) is completely separate from graphics (`game/`). The simulation runs in a Web Worker so infinite loops cannot freeze the browser.

---

## 🔒 Safety

- Student code runs in a **Web Worker** — it cannot access the DOM
- The main thread terminates the Worker after **2 seconds** (infinite loop protection)
- The simulation enforces a **maxSteps** limit per level

---

## 🛠️ Tech Stack

| Tool | Purpose |
|---|---|
| [Vite](https://vitejs.dev/) | Build tool (zero config) |
| [Three.js](https://threejs.org/) | 3D scene |
| [CodeMirror 6](https://codemirror.net/) | Code editor with syntax highlighting |
| [Vitest](https://vitest.dev/) | Unit tests |
| Web Workers | Safe code execution |
| localStorage | Progress persistence |
| Web Audio API | Synthesised sound effects |

No backend. No database. No external model files. Pure static site.

---

## 🌐 Embedding in Another Site

```html
<iframe
  src="https://your-org.github.io/codebot-quest/"
  width="1024"
  height="640"
  style="border:none; border-radius:12px;"
  allow="autoplay"
></iframe>
```

No hard-coded absolute paths — the app works from any sub-path when `base` in `vite.config.js` is set correctly.

---

## 🚀 Deploy to GitHub Pages

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys to GitHub Pages on every push to `main`.

1. Push this repo to GitHub
2. Go to **Settings → Pages → Source: GitHub Actions**
3. The live URL will be `https://<your-username>.github.io/codebot-quest/`

---

## 👏 Credits

- **Developer:** Game Coders Club
- **3D Engine:** [Three.js](https://threejs.org/) — MIT License
- **Code Editor:** [CodeMirror](https://codemirror.net/) — MIT License
- **Build Tool:** [Vite](https://vitejs.dev/) — MIT License
- **Testing:** [Vitest](https://vitest.dev/) — MIT License

---

*Built for the Game Coders Club — teaching kids to code through play. 🎮*
