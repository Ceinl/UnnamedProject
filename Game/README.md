# Game Directory

This directory will contain the Love2D game runtime that consumes the JSON files created by the editors.

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

The Love2D runtime needs to be implemented following the architecture in `../BEHAVIOR_LAYER_GUIDE.md`.

## Next Steps

1. Create directory structure
2. Implement core managers (Game, Scene, Object, Script)
3. Implement components (Transform, Sprite, Collider, Trigger, Script)
4. Implement systems (Render, Physics, Trigger, Dialogue)
5. Add utility classes
6. Test with sample scene and dialogue

See `../BEHAVIOR_LAYER_GUIDE.md` for complete implementation details.
