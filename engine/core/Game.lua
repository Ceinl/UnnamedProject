local Logger = require("engine.utils.Logger")
local EventBus = require("engine.core.EventBus")
local Camera = require("engine.core.Camera")
local ObjectManager = require("engine.core.ObjectManager")
local SceneManager = require("engine.core.SceneManager")

local AssetManager = require("engine.managers.AssetManager")
local ScriptManager = require("engine.managers.ScriptManager")
local StateManager = require("engine.managers.StateManager")
local DialogueManager = require("engine.managers.DialogueManager")

local PhysicsSystem = require("engine.systems.PhysicsSystem")
local TriggerSystem = require("engine.systems.TriggerSystem")
local RenderSystem = require("engine.systems.RenderSystem")
local DialogueSystem = require("engine.systems.DialogueSystem")

local Game = {
  initialized = false,

  config = {
    gravity = { x = 0, y = 600 },
    meterScale = 64,
    debug = true,
  },

  debug = {
    showStats = true,
    showColliders = false,
    showTriggers = false,
    showTextBounds = false,
    lastSceneLoadMs = nil,
  },

  paused = false,
  pendingSceneSwitch = nil,

  input = {
    keysDown = {},
    keysPressed = {},
  },
}

function Game:init()
  if self.initialized then
    return
  end

  love.physics.setMeter(self.config.meterScale)

  self.logger = Logger.new(300)
  self.events = EventBus.new()
  self.camera = Camera.new()

  self.assetManager = AssetManager.new(self)
  self.stateManager = StateManager.new(self)
  self.scriptManager = ScriptManager.new(self)
  self.dialogueManager = DialogueManager.new(self)

  self.objectManager = ObjectManager.new(self)

  self.physicsSystem = PhysicsSystem.new(self)
  self.triggerSystem = TriggerSystem.new(self)
  self.dialogueSystem = DialogueSystem.new(self)
  self.renderSystem = RenderSystem.new(self)

  self.sceneManager = SceneManager.new(self)

  self:_setup_event_handlers()

  local default_scene = self.sceneManager:get_default_scene_id()
  if default_scene then
    local ok, err = self.sceneManager:load_scene(default_scene)
    if not ok then
      self.logger:error("Failed to load default scene: " .. tostring(err))
    end
  else
    self.logger:warn("No scenes found in content/scenes/index.json")
  end

  self.initialized = true
  self.logger:info("Runtime initialized")
end

function Game:_setup_event_handlers()
  self.events:on("physics:beginContact", function(data)
    local object_a = data.objectA
    local object_b = data.objectB

    local script_a = object_a:get_component("Script")
    local script_b = object_b:get_component("Script")

    if script_a then
      script_a:onCollisionEnter(object_b, data.contact)
    end
    if script_b then
      script_b:onCollisionEnter(object_a, data.contact)
    end
  end)

  self.events:on("physics:endContact", function(data)
    local object_a = data.objectA
    local object_b = data.objectB

    local script_a = object_a:get_component("Script")
    local script_b = object_b:get_component("Script")

    if script_a then
      script_a:onCollisionExit(object_b, data.contact)
    end
    if script_b then
      script_b:onCollisionExit(object_a, data.contact)
    end
  end)
end

function Game:request_scene_switch(scene_id)
  self.pendingSceneSwitch = scene_id
end

function Game:_apply_pending_scene_switch()
  if not self.pendingSceneSwitch then
    return
  end

  local target = self.pendingSceneSwitch
  self.pendingSceneSwitch = nil

  local ok, err = self.sceneManager:load_scene(target)
  if not ok then
    self.logger:error("Scene switch failed: " .. tostring(err))
  end
end

function Game:_get_interactor_object()
  local players = self.objectManager:findByTag("player")
  if #players > 0 then
    for _, player in ipairs(players) do
      if player.type ~= "spawn" then
        return player
      end
    end
    return players[1]
  end

  local objects = self.objectManager:get_all()
  if #objects > 0 then
    return objects[1]
  end

  return nil
end

function Game:update(dt)
  if not self.initialized then
    return
  end

  self:_apply_pending_scene_switch()

  if self.input.keysPressed["e"] then
    self.triggerSystem:handle_interact(self:_get_interactor_object())
  end

  if not self.paused then
    self.physicsSystem:update(dt)
    self.objectManager:update(dt)
    self.triggerSystem:update(dt)
    self.scriptManager:update(dt)
  end

  self.dialogueSystem:update(dt)

  self.input.keysPressed = {}
end

function Game:draw()
  if not self.initialized then
    return
  end
  self.renderSystem:draw()
end

function Game:_toggle_debug(flag_name)
  self.debug[flag_name] = not self.debug[flag_name]
  self.logger:info(flag_name .. " = " .. tostring(self.debug[flag_name]))
end

function Game:keypressed(key, _scancode, isrepeat)
  if isrepeat then
    return
  end

  self.input.keysDown[key] = true
  self.input.keysPressed[key] = true

  if self.dialogueManager and self.dialogueManager:handle_keypressed(key) then
    return
  end

  -- Forward to scene scripts
  for _, entry in ipairs(self.scriptManager.scene_scripts) do
    self.scriptManager:safe_call(entry.instance, "keypressed", key, _scancode, isrepeat)
  end

  if key == "f1" then
    self:_toggle_debug("showStats")
  elseif key == "f2" then
    self:_toggle_debug("showColliders")
  elseif key == "f3" then
    self:_toggle_debug("showTriggers")
  elseif key == "f4" then
    self:_toggle_debug("showTextBounds")
  elseif key == "f5" then
    local ok, err = self.sceneManager:reload_scene()
    if not ok then
      self.logger:error("Reload failed: " .. tostring(err))
    end
  elseif key == "f6" then
    self.scriptManager:reload_cached_scripts()
    self.logger:info("Script cache reloaded")
  elseif key == "p" then
    self.paused = not self.paused
    self.logger:info("Paused = " .. tostring(self.paused))
  elseif key == "]" then
    local next_scene = self.sceneManager:get_scene_by_offset(1)
    if next_scene then
      self:request_scene_switch(next_scene)
    end
  elseif key == "[" then
    local prev_scene = self.sceneManager:get_scene_by_offset(-1)
    if prev_scene then
      self:request_scene_switch(prev_scene)
    end
  end
end

function Game:keyreleased(key)
  self.input.keysDown[key] = nil

  -- Forward to scene scripts
  for _, entry in ipairs(self.scriptManager.scene_scripts) do
    self.scriptManager:safe_call(entry.instance, "keyreleased", key)
  end
end

function Game:mousepressed(x, y, button)
  if self.dialogueManager and self.dialogueManager:handle_mousepressed(x, y, button) then
    return
  end
  self.events:emit("input:mousepressed", {
    x = x,
    y = y,
    button = button,
  })
end

function Game:mousereleased(x, y, button)
  self.events:emit("input:mousereleased", {
    x = x,
    y = y,
    button = button,
  })
end

function Game:resize(width, height)
  self.events:emit("window:resize", {
    width = width,
    height = height,
  })
end

return Game
