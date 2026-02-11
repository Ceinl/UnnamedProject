# Runtime Agent Playbook

This file is for agents implementing or extending the Love2D runtime on branch `core`.

## What Exists Now

- Love2D runtime entrypoint: `Game/main.lua`
- Runtime core: `Game/src/`
- Scene loading from `content/scenes/index.json`
- Scene validation/defaulting at runtime (`Game/src/utils/SceneValidation.lua`)
- Components: Transform, Sprite, Collider, Trigger, Script, Text
- Systems: Render, Physics, Trigger, Dialogue (dialogue currently placeholder)

## Build And Run

```bash
# Build editors (optional for runtime-only work)
make build

# Run runtime
love Game
```

Useful checks:

```bash
# Lua syntax checks
find Game -name '*.lua' -type f -print0 | xargs -0 -n1 luac -p
```

## Runtime Hotkeys

- `F1` toggle stats/log HUD
- `F2` toggle collider debug draw
- `F3` toggle trigger debug draw
- `F4` toggle text-bounds debug draw
- `F5` reload current scene
- `F6` reload cached scripts
- `E` interact with `onInteract` triggers
- `P` pause update loop
- `[` previous scene from index
- `]` next scene from index

## How To Create Scenes (Required Contract)

### 1. Register Scene In Index

Add item to `content/scenes/index.json`:

```json
{
  "id": "forest_level_01",
  "name": "Forest Level",
  "path": "content/scenes/forest_level_01.json"
}
```

### 2. Create Scene JSON File

Minimum required fields:

- `id` (string)
- `size.width` (number)
- `size.height` (number)
- `objects` (array)

Recommended base template:

```json
{
  "id": "forest_level_01",
  "name": "Forest Level",
  "version": "1.0.0",
  "lastModified": "2026-02-11T12:00:00Z",
  "size": { "width": 3200, "height": 1800 },
  "backgroundColor": "#1a1a2e",
  "camera": {
    "defaultPosition": { "x": 1600, "y": 900 },
    "defaultZoom": 1.0
  },
  "objects": [],
  "scripts": []
}
```

### 3. Object JSON Rules

Required for every object:

- `id` (unique string in scene)
- `type` (`prop|trigger|collider|spawn|light|text`)
- `position.x`, `position.y` (numbers)
- `size.width`, `size.height` (numbers)

Common optional fields:

- `name`, `rotation`, `scale`, `opacity`, `zIndex`, `color`, `tags`, `visible`
- `sprite` path (relative path only)
- `script` path (relative path only)
- `scriptParams` object

Component blocks:

- `collider`: `shape`, `offset`, `isStatic`, `isTrigger`, physics params
- `trigger`: `event`, `script`, `action`, `cooldown`, `oneShot`
- `text`: `content`, `fontFamily`, `fontSize`, `align`, `lineHeight`

## Path Rules

Always use project-root-relative paths:

- Good: `assets/props/tree.png`
- Good: `scripts/objects/chest.lua`
- Bad: `/Users/.../tree.png`
- Bad: `../outside/project.lua`

## Script Authoring

Object script callbacks supported:

- `onLoad(params)`
- `onInit()`
- `update(dt)`
- `draw()`
- `onCollisionEnter(other, contact)`
- `onCollisionExit(other, contact)`
- `onTrigger(target, eventType)`
- `onDestroy()`

Trigger script callbacks supported:

- `onLoad(params)`
- `onInit()`
- `onEnter(target)`
- `onExit(target)`
- `onStay(target)`
- `onInteract(target)`
- `onDestroy()`

## Agent Checklist Before Finish

1. Ensure new scene is in `content/scenes/index.json`.
2. Validate JSON shape against rules above.
3. Keep asset/script paths relative.
4. Run `luac -p` syntax check for changed Lua files.
5. Start runtime with `love Game` and verify scene load/reload.
6. If adding runtime features, update both `ROADMAP.md` and `AGENTS.md`.

## Core Runtime Files

- `Game/src/core/Game.lua`
- `Game/src/core/SceneManager.lua`
- `Game/src/core/ObjectManager.lua`
- `Game/src/utils/SceneValidation.lua`
- `Game/src/systems/RenderSystem.lua`
- `Game/src/systems/PhysicsSystem.lua`
- `Game/src/systems/TriggerSystem.lua`
