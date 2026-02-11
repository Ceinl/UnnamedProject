# Game Directory

This directory contains the Love2D game runtime that consumes the JSON files created by the editors.

## Expected Structure

```
Game/
├── main.lua                    # Entry point
├── conf.lua                    # Love2D configuration
├── libs/                       # Third-party libraries
│   ├── json.lua               # JSON parser
│   ├── inspect.lua            # Debug utility
│   └── class.lua              # OOP helper
├── src/
│   ├── core/                  # Core engine systems
│   │   ├── Game.lua
│   │   ├── SceneManager.lua
│   │   ├── ObjectManager.lua
│   │   ├── Camera.lua
│   │   └── EventBus.lua
│   │
│   ├── components/            # Entity components
│   │   ├── Component.lua
│   │   ├── Transform.lua
│   │   ├── Sprite.lua
│   │   ├── Collider.lua
│   │   ├── Trigger.lua
│   │   └── Script.lua
│   │
│   ├── systems/               # Game systems
│   │   ├── RenderSystem.lua
│   │   ├── PhysicsSystem.lua
│   │   ├── TriggerSystem.lua
│   │   └── DialogueSystem.lua
│   │
│   ├── managers/              # Specialized managers
│   │   ├── AssetManager.lua
│   │   ├── StateManager.lua
│   │   ├── ScriptManager.lua
│   │   └── DialogueManager.lua
│   │
│   ├── utils/                 # Utilities
│   │   ├── Vector2.lua
│   │   ├── Rect.lua
│   │   └── TableUtils.lua
│   │
│   └── entities/              # Game object definitions
│       ├── GameObject.lua
│       ├── Prop.lua
│       ├── TriggerZone.lua
│       └── SpawnPoint.lua
│
├── content/                   # Symlink to ../content/
├── assets/                    # Symlink to ../assets/
└── scripts/                   # Symlink to ../scripts/
```

## Implementation Status

Phase 1 runtime foundation is implemented:
- Scene loading from `content/scenes/index.json`
- Scene schema validation, defaults, and deterministic object load order
- Object/component lifecycle (`init`, `update`, `draw`, `destroy`)
- Core components: Transform, Sprite, Collider, Trigger, Script, Text
- Core systems: Render, Physics, Trigger, Dialogue
- Managers: Scene/Object/Asset/Script/State/Dialogue
- Debug overlays and runtime diagnostics

## Run

```bash
love Game
```

### Runtime Hotkeys
- `F1` toggle stats/log HUD
- `F2` toggle collider debug drawing
- `F3` toggle trigger debug drawing
- `F4` toggle text bounds overlay
- `F5` reload current scene
- `F6` reload cached scripts
- `E` interact (trigger events)
- `P` pause/unpause update loop
- `[` / `]` switch scenes from index

See `../BEHAVIOR_LAYER_GUIDE.md` for complete implementation details.
