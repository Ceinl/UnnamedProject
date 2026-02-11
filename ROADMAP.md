# Engine Upgrade Roadmap

This document tracks planned enhancements to the UnnamedProject game engine. Items are organized by priority and system area.

---

## Phase 1: Core Scene System

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

## Phase 2: World Building

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

## Phase 3: Audio

### Audio Components
- [ ] SFX triggers (one-shot and looping)
- [ ] Background music with crossfading
- [ ] Spatial audio (distance-based volume/pan)
- [ ] Audio bus mixing (master, music, SFX, voice)
- [ ] Audio occlusion/raycasting

---

## Phase 4: Advanced Dialogue

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

## Phase 5: Game Systems

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

## Phase 6: Polish & Tools

### Editor Enhancements
- [ ] Undo/redo system
- [ ] Multi-select and bulk operations
- [ ] Search and filter in object lists
- [ ] Asset hot-reload
- [ ] Scene preview in editor

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
1. Update this roadmap to mark items in progress
2. Follow existing code conventions
3. Update documentation (AGENTS.md, BEHAVIOR_LAYER_GUIDE.md)
4. Add sample usage to sample_scene.json when applicable

## Current Focus

**Next Milestone:** Phase 1 (Core Scene System)  
**Priority:** Sprite Animation and Object Hierarchy  
**Reason:** Required for basic animated character movement and complex object relationships
