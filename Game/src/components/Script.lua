local Component = require("src.components.Component")

local Script = setmetatable({}, { __index = Component })
Script.__index = Script

function Script.new(game_object, data)
  local self = setmetatable(Component.new(game_object), Script)
  self.scriptPath = data.scriptPath
  self.params = data.params or {}
  self.instance = nil
  return self
end

function Script:init()
  if not self.scriptPath then
    self.initialized = true
    return
  end

  local instance, err = self.gameObject.game.scriptManager:create_instance(self.scriptPath, self.params)
  if not instance then
    self.gameObject.game.logger:error("Failed to attach script '" .. tostring(self.scriptPath) .. "' to " .. self.gameObject.id .. ": " .. tostring(err))
    self.instance = nil
  else
    -- Set up instance context for object-attached scripts
    instance.gameObject = self.gameObject
    instance.game = self.gameObject.game
    self.instance = instance
  end

  self.initialized = true
end

function Script:update(dt)
  if self.instance then
    self.gameObject.game.scriptManager:safe_call(self.instance, "update", dt)
  end
end

function Script:draw()
  if self.instance then
    self.gameObject.game.scriptManager:safe_call(self.instance, "draw")
  end
end

function Script:onCollisionEnter(other, contact)
  if self.instance then
    self.gameObject.game.scriptManager:safe_call(self.instance, "onCollisionEnter", other, contact)
  end
end

function Script:onCollisionExit(other, contact)
  if self.instance then
    self.gameObject.game.scriptManager:safe_call(self.instance, "onCollisionExit", other, contact)
  end
end

function Script:onTrigger(target, event_type)
  if self.instance then
    self.gameObject.game.scriptManager:safe_call(self.instance, "onTrigger", target, event_type)
  end
end

function Script:destroy()
  if self.instance then
    self.gameObject.game.scriptManager:safe_call(self.instance, "onDestroy")
  end
  self.instance = nil
end

return Script
