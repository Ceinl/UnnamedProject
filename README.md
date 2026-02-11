# UnnamedProject

A Love2D-based 2D game engine with browser-based visual editors for scenes and dialogues.

## Overview

This project provides a complete development environment for creating 2D games with:

- **Scene Editor** - Visual tool for placing game objects, colliders, triggers, and configuring scenes
- **Dialogue Editor** - Node-graph editor for creating branching dialogue systems
- **Love2D Runtime** - Game engine that consumes JSON data from editors (to be implemented)

## Project Structure

```
UnnamedProject/
├── Utils/
│   ├── scene_editor/        # Visual scene editor (TypeScript/Bun)
│   │   ├── server.ts        # HTTP server (port 5174)
│   │   ├── build.ts         # Build script
│   │   ├── src/app.ts       # Frontend application
│   │   ├── public/          # Static files (HTML, CSS, JS)
│   │   └── types/scene.ts   # Type definitions
│   │
│   └── dialog_editor/       # Visual dialogue editor (TypeScript/Bun)
│       ├── server.ts        # HTTP server (port 5173)
│       ├── build.ts         # Build script
│       ├── src/app.ts       # Frontend application
│       ├── public/          # Static files
│       └── content/         # Dialogue content
│
├── content/
│   ├── scenes/              # Scene JSON files
│   │   ├── index.json       # Scene registry
│   │   └── *.json           # Individual scene files
│   │
│   └── dialogue/            # Dialogue JSON files
│       ├── index.json       # Dialogue registry
│       └── *.json           # Individual dialogue files
│
├── scripts/
│   ├── objects/             # Object behavior scripts (Lua)
│   └── triggers/            # Trigger behavior scripts (Lua)
│
├── Makefile                 # Build and dev commands
├── BEHAVIOR_LAYER_GUIDE.md  # Love2D runtime implementation guide
├── README.md                # This file
└── AGENTS.md                # AI agent context
```

## Requirements

- [Bun](https://bun.sh) runtime (v1.0+)
- [Love2D](https://love2d.org) (for game runtime - when implemented)
- Modern web browser

## Quick Start

### 1. Install Dependencies

```bash
# Ensure Bun is installed
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (via PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

### 2. Build Editors

```bash
# Build both editors
make build

# Or build individually
make scene    # Build Scene Editor only
make dialog   # Build Dialog Editor only
```

### 3. Run Development Servers

```bash
# Start both editors (in background)
make dev

# Or start individually
make dev-scene   # Scene Editor on http://localhost:5174
make dev-dialog  # Dialog Editor on http://localhost:5173
```

### 4. Open in Browser

- Scene Editor: http://localhost:5174
- Dialogue Editor: http://localhost:5173

## Usage Workflow

### Creating a Scene

1. Open Scene Editor (http://localhost:5174)
2. Select your project folder (must contain `content/scenes/`)
3. Click "New Scene" and define scene properties
4. Add objects using the asset browser or placement tools
5. Configure colliders, triggers, and scripts
6. Press `Ctrl+S` to save

### Creating Dialogue

1. Open Dialogue Editor (http://localhost:5173)
2. Click "New" to create a dialogue
3. Double-click canvas to add nodes
4. Connect nodes by dragging handles
5. Add choices, requirements, and effects
6. Save your work

### Implementing Game Runtime

The Love2D runtime needs to be implemented following the architecture in `BEHAVIOR_LAYER_GUIDE.md`. Key components:

- `src/core/Game.lua` - Central game hub
- `src/core/SceneManager.lua` - Scene loading
- `src/core/ObjectManager.lua` - Game object management
- `src/components/` - Transform, Sprite, Collider, Trigger, Script
- `src/systems/` - Render, Physics, Trigger, Dialogue

See `BEHAVIOR_LAYER_GUIDE.md` for complete implementation details.

## Build Commands

```bash
# Build all editors for release
make build

# Build Scene Editor only
make scene

# Build Dialogue Editor only
make dialog

# Clean build outputs
make clean

# Run development servers
make dev
make dev-scene
make dev-dialog

# Show help
make help
```

## Editor Features

### Scene Editor
- Canvas-based object placement with zoom/pan
- Visual editing of props, colliders, triggers, spawn points
- Grid snapping and alignment
- Multi-select and bulk operations
- Asset browser for images and scripts
- Relative path storage for cross-machine compatibility

### Dialogue Editor
- Node-graph visual dialogue creation
- Branching conversations with choices
- Requirements and effects system
- Chat mode support
- Auto-layout and manual positioning
- State management integration

## File Formats

### Scene JSON
```json
{
  "id": "forest_level_01",
  "name": "Forest Level",
  "size": { "width": 3200, "height": 1800 },
  "objects": [
    {
      "id": "tree_01",
      "type": "prop",
      "position": { "x": 400, "y": 600 },
      "sprite": "assets/props/tree.png",
      "script": "scripts/objects/tree.lua"
    }
  ]
}
```

### Dialogue JSON
```json
{
  "start": "greeting",
  "nodes": {
    "greeting": {
      "text": "Hello!",
      "choices": [
        { "label": "Hi", "next": "response" }
      ]
    }
  }
}
```

## Development

### Project Architecture

- **Editors**: TypeScript frontend + Bun backend
- **Content**: JSON files for scenes/dialogues
- **Scripts**: Lua files for game behavior
- **Runtime**: Love2D (to be implemented)

### Adding New Features

**Scene Editor:**
- Extend types in `Utils/scene_editor/types/scene.ts`
- Add rendering in `Utils/scene_editor/src/app.ts`
- Update server endpoints in `Utils/scene_editor/server.ts`

**Dialogue Editor:**
- Add node types in `Utils/dialog_editor/src/app.ts`
- Extend requirements/effects arrays
- Update validation in server

**Love2D Runtime:**
- Follow component-based architecture from guide
- Implement managers for scenes, objects, scripts
- Add systems for rendering, physics, dialogue

## Troubleshooting

**Editors won't start:**
- Ensure Bun is installed: `bun --version`
- Check ports 5173 and 5174 are available

**Can't save scenes:**
- Verify project folder contains `content/scenes/`
- Check write permissions on the directory

**Assets not showing:**
- Confirm assets are in expected folders (`assets/` for images)
- Restart the editor server

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test both editors
5. Submit a pull request

## License

[Your License Here]

## Credits

- Love2D - Game framework
- Bun - JavaScript runtime
- TypeScript - Type-safe JavaScript

---

*For detailed implementation guides, see BEHAVIOR_LAYER_GUIDE.md*
