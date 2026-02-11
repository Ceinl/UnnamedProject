# Scene Editor Tool - Complete Overview

## Project Summary

This is a **browser-based visual scene editor** for creating interactive 2D game scenes. It provides a canvas-based interface for placing game objects (props, triggers, colliders), defining their properties, and exporting complete scene definitions as JSON. The editor supports image-based object placement with script attachments using relative paths for cross-machine compatibility.

---

## Architecture

The tool consists of:
- **Frontend**: TypeScript application with canvas-based scene editor
- **Backend**: Bun-based HTTP server with JSON API
- **Build System**: Bun bundler for TypeScript compilation
- **File Browser**: Native file system integration for selecting project repositories

---

## File Structure

```
scene_editor/
├── server.ts              # Bun HTTP server (backend API)
├── build.ts               # Build script for frontend
├── src/
│   └── app.ts             # Main frontend application
├── public/
│   ├── index.html         # Single-page application HTML
│   ├── styles.css         # Complete styling
│   ├── app.js             # Compiled JavaScript (generated)
│   └── app.js.map         # Source map (generated)
└── types/
    └── scene.ts           # Shared type definitions
```

---

## Backend (server.ts)

### Server Configuration
- **Port**: 5174
- **Runtime**: Bun (Node.js alternative)
- **Static files served from**: `scene_editor/public/`
- **Scene files stored in**: Selected repo's `content/scenes/` directory
- **Index file**: `content/scenes/index.json`
- **Working directory**: User-selected project repository

### API Endpoints

#### `GET /api/project`
Returns currently selected project path and validation status.
```typescript
Response: { 
  path: string | null, 
  valid: boolean,
  contentPath: string | null 
}
```

#### `POST /api/project/select`
Validates and selects a project directory.
```typescript
Request Body: { path: string }
Response: { 
  ok: boolean, 
  error?: string,
  contentPath: string 
}
```

Validation checks:
- Directory exists
- Contains expected structure (content/scenes/)
- Read/write permissions

#### `GET /api/scenes`
Returns list of all scene files in the selected project.
```typescript
Response: { items: [{ id: string, name: string }] }
```

#### `GET /api/scene/:id`
Loads a specific scene definition.
```typescript
Response: { id: string, data: Scene }
```

#### `POST /api/scene/:id`
Saves a scene with validation.
```typescript
Request Body: Scene
Response: { ok: true, validation: { errors: [], warnings: [] } }
```

#### `GET /api/assets`
Lists available image assets from the project's asset directory.
```typescript
Response: { 
  images: [{ 
    id: string, 
    path: string,        // Relative to project root
    fullPath: string,    // Absolute path for loading
    size: { width: number, height: number }
  }] 
}
```

#### `GET /api/scripts`
Lists available script files from the project's script directory.
```typescript
Response: { 
  scripts: [{ 
    id: string, 
    path: string,        // Relative path (stored in JSON)
    name: string 
  }] 
}
```

### Data Validation

The server validates scenes for:
- **Errors**: 
  - Missing required properties (id, type, position)
  - Invalid collider shapes or dimensions
  - Broken script references (file not found)
  - Duplicate object IDs
  - Invalid trigger configurations
- **Warnings**: 
  - Objects outside scene bounds
  - Overlapping colliders without interaction
  - Scripts in non-standard locations
  - Unused assets referenced

### Path Handling

All paths stored in scene JSON use **relative paths** from the project root:
```json
{
  "background": "assets/scenes/forest_bg.png",
  "objects": [{
    "sprite": "assets/props/tree.png",
    "script": "scripts/objects/interactive_tree.lua"
  }]
}
```

Path resolution on load:
1. Store relative path in JSON
2. Resolve to absolute path using `projectRoot + relativePath`
3. Validate file exists
4. Load asset

---

## Frontend (src/app.ts)

### Type Definitions

#### Core Types
```typescript
type Vector2 = {
  x: number;
  y: number;
};

type Vector2Size = {
  width: number;
  height: number;
};

type GameObjectType = "prop" | "trigger" | "collider" | "spawn" | "light";

type ColliderShape = "box" | "circle" | "polygon";

type GameObject = {
  id: string;                    // Unique identifier
  type: GameObjectType;          // Object category
  name?: string;                 // Display name
  
  // Transform
  position: Vector2;             // World position (x, y)
  size: Vector2Size;             // Width/height or radius
  rotation: number;              // Degrees
  scale: Vector2;                // Scale multiplier (default: 1, 1)
  
  // Visual
  sprite?: string;               // Relative path to image asset
  color?: string;                // Fallback color if no sprite
  opacity: number;               // 0-1 transparency
  zIndex: number;                // Render order
  
  // Collider specific
  collider?: {
    shape: ColliderShape;
    offset?: Vector2;            // Offset from position
    isStatic: boolean;           // Static or dynamic
    isTrigger: boolean;          // Trigger (no collision response)
  };
  
  // Trigger specific
  trigger?: {
    event: "onEnter" | "onExit" | "onStay" | "onInteract";
    script?: string;             // Relative path to script
    action?: string;             // Inline action identifier
    cooldown?: number;           // Seconds between triggers
    oneShot: boolean;            // Trigger only once
  };
  
  // Script attachment
  script?: string;               // Relative path to behavior script
  scriptParams?: Record<string, unknown>;  // Script configuration
  
  // Metadata
  tags?: string[];               // Search/filter tags
  locked?: boolean;              // Prevent editing
  visible?: boolean;             // Visible in game
  editorVisible?: boolean;       // Visible in editor
};

type Scene = {
  id: string;                    // Scene identifier
  name?: string;                 // Display name
  
  // World settings
  size: Vector2Size;             // Scene bounds
  background?: string;           // Background image path
  backgroundColor?: string;      // Fallback color
  
  // Grid settings
  grid: {
    enabled: boolean;
    size: number;                // Grid cell size
    snap: boolean;               // Snap to grid
    color: string;
    opacity: number;
  };
  
  // Camera
  camera: {
    defaultPosition: Vector2;
    defaultZoom: number;
    bounds?: { min: Vector2; max: Vector2 };
  };
  
  // Objects
  objects: GameObject[];
  
  // Layers
  layers?: string[];             // Named layers for organization
  
  // Global scripts
  scripts?: string[];            // Scene-level scripts (relative paths)
  
  // Metadata
  version: string;
  lastModified: string;
};
```

### State Management

```typescript
type EditorState = {
  // Project
  projectPath: string | null;
  contentPath: string | null;
  
  // Scene
  scenes: SceneItem[];           // List of all scenes
  currentSceneId: string | null;
  sceneData: Scene | null;
  dirty: boolean;                // Unsaved changes
  
  // Viewport
  camera: {
    position: Vector2;           // Camera offset
    zoom: number;                // Zoom level (0.1 - 5.0)
  };
  
  // Selection
  selectedObjectIds: string[];   // Multi-select support
  hoveredObjectId: string | null;
  
  // Tools
  activeTool: "select" | "move" | "place" | "collider" | "trigger";
  toolOptions: {
    snapToGrid: boolean;
    showGrid: boolean;
    showColliders: boolean;
    showTriggers: boolean;
  };
  
  // Placement
  placementObject: GameObject | null;  // Object being placed
  isPlacing: boolean;
  
  // Dragging
  dragState: {
    isDragging: boolean;
    startPos: Vector2;
    objects: string[];
    mode: "move" | "resize" | "rotate";
  } | null;
  
  // Asset browser
  assets: AssetItem[];
  scripts: ScriptItem[];
  
  // UI
  panels: {
    assetBrowser: boolean;
    sceneHierarchy: boolean;
    inspector: boolean;
    layers: boolean;
  };
};
```

### Canvas Rendering System

#### Constants
```typescript
const CANVAS = {
  minZoom: 0.1,
  maxZoom: 5.0,
  zoomStep: 0.1,
  gridColor: "rgba(255, 255, 255, 0.1)",
  selectionColor: "#4dd1c8",
  colliderColor: "#ff8b5a",
  triggerColor: "#8b5aff",
  spawnColor: "#5aff8b",
  handleSize: 8
};
```

#### Rendering Layers (bottom to top)
1. **Background**: Grid, scene background color/image
2. **Object Bodies**: Sprites, shapes
3. **Object Outlines**: Selection borders, hover highlights
4. **Gizmos**: 
   - Collider boundaries (orange dashed lines)
   - Trigger zones (purple fill + border)
   - Spawn points (green arrows)
   - Transform handles (rotation, scale)
5. **UI Overlays**: Selection boxes, drag previews

#### Visual Features
- **Grid**: Configurable size with snap-to-grid option
- **Zoom/Pan**: Mouse wheel zoom, middle-click drag to pan
- **Object Gizmos**: 
  - Selection: Teal bounding box with resize handles
  - Colliders: Orange wireframe overlay
  - Triggers: Purple semi-transparent fill
  - Scripts: Small script icon indicator

### Object Editor Features

#### Object Properties Panel

**Transform Section:**
- Position (X, Y) - with numeric input or drag
- Size (Width, Height) or Radius
- Rotation (degrees)
- Scale (X, Y)

**Visual Section:**
- Sprite: Image picker with asset browser
- Color: Color picker (fallback when no sprite)
- Opacity: 0-100 slider
- Z-Index: Layer ordering

**Collider Section (for collider/prop types):**
- Shape: Box/Circle/Polygon dropdown
- Offset: X, Y from position
- Static/Dynamic toggle
- Is Trigger toggle

**Trigger Section (for trigger types):**
- Event Type: onEnter/onExit/onStay/onInteract
- Script: File picker with relative path display
- Action: Inline action name (alternative to script)
- Cooldown: Seconds between triggers
- One-shot toggle

**Script Section:**
- Script Path: File picker (relative path stored)
- Parameters: Dynamic key-value editor for script config
- Open Script: Button to open in external editor

**Metadata Section:**
- Name: Display name
- Tags: Comma-separated list
- Locked: Prevent editing checkbox
- Visible in Game: Show/hide in runtime
- Visible in Editor: Show/hide in editor only

### Asset Management

#### Asset Browser Panel
- **Images Tab**: 
  - Thumbnail grid of available sprites
  - Drag-and-drop onto canvas to create prop
  - Filter by folder/tags
  - Preview on hover
  
- **Scripts Tab**:
  - List of available behavior scripts
  - Filter by language (.lua, .js, .py, etc.)
  - Recent scripts section
  - Drag onto objects to attach

#### Asset Discovery
Server scans project directories:
- Images: `assets/**/*.{png,jpg,jpeg,webp}`
- Scripts: `scripts/**/*.{lua,js,py,ts}`

### Scene Hierarchy Panel

Tree view of all objects:
```
Scene: Forest Level
├── [Layer: Background]
│   ├── Sky (sprite)
│   └── Mountains (sprite)
├── [Layer: Ground]
│   ├── Floor (collider)
│   └── Grass patches (prop)
├── [Layer: Props]
│   ├── Tree_01 (prop + script)
│   ├── Chest (prop + trigger + script)
│   └── Rock (prop)
├── [Layer: Triggers]
│   ├── Level Exit (trigger)
│   └── Ambient Audio (trigger)
└── [Layer: Spawns]
    ├── Player Spawn (spawn)
    └── Enemy Spawn 1 (spawn)
```

Features:
- Drag to reorder (affects z-index)
- Click to select
- Double-click to focus camera
- Right-click context menu (duplicate, delete, lock)
- Visibility toggles
- Lock toggles

### Tools System

#### Select Tool (V)
- Click to select single object
- Shift+click for multi-select
- Click+drag to marquee select
- Drag selected objects to move
- Drag handles to resize/rotate

#### Move Tool (M)
- Pan camera with drag
- Arrow keys for precise camera nudge

#### Place Tool (P)
- Click on canvas to place new object
- Uses currently selected asset from browser
- Hold Shift to place multiple
- Snap to grid if enabled

#### Collider Tool (C)
- Draw box/circle collider on canvas
- Click and drag to define size
- Auto-selects appropriate type

#### Trigger Tool (T)
- Draw trigger zone on canvas
- Prompts for event type after creation
- Suggests available scripts

### Grid and Snapping

```typescript
type GridSettings = {
  enabled: boolean;
  size: number;           // Pixels per grid cell
  snap: boolean;          // Snap objects to grid
  subdivisions: number;   // Visual subdivisions
  showCoordinates: boolean;  // Show world coords on hover
};
```

Snapping behavior:
- Objects snap to nearest grid intersection
- Resize snaps to grid increments
- Rotation snaps to 15° increments (hold Shift for free rotation)

### Keyboard Shortcuts

```typescript
const SHORTCUTS = {
  // Tools
  "v": "selectTool",
  "m": "moveTool", 
  "p": "placeTool",
  "c": "colliderTool",
  "t": "triggerTool",
  
  // Actions
  "ctrl+s": "saveScene",
  "ctrl+z": "undo",
  "ctrl+shift+z": "redo",
  "ctrl+d": "duplicate",
  "delete": "deleteSelection",
  "ctrl+g": "group",
  "ctrl+shift+g": "ungroup",
  
  // View
  "h": "toggleUI",
  "f": "focusSelection",
  "home": "resetCamera",
  "+": "zoomIn",
  "-": "zoomOut",
  "0": "resetZoom",
  
  // Grid
  "ctrl+'": "toggleGrid",
  "ctrl+;": "toggleSnap"
};
```

---

## Build System (build.ts)

Uses Bun's built-in bundler:

```typescript
await Bun.build({
  entrypoints: ["src/app.ts"],
  outdir: "public",
  target: "browser",
  minify: false,
  sourcemap: "external"
});
```

---

## Styling (styles.css)

### Design System

#### Color Palette
```css
:root {
  --bg: #0c0f14;           /* Deep background */
  --bg-2: #121720;         /* Secondary background */
  --ink: #e8edf2;          /* Primary text */
  --muted: #9aa5b4;        /* Secondary text */
  --panel: #151b24;        /* Panel background */
  --panel-2: #1b2330;      /* Elevated panels */
  --accent: #ff8b5a;       /* Orange - colliders */
  --accent-2: #4dd1c8;     /* Teal - selection */
  --accent-3: #8b5aff;     /* Purple - triggers */
  --accent-4: #5aff8b;     /* Green - spawns */
  --danger: #ff6b63;       /* Error/danger */
  --stroke: rgba(232, 237, 242, 0.12);  /* Borders */
}
```

#### Typography
- **Display**: Marcellus (serif) - titles
- **Body**: Chivo - UI text
- **Mono**: JetBrains Mono - coordinates, IDs

#### Visual Effects
- Dark theme optimized for long editing sessions
- Subtle grid pattern on canvas
- Gizmo colors follow game object types
- Semi-transparent overlays for non-intrusive UI

#### Layout
- **Left Sidebar**: Scene hierarchy, layer management
- **Center**: Main canvas (maximized workspace)
- **Right Sidebar**: Inspector panel, asset browser
- **Topbar**: Project info, scene selector, tool buttons
- **Bottom Bar**: Status, coordinates, zoom level
- **Floating**: Quick tool palette

---

## HTML Structure (index.html)

### Main Sections

```html
<div class="app">
  <!-- Project selector (shown if no project selected) -->
  <div id="projectSelector" class="modal">...</div>
  
  <!-- Topbar -->
  <header class="topbar">
    <div class="project-info">...</div>
    <div class="scene-selector">...</div>
    <div class="actions">...</div>
  </header>
  
  <!-- Main workspace -->
  <div class="workspace">
    <!-- Left sidebar -->
    <aside class="sidebar-left">
      <section class="hierarchy-panel">...</section>
      <section class="layers-panel">...</section>
    </aside>
    
    <!-- Canvas area -->
    <main class="canvas-container">
      <canvas id="sceneCanvas"></canvas>
      <div class="canvas-overlay">...</div>
    </main>
    
    <!-- Right sidebar -->
    <aside class="sidebar-right">
      <section class="inspector-panel">...</section>
      <section class="asset-browser">...</section>
    </aside>
  </div>
  
  <!-- Bottom bar -->
  <footer class="status-bar">
    <span class="coordinates">X: 0, Y: 0</span>
    <span class="zoom">100%</span>
    <span class="status">Ready</span>
  </footer>
  
  <!-- Floating tool palette -->
  <div class="tool-palette">...</div>
</div>
```

---

## Usage Workflow

### First Time Setup
```bash
# Build the frontend
bun run build.ts

# Start the server
bun run server.ts

# Open browser to http://localhost:5174
```

### Selecting a Project
1. On first load, project selector modal appears
2. Click "Browse" to open file picker
3. Navigate to your game project folder
4. Select folder containing `content/scenes/`
5. Server validates and stores path
6. Project loads with available scenes

### Creating a New Scene
1. Click "New Scene" button
2. Enter scene name
3. Define scene size (width x height)
4. Optional: Set background color/image
5. Scene opens in editor with empty canvas

### Adding Objects

**From Asset Browser:**
1. Open asset browser (right panel)
2. Navigate to image folder
3. Drag image onto canvas
4. Object created at drop position
5. Adjust position, scale, rotation

**Using Tools:**
1. Select tool from palette (C for collider, T for trigger)
2. Click and drag on canvas
3. Define area/shape
4. Configure properties in inspector

### Configuring Objects
1. Click object to select
2. Inspector panel shows properties
3. Edit transform (position, size, rotation)
4. For props: Assign sprite from asset browser
5. For triggers/colliders: Define behavior
6. For any object: Attach script

### Attaching Scripts
1. Select object in scene or hierarchy
2. In Inspector, expand "Script" section
3. Click "Select Script" button
4. File browser shows available scripts
5. Select script file
6. Path stored as relative: `scripts/behaviors/door.lua`
7. Configure script parameters if needed

### Setting Up Colliders
1. Create object or select existing
2. Enable collider in Inspector
3. Choose shape: Box/Circle/Polygon
4. Adjust size and offset
5. Set static/dynamic
6. Toggle "Is Trigger" for non-physical triggers

### Setting Up Triggers
1. Use Trigger Tool or convert collider to trigger
2. Select event type:
   - **onEnter**: Player/object enters zone
   - **onExit**: Player/object leaves zone
   - **onStay**: Continuous while inside
   - **onInteract**: Player presses interact key
3. Assign script or action:
   - Script: Select file from project
   - Action: Enter action identifier string
4. Set cooldown (minimum seconds between triggers)
5. Enable one-shot if trigger should fire only once

### Scene Organization

**Layers:**
1. Open Layers panel (left sidebar)
2. Create new layer: Background, Props, Colliders, etc.
3. Drag objects between layers
4. Toggle layer visibility/lock
5. Layers affect render order (bottom to top)

**Hierarchy:**
1. View all objects in tree structure
2. Group related objects
3. Lock objects to prevent accidental edits
4. Hide objects to reduce clutter
5. Search/filter by name or tag

### Saving and Exporting
1. Press Ctrl+S or click "Save"
2. Server validates scene
3. Errors/warnings displayed if any
4. Scene saved to `content/scenes/{sceneId}.json`
5. Index updated automatically

### JSON Output Format

```json
{
  "id": "forest_level_01",
  "name": "Forest Level 1",
  "version": "1.0.0",
  "lastModified": "2026-02-11T10:30:00Z",
  
  "size": {
    "width": 3200,
    "height": 1800
  },
  
  "background": "assets/scenes/forest_bg.png",
  "backgroundColor": "#1a3d1a",
  
  "grid": {
    "enabled": true,
    "size": 32,
    "snap": true,
    "color": "rgba(255,255,255,0.1)",
    "opacity": 0.5
  },
  
  "camera": {
    "defaultPosition": { "x": 1600, "y": 900 },
    "defaultZoom": 1.0,
    "bounds": {
      "min": { "x": 0, "y": 0 },
      "max": { "x": 3200, "y": 1800 }
    }
  },
  
  "layers": ["Background", "Ground", "Props", "Triggers", "Spawns"],
  
  "objects": [
    {
      "id": "tree_01",
      "type": "prop",
      "name": "Large Oak Tree",
      "position": { "x": 400, "y": 600 },
      "size": { "width": 128, "height": 192 },
      "rotation": 0,
      "scale": { "x": 1, "y": 1 },
      "sprite": "assets/props/tree_oak.png",
      "zIndex": 10,
      "tags": ["flora", "solid"],
      "locked": false,
      "visible": true
    },
    {
      "id": "ground_collider",
      "type": "collider",
      "name": "Ground",
      "position": { "x": 1600, "y": 1700 },
      "size": { "width": 3200, "height": 100 },
      "rotation": 0,
      "scale": { "x": 1, "y": 1 },
      "color": "#444444",
      "zIndex": 0,
      "collider": {
        "shape": "box",
        "offset": { "x": 0, "y": 0 },
        "isStatic": true,
        "isTrigger": false
      },
      "tags": ["ground", "solid"]
    },
    {
      "id": "chest_01",
      "type": "prop",
      "name": "Treasure Chest",
      "position": { "x": 800, "y": 1550 },
      "size": { "width": 48, "height": 32 },
      "sprite": "assets/props/chest_closed.png",
      "zIndex": 20,
      "script": "scripts/objects/chest.lua",
      "scriptParams": {
        "lootTable": "forest_common",
        "isLocked": true,
        "requiredKey": "forest_key"
      },
      "tags": ["interactive", "lootable"]
    },
    {
      "id": "exit_trigger",
      "type": "trigger",
      "name": "Level Exit",
      "position": { "x": 3000, "y": 1500 },
      "size": { "width": 64, "height": 200 },
      "color": "#8b5aff",
      "opacity": 0.3,
      "zIndex": 100,
      "trigger": {
        "event": "onEnter",
        "script": "scripts/triggers/level_transition.lua",
        "cooldown": 0,
        "oneShot": false
      },
      "scriptParams": {
        "targetScene": "forest_level_02",
        "spawnPoint": "entrance_west"
      },
      "tags": ["transition", "level_exit"]
    },
    {
      "id": "player_spawn",
      "type": "spawn",
      "name": "Player Spawn Point",
      "position": { "x": 100, "y": 1500 },
      "size": { "width": 32, "height": 64 },
      "color": "#5aff8b",
      "zIndex": 50,
      "tags": ["spawn", "player"]
    }
  ],
  
  "scripts": [
    "scripts/scenes/forest_ambient.lua"
  ]
}
```

---

## Path Resolution Strategy

### Relative Path Storage
All file references stored as relative to project root:
```
Project Root/
├── content/
│   └── scenes/
│       └── forest_level_01.json  <-- Scene file
├── assets/
│   └── props/
│       └── tree.png              --> "assets/props/tree.png"
└── scripts/
    └── objects/
        └── chest.lua             --> "scripts/objects/chest.lua"
```

### Cross-Machine Compatibility
1. Editor stores only relative paths
2. Each developer sets their own project path
3. Server resolves: `projectRoot + relativePath`
4. Works identically on any machine with same project structure
5. Version control friendly (no absolute paths)

### Path Validation
On save/load:
1. Validate all referenced paths exist
2. Check relative paths resolve correctly
3. Warn about missing assets
4. Suggest corrections for broken references

---

## Integration with Game Engine

The scene editor produces JSON files that can be consumed by your game runtime:

### Runtime Components
- **Scene Loader**: Parses JSON, instantiates objects
- **Asset Manager**: Loads images using resolved paths
- **Script Manager**: Loads and attaches behavior scripts
- **Physics System**: Creates colliders from definitions
- **Trigger System**: Manages trigger zones and events

### Loading a Scene
```lua
-- Example runtime integration
local sceneData = json.load("content/scenes/forest_level_01.json")
local scene = Scene.new(sceneData)

-- Load objects
for _, objData in ipairs(sceneData.objects) do
    local object = GameObject.new(objData)
    
    -- Attach sprite
    if objData.sprite then
        local absolutePath = projectRoot .. "/" .. objData.sprite
        object:setSprite(absolutePath)
    end
    
    -- Attach script
    if objData.script then
        local scriptPath = projectRoot .. "/" .. objData.script
        local script = loadfile(scriptPath)
        object:attachScript(script, objData.scriptParams)
    end
    
    scene:addObject(object)
end
```

---

## Technical Highlights

1. **Project-Agnostic**: Works with any project structure via path selection
2. **Cross-Machine Safe**: All paths stored relative to project root
3. **Canvas-Based Rendering**: High performance with zoom/pan
4. **Type-Safe**: Full TypeScript coverage
5. **Real-time Validation**: Server validates on save
6. **Multi-Select**: Edit multiple objects simultaneously
7. **Undo/Redo**: Full action history
8. **Grid Snapping**: Precise placement
9. **Script Parameters**: Dynamic configuration per object
10. **Layer System**: Organize complex scenes

---

## Extension Points

To add new features:

1. **New Object Types**: Extend `GameObjectType` and add rendering logic
2. **New Collider Shapes**: Extend `ColliderShape` with physics integration
3. **Custom Gizmos**: Add rendering functions for specialized objects
4. **New Tools**: Add tool state and interaction handlers
5. **Export Formats**: Add new endpoints in server.ts
6. **Script Languages**: Extend script discovery patterns
7. **Visual Themes**: Modify CSS variables in styles.css

---

*Universal Scene Editor Specification*
