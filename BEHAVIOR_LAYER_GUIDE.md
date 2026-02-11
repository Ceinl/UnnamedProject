# Love2D Behavior Layer - Comprehensive Implementation Guide

## Overview

This guide explains how to build the runtime behavior layer for Love2D that consumes JSON data from the Scene Editor and Dialogue Editor tools. This layer bridges the gap between the visual editors and a playable game.

**What you're building:**
- Scene loader and manager
- Game object system with component architecture
- Script attachment and execution system
- Physics integration for colliders
- Dialogue runtime with state management
- Trigger event system
- Asset loading and caching

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Your Love2D Game                     │
├─────────────────────────────────────────────────────────┤
│  main.lua                                               │
│  ├── Game.lua (singleton, orchestrates everything)      │
│  ├── SceneManager.lua (loads/switches scenes)           │
│  ├── ObjectManager.lua (manages game objects)           │
│  ├── ScriptManager.lua (handles script lifecycle)       │
│  ├── DialogueManager.lua (runs dialogue graphs)         │
│  ├── StateManager.lua (game state/variables)            │
│  ├── PhysicsWorld.lua (Box2D integration)               │
│  └── AssetManager.lua (images, sounds, etc.)            │
├─────────────────────────────────────────────────────────┤
│  Components/                                            │
│  ├── Transform.lua (position, rotation, scale)          │
│  ├── Sprite.lua (visual rendering)                      │
│  ├── Collider.lua (physics body/shape)                  │
│  ├── Trigger.lua (event zones)                          │
│  └── Script.lua (behavior attachment)                   │
├─────────────────────────────────────────────────────────┤
│  Systems/                                               │
│  ├── RenderSystem.lua (draws everything)                │
│  ├── PhysicsSystem.lua (updates physics)                │
│  ├── TriggerSystem.lua (checks trigger events)          │
│  └── DialogueSystem.lua (handles conversation UI)       │
└─────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
my_game/
├── main.lua                    # Entry point
├── conf.lua                    # Love2D configuration
├── libs/                       # Third-party libraries
│   ├── json.lua               # JSON parser (use dkjson or similar)
│   ├── inspect.lua            # Debug utility (optional)
│   └── class.lua              # OOP helper (optional, or use HUMP.class)
├── src/
│   ├── core/                  # Core engine systems
│   │   ├── Game.lua
│   │   ├── SceneManager.lua
│   │   ├── ObjectManager.lua
│   │   ├── Camera.lua         # Camera with attach/detach methods
│   │   └── EventBus.lua       # Pub/sub for decoupled communication
│   │
│   ├── components/            # Entity components
│   │   ├── Component.lua      # Base class
│   │   ├── Transform.lua
│   │   ├── Sprite.lua
│   │   ├── Collider.lua
│   │   ├── Trigger.lua
│   │   └── Script.lua
│   │
│   ├── systems/               # Game systems
│   │   ├── RenderSystem.lua
│   │   ├── PhysicsSystem.lua
│   │   ├── TriggerSystem.lua  # Manages trigger events and interactions
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
│       ├── GameObject.lua     # Base game object class
│       ├── Prop.lua           # Static objects
│       ├── TriggerZone.lua    # Trigger areas
│       └── SpawnPoint.lua     # Spawn markers
│
├── content/                   # Editor output goes here
│   ├── scenes/               # Scene JSON files
│   │   ├── index.json
│   │   ├── forest_level_01.json
│   │   └── dungeon_level_01.json
│   │
│   └── dialogue/             # Dialogue JSON files
│       ├── index.json
│       ├── npc_merchant.json
│       └── quest_giver.json
│
├── assets/                    # Game assets
│   ├── sprites/
│   ├── tilesets/
│   ├── audio/
│   └── fonts/
│
└── scripts/                   # Behavior scripts (attached to objects)
    ├── objects/              # Object-specific behaviors
    │   ├── chest.lua
    │   ├── door.lua
    │   └── npc.lua
    ├── triggers/             # Trigger behaviors
    │   ├── level_transition.lua
    │   └── damage_zone.lua
    └── scenes/               # Scene-level scripts
        └── ambient_effects.lua
```

---

## Core Implementation

### 1. JSON Parser Setup

**libs/json.lua** - Use a robust JSON library:

```lua
-- Use dkjson (drop-in file): https://github.com/LuaDist/dkjson
-- Or json.lua by rxi: https://github.com/rxi/json.lua
-- Place in libs/ and require it

local json = require("libs.json")

-- Wrapper for error handling
local JSON = {}

function JSON.load(path)
    local content = love.filesystem.read(path)
    if not content then
        error("Failed to read file: " .. path)
    end
    
    local success, result = pcall(json.decode, content)
    if not success then
        error("JSON parse error in " .. path .. ": " .. result)
    end
    
    return result
end

function JSON.save(path, data)
    local content = json.encode(data)
    love.filesystem.write(path, content)
end

return JSON
```

---

### 2. Game Class (Central Hub)

**src/core/Game.lua**

```lua
local Game = {
    -- Subsystems
    sceneManager = nil,
    objectManager = nil,
    scriptManager = nil,
    dialogueManager = nil,
    stateManager = nil,
    assetManager = nil,
    physicsWorld = nil,
    
    -- Event bus for decoupled communication
    events = nil,
    
    -- Game state
    currentScene = nil,
    isPaused = false,
    
    -- Configuration
    config = {
        gravity = { x = 0, y = 500 },
        meterScale = 64,  -- 64 pixels = 1 meter
        debug = true
    }
}

function Game.init()
    -- Load configuration
    Game.loadConfig()
    
    -- Initialize event bus first (other systems depend on it)
    Game.events = require("src.core.EventBus").new()
    
    -- Initialize managers
    Game.assetManager = require("src.managers.AssetManager").new(Game)
    Game.stateManager = require("src.managers.StateManager").new(Game)
    Game.scriptManager = require("src.managers.ScriptManager").new(Game)
    Game.dialogueManager = require("src.managers.DialogueManager").new(Game)
    
    -- Initialize systems
    Game.physicsWorld = require("src.systems.PhysicsSystem").new(Game)
    Game.renderSystem = require("src.systems.RenderSystem").new(Game)
    Game.triggerSystem = require("src.systems.TriggerSystem").new(Game)
    Game.dialogueSystem = require("src.systems.DialogueSystem").new(Game)
    
    -- Initialize camera
    Game.camera = require("src.core.Camera").new(Game)
    
    -- Initialize object and scene managers last
    Game.objectManager = require("src.core.ObjectManager").new(Game)
    Game.sceneManager = require("src.core.SceneManager").new(Game)
    
    -- Subscribe to events
    Game.setupEventHandlers()
    
    print("Game initialized successfully")
end

function Game.loadConfig()
    -- Load from config file if exists, otherwise use defaults
    local configData = {}
    local success = pcall(function()
        configData = require("libs.json").load("config.json")
    end)
    
    if success and configData then
        for k, v in pairs(configData) do
            Game.config[k] = v
        end
    end
end

function Game.setupEventHandlers()
    -- Scene change events
    Game.events:on("scene.load", function(sceneId)
        Game.sceneManager:loadScene(sceneId)
    end)
    
    -- Object events
    Game.events:on("object.spawn", function(data)
        Game.objectManager:createObject(data)
    end)
    
    Game.events:on("object.destroy", function(objectId)
        Game.objectManager:destroyObject(objectId)
    end)
    
    -- Dialogue events
    Game.events:on("dialogue.start", function(dialogueId, entryNode)
        Game.dialogueManager:startDialogue(dialogueId, entryNode)
    end)
    
    Game.events:on("dialogue.end", function()
        Game.dialogueSystem:hide()
    end)
    
    -- Trigger events
    Game.events:on("trigger.activated", function(triggerData)
        Game.triggerSystem:handleTrigger(triggerData)
    end)
end

function Game.update(dt)
    if Game.isPaused then return end
    
    -- Update in order: physics → objects → scripts → triggers → dialogue → camera
    Game.physicsWorld:update(dt)
    Game.objectManager:update(dt)
    Game.scriptManager:update(dt)
    Game.triggerSystem:update(dt)
    Game.dialogueManager:update(dt)
    
    if Game.camera then
        Game.camera:update(dt)
    end
end

function Game.draw()
    -- Apply camera transform
    if Game.camera then
        Game.camera:attach()
    end
    
    -- Render systems
    Game.renderSystem:drawBackground()
    Game.objectManager:draw()
    Game.triggerSystem:draw()  -- Debug visualization
    
    if Game.camera then
        Game.camera:detach()
    end
    
    -- UI systems (not affected by camera)
    Game.dialogueSystem:draw()
    Game.renderSystem:drawUI()
    
    -- Debug info
    if Game.config.debug then
        Game.renderSystem:drawDebug()
    end
end

function Game.keypressed(key, scancode, isrepeat)
    -- Global shortcuts
    if key == "escape" then
        Game.dialogueManager:skipOrAdvance()
    end
    
    -- Pass to dialogue system first (it may consume input)
    if Game.dialogueManager:isActive() then
        Game.dialogueManager:keypressed(key)
        return
    end
    
    -- Pass to current scene/game objects
    Game.objectManager:keypressed(key, scancode, isrepeat)
end

function Game.keyreleased(key)
    if not Game.dialogueManager:isActive() then
        Game.objectManager:keyreleased(key)
    end
end

function Game.mousepressed(x, y, button)
    if Game.dialogueManager:isActive() then
        Game.dialogueManager:mousepressed(x, y, button)
        return
    end
    
    Game.objectManager:mousepressed(x, y, button)
end

function Game.quit()
    -- Cleanup
    Game.sceneManager:cleanup()
    Game.physicsWorld:destroy()
end

return Game
```

---

### 3. Vector2 Utility

**src/utils/Vector2.lua**

```lua
local Vector2 = {}
Vector2.__index = Vector2

function Vector2.new(x, y)
    return setmetatable({
        x = x or 0,
        y = y or 0
    }, Vector2)
end

function Vector2.fromTable(t)
    return Vector2.new(t.x, t.y)
end

function Vector2:add(v)
    return Vector2.new(self.x + v.x, self.y + v.y)
end

function Vector2:sub(v)
    return Vector2.new(self.x - v.x, self.y - v.y)
end

function Vector2:mul(s)
    return Vector2.new(self.x * s, self.y * s)
end

function Vector2:div(s)
    return Vector2.new(self.x / s, self.y / s)
end

function Vector2:length()
    return math.sqrt(self.x * self.x + self.y * self.y)
end

function Vector2:normalize()
    local len = self:length()
    if len > 0 then
        return self:div(len)
    end
    return Vector2.new(0, 0)
end

function Vector2:distance(v)
    return self:sub(v):length()
end

function Vector2:clone()
    return Vector2.new(self.x, self.y)
end

function Vector2:toTable()
    return { x = self.x, y = self.y }
end

return Vector2
```

---

### 4. Component Base Class

**src/components/Component.lua**

```lua
local Component = {}
Component.__index = Component

function Component.new(gameObject)
    return setmetatable({
        gameObject = gameObject,
        enabled = true,
        initialized = false
    }, Component)
end

function Component:init()
    -- Override in subclasses
    self.initialized = true
end

function Component:update(dt)
    -- Override in subclasses
end

function Component:draw()
    -- Override in subclasses
end

function Component:destroy()
    -- Cleanup code
end

function Component:getGameObject()
    return self.gameObject
end

function Component:getGame()
    return self.gameObject and self.gameObject.game
end

return Component
```

---

### 5. Transform Component

**src/components/Transform.lua**

```lua
local Component = require("src.components.Component")
local Vector2 = require("src.utils.Vector2")

local Transform = setmetatable({}, { __index = Component })
Transform.__index = Transform

function Transform.new(gameObject, data)
    local self = setmetatable(Component.new(gameObject), Transform)
    
    -- Position (world coordinates)
    self.position = Vector2.fromTable(data.position or { x = 0, y = 0 })
    
    -- Size
    self.size = {
        width = data.size and data.size.width or 32,
        height = data.size and data.size.height or 32
    }
    
    -- Rotation (degrees, converted to radians internally)
    self.rotation = data.rotation or 0
    self.rotationRad = math.rad(self.rotation)
    
    -- Scale
    self.scale = Vector2.fromTable(data.scale or { x = 1, y = 1 })
    
    -- Cached world transform matrix
    self.matrixDirty = true
    self.transformMatrix = nil
    
    return self
end

function Transform:setPosition(x, y)
    if type(x) == "table" then
        self.position = Vector2.fromTable(x)
    else
        self.position = Vector2.new(x, y)
    end
    self.matrixDirty = true
end

function Transform:getPosition()
    return self.position:clone()
end

function Transform:setRotation(degrees)
    self.rotation = degrees
    self.rotationRad = math.rad(degrees)
    self.matrixDirty = true
end

function Transform:getRotation()
    return self.rotation
end

function Transform:getRotationRad()
    return self.rotationRad
end

function Transform:setScale(x, y)
    if type(x) == "table" then
        self.scale = Vector2.fromTable(x)
    else
        self.scale = Vector2.new(x, y or x)
    end
    self.matrixDirty = true
end

function Transform:getScale()
    return self.scale:clone()
end

function Transform:getSize()
    return self.size.width, self.size.height
end

function Transform:setSize(width, height)
    self.size.width = width
    self.size.height = height
    self.matrixDirty = true
end

function Transform:getCenter()
    return Vector2.new(
        self.position.x + self.size.width * self.scale.x / 2,
        self.position.y + self.size.height * self.scale.y / 2
    )
end

function Transform:getBoundingBox()
    local halfW = (self.size.width * self.scale.x) / 2
    local halfH = (self.size.height * self.scale.y) / 2
    local center = self:getCenter()
    
    return {
        left = center.x - halfW,
        right = center.x + halfW,
        top = center.y - halfH,
        bottom = center.y + halfH
    }
end

function Transform:translate(dx, dy)
    self.position = self.position:add(Vector2.new(dx, dy))
    self.matrixDirty = true
end

function Transform:rotate(degrees)
    self.rotation = self.rotation + degrees
    self.rotationRad = math.rad(self.rotation)
    self.matrixDirty = true
end

function Transform:lookAt(targetX, targetY)
    local dx = targetX - self.position.x
    local dy = targetY - self.position.y
    self.rotationRad = math.atan2(dy, dx)
    self.rotation = math.deg(self.rotationRad)
end

function Transform:getTransformMatrix()
    if not self.matrixDirty and self.transformMatrix then
        return self.transformMatrix
    end
    
    local cx, cy = self.position.x, self.position.y
    
    self.transformMatrix = love.math.newTransform(
        cx, cy,
        self.rotationRad,
        self.scale.x, self.scale.y,
        self.size.width / 2, self.size.height / 2
    )
    
    self.matrixDirty = false
    return self.transformMatrix
end

return Transform
```

---

### 6. Sprite Component

**src/components/Sprite.lua**

```lua
local Component = require("src.components.Component")
local Vector2 = require("src.utils.Vector2")

local Sprite = setmetatable({}, { __index = Component })
Sprite.__index = Sprite

function Sprite.new(gameObject, data)
    local self = setmetatable(Component.new(gameObject), Sprite)
    
    self.game = gameObject.game
    
    -- Image reference
    self.image = nil
    self.quad = nil
    
    -- Color tint (fallback when no image)
    self.color = data.color and self:parseColor(data.color) or { 1, 1, 1, 1 }
    
    -- Opacity
    self.opacity = data.opacity or 1.0
    
    -- Z-index for rendering order
    self.zIndex = data.zIndex or 0
    
    -- Animation
    self.animation = nil
    self.currentFrame = 1
    self.animationTimer = 0
    self.frameDuration = 0.1
    self.isPlaying = false
    self.loop = true
    
    -- Flip
    self.flipX = false
    self.flipY = false
    
    -- Load image if specified
    if data.sprite then
        self:loadImage(data.sprite)
    end
    
    return self
end

function Sprite:parseColor(colorStr)
    -- Support hex colors (#RRGGBB or #RRGGBBAA)
    if type(colorStr) == "string" and colorStr:sub(1, 1) == "#" then
        local hex = colorStr:sub(2)
        local r = tonumber(hex:sub(1, 2), 16) / 255
        local g = tonumber(hex:sub(3, 4), 16) / 255
        local b = tonumber(hex:sub(5, 6), 16) / 255
        local a = 1.0
        
        if #hex >= 8 then
            a = tonumber(hex:sub(7, 8), 16) / 255
        end
        
        return { r, g, b, a }
    end
    
    -- Support named colors
    local namedColors = {
        red = { 1, 0, 0, 1 },
        green = { 0, 1, 0, 1 },
        blue = { 0, 0, 1, 1 },
        white = { 1, 1, 1, 1 },
        black = { 0, 0, 0, 1 },
        yellow = { 1, 1, 0, 1 },
        purple = { 0.5, 0, 0.5, 1 }
    }
    
    if type(colorStr) == "string" and namedColors[colorStr:lower()] then
        return namedColors[colorStr:lower()]
    end
    
    return { 1, 1, 1, 1 }
end

function Sprite:loadImage(relativePath)
    self.image = self.game.assetManager:loadImage(relativePath)
    
    if self.image then
        -- If no size set on transform, use image size
        local transform = self.gameObject:getComponent("Transform")
        if transform and transform.size.width == 32 and transform.size.height == 32 then
            local w, h = self.image:getDimensions()
            transform:setSize(w, h)
        end
    end
end

function Sprite:setAnimation(frames, frameDuration)
    self.animation = frames
    self.frameDuration = frameDuration or 0.1
    self.currentFrame = 1
    self.animationTimer = 0
    self.isPlaying = true
end

function Sprite:play()
    self.isPlaying = true
end

function Sprite:stop()
    self.isPlaying = false
end

function Sprite:pause()
    self.isPlaying = false
end

function Sprite:update(dt)
    if not self.isPlaying or not self.animation then
        return
    end
    
    self.animationTimer = self.animationTimer + dt
    
    if self.animationTimer >= self.frameDuration then
        self.animationTimer = self.animationTimer - self.frameDuration
        self.currentFrame = self.currentFrame + 1
        
        if self.currentFrame > #self.animation then
            if self.loop then
                self.currentFrame = 1
            else
                self.currentFrame = #self.animation
                self.isPlaying = false
            end
        end
    end
end

function Sprite:draw()
    local transform = self.gameObject:getComponent("Transform")
    if not transform then return end
    
    love.graphics.push()
    
    -- Apply transform
    local matrix = transform:getTransformMatrix()
    love.graphics.applyTransform(matrix)
    
    -- Set color with opacity
    local color = {
        self.color[1],
        self.color[2],
        self.color[3],
        self.color[4] * self.opacity
    }
    love.graphics.setColor(color)
    
    if self.image then
        -- Handle animation
        if self.animation and self.quad then
            local frame = self.animation[self.currentFrame]
            -- Draw with quad
            love.graphics.draw(self.image, self.quad,
                -transform.size.width / 2,
                -transform.size.height / 2,
                0,
                self.flipX and -1 or 1,
                self.flipY and -1 or 1
            )
        else
            -- Draw full image
            love.graphics.draw(self.image,
                -transform.size.width / 2,
                -transform.size.height / 2,
                0,
                self.flipX and -1 or 1,
                self.flipY and -1 or 1
            )
        end
    else
        -- Draw colored rectangle as fallback
        love.graphics.rectangle("fill",
            -transform.size.width / 2,
            -transform.size.height / 2,
            transform.size.width,
            transform.size.height
        )
    end
    
    love.graphics.pop()
end

function Sprite:setColor(r, g, b, a)
    if type(r) == "table" then
        self.color = { r[1] or r.r, r[2] or r.g, r[3] or r.b, r[4] or r.a or 1 }
    else
        self.color = { r, g, b, a or 1 }
    end
end

function Sprite:setOpacity(opacity)
    self.opacity = math.max(0, math.min(1, opacity))
end

return Sprite
```

---

### 7. Collider Component (Box2D Integration)

**src/components/Collider.lua**

```lua
local Component = require("src.components.Component")
local Vector2 = require("src.utils.Vector2")

local Collider = setmetatable({}, { __index = Component })
Collider.__index = Collider

function Collider.new(gameObject, data)
    local self = setmetatable(Component.new(gameObject), Collider)
    
    self.game = gameObject.game
    self.physicsWorld = self.game.physicsWorld
    
    -- Collider configuration from JSON
    self.shape = data.shape or "box"
    self.isStatic = data.isStatic ~= false  -- Default to static
    self.isTrigger = data.isTrigger or false
    self.offset = Vector2.fromTable(data.offset or { x = 0, y = 0 })
    
    -- Box2D objects
    self.body = nil
    self.fixture = nil
    self.shape = nil
    
    -- Collision callbacks
    self.onCollisionEnter = nil
    self.onCollisionExit = nil
    self.onCollisionStay = nil
    
    return self
end

function Collider:init()
    local transform = self.gameObject:getComponent("Transform")
    if not transform then
        error("Collider requires Transform component")
        return
    end
    
    -- Create body
    local bodyType = self.isStatic and "static" or "dynamic"
    local x = transform.position.x + self.offset.x
    local y = transform.position.y + self.offset.y
    
    self.body = love.physics.newBody(
        self.physicsWorld.world,
        x, y,
        bodyType
    )
    
    -- Create shape based on type
    local width, height = transform:getSize()
    local scale = transform:getScale()
    width = width * scale.x
    height = height * scale.y
    
    if self.shape == "box" then
        self.shape = love.physics.newRectangleShape(width / 2, height / 2)
    elseif self.shape == "circle" then
        local radius = math.min(width, height) / 2
        self.shape = love.physics.newCircleShape(radius)
    elseif self.shape == "polygon" then
        -- For polygon, you'd need vertices in the data
        -- This is a simplified rectangle as fallback
        self.shape = love.physics.newRectangleShape(width / 2, height / 2)
    end
    
    -- Create fixture
    self.fixture = love.physics.newFixture(self.body, self.shape)
    self.fixture:setUserData(self.gameObject)
    
    -- Configure as trigger (sensor) if needed
    if self.isTrigger then
        self.fixture:setSensor(true)
    end
    
    -- Set initial rotation
    self.body:setAngle(transform:getRotationRad())
    
    -- Reference back to this component for callbacks
    self.body:setUserData(self)
    
    Component.init(self)
end

function Collider:update(dt)
    if not self.body then return end
    
    -- Sync transform with physics body (for dynamic bodies)
    if not self.isStatic then
        local transform = self.gameObject:getComponent("Transform")
        if transform then
            local x, y = self.body:getPosition()
            local angle = self.body:getAngle()
            
            -- Subtract offset to get actual position
            transform:setPosition(x - self.offset.x, y - self.offset.y)
            transform:setRotation(math.deg(angle))
        end
    end
end

function Collider:setPosition(x, y)
    if self.body then
        self.body:setPosition(x + self.offset.x, y + self.offset.y)
    end
end

function Collider:setRotation(degrees)
    if self.body then
        self.body:setAngle(math.rad(degrees))
    end
end

function Collider:setVelocity(vx, vy)
    if self.body and not self.isStatic then
        self.body:setLinearVelocity(vx, vy)
    end
end

function Collider:getVelocity()
    if self.body then
        return self.body:getLinearVelocity()
    end
    return 0, 0
end

function Collider:applyForce(fx, fy)
    if self.body and not self.isStatic then
        self.body:applyForce(fx, fy)
    end
end

function Collider:applyImpulse(ix, iy)
    if self.body and not self.isStatic then
        self.body:applyLinearImpulse(ix, iy)
    end
end

function Collider:destroy()
    if self.fixture then
        self.fixture:destroy()
        self.fixture = nil
    end
    
    if self.body then
        self.body:destroy()
        self.body = nil
    end
    
    if self.shape then
        self.shape = nil
    end
    
    Component.destroy(self)
end

return Collider
```

---

### 8. Trigger Component

**src/components/Trigger.lua**

```lua
local Component = require("src.components.Component")
local Vector2 = require("src.utils.Vector2")

local Trigger = setmetatable({}, { __index = Component })
Trigger.__index = Trigger

function Trigger.new(gameObject, data)
    local self = setmetatable(Component.new(gameObject), Trigger)
    
    self.game = gameObject.game
    
    -- Trigger configuration
    self.event = data.event or "onEnter"  -- onEnter, onExit, onStay, onInteract
    self.script = data.script  -- Optional script to execute
    self.action = data.action  -- Optional action identifier
    self.cooldown = data.cooldown or 0
    self.oneShot = data.oneShot or false
    self.hasTriggered = false
    
    -- Cooldown timer
    self.cooldownTimer = 0
    
    -- Track objects inside trigger
    self.objectsInside = {}
    self.objectsInsidePrevious = {}
    
    -- Interaction
    self.canInteract = false
    self.interactKey = "e"
    
    return self
end

function Trigger:init()
    -- Ensure we have a collider as trigger
    local collider = self.gameObject:getComponent("Collider")
    if not collider then
        -- Create trigger collider if missing
        local transform = self.gameObject:getComponent("Transform")
        if transform then
            local colliderData = {
                shape = "box",
                isStatic = true,
                isTrigger = true,
                offset = { x = 0, y = 0 }
            }
            collider = self.gameObject:addComponent("Collider", colliderData)
        end
    elseif not collider.isTrigger then
        -- Convert existing collider to trigger
        collider.fixture:setSensor(true)
        collider.isTrigger = true
    end
    
    Component.init(self)
end

function Trigger:update(dt)
    if self.cooldownTimer > 0 then
        self.cooldownTimer = self.cooldownTimer - dt
    end
    
    -- Handle onStay events
    if self.event == "onStay" and self.cooldownTimer <= 0 then
        for objectId, _ in pairs(self.objectsInside) do
            self:execute(objectId, "onStay")
        end
    end
    
    -- Swap tracking tables
    self.objectsInsidePrevious = {}
    for k, v in pairs(self.objectsInside) do
        self.objectsInsidePrevious[k] = v
    end
    self.objectsInside = {}
end

function Trigger:onObjectEnter(object)
    if self.hasTriggered and self.oneShot then
        return
    end
    
    local objectId = object.id
    self.objectsInside[objectId] = object
    
    -- Check if this is a new entry
    if not self.objectsInsidePrevious[objectId] then
        if self.event == "onEnter" and self.cooldownTimer <= 0 then
            self:execute(objectId, "onEnter")
        end
    end
    
    -- Enable interaction if onInteract type
    if self.event == "onInteract" then
        self.canInteract = true
        self.interactTarget = object
    end
end

function Trigger:onObjectExit(object)
    local objectId = object.id
    
    if self.objectsInsidePrevious[objectId] and not self.objectsInside[objectId] then
        if self.event == "onExit" then
            self:execute(objectId, "onExit")
        end
    end
    
    if self.event == "onInteract" and self.interactTarget == object then
        self.canInteract = false
        self.interactTarget = nil
    end
end

function Trigger:onInteract()
    if self.event == "onInteract" and self.canInteract and self.cooldownTimer <= 0 then
        if self.interactTarget then
            self:execute(self.interactTarget.id, "onInteract")
        end
    end
end

function Trigger:execute(objectId, eventType)
    if self.hasTriggered and self.oneShot then
        return
    end
    
    -- Set cooldown
    if self.cooldown > 0 then
        self.cooldownTimer = self.cooldown
    end
    
    -- Mark as triggered if one-shot
    if self.oneShot then
        self.hasTriggered = true
    end
    
    -- Execute script if provided
    if self.script then
        self.game.events:emit("trigger.activated", {
            trigger = self,
            gameObject = self.gameObject,
            targetObjectId = objectId,
            eventType = eventType,
            script = self.script,
            params = self.gameObject.scriptParams
        })
    end
    
    -- Emit action event if provided
    if self.action then
        self.game.events:emit("action." .. self.action, {
            source = self.gameObject,
            target = objectId
        })
    end
end

function Trigger:draw()
    -- Debug visualization
    if self.game.config.debug then
        local transform = self.gameObject:getComponent("Transform")
        if transform then
            love.graphics.push()
            local matrix = transform:getTransformMatrix()
            love.graphics.applyTransform(matrix)
            
            -- Draw trigger zone
            love.graphics.setColor(0.5, 0.3, 1, 0.3)
            local w, h = transform:getSize()
            love.graphics.rectangle("fill", -w/2, -h/2, w, h)
            
            love.graphics.setColor(0.5, 0.3, 1, 0.8)
            love.graphics.rectangle("line", -w/2, -h/2, w, h)
            
            -- Draw event type
            love.graphics.setColor(1, 1, 1, 1)
            love.graphics.print(self.event, -w/2, -h/2 - 15)
            
            love.graphics.pop()
        end
    end
end

return Trigger
```

---

### 9. Script Component

**src/components/Script.lua**

```lua
local Component = require("src.components.Component")

local Script = setmetatable({}, { __index = Component })
Script.__index = Script

function Script.new(gameObject, data)
    local self = setmetatable(Component.new(gameObject), Script)
    
    self.game = gameObject.game
    self.scriptManager = self.game.scriptManager
    
    -- Script reference
    self.scriptPath = data.script
    self.params = data.scriptParams or {}
    
    -- Loaded script module
    self.module = nil
    self.instance = nil
    
    -- Lifecycle state
    self.hasInit = false
    self.hasLoad = false
    
    return self
end

function Script:init()
    if not self.scriptPath then
        Component.init(self)
        return
    end
    
    -- Load the script module
    local success, result = pcall(function()
        return self.scriptManager:loadScript(self.scriptPath)
    end)
    
    if not success then
        print("ERROR: Failed to load script '" .. self.scriptPath .. "': " .. result)
        Component.init(self)
        return
    end
    
    self.module = result
    
    -- Create instance table if module is a table
    if type(self.module) == "table" then
        self.instance = {}
        
        -- Copy all functions from module to instance
        for k, v in pairs(self.module) do
            if type(v) == "function" then
                self.instance[k] = v
            end
        end
        
        -- Set up instance context
        self.instance.gameObject = self.gameObject
        self.instance.game = self.game
        self.instance.params = self.params
    end
    
    -- Call onLoad if defined
    if self.instance and self.instance.onLoad then
        local success, err = pcall(self.instance.onLoad, self.instance, self.params)
        if not success then
            print("ERROR in onLoad of '" .. self.scriptPath .. "': " .. err)
        else
            self.hasLoad = true
        end
    end
    
    Component.init(self)
end

function Script:update(dt)
    if not self.instance then return end
    
    -- Call onInit on first update (guarantees all components are ready)
    if not self.hasInit and self.instance.onInit then
        local success, err = pcall(self.instance.onInit, self.instance)
        if not success then
            print("ERROR in onInit of '" .. self.scriptPath .. "': " .. err)
        end
        self.hasInit = true
    end
    
    -- Call update
    if self.instance.update then
        local success, err = pcall(self.instance.update, self.instance, dt)
        if not success then
            print("ERROR in update of '" .. self.scriptPath .. "': " .. err)
        end
    end
end

function Script:draw()
    if not self.instance or not self.instance.draw then return end
    
    local success, err = pcall(self.instance.draw, self.instance)
    if not success then
        print("ERROR in draw of '" .. self.scriptPath .. "': " .. err)
    end
end

function Script:onCollisionEnter(other, contact)
    if not self.instance or not self.instance.onCollisionEnter then return end
    
    local success, err = pcall(self.instance.onCollisionEnter, self.instance, other, contact)
    if not success then
        print("ERROR in onCollisionEnter of '" .. self.scriptPath .. "': " .. err)
    end
end

function Script:onCollisionExit(other, contact)
    if not self.instance or not self.instance.onCollisionExit then return end
    
    local success, err = pcall(self.instance.onCollisionExit, self.instance, other, contact)
    if not success then
        print("ERROR in onCollisionExit of '" .. self.scriptPath .. "': " .. err)
    end
end

function Script:onTrigger(targetObjectId, eventType)
    if not self.instance then return end
    
    local handlerName = "on" .. eventType:gsub("^%l", string.upper)
    if self.instance[handlerName] then
        local targetObject = self.game.objectManager:getObject(targetObjectId)
        local success, err = pcall(self.instance[handlerName], self.instance, targetObject)
        if not success then
            print("ERROR in " .. handlerName .. " of '" .. self.scriptPath .. "': " .. err)
        end
    end
end

function Script:destroy()
    if not self.instance then return end
    
    if self.instance.onDestroy then
        local success, err = pcall(self.instance.onDestroy, self.instance)
        if not success then
            print("ERROR in onDestroy of '" .. self.scriptPath .. "': " .. err)
        end
    end
    
    Component.destroy(self)
end

function Script:call(methodName, ...)
    if not self.instance or not self.instance[methodName] then
        return nil
    end
    
    local success, result = pcall(self.instance[methodName], self.instance, ...)
    if not success then
        print("ERROR calling '" .. methodName .. "' in '" .. self.scriptPath .. "': " .. result)
        return nil
    end
    
    return result
end

return Script
```

---

### 10. Game Object Base Class

**src/entities/GameObject.lua**

```lua
local GameObject = {}
GameObject.__index = GameObject

-- Unique ID counter
local idCounter = 0

function GameObject.new(game, data)
    idCounter = idCounter + 1
    
    local self = setmetatable({
        -- Core
        id = data.id or ("object_" .. idCounter),
        game = game,
        type = data.type or "prop",
        name = data.name or "GameObject",
        
        -- Components
        components = {},
        componentsByType = {},
        
        -- Tags for filtering
        tags = data.tags or {},
        
        -- State
        enabled = data.visible ~= false,
        locked = data.locked or false,
        
        -- Script parameters (passed to attached scripts)
        scriptParams = data.scriptParams or {}
    }, GameObject)
    
    return self
end

function GameObject:addComponent(componentType, data)
    -- Require component class
    local componentClass = require("src.components." .. componentType)
    
    -- Create component instance
    local component = componentClass.new(self, data or {})
    
    -- Store reference
    table.insert(self.components, component)
    
    if not self.componentsByType[componentType] then
        self.componentsByType[componentType] = {}
    end
    table.insert(self.componentsByType[componentType], component)
    
    -- Initialize immediately
    component:init()
    
    return component
end

function GameObject:getComponent(componentType)
    local components = self.componentsByType[componentType]
    if components and #components > 0 then
        return components[1]
    end
    return nil
end

function GameObject:getComponents(componentType)
    return self.componentsByType[componentType] or {}
end

function GameObject:removeComponent(component)
    -- Remove from components list
    for i, c in ipairs(self.components) do
        if c == component then
            table.remove(self.components, i)
            break
        end
    end
    
    -- Remove from type mapping
    for typeName, components in pairs(self.componentsByType) do
        for i, c in ipairs(components) do
            if c == component then
                table.remove(components, i)
                break
            end
        end
    end
    
    -- Destroy component
    component:destroy()
end

function GameObject:update(dt)
    if not self.enabled then return end
    
    for _, component in ipairs(self.components) do
        if component.enabled and component.update then
            component:update(dt)
        end
    end
end

function GameObject:draw()
    if not self.enabled then return end
    
    for _, component in ipairs(self.components) do
        if component.enabled and component.draw then
            component:draw()
        end
    end
end

function GameObject:hasTag(tag)
    for _, t in ipairs(self.tags) do
        if t == tag then
            return true
        end
    end
    return false
end

function GameObject:destroy()
    -- Destroy all components
    for _, component in ipairs(self.components) do
        component:destroy()
    end
    
    self.components = {}
    self.componentsByType = {}
end

-- Factory method from JSON data
function GameObject.fromJSON(game, data)
    local object = GameObject.new(game, data)
    
    -- Add Transform (required)
    object:addComponent("Transform", data)
    
    -- Add Sprite if has sprite or color
    if data.sprite or data.color then
        object:addComponent("Sprite", data)
    end
    
    -- Add Collider if defined
    if data.collider then
        object:addComponent("Collider", data.collider)
    end
    
    -- Add Trigger if defined
    if data.trigger then
        object:addComponent("Trigger", data.trigger)
    end
    
    -- Add Script if defined
    if data.script then
        object:addComponent("Script", data)
    end
    
    return object
end

return GameObject
```

---

### 11. Object Manager

**src/core/ObjectManager.lua**

```lua
local GameObject = require("src.entities.GameObject")

local ObjectManager = {}
ObjectManager.__index = ObjectManager

function ObjectManager.new(game)
    return setmetatable({
        game = game,
        objects = {},
        objectsById = {},
        objectsByTag = {},
        objectsByLayer = {},
        zSortedObjects = {},
        needsSort = true
    }, ObjectManager)
end

function ObjectManager:createObject(data)
    local object = GameObject.fromJSON(self.game, data)
    
    -- Register object
    self.objects[object.id] = object
    self.objectsById[object.id] = object
    
    -- Register by tags
    for _, tag in ipairs(object.tags) do
        if not self.objectsByTag[tag] then
            self.objectsByTag[tag] = {}
        end
        self.objectsByTag[tag][object.id] = object
    end
    
    -- Register by layer (if specified in data)
    local layer = data.layer or "default"
    if not self.objectsByLayer[layer] then
        self.objectsByLayer[layer] = {}
    end
    table.insert(self.objectsByLayer[layer], object)
    
    self.needsSort = true
    
    return object
end

function ObjectManager:destroyObject(objectId)
    local object = self.objectsById[objectId]
    if not object then return end
    
    -- Unregister from tags
    for _, tag in ipairs(object.tags) do
        if self.objectsByTag[tag] then
            self.objectsByTag[tag][objectId] = nil
        end
    end
    
    -- Unregister from layers
    for layerName, objects in pairs(self.objectsByLayer) do
        for i, obj in ipairs(objects) do
            if obj.id == objectId then
                table.remove(objects, i)
                break
            end
        end
    end
    
    -- Destroy object
    object:destroy()
    
    -- Unregister
    self.objects[objectId] = nil
    self.objectsById[objectId] = nil
    self.needsSort = true
end

function ObjectManager:getObject(objectId)
    return self.objectsById[objectId]
end

function ObjectManager:getAllObjects()
    local allObjects = {}
    for _, obj in pairs(self.objectsById) do
        table.insert(allObjects, obj)
    end
    return allObjects
end

function ObjectManager:getObjectsByTag(tag)
    local result = {}
    local objects = self.objectsByTag[tag]
    if objects then
        for _, obj in pairs(objects) do
            table.insert(result, obj)
        end
    end
    return result
end

function ObjectManager:getObjectsByLayer(layer)
    return self.objectsByLayer[layer] or {}
end

function ObjectManager:getObjectByName(name)
    for _, object in pairs(self.objectsById) do
        if object.name == name then
            return object
        end
    end
    return nil
end

function ObjectManager:update(dt)
    for _, object in pairs(self.objectsById) do
        object:update(dt)
    end
end

function ObjectManager:draw()
    -- Sort by z-index if needed
    if self.needsSort then
        self:sortByZIndex()
    end
    
    -- Draw in z-order
    for _, object in ipairs(self.zSortedObjects) do
        object:draw()
    end
end

function ObjectManager:sortByZIndex()
    self.zSortedObjects = {}
    
    for _, object in pairs(self.objectsById) do
        table.insert(self.zSortedObjects, object)
    end
    
    table.sort(self.zSortedObjects, function(a, b)
        local spriteA = a:getComponent("Sprite")
        local spriteB = b:getComponent("Sprite")
        local zA = spriteA and spriteA.zIndex or 0
        local zB = spriteB and spriteB.zIndex or 0
        return zA < zB
    end)
    
    self.needsSort = false
end

function ObjectManager:keypressed(key, scancode, isrepeat)
    for _, object in pairs(self.objectsById) do
        local script = object:getComponent("Script")
        if script and script.instance and script.instance.keypressed then
            local success = pcall(script.instance.keypressed, script.instance, key)
            if success then return end
        end
    end
end

function ObjectManager:keyreleased(key)
    for _, object in pairs(self.objectsById) do
        local script = object:getComponent("Script")
        if script and script.instance and script.instance.keyreleased then
            pcall(script.instance.keyreleased, script.instance, key)
        end
    end
end

function ObjectManager:mousepressed(x, y, button)
    for _, object in pairs(self.objectsById) do
        local script = object:getComponent("Script")
        if script and script.instance and script.instance.mousepressed then
            local success = pcall(script.instance.mousepressed, script.instance, x, y, button)
            if success then return end
        end
    end
end

function ObjectManager:clear()
    for id, _ in pairs(self.objectsById) do
        self:destroyObject(id)
    end
end

return ObjectManager
```

---

### 12. Scene Manager

**src/core/SceneManager.lua**

```lua
local JSON = require("libs.json")

local SceneManager = {}
SceneManager.__index = SceneManager

function SceneManager.new(game)
    return setmetatable({
        game = game,
        currentScene = nil,
        scenes = {},
        sceneIndex = nil
    }, SceneManager)
end

function SceneManager:loadSceneIndex()
    local indexPath = "content/scenes/index.json"
    
    local success, data = pcall(function()
        return JSON.load(indexPath)
    end)
    
    if not success then
        print("WARNING: Could not load scene index: " .. data)
        self.sceneIndex = {}
        return
    end
    
    self.sceneIndex = data
    print("Loaded scene index with " .. #data .. " scenes")
end

function SceneManager:loadScene(sceneId)
    print("Loading scene: " .. sceneId)
    
    -- Load scene data
    local scenePath = "content/scenes/" .. sceneId .. ".json"
    
    local success, sceneData = pcall(function()
        return JSON.load(scenePath)
    end)
    
    if not success then
        error("Failed to load scene '" .. sceneId .. "': " .. sceneData)
        return
    end
    
    -- Cleanup current scene
    self:cleanup()
    
    -- Clear physics world
    self.game.physicsWorld:clear()
    
    -- Clear objects
    self.game.objectManager:clear()
    
    -- Set new scene
    self.currentScene = sceneData
    self.scenes[sceneId] = sceneData
    
    -- Configure camera
    if sceneData.camera and self.game.camera then
        local cam = self.game.camera
        local defaultPos = sceneData.camera.defaultPosition or { x = 0, y = 0 }
        cam:setPosition(defaultPos.x, defaultPos.y)
        cam:setZoom(sceneData.camera.defaultZoom or 1.0)
        
        if sceneData.camera.bounds then
            cam:setBounds(
                sceneData.camera.bounds.min.x,
                sceneData.camera.bounds.min.y,
                sceneData.camera.bounds.max.x,
                sceneData.camera.bounds.max.y
            )
        end
    end
    
    -- Set background
    self.backgroundColor = self:parseColor(sceneData.backgroundColor or "#1a1a1a")
    self.backgroundImage = nil
    
    if sceneData.background then
        self.backgroundImage = self.game.assetManager:loadImage(sceneData.background)
    end
    
    -- Create game objects
    if sceneData.objects then
        for _, objectData in ipairs(sceneData.objects) do
            self.game.objectManager:createObject(objectData)
        end
    end
    
    -- Load scene-level scripts
    if sceneData.scripts then
        for _, scriptPath in ipairs(sceneData.scripts) do
            self.game.scriptManager:executeSceneScript(scriptPath)
        end
    end
    
    -- Emit scene loaded event
    self.game.events:emit("scene.loaded", {
        sceneId = sceneId,
        scene = sceneData
    })
    
    print("Scene loaded successfully")
end

function SceneManager:parseColor(colorStr)
    if type(colorStr) ~= "string" or colorStr:sub(1, 1) ~= "#" then
        return { 0.1, 0.1, 0.1, 1 }
    end
    
    local hex = colorStr:sub(2)
    local r = tonumber(hex:sub(1, 2), 16) / 255
    local g = tonumber(hex:sub(3, 4), 16) / 255
    local b = tonumber(hex:sub(5, 6), 16) / 255
    
    return { r, g, b, 1 }
end

function SceneManager:getCurrentScene()
    return self.currentScene
end

function SceneManager:getCamera()
    return self.camera
end

function SceneManager:setCameraPosition(x, y)
    if self.game.camera then
        self.game.camera:setPosition(x, y)
    end
end

function SceneManager:getCamera()
    return self.game.camera
end

function SceneManager:cleanup()
    if not self.currentScene then return end
    
    -- Emit scene unloading event
    self.game.events:emit("scene.unloading", {
        sceneId = self.currentScene.id,
        scene = self.currentScene
    })
    
    self.currentScene = nil
end

return SceneManager
```

---

### 13. Script Manager

**src/managers/ScriptManager.lua**

```lua
local ScriptManager = {}
ScriptManager.__index = ScriptManager

function ScriptManager.new(game)
    return setmetatable({
        game = game,
        loadedScripts = {},
        sceneScripts = {}
    }, ScriptManager)
end

function ScriptManager:loadScript(relativePath)
    -- Check cache
    if self.loadedScripts[relativePath] then
        return self.loadedScripts[relativePath]
    end
    
    -- Construct full path
    local fullPath = relativePath:gsub("%.lua$", "")
    fullPath = fullPath:gsub("/", ".")
    
    -- Load module
    local success, result = pcall(require, fullPath)
    
    if not success then
        error("Failed to load script '" .. relativePath .. "': " .. result)
    end
    
    -- Cache it
    self.loadedScripts[relativePath] = result
    
    return result
end

function ScriptManager:executeSceneScript(relativePath)
    local script = self:loadScript(relativePath)
    
    if type(script) == "table" and script.run then
        local sceneData = self.game.sceneManager:getCurrentScene()
        local success, err = pcall(script.run, script, self.game, sceneData)
        
        if not success then
            print("ERROR in scene script '" .. relativePath .. "': " .. err)
        else
            table.insert(self.sceneScripts, script)
        end
    end
end

function ScriptManager:update(dt)
    -- Update scene-level scripts
    for _, script in ipairs(self.sceneScripts) do
        if script.update then
            local success, err = pcall(script.update, script, dt)
            if not success then
                print("ERROR updating scene script: " .. err)
            end
        end
    end
end

function ScriptManager:draw()
    -- Draw scene-level scripts
    for _, script in ipairs(self.sceneScripts) do
        if script.draw then
            local success, err = pcall(script.draw, script)
            if not success then
                print("ERROR drawing scene script: " .. err)
            end
        end
    end
end

function ScriptManager:clearSceneScripts()
    -- Call cleanup on scene scripts
    for _, script in ipairs(self.sceneScripts) do
        if script.cleanup then
            pcall(script.cleanup, script)
        end
    end
    
    self.sceneScripts = {}
end

return ScriptManager
```

---

### 14. Asset Manager

**src/managers/AssetManager.lua**

```lua
local AssetManager = {}
AssetManager.__index = AssetManager

function AssetManager.new(game)
    return setmetatable({
        game = game,
        images = {},
        sounds = {},
        fonts = {},
        quads = {}
    }, AssetManager)
end

function AssetManager:loadImage(relativePath)
    -- Check cache
    if self.images[relativePath] then
        return self.images[relativePath]
    end
    
    -- Load image
    local success, image = pcall(love.graphics.newImage, relativePath)
    
    if not success then
        print("WARNING: Failed to load image: " .. relativePath)
        return nil
    end
    
    -- Set filter for pixel art
    image:setFilter("nearest", "nearest")
    
    -- Cache it
    self.images[relativePath] = image
    
    return image
end

function AssetManager:loadSound(relativePath, soundType)
    soundType = soundType or "static"  -- static, stream, or queue
    
    if self.sounds[relativePath] then
        return self.sounds[relativePath]
    end
    
    local success, sound = pcall(love.audio.newSource, relativePath, soundType)
    
    if not success then
        print("WARNING: Failed to load sound: " .. relativePath)
        return nil
    end
    
    self.sounds[relativePath] = sound
    return sound
end

function AssetManager:loadFont(relativePath, size)
    size = size or 12
    local key = relativePath .. "_" .. size
    
    if self.fonts[key] then
        return self.fonts[key]
    end
    
    local success, font = pcall(love.graphics.newFont, relativePath, size)
    
    if not success then
        print("WARNING: Failed to load font: " .. relativePath)
        return love.graphics.getFont()  -- Return default font
    end
    
    self.fonts[key] = font
    return font
end

function AssetManager:getImage(path)
    return self.images[path]
end

function AssetManager:getSound(path)
    return self.sounds[path]
end

function AssetManager:getFont(path, size)
    return self.fonts[path .. "_" .. size]
end

function AssetManager:createQuad(imagePath, x, y, width, height)
    local image = self.images[imagePath]
    if not image then
        return nil
    end
    
    local quad = love.graphics.newQuad(x, y, width, height, image:getDimensions())
    return quad
end

function AssetManager:unloadImage(path)
    self.images[path] = nil
end

function AssetManager:unloadSound(path)
    self.sounds[path] = nil
end

function AssetManager:unloadFont(path, size)
    self.fonts[path .. "_" .. size] = nil
end

function AssetManager:unloadAll()
    self.images = {}
    self.sounds = {}
    self.fonts = {}
    self.quads = {}
    
    -- Force garbage collection
    collectgarbage("collect")
end

return AssetManager
```

---

### 15. State Manager (Game State)

**src/managers/StateManager.lua**

```lua
local JSON = require("libs.json")

local StateManager = {}
StateManager.__index = StateManager

function StateManager.new(game)
    return setmetatable({
        game = game,
        
        -- Variables (numbers, strings, booleans)
        variables = {},
        
        -- Flags (booleans)
        flags = {},
        
        -- States (string identifiers for game state)
        states = {},
        
        -- Dialogue tracking
        seenNodes = {},
        visitedNodes = {},
        
        -- Persistence
        saveSlot = 1,
        saveDirectory = "saves"
    }, StateManager)
end

-- Variable operations
function StateManager:setVar(key, value)
    self.variables[key] = value
    self.game.events:emit("state.varChanged", { key = key, value = value })
end

function StateManager:getVar(key, defaultValue)
    return self.variables[key] ~= nil and self.variables[key] or defaultValue
end

function StateManager:addVar(key, amount)
    local current = self:getVar(key, 0)
    self:setVar(key, current + amount)
end

function StateManager:hasVar(key)
    return self.variables[key] ~= nil
end

-- Flag operations
function StateManager:setFlag(key)
    self.flags[key] = true
    self.game.events:emit("state.flagSet", { key = key })
end

function StateManager:clearFlag(key)
    self.flags[key] = nil
    self.game.events:emit("state.flagCleared", { key = key })
end

function StateManager:hasFlag(key)
    return self.flags[key] == true
end

function StateManager:toggleFlag(key)
    if self:hasFlag(key) then
        self:clearFlag(key)
    else
        self:setFlag(key)
    end
end

-- State operations
function StateManager:setState(key, state)
    self.states[key] = state
    self.game.events:emit("state.changed", { key = key, state = state })
end

function StateManager:getState(key, defaultState)
    return self.states[key] or defaultState
end

-- Dialogue tracking
function StateManager:markNodeSeen(dialogueId, nodeId)
    if not self.seenNodes[dialogueId] then
        self.seenNodes[dialogueId] = {}
    end
    self.seenNodes[dialogueId][nodeId] = true
end

function StateManager:hasSeenNode(dialogueId, nodeId)
    return self.seenNodes[dialogueId] and self.seenNodes[dialogueId][nodeId] == true
end

-- Requirement checking (for dialogue choices)
function StateManager:checkRequirement(requirement)
    if not requirement then
        return true
    end
    
    local reqType = requirement.type
    
    if reqType == "varEq" then
        return self:getVar(requirement.key) == requirement.value
    elseif reqType == "varNe" then
        return self:getVar(requirement.key) ~= requirement.value
    elseif reqType == "varMin" then
        return self:getVar(requirement.key, 0) >= requirement.value
    elseif reqType == "varMax" then
        return self:getVar(requirement.key, 0) <= requirement.value
    elseif reqType == "flag" then
        return self:hasFlag(requirement.key)
    elseif reqType == "notFlag" then
        return not self:hasFlag(requirement.key)
    elseif reqType == "state" then
        return self:getState(requirement.key) == requirement.value
    elseif reqType == "stateNot" then
        return self:getState(requirement.key) ~= requirement.value
    elseif reqType == "seen" then
        return self:hasSeenNode(requirement.dialogueId, requirement.nodeId)
    elseif reqType == "notSeen" then
        return not self:hasSeenNode(requirement.dialogueId, requirement.nodeId)
    end
    
    return true
end

function StateManager:checkRequirementSet(requirementSet)
    if not requirementSet then
        return true
    end
    
    -- Support both { met = boolean } format and array of requirements
    if requirementSet.met ~= nil then
        return requirementSet.met
    end
    
    -- Check all requirements (AND logic)
    for _, req in ipairs(requirementSet) do
        if not self:checkRequirement(req) then
            return false
        end
    end
    
    return true
end

-- Effect application (from dialogue)
function StateManager:applyEffect(effect)
    if not effect then return end
    
    local effectType = effect.type
    
    if effectType == "setVar" then
        self:setVar(effect.key, effect.value)
    elseif effectType == "addVar" then
        self:addVar(effect.key, effect.value)
    elseif effectType == "setFlag" then
        self:setFlag(effect.key)
    elseif effectType == "clearFlag" then
        self:clearFlag(effect.key)
    elseif effectType == "setState" then
        self:setState(effect.key, effect.value)
    elseif effectType == "emotion" then
        -- Emotions are typically handled by dialogue system
        self.game.events:emit("dialogue.emotion", { emotion = effect.value })
    end
end

function StateManager:applyEffects(effects)
    if not effects then return end
    
    for _, effect in ipairs(effects) do
        self:applyEffect(effect)
    end
end

-- Persistence
function StateManager:save(slot)
    slot = slot or self.saveSlot
    
    local saveData = {
        variables = self.variables,
        flags = self.flags,
        states = self.states,
        seenNodes = self.seenNodes,
        timestamp = os.time()
    }
    
    local filename = self.saveDirectory .. "/save_" .. slot .. ".json"
    
    -- Ensure save directory exists
    love.filesystem.createDirectory(self.saveDirectory)
    
    -- Save to file
    local success = pcall(function()
        JSON.save(filename, saveData)
    end)
    
    if success then
        print("Game saved to slot " .. slot)
        return true
    else
        print("ERROR: Failed to save game")
        return false
    end
end

function StateManager:load(slot)
    slot = slot or self.saveSlot
    
    local filename = self.saveDirectory .. "/save_" .. slot .. ".json"
    
    local success, data = pcall(function()
        return JSON.load(filename)
    end)
    
    if not success then
        print("ERROR: Failed to load save " .. slot)
        return false
    end
    
    self.variables = data.variables or {}
    self.flags = data.flags or {}
    self.states = data.states or {}
    self.seenNodes = data.seenNodes or {}
    
    print("Game loaded from slot " .. slot)
    return true
end

function StateManager:hasSave(slot)
    slot = slot or self.saveSlot
    local filename = self.saveDirectory .. "/save_" .. slot .. ".json"
    return love.filesystem.getInfo(filename) ~= nil
end

return StateManager
```

---

### 16. Dialogue Manager

**src/managers/DialogueManager.lua**

```lua
local JSON = require("libs.json")

local DialogueManager = {}
DialogueManager.__index = DialogueManager

function DialogueManager.new(game)
    return setmetatable({
        game = game,
        
        -- Loaded dialogues
        dialogues = {},
        dialogueIndex = nil,
        
        -- Current dialogue state
        isActive = false,
        currentDialogue = nil,
        currentDialogueId = nil,
        currentNodeId = nil,
        currentNode = nil,
        
        -- Choice selection
        selectedChoiceIndex = 1,
        
        -- Display state
        displayText = "",
        textTimer = 0,
        textSpeed = 0.05,
        textComplete = false,
        
        -- History for going back
        nodeHistory = {}
    }, DialogueManager)
end

function DialogueManager:loadDialogueIndex()
    local indexPath = "content/dialogue/index.json"
    
    local success, data = pcall(function()
        return JSON.load(indexPath)
    end)
    
    if not success then
        print("WARNING: Could not load dialogue index")
        self.dialogueIndex = {}
        return
    end
    
    self.dialogueIndex = data
end

function DialogueManager:loadDialogue(dialogueId)
    -- Check cache
    if self.dialogues[dialogueId] then
        return self.dialogues[dialogueId]
    end
    
    -- Load dialogue file
    local dialoguePath = "content/dialogue/" .. dialogueId .. ".json"
    
    local success, data = pcall(function()
        return JSON.load(dialoguePath)
    end)
    
    if not success then
        print("ERROR: Failed to load dialogue '" .. dialogueId .. "': " .. data)
        return nil
    end
    
    self.dialogues[dialogueId] = data
    return data
end

function DialogueManager:startDialogue(dialogueId, entryNode)
    local dialogue = self:loadDialogue(dialogueId)
    
    if not dialogue then
        print("ERROR: Dialogue not found: " .. dialogueId)
        return
    end
    
    -- Determine entry point
    entryNode = entryNode or dialogue.start
    
    if not entryNode or not dialogue.nodes[entryNode] then
        print("ERROR: Invalid entry point for dialogue: " .. dialogueId)
        return
    end
    
    -- Set current dialogue
    self.currentDialogue = dialogue
    self.currentDialogueId = dialogueId
    self.currentNodeId = entryNode
    self.currentNode = dialogue.nodes[entryNode]
    self.isActive = true
    self.nodeHistory = {}
    self.selectedChoiceIndex = 1
    
    -- Start displaying first node
    self:enterNode(entryNode)
    
    -- Emit event
    self.game.events:emit("dialogue.started", {
        dialogueId = dialogueId,
        nodeId = entryNode
    })
end

function DialogueManager:enterNode(nodeId)
    if not self.currentDialogue or not self.currentDialogue.nodes[nodeId] then
        return
    end
    
    -- Push current to history (for back navigation if needed)
    if self.currentNodeId then
        table.insert(self.nodeHistory, self.currentNodeId)
    end
    
    -- Set new node
    self.currentNodeId = nodeId
    self.currentNode = self.currentDialogue.nodes[nodeId]
    
    -- Mark as seen
    self.game.stateManager:markNodeSeen(self.currentDialogueId, nodeId)
    
    -- Apply node effects
    if self.currentNode.effects then
        self.game.stateManager:applyEffects(self.currentNode.effects)
    end
    
    -- Start text animation
    self:animateText(self.currentNode.text or "")
    
    -- Reset choice selection
    self.selectedChoiceIndex = 1
    
    -- Auto-advance if configured
    if self.currentNode.next and not self.currentNode.choices then
        -- Will advance on text complete
    end
    
    -- Handle end node (JSON field 'end' is a Lua keyword, so we check for it specially)
    -- Note: The Dialogue Editor outputs nodes with "end": true for terminal nodes
    local isEndNode = rawget(self.currentNode, "end")
    if isEndNode then
        -- Schedule end after text complete
    end
end

function DialogueManager:animateText(text)
    self.displayText = ""
    self.fullText = text or ""
    self.textTimer = 0
    self.textComplete = false
    self.visibleLength = 0
end

function DialogueManager:update(dt)
    if not self.isActive then return end
    
    -- Animate text
    if not self.textComplete then
        self.textTimer = self.textTimer + dt
        
        while self.textTimer >= self.textSpeed do
            self.textTimer = self.textTimer - self.textSpeed
            self.visibleLength = self.visibleLength + 1
            
            if self.visibleLength >= #self.fullText then
                self.displayText = self.fullText
                self.textComplete = true
                break
            end
        end
        
        if not self.textComplete then
            self.displayText = self.fullText:sub(1, self.visibleLength)
        end
    end
end

function DialogueManager:advance()
    if not self.isActive then return end
    
    -- If text is still animating, complete it immediately
    if not self.textComplete then
        self.displayText = self.fullText
        self.textComplete = true
        return
    end
    
    -- Handle end node
    if self.currentNode.end_ then
        self:endDialogue()
        return
    end
    
    -- Handle auto-next
    if self.currentNode.next and not self.currentNode.choices then
        self:enterNode(self.currentNode.next)
        return
    end
end

function DialogueManager:selectChoice(choiceIndex)
    if not self.isActive or not self.currentNode.choices then return end
    
    local choices = self:getAvailableChoices()
    
    if choiceIndex < 1 or choiceIndex > #choices then
        return
    end
    
    local choice = choices[choiceIndex]
    
    -- Apply choice effects
    if choice.effects then
        self.game.stateManager:applyEffects(choice.effects)
    end
    
    -- Go to next node
    if choice.next then
        self:enterNode(choice.next)
    else
        self:endDialogue()
    end
end

function DialogueManager:getAvailableChoices()
    if not self.currentNode or not self.currentNode.choices then
        return {}
    end
    
    local available = {}
    
    for _, choice in ipairs(self.currentNode.choices) do
        -- Check if choice is hidden
        if not choice.hidden then
            -- Check requirements
            if self.game.stateManager:checkRequirementSet(choice.requires) then
                table.insert(available, choice)
            elseif choice.lockedLabel then
                -- Show locked version
                local lockedChoice = {}
                for k, v in pairs(choice) do
                    lockedChoice[k] = v
                end
                lockedChoice.label = choice.lockedLabel
                lockedChoice.isLocked = true
                table.insert(available, lockedChoice)
            end
        end
    end
    
    return available
end

function DialogueManager:endDialogue()
    self.isActive = false
    
    self.game.events:emit("dialogue.ended", {
        dialogueId = self.currentDialogueId
    })
    
    self.currentDialogue = nil
    self.currentDialogueId = nil
    self.currentNodeId = nil
    self.currentNode = nil
    self.displayText = ""
    self.nodeHistory = {}
end

function DialogueManager:skipOrAdvance()
    if not self.isActive then return end
    
    if not self.textComplete then
        -- Skip to end of text
        self.displayText = self.fullText
        self.textComplete = true
    else
        -- Advance to next
        self:advance()
    end
end

function DialogueManager:keypressed(key)
    if not self.isActive then return end
    
    local choices = self:getAvailableChoices()
    
    if #choices > 0 then
        -- Navigate choices
        if key == "up" or key == "w" then
            self.selectedChoiceIndex = self.selectedChoiceIndex - 1
            if self.selectedChoiceIndex < 1 then
                self.selectedChoiceIndex = #choices
            end
        elseif key == "down" or key == "s" then
            self.selectedChoiceIndex = self.selectedChoiceIndex + 1
            if self.selectedChoiceIndex > #choices then
                self.selectedChoiceIndex = 1
            end
        elseif key == "return" or key == "space" then
            local choice = choices[self.selectedChoiceIndex]
            if choice and not choice.isLocked then
                self:selectChoice(self.selectedChoiceIndex)
            end
        end
    else
        -- No choices, advance on any key
        if key == "return" or key == "space" or key == "e" then
            self:advance()
        end
    end
end

function DialogueManager:mousepressed(x, y, button)
    if not self.isActive then return end
    
    if button == 1 then  -- Left click
        self:skipOrAdvance()
    end
end

function DialogueManager:isActive()
    return self.isActive
end

function DialogueManager:getCurrentText()
    return self.displayText
end

function DialogueManager:getFullText()
    return self.fullText or ""
end

function DialogueManager:getCurrentNode()
    return self.currentNode
end

function DialogueManager:getSelectedChoiceIndex()
    return self.selectedChoiceIndex
end

return DialogueManager
```

---

### 17. Physics System

**src/systems/PhysicsSystem.lua**

```lua
local PhysicsSystem = {}
PhysicsSystem.__index = PhysicsSystem

function PhysicsSystem.new(game)
    local self = setmetatable({
        game = game,
        world = nil,
        meterScale = 64  -- 64 pixels = 1 meter
    }, PhysicsSystem)
    
    -- Create Box2D world
    self.world = love.physics.newWorld(
        game.config.gravity.x,
        game.config.gravity.y,
        true
    )
    
    -- Set up collision callbacks
    self.world:setCallbacks(
        function(a, b, contact) self:beginContact(a, b, contact) end,
        function(a, b, contact) self:endContact(a, b, contact) end,
        function(a, b, contact) self:preSolve(a, b, contact) end,
        function(a, b, contact, normalImpulse, tangentImpulse) 
            self:postSolve(a, b, contact, normalImpulse, tangentImpulse) 
        end
    )
    
    return self
end

function PhysicsSystem:beginContact(fixtureA, fixtureB, contact)
    local objectA = fixtureA:getUserData()
    local objectB = fixtureB:getUserData()
    
    if not objectA or not objectB then return end
    
    -- Check for triggers
    local colliderA = objectA:getComponent("Collider")
    local colliderB = objectB:getComponent("Collider")
    local triggerA = objectA:getComponent("Trigger")
    local triggerB = objectB:getComponent("Trigger")
    
    -- Handle trigger enter
    if triggerA and colliderB then
        triggerA:onObjectEnter(objectB)
    end
    
    if triggerB and colliderA then
        triggerB:onObjectEnter(objectA)
    end
    
    -- Notify scripts
    local scriptA = objectA:getComponent("Script")
    local scriptB = objectB:getComponent("Script")
    
    if scriptA then
        scriptA:onCollisionEnter(objectB, contact)
    end
    
    if scriptB then
        scriptB:onCollisionEnter(objectA, contact)
    end
end

function PhysicsSystem:endContact(fixtureA, fixtureB, contact)
    local objectA = fixtureA:getUserData()
    local objectB = fixtureB:getUserData()
    
    if not objectA or not objectB then return end
    
    -- Check for triggers
    local triggerA = objectA:getComponent("Trigger")
    local triggerB = objectB:getComponent("Trigger")
    
    -- Handle trigger exit
    if triggerA then
        triggerA:onObjectExit(objectB)
    end
    
    if triggerB then
        triggerB:onObjectExit(objectA)
    end
    
    -- Notify scripts
    local scriptA = objectA:getComponent("Script")
    local scriptB = objectB:getComponent("Script")
    
    if scriptA then
        scriptA:onCollisionExit(objectB, contact)
    end
    
    if scriptB then
        scriptB:onCollisionExit(objectA, contact)
    end
end

function PhysicsSystem:preSolve(fixtureA, fixtureB, contact)
    -- Can disable collision here if needed
end

function PhysicsSystem:postSolve(fixtureA, fixtureB, contact, normalImpulse, tangentImpulse)
    -- Collision response already handled by Box2D
end

function PhysicsSystem:update(dt)
    self.world:update(dt)
end

function PhysicsSystem:clear()
    -- Remove all bodies
    local bodies = self.world:getBodies()
    for _, body in ipairs(bodies) do
        body:destroy()
    end
end

function PhysicsSystem:toMeters(pixels)
    return pixels / self.meterScale
end

function PhysicsSystem:toPixels(meters)
    return meters * self.meterScale
end

function PhysicsSystem:destroy()
    self.world:destroy()
end

return PhysicsSystem
```

---

### 18. Render System

**src/systems/RenderSystem.lua**

```lua
local RenderSystem = {}
RenderSystem.__index = RenderSystem

function RenderSystem.new(game)
    return setmetatable({
        game = game,
        debugInfo = {},
        showFPS = true
    }, RenderSystem)
end

function RenderSystem:drawBackground()
    local scene = self.game.sceneManager:getCurrentScene()
    if not scene then return end
    
    -- Draw background color
    local bgColor = self.game.sceneManager.backgroundColor
    love.graphics.setColor(bgColor)
    love.graphics.rectangle("fill", 0, 0, love.graphics.getDimensions())
    
    -- Draw background image if exists
    local bgImage = self.game.sceneManager.backgroundImage
    if bgImage then
        love.graphics.setColor(1, 1, 1, 1)
        local screenW, screenH = love.graphics.getDimensions()
        local imgW, imgH = bgImage:getDimensions()
        
        -- Scale to cover screen
        local scale = math.max(screenW / imgW, screenH / imgH)
        local drawX = (screenW - imgW * scale) / 2
        local drawY = (screenH - imgH * scale) / 2
        
        love.graphics.draw(bgImage, drawX, drawY, 0, scale, scale)
    end
end

function RenderSystem:drawUI()
    -- Draw UI elements here
    -- This is called after camera is detached
end

function RenderSystem:drawDebug()
    love.graphics.setColor(1, 1, 1, 0.8)
    
    local y = 10
    local lineHeight = 20
    
    -- FPS
    if self.showFPS then
        love.graphics.print("FPS: " .. love.timer.getFPS(), 10, y)
        y = y + lineHeight
    end
    
    -- Memory
    local mem = collectgarbage("count")
    love.graphics.print(string.format("Memory: %.2f MB", mem / 1024), 10, y)
    y = y + lineHeight
    
    -- Object count
    local objectCount = 0
    for _ in pairs(self.game.objectManager.objectsById) do
        objectCount = objectCount + 1
    end
    love.graphics.print("Objects: " .. objectCount, 10, y)
    y = y + lineHeight
    
    -- Physics bodies
    if self.game.physicsWorld and self.game.physicsWorld.world then
        local bodyCount = 0
        for _ in ipairs(self.game.physicsWorld.world:getBodies()) do
            bodyCount = bodyCount + 1
        end
        love.graphics.print("Physics Bodies: " .. bodyCount, 10, y)
        y = y + lineHeight
    end
    
    -- Dialogue state
    if self.game.dialogueManager:isActive() then
        love.graphics.print("Dialogue Active", 10, y)
        y = y + lineHeight
    end
    
    -- Custom debug info
    for _, info in ipairs(self.debugInfo) do
        love.graphics.print(info, 10, y)
        y = y + lineHeight
    end
    
    -- Clear debug info for next frame
    self.debugInfo = {}
end

function RenderSystem:addDebugInfo(text)
    table.insert(self.debugInfo, text)
end

return RenderSystem
```

---

### 19. Dialogue System (UI)

**src/systems/DialogueSystem.lua**

```lua
local DialogueSystem = {}
DialogueSystem.__index = DialogueSystem

function DialogueSystem.new(game)
    return setmetatable({
        game = game,
        
        -- UI Configuration
        boxHeight = 150,
        padding = 20,
        textColor = { 1, 1, 1, 1 },
        boxColor = { 0, 0, 0, 0.8 },
        choiceColor = { 0.8, 0.8, 0.8, 1 },
        selectedChoiceColor = { 1, 1, 0, 1 },
        lockedChoiceColor = { 0.5, 0.5, 0.5, 1 },
        fontSize = 16,
        
        -- Speaker name
        showSpeaker = true,
        speakerColor = { 0.9, 0.7, 0.3, 1 }
    }, DialogueSystem)
end

function DialogueSystem:draw()
    if not self.game.dialogueManager:isActive() then
        return
    end
    
    local screenW, screenH = love.graphics.getDimensions()
    local manager = self.game.dialogueManager
    local currentNode = manager:getCurrentNode()
    
    if not currentNode then return end
    
    -- Draw dialogue box background
    love.graphics.setColor(self.boxColor)
    love.graphics.rectangle("fill",
        self.padding,
        screenH - self.boxHeight - self.padding,
        screenW - self.padding * 2,
        self.boxHeight
    )
    
    -- Draw border
    love.graphics.setColor(0.5, 0.5, 0.5, 1)
    love.graphics.setLineWidth(2)
    love.graphics.rectangle("line",
        self.padding,
        screenH - self.boxHeight - self.padding,
        screenW - self.padding * 2,
        self.boxHeight
    )
    
    -- Set up text area
    local textX = self.padding * 2
    local textY = screenH - self.boxHeight
    local textW = screenW - self.padding * 4
    local textH = self.boxHeight - self.padding * 2
    
    -- Draw speaker name if available
    local currentY = textY
    if self.showSpeaker and currentNode.speaker then
        love.graphics.setColor(self.speakerColor)
        love.graphics.print(currentNode.speaker, textX, currentY)
        currentY = currentY + 25
    end
    
    -- Draw dialogue text
    love.graphics.setColor(self.textColor)
    local text = manager:getCurrentText()
    love.graphics.printf(text, textX, currentY, textW, "left")
    
    -- Draw continue indicator if text is complete
    local isEndNode = rawget(currentNode, "end")
    if manager.textComplete and not currentNode.choices and not isEndNode then
        love.graphics.setColor(1, 1, 1, 0.8)
        local indicatorX = screenW - self.padding * 3
        local indicatorY = screenH - self.padding * 3
        love.graphics.print("▼", indicatorX, indicatorY)
    end
    
    -- Draw choices
    local choices = manager:getAvailableChoices()
    if #choices > 0 then
        currentY = currentY + 60
        
        for i, choice in ipairs(choices) do
            local choiceText = choice.label or "..."
            
            -- Determine color
            if i == manager:getSelectedChoiceIndex() then
                if choice.isLocked then
                    love.graphics.setColor(self.lockedChoiceColor)
                    choiceText = "🔒 " .. choiceText
                else
                    love.graphics.setColor(self.selectedChoiceColor)
                    choiceText = "> " .. choiceText
                end
            else
                if choice.isLocked then
                    love.graphics.setColor(self.lockedChoiceColor)
                    choiceText = "   🔒 " .. choiceText
                else
                    love.graphics.setColor(self.choiceColor)
                    choiceText = "   " .. choiceText
                end
            end
            
            love.graphics.print(choiceText, textX, currentY)
            currentY = currentY + 25
        end
    end
end

function DialogueSystem:hide()
    -- Called when dialogue ends
end

return DialogueSystem
```

---

### 20. Camera (Missing Implementation - Added)

**src/core/Camera.lua**

```lua
local Camera = {}
Camera.__index = Camera

function Camera.new(game)
    return setmetatable({
        game = game,
        position = { x = 0, y = 0 },
        zoom = 1.0,
        rotation = 0,
        bounds = nil,
        shakeMagnitude = 0,
        shakeDuration = 0,
        shakeTimer = 0
    }, Camera)
end

function Camera:setPosition(x, y)
    self.position.x = x
    self.position.y = y
    self:applyBounds()
end

function Camera:getPosition()
    return self.position.x, self.position.y
end

function Camera:setZoom(zoom)
    self.zoom = math.max(0.1, math.min(5.0, zoom))
end

function Camera:getZoom()
    return self.zoom
end

function Camera:setBounds(minX, minY, maxX, maxY)
    self.bounds = {
        min = { x = minX, y = minY },
        max = { x = maxX, y = maxY }
    }
end

function Camera:applyBounds()
    if not self.bounds then return end
    
    self.position.x = math.max(
        self.bounds.min.x,
        math.min(self.bounds.max.x, self.position.x)
    )
    self.position.y = math.max(
        self.bounds.min.y,
        math.min(self.bounds.max.y, self.position.y)
    )
end

function Camera:shake(magnitude, duration)
    self.shakeMagnitude = magnitude
    self.shakeDuration = duration
    self.shakeTimer = duration
end

function Camera:update(dt)
    if self.shakeTimer > 0 then
        self.shakeTimer = self.shakeTimer - dt
        if self.shakeTimer <= 0 then
            self.shakeTimer = 0
        end
    end
end

function Camera:getShakeOffset()
    if self.shakeTimer <= 0 then
        return 0, 0
    end
    
    local intensity = (self.shakeTimer / self.shakeDuration) * self.shakeMagnitude
    local offsetX = (math.random() - 0.5) * 2 * intensity
    local offsetY = (math.random() - 0.5) * 2 * intensity
    
    return offsetX, offsetY
end

function Camera:attach()
    love.graphics.push()
    
    local screenW, screenH = love.graphics.getDimensions()
    local shakeX, shakeY = self:getShakeOffset()
    
    love.graphics.translate(screenW / 2 + shakeX, screenH / 2 + shakeY)
    love.graphics.scale(self.zoom)
    love.graphics.rotate(self.rotation)
    love.graphics.translate(-self.position.x, -self.position.y)
end

function Camera:detach()
    love.graphics.pop()
end

function Camera:worldToScreen(worldX, worldY)
    local screenW, screenH = love.graphics.getDimensions()
    local relativeX = worldX - self.position.x
    local relativeY = worldY - self.position.y
    
    -- Apply rotation
    local cos_r = math.cos(-self.rotation)
    local sin_r = math.sin(-self.rotation)
    local rotatedX = relativeX * cos_r - relativeY * sin_r
    local rotatedY = relativeX * sin_r + relativeY * cos_r
    
    -- Apply zoom and translate to screen center
    local screenX = screenW / 2 + rotatedX * self.zoom
    local screenY = screenH / 2 + rotatedY * self.zoom
    
    return screenX, screenY
end

function Camera:screenToWorld(screenX, screenY)
    local screenW, screenH = love.graphics.getDimensions()
    
    -- Reverse screen center translation
    local relativeX = (screenX - screenW / 2) / self.zoom
    local relativeY = (screenY - screenH / 2) / self.zoom
    
    -- Reverse rotation
    local cos_r = math.cos(self.rotation)
    local sin_r = math.sin(self.rotation)
    local rotatedX = relativeX * cos_r - relativeY * sin_r
    local rotatedY = relativeX * sin_r + relativeY * cos_r
    
    -- Add camera position
    local worldX = self.position.x + rotatedX
    local worldY = self.position.y + rotatedY
    
    return worldX, worldY
end

return Camera
```

---

### 21. Trigger System (Missing Implementation - Added)

**src/systems/TriggerSystem.lua**

```lua
local TriggerSystem = {}
TriggerSystem.__index = TriggerSystem

function TriggerSystem.new(game)
    return setmetatable({
        game = game,
        activeTriggers = {},
        interactionKey = "e",
        showInteractionPrompts = true
    }, TriggerSystem)
end

function TriggerSystem:update(dt)
    -- Check for interact key press
    if love.keyboard.isDown(self.interactionKey) then
        self:checkInteractions()
    end
    
    -- Update all triggers
    for _, trigger in ipairs(self.activeTriggers) do
        if trigger.update then
            trigger:update(dt)
        end
    end
end

function TriggerSystem:checkInteractions()
    -- Get player object (assuming it has "player" tag)
    local players = self.game.objectManager:getObjectsByTag("player")
    if #players == 0 then return end
    
    local player = players[1]
    
    -- Find interactable triggers near player
    for _, obj in pairs(self.game.objectManager:getAllObjects()) do
        local trigger = obj:getComponent("Trigger")
        if trigger and trigger.event == "onInteract" and trigger.canInteract then
            trigger:onInteract()
        end
    end
end

function TriggerSystem:handleTrigger(triggerData)
    -- Execute trigger script if provided
    if triggerData.script then
        self:executeTriggerScript(triggerData)
    end
    
    -- Emit action event if provided
    if triggerData.action then
        self.game.events:emit("action." .. triggerData.action, {
            source = triggerData.gameObject,
            target = triggerData.targetObjectId,
            trigger = triggerData.trigger
        })
    end
end

function TriggerSystem:executeTriggerScript(triggerData)
    local scriptPath = triggerData.script
    local gameObject = triggerData.gameObject
    local targetId = triggerData.targetObjectId
    local eventType = triggerData.eventType
    
    -- Load and execute the script
    local success, script = pcall(function()
        return self.game.scriptManager:loadScript(scriptPath)
    end)
    
    if not success then
        print("ERROR: Failed to load trigger script '" .. scriptPath .. "': " .. script)
        return
    end
    
    -- Get target object
    local targetObject = nil
    if targetId then
        targetObject = self.game.objectManager:getObject(targetId)
    end
    
    -- Execute appropriate handler
    if type(script) == "table" then
        local handlerName = "on" .. eventType:gsub("^%l", string.upper)
        if script[handlerName] then
            local execSuccess, err = pcall(script[handlerName], script, {
                game = self.game,
                gameObject = gameObject,
                target = targetObject,
                params = triggerData.params or {}
            })
            
            if not execSuccess then
                print("ERROR in trigger script '" .. scriptPath .. "' [" .. handlerName .. "]: " .. err)
            end
        end
    end
end

function TriggerSystem:draw()
    if not self.game.config.debug and not self.showInteractionPrompts then
        return
    end
    
    -- Draw interaction prompts for onInteract triggers
    if self.showInteractionPrompts then
        for _, obj in ipairs(self.game.objectManager:getAllObjects()) do
            local trigger = obj:getComponent("Trigger")
            local transform = obj:getComponent("Transform")
            
            if trigger and trigger.event == "onInteract" and trigger.canInteract and transform then
                local pos = transform:getPosition()
                local screenX, screenY
            if self.game.camera then
                screenX, screenY = self.game.camera:worldToScreen(pos.x, pos.y)
            else
                screenX, screenY = pos.x, pos.y
            end
                
                love.graphics.setColor(1, 1, 1, 1)
                love.graphics.print("[" .. self.interactionKey:upper() .. "]", screenX - 10, screenY - 30)
            end
        end
    end
end

function TriggerSystem:setInteractionKey(key)
    self.interactionKey = key
end

function TriggerSystem:setShowInteractionPrompts(show)
    self.showInteractionPrompts = show
end

return TriggerSystem
```

---

### 22. Event Bus

**src/core/EventBus.lua**

```lua
local EventBus = {}
EventBus.__index = EventBus

function EventBus.new()
    return setmetatable({
        listeners = {}
    }, EventBus)
end

function EventBus:on(eventName, callback)
    if not self.listeners[eventName] then
        self.listeners[eventName] = {}
    end
    
    table.insert(self.listeners[eventName], callback)
    
    -- Return unsubscribe function
    return function()
        self:off(eventName, callback)
    end
end

function EventBus:off(eventName, callback)
    if not self.listeners[eventName] then return end
    
    for i, cb in ipairs(self.listeners[eventName]) do
        if cb == callback then
            table.remove(self.listeners[eventName], i)
            return
        end
    end
end

function EventBus:emit(eventName, data)
    if not self.listeners[eventName] then return end
    
    for _, callback in ipairs(self.listeners[eventName]) do
        local success, err = pcall(callback, data)
        if not success then
            print("ERROR in event handler for '" .. eventName .. "': " .. err)
        end
    end
end

function EventBus:once(eventName, callback)
    local function wrappedCallback(data)
        callback(data)
        self:off(eventName, wrappedCallback)
    end
    
    return self:on(eventName, wrappedCallback)
end

return EventBus
```

---

## Main Entry Point

### main.lua

```lua
-- Love2D Behavior Layer - Main Entry Point

-- Load core game system
local Game = require("src.core.Game")

function love.load()
    -- Initialize game
    Game.init()
    
    -- Load initial scene
    Game.sceneManager:loadSceneIndex()
    Game.dialogueManager:loadDialogueIndex()
    
    -- Load starting scene (change to your first scene)
    Game.sceneManager:loadScene("test_scene")
end

function love.update(dt)
    Game.update(dt)
end

function love.draw()
    Game.draw()
end

function love.keypressed(key, scancode, isrepeat)
    Game.keypressed(key, scancode, isrepeat)
end

function love.keyreleased(key)
    Game.keyreleased(key)
end

function love.mousepressed(x, y, button)
    Game.mousepressed(x, y, button)
end

function love.quit()
    Game.quit()
end
```

---

### conf.lua

```lua
-- Love2D Configuration

function love.conf(t)
    t.identity = "my_game"
    t.version = "11.4"
    
    -- Window settings
    t.window.title = "My Game"
    t.window.width = 1280
    t.window.height = 720
    t.window.resizable = true
    t.window.fullscreen = false
    t.window.vsync = 1
    
    -- Modules (disable unused ones for faster startup)
    t.modules.joystick = false
    t.modules.physics = true
    t.modules.thread = true
end
```

---

## Example Behavior Scripts

### scripts/objects/chest.lua

```lua
-- Chest behavior script
-- Attached to chest game objects

local Chest = {}

function Chest:onLoad(params)
    -- Initialize from params
    self.isOpen = false
    self.lootTable = params.lootTable or "default"
    self.isLocked = params.isLocked or false
    self.requiredKey = params.requiredKey
    
    -- Get components
    self.sprite = self.gameObject:getComponent("Sprite")
    self.transform = self.gameObject:getComponent("Transform")
end

function Chest:onInit()
    -- Set closed sprite initially
    if self.sprite then
        -- Assuming sprite handles animation frames
        -- self.sprite:setFrame(0) -- closed
    end
end

function Chest:onInteract(player)
    if self.isOpen then
        -- Already open
        self.game.dialogueManager:startDialogue("chest_already_open")
        return
    end
    
    if self.isLocked then
        -- Check if player has key
        if self.requiredKey and not self.game.stateManager:hasFlag("key_" .. self.requiredKey) then
            self.game.dialogueManager:startDialogue("chest_locked")
            return
        end
        
        -- Unlock
        self.isLocked = false
        self.game.stateManager:setFlag("chest_" .. self.gameObject.id .. "_unlocked")
    end
    
    -- Open chest
    self:open()
end

function Chest:open()
    self.isOpen = true
    
    -- Change sprite to open
    if self.sprite then
        -- self.sprite:setFrame(1) -- open
        self.sprite:setColor(0.8, 0.8, 0.8, 1) -- dim slightly
    end
    
    -- Give loot
    self:giveLoot()
    
    -- Play sound
    local sound = self.game.assetManager:loadSound("assets/audio/chest_open.wav")
    if sound then
        sound:play()
    end
    
    -- Show dialogue
    self.game.dialogueManager:startDialogue("chest_opened")
end

function Chest:giveLoot()
    -- Add items to player inventory
    -- This depends on your inventory system
    print("Giving loot from table: " .. self.lootTable)
end

function Chest:onCollisionEnter(other, contact)
    -- Could auto-open on collision if desired
end

return Chest
```

---

### scripts/triggers/level_transition.lua

```lua
-- Level transition trigger
-- Attached to trigger zones at level exits

local LevelTransition = {}

function LevelTransition:onLoad(params)
    self.targetScene = params.targetScene
    self.spawnPoint = params.spawnPoint
    self.transitionDelay = params.delay or 0.5
    self.timer = 0
    self.isTransitioning = false
end

function LevelTransition:onEnter(player)
    if not self.isTransitioning then
        self:startTransition(player)
    end
end

function LevelTransition:startTransition(player)
    self.isTransitioning = true
    self.player = player
    
    -- Fade out effect
    self.game.events:emit("screen.fadeOut", { duration = self.transitionDelay })
end

function LevelTransition:update(dt)
    if not self.isTransitioning then return end
    
    self.timer = self.timer + dt
    
    if self.timer >= self.transitionDelay then
        self:completeTransition()
    end
end

function LevelTransition:completeTransition()
    if not self.targetScene then return end
    
    -- Load new scene
    self.game.sceneManager:loadScene(self.targetScene)
    
    -- Position player at spawn point
    if self.spawnPoint and self.player then
        local spawn = self.game.objectManager:getObjectByName(self.spawnPoint)
        if spawn then
            local transform = spawn:getComponent("Transform")
            local playerTransform = self.player:getComponent("Transform")
            if transform and playerTransform then
                local pos = transform:getPosition()
                playerTransform:setPosition(pos.x, pos.y)
            end
        end
    end
    
    -- Fade in
    self.game.events:emit("screen.fadeIn", { duration = 0.5 })
    
    -- Reset state
    self.isTransitioning = false
    self.timer = 0
    self.player = nil
end

return LevelTransition
```

---

### scripts/scenes/ambient_effects.lua

```lua
-- Scene-level ambient effects script
-- Runs continuously while scene is active

local AmbientEffects = {
    particles = nil,
    ambientSound = nil
}

function AmbientEffects:run(game, sceneData)
    self.game = game
    
    -- Set up ambient sound
    if sceneData.ambientSound then
        self.ambientSound = game.assetManager:loadSound(sceneData.ambientSound, "stream")
        if self.ambientSound then
            self.ambientSound:setLooping(true)
            self.ambientSound:setVolume(0.3)
            self.ambientSound:play()
        end
    end
    
    -- Set up particle effects
    if sceneData.weather == "rain" then
        self:createRainEffect()
    elseif sceneData.weather == "snow" then
        self:createSnowEffect()
    end
end

function AmbientEffects:createRainEffect()
    -- Create rain particle system
    -- This is simplified - you'd use love.graphics.newParticleSystem
    print("Creating rain effect")
end

function AmbientEffects:createSnowEffect()
    -- Create snow particle system
    print("Creating snow effect")
end

function AmbientEffects:update(dt)
    -- Update particles
    if self.particles then
        self.particles:update(dt)
    end
end

function AmbientEffects:draw()
    -- Draw particles
    if self.particles then
        love.graphics.draw(self.particles)
    end
end

function AmbientEffects:cleanup()
    -- Stop ambient sound
    if self.ambientSound then
        self.ambientSound:stop()
    end
    
    -- Clean up particles
    self.particles = nil
end

return AmbientEffects
```

---

## Usage Examples

### Creating a Simple Game

```lua
-- In a script attached to player object

local Player = {
    speed = 200,
    jumpForce = 500
}

function Player:onLoad(params)
    self.speed = params.speed or self.speed
end

function Player:onInit()
    self.transform = self.gameObject:getComponent("Transform")
    self.collider = self.gameObject:getComponent("Collider")
    self.sprite = self.gameObject:getComponent("Sprite")
end

function Player:update(dt)
    local vx, vy = 0, 0
    local isMoving = false
    
    -- Movement
    if love.keyboard.isDown("a", "left") then
        vx = -self.speed
        isMoving = true
        if self.sprite then self.sprite.flipX = true end
    elseif love.keyboard.isDown("d", "right") then
        vx = self.speed
        isMoving = true
        if self.sprite then self.sprite.flipX = false end
    end
    
    -- Jump
    if love.keyboard.isDown("space") and self:isGrounded() then
        self.collider:applyImpulse(0, -self.jumpForce)
    end
    
    -- Apply velocity
    self.collider:setVelocity(vx, self.collider:getVelocity())
    
    -- Camera follow
    local pos = self.transform:getPosition()
    self.game.sceneManager:setCameraPosition(pos.x, pos.y)
end

function Player:isGrounded()
    -- Raycast down to check if grounded
    -- Implementation depends on your physics setup
    return false
end

function Player:keypressed(key)
    if key == "e" then
        -- Interact with triggers
        local triggers = self.game.objectManager:getObjectsByTag("interactable")
        for _, trigger in ipairs(triggers) do
            local t = trigger:getComponent("Trigger")
            if t and t.canInteract then
                t:onInteract()
            end
        end
    end
end

return Player
```

---

## Best Practices

### 1. Error Handling
Always wrap script execution in `pcall` to prevent crashes from bad scripts:

```lua
local success, err = pcall(script.update, script, dt)
if not success then
    print("Script error: " .. err)
end
```

### 2. Component Communication
Use the EventBus for decoupled communication:

```lua
-- Instead of direct references:
self.game.events:emit("player.healthChanged", { amount = -10 })

-- Instead of direct calls:
self.game.events:on("player.healthChanged", function(data)
    ui:updateHealthBar(data.amount)
end)
```

### 3. Lazy Loading
Don't load assets until needed:

```lua
function Sprite:loadImage(path)
    if not self.game.assetManager:getImage(path) then
        self.game.assetManager:loadImage(path)
    end
end
```

### 4. State Persistence
Save important state regularly:

```lua
function Game:saveProgress()
    self.stateManager:setVar("checkpoint", self.sceneManager.currentScene.id)
    self.stateManager:save()
end
```

### 5. Debug Visualization
Always provide visual feedback in debug mode:

```lua
if self.game.config.debug then
    -- Draw collider bounds
    -- Draw trigger zones
    -- Show FPS and object count
end
```

---

## Common Patterns

### Pattern 1: Object Pooling
For frequently spawned objects (bullets, particles), use pooling instead of creating/destroying:

```lua
local ObjectPool = {
    available = {},
    inUse = {}
}

function ObjectPool:get()
    if #self.available > 0 then
        local obj = table.remove(self.available)
        table.insert(self.inUse, obj)
        return obj
    end
    return self:createNew()
end

function ObjectPool:release(obj)
    -- Remove from inUse
    -- Reset state
    -- Add to available
end
```

### Pattern 2: Command Pattern
For undo/redo functionality in editors:

```lua
local Command = {
    execute = function() end,
    undo = function() end
}

local CommandHistory = {
    commands = {},
    currentIndex = 0
}
```

### Pattern 3: State Machine
For AI or player states:

```lua
local StateMachine = {
    currentState = nil,
    states = {}
}

function StateMachine:changeState(newState)
    if self.currentState and self.currentState.exit then
        self.currentState:exit()
    end
    
    self.currentState = self.states[newState]
    
    if self.currentState and self.currentState.enter then
        self.currentState:enter()
    end
end
```

---

## Extension Points

### Adding New Components

1. Create file in `src/components/NewComponent.lua`
2. Inherit from Component base class
3. Override `init()`, `update(dt)`, `draw()`, `destroy()`
4. Add to GameObject factory in `GameObject.fromJSON()`

### Adding Custom Events

1. Define event names as constants
2. Emit events using `game.events:emit("event.name", data)`
3. Subscribe in relevant systems using `game.events:on("event.name", handler)`

### Adding New Script Hooks

1. Add method to Script component (e.g., `onCustomEvent`)
2. Call from relevant system
3. Document for script authors

---

## Troubleshooting

### Problem: Scripts not loading
- Check file path matches exactly (case-sensitive)
- Ensure `.lua` extension is in path
- Verify script returns a table with required methods

### Problem: Physics bodies not colliding
- Check collision categories/masks
- Ensure both objects have Collider components
- Verify at least one is not a sensor

### Problem: Dialogue not advancing
- Check `textComplete` flag
- Verify node has `next` or `choices` defined
- Ensure choice requirements are met

### Problem: Z-sorting incorrect
- Call `objectManager:sortByZIndex()` after adding objects
- Verify Sprite components have zIndex set

---

## Further Reading

- Love2D Wiki: https://love2d.org/wiki
- Box2D Manual: https://box2d.org/documentation/
- Lua Manual: https://www.lua.org/manual/5.1/
- JSON Format: https://www.json.org/

---

*This guide provides a complete foundation for building a Love2D behavior layer compatible with the Scene Editor and Dialogue Editor tools. Customize and extend as needed for your specific game requirements.*
