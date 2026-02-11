# AGENTS.md

This file provides context for AI agents working on this project.

## Project Type

Love2D-based 2D game engine with browser-based visual editors.

## Technology Stack

- **Runtime**: Love2D (Lua) + Bun tooling/editors (TypeScript)
- **Frontend**: Vanilla TypeScript (no framework)
- **Backend**: Bun HTTP server
- **Game Engine**: Love2D (Lua)
- **Build**: Bun bundler
- **Styling**: CSS with CSS variables

## Key Architecture Decisions

### Path Handling
All file paths stored as **relative to project root** for cross-machine compatibility:
- Assets: `assets/props/tree.png`
- Scripts: `scripts/objects/chest.lua`
- Scenes: `content/scenes/forest.json`

### Component-Based System
Game objects use component architecture:
- Transform (position, rotation, scale)
- Sprite (visual rendering)
- Collider (physics)
- Trigger (event zones)
- Script (behavior)

### Data Flow
1. Editors create JSON files (scenes, dialogues)
2. Love2D runtime loads and parses JSON
3. Runtime instantiates game objects with components
4. Scripts attach to objects for custom behavior

## File Locations

### Critical Files
- `Makefile` - Build commands
- `BEHAVIOR_LAYER_GUIDE.md` - Love2D implementation guide
- `Utils/scene_editor/server.ts` - Scene editor backend
- `Utils/dialog_editor/server.ts` - Dialogue editor backend
- `content/scenes/index.json` - Scene registry
- `content/dialogue/index.json` - Dialogue registry

### Source Files
- `Utils/scene_editor/src/app.ts` - Scene editor frontend
- `Utils/dialog_editor/src/app.ts` - Dialogue editor frontend
- `Utils/scene_editor/types/scene.ts` - Scene type definitions
- `Utils/scene_editor/public/styles.css` - Scene editor styles
- `Utils/dialog_editor/public/styles.css` - Dialogue editor styles

### Content Files
- `content/scenes/*.json` - Scene definitions
- `content/dialogue/*.json` - Dialogue graphs
- `scripts/objects/*.lua` - Object behaviors
- `scripts/triggers/*.lua` - Trigger behaviors

## Development Commands

```bash
# Build
make build        # Build both editors
make scene        # Build Scene Editor only
make dialog       # Build Dialogue Editor only

# Development
make dev          # Run both editors
make dev-scene    # Scene Editor on port 5174
make dev-dialog   # Dialogue Editor on port 5173

# Maintenance
make clean        # Remove build outputs
make help         # Show all commands
```

### Love2D Runtime

```bash
# Run runtime
love Game

# Lua syntax check for runtime
find Game -name '*.lua' -type f -print0 | xargs -0 -n1 luac -p
```

## Editor Ports

- Scene Editor: http://localhost:5174
- Dialogue Editor: http://localhost:5173

## TypeScript Configuration

Editors use Bun's built-in TypeScript support. No tsconfig.json needed. Build with:
```bash
bun run build.ts
```

## Code Style

### TypeScript
- Use explicit types for function parameters
- Use interfaces for object shapes
- Prefer `const` over `let`
- Use camelCase for variables/functions
- Use PascalCase for types/interfaces

### Lua (for Love2D)
- Use snake_case for variables/functions
- Modules return tables
- Use local variables where possible
- Document public functions with comments

### CSS
- Use CSS variables from :root
- Follow BEM naming convention
- Use rem units for sizing

## Common Tasks

### Adding a New Scene Object Type

1. Add type to `GameObjectType` in `Utils/scene_editor/types/scene.ts`
2. Add rendering logic in `Utils/scene_editor/src/app.ts`
3. Add property editor in inspector panel
4. Update Love2D runtime components/systems in `Game/src/`

### Adding a New Dialogue Node Type

1. Extend `DialogueNode` type in `Utils/dialog_editor/src/app.ts`
2. Add node rendering in graph canvas
3. Add property editor in inspector
4. Update validation in `server.ts`

### Adding a New Requirement Type

1. Add to `REQ_TYPES` array in `Utils/dialog_editor/src/app.ts`
2. Implement runtime check in dialogue/state systems under `Game/src/`

### Adding a New Effect Type

1. Add to `FX_TYPES` array in `Utils/dialog_editor/src/app.ts`
2. Implement runtime execution in dialogue/state systems under `Game/src/`

## Testing

Currently no automated tests. Manual testing:
1. Build editors
2. Run dev servers
3. Create test scene/dialogue
4. Verify save/load works
5. Check all features in browser

## Known Limitations

- Dialogue runtime is currently a placeholder (core scene runtime is implemented)
- No automated testing
- Script cache hot-reload exists; full asset hot-reload is not implemented
- Editors require manual refresh after build

## Future Enhancements

- Expand runtime from core scene MVP to full gameplay systems
- Asset hot-reload
- Undo/redo system
- Multi-user collaboration
- Export to other formats
- Mobile editor support

## Project Context

This is a work-in-progress game development toolset. The editors are functional and the core Love2D runtime foundation is implemented on branch `core`.

When implementing or extending Love2D runtime features:
1. Follow the component-based architecture
2. Use the JSON structures produced by editors
3. Implement all managers (Scene, Object, Script, Dialogue, State)
4. Add systems for rendering, physics, and dialogue
5. Test with sample scenes and scene reload flow

For scene authoring and runtime workflow details, use:
- `RUNTIME_AGENT_PLAYBOOK.md` - Agent workflow for creating scenes and building/running the game

## Questions?

Refer to:
- `BEHAVIOR_LAYER_GUIDE.md` - Love2D implementation details
- `RUNTIME_AGENT_PLAYBOOK.md` - Scene schema and game build/run workflow for agents
- `Utils/scene_editor/scene_editor_guidelines.md` - Scene editor docs
- `Utils/dialog_editor/guidelines.md` - Dialogue editor docs
