# Engine Upgrade Roadmap

This roadmap is organized around delivering a stable Love2D runtime first, then layering gameplay/editor features.

---

## Phase 1: Core Runtime MVP (Current Priority)

### 1. Scene Data Pipeline
- [ ] Scene JSON loader (`content/scenes/*.json`)
- [ ] Strict schema validation for required fields
- [ ] Runtime defaults for optional fields
- [ ] Clear error reporting (file, object id, field)
- [ ] Deterministic object load order

### 2. Object & Component Lifecycle
- [ ] `GameObject` base (`id`, `type`, `name`, tags, state)
- [ ] Component lifecycle contract (`init`, `update`, `draw`, `destroy`)
- [ ] Object manager (`create`, `destroy`, `findById`, `findByTag`)
- [ ] Z-index sorting + stable tie-breaker
- [ ] Scene clear/unload cleanup safety

### 3. Core Components
- [ ] Transform component (position, rotation, scale, size)
- [ ] Sprite component (image + color fallback)
- [ ] Collider component (box/circle/polygon input handling)
- [ ] Trigger component (enter/exit/interact states)
- [ ] Script component (attach + params + callbacks)
- [ ] Text component (content, font, size, align, lineHeight)

### 4. Core Systems
- [ ] Render system (background, sprite, text, debug layers)
- [ ] Physics system bootstrap (Love2D Box2D world)
- [ ] Physics-transform synchronization
- [ ] Trigger system event dispatch
- [ ] Script manager update loop integration

### 5. Scene Runtime Integration
- [ ] Scene manager (`load`, `reload`, `unload`)
- [ ] Camera defaults from scene JSON
- [ ] Scene-level script execution support
- [ ] Relative path resolution for assets/scripts
- [ ] Runtime handling for unsupported object data

### 6. Input & Interaction Baseline
- [ ] Centralized input router (keyboard/mouse)
- [ ] Interact key flow for trigger events
- [ ] Pause-safe update loop behavior
- [ ] Basic scene switching hook

### 7. Asset & Script Infrastructure
- [ ] Asset manager cache (images/fonts)
- [ ] Script loader + protected execution (`pcall` wrappers)
- [ ] Script hot-reload dev helper (optional in dev mode)
- [ ] Missing-file fallback behavior (no hard crash)

### 8. Core Debug & Diagnostics
- [ ] FPS/memory/object counters
- [ ] Collider and trigger debug draw toggles
- [ ] Text bounds debug overlay toggle
- [ ] Runtime warnings panel/log stream
- [ ] Per-scene load timing logs

### 9. Core QA Gates (Definition of Done)
- [ ] Load 3+ sample scenes without runtime errors
- [ ] Validate prop/collider/trigger/spawn/text objects render and update correctly
- [ ] Trigger enter/exit/interact events fire reliably
- [ ] Attached scripts run and receive params
- [ ] Scene unload/reload leaves no orphaned physics bodies/components

---

## Phase 2: Core Scene Features (After MVP)

### Sprite Animation
- [ ] Frame sequence definitions (start frame, end frame, duration)
- [ ] Named animation states (idle, walk, attack, etc.)
- [ ] Playback controls (play, pause, stop, loop toggle)
- [ ] Animation transitions and blending
- [ ] Directional sprite support (4-way or 8-way facing)

### Object Hierarchy
- [ ] Parent-child transform relationships
- [ ] Relative positioning, rotation, and scaling
- [ ] Scene graph traversal
- [ ] Prefab/template system for reusable objects

### Custom Properties
- [ ] Arbitrary key-value data storage on game objects
- [ ] Type-safe property definitions (string, number, boolean, enum)
- [ ] Property inheritance from prefabs
- [ ] Runtime property modification via scripts

---

## Phase 3: World Building

### Tilemap System
- [ ] Tile layer support (multiple layers per scene)
- [ ] Tileset management and import
- [ ] Auto-tiling for seamless transitions
- [ ] Tile collision data
- [ ] Animated tiles

### Parallax Backgrounds
- [ ] Multiple background layers
- [ ] Depth-based scroll factor
- [ ] Infinite scrolling support
- [ ] Layer blending modes

### Particle Systems
- [ ] Emitter component for game objects
- [ ] Particle properties (velocity, lifetime, color, size, rotation)
- [ ] Burst and continuous emission modes
- [ ] Collision response (bounce, destroy)

---

## Phase 4: Audio

### Audio Components
- [ ] SFX triggers (one-shot and looping)
- [ ] Background music with crossfading
- [ ] Spatial audio (distance-based volume/pan)
- [ ] Audio bus mixing (master, music, SFX, voice)
- [ ] Audio occlusion/raycasting

---

## Phase 5: Advanced Dialogue

### Text System
- [ ] Variable interpolation (`{playerName}`, `{goldAmount}`)
- [ ] Rich text formatting (color, bold, italic, size)
- [ ] Typewriter effect with speed control
- [ ] Text sound effects (per-character audio)

### Conditions & Logic
- [ ] Expression-based requirements
- [ ] Comparison operators (equals, greater than, less than, etc.)
- [ ] Logical operators (AND, OR, NOT)
- [ ] Function calls for complex checks

### Visual Presentation
- [ ] Character portraits with emotion states
- [ ] Dialogue box themes/styles
- [ ] Positioning (top, bottom, center, custom)
- [ ] Transition effects (fade, slide, pop)

### Cutscene Integration
- [ ] Camera movement commands
- [ ] Object animation triggers
- [ ] Scene transitions
- [ ] Wait/timing commands
- [ ] Synchronous/async operation support

---

## Phase 6: Game Systems

### Save/Load System
- [ ] Scene state serialization
- [ ] Object state persistence
- [ ] Global game state (inventory, flags, stats)
- [ ] Save slots and metadata
- [ ] Auto-save functionality

### Inventory System
- [ ] Item definitions (name, description, icon, stack size)
- [ ] Inventory UI integration
- [ ] Item usage in dialogue
- [ ] Crafting/recipe system

### Quest System
- [ ] Quest definitions with objectives
- [ ] Progress tracking
- [ ] Quest states (inactive, active, completed, failed)
- [ ] Reward system

---

## Phase 7: Polish & Tools

### Editor/Runtime Workflow
- [ ] Undo/redo system
- [ ] Multi-select and bulk operations
- [ ] Search and filter in object lists
- [ ] Asset hot-reload
- [ ] In-editor/runtime parity checks

### Performance
- [ ] Object culling (render only visible objects)
- [ ] Texture atlasing
- [ ] Asset streaming for large worlds
- [ ] Physics optimization (spatial hashing)

### Debugging
- [ ] In-game console
- [ ] Visual debugging overlays (colliders, triggers, paths)
- [ ] Performance profiling (FPS, memory, draw calls)
- [ ] Scene inspection tools

---

## Backlog (Future Considerations)

- [ ] Multiplayer/networking support
- [ ] Modding API
- [ ] Localization workflow improvements
- [ ] Mobile touch controls
- [ ] Steam/integration features
- [ ] Shader/post-processing effects
- [ ] Pathfinding system
- [ ] AI behavior trees

---

## Contributing

When adding features:
1. Update this roadmap to mark items in progress/completed.
2. Follow existing code conventions.
3. Update docs (`AGENTS.md`, `BEHAVIOR_LAYER_GUIDE.md`) when behavior changes.
4. Add sample scene coverage for new runtime capabilities.

## Current Focus

**Next Milestone:** Phase 1 (Core Runtime MVP)  
**Priority:** Scene Data Pipeline + Object/Component Lifecycle + Core Systems  
**Reason:** Everything else depends on a stable runtime foundation.
