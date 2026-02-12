local Component = require("engine.components.Component")

local Trigger = setmetatable({}, { __index = Component })
Trigger.__index = Trigger

local function intersects(a, b)
  return a.x < (b.x + b.width)
    and (a.x + a.width) > b.x
    and a.y < (b.y + b.height)
    and (a.y + a.height) > b.y
end

local function get_bounds_from_object(object)
  local collider = object:get_component("Collider")
  if collider then
    return collider:get_aabb()
  end

  local transform = object:get_component("Transform")
  if not transform then
    return nil
  end

  local width = transform.size.width * transform.scale.x
  local height = transform.size.height * transform.scale.y
  return {
    x = transform.position.x - width / 2,
    y = transform.position.y - height / 2,
    width = width,
    height = height,
  }
end

function Trigger.new(game_object, data)
  local self = setmetatable(Component.new(game_object), Trigger)
  self.event = data.event or "onEnter"
  self.script = data.script
  self.action = data.action
  self.cooldown = math.max(0, data.cooldown or 0)
  self.oneShot = data.oneShot == true

  self.cooldownTimer = 0
  self.hasTriggered = false
  self.activeObjects = {}
  self.interactTarget = nil
  self.scriptInstance = nil

  return self
end

function Trigger:init()
  if self.script then
    local instance, err = self.gameObject.game.scriptManager:create_instance(self.script, {
      triggerObjectId = self.gameObject.id,
    })
    if instance then
      self.scriptInstance = instance
    else
      self.gameObject.game.logger:error("Failed to load trigger script '" .. self.script .. "': " .. tostring(err))
    end
  end

  self.initialized = true
end

function Trigger:update(dt)
  if self.cooldownTimer > 0 then
    self.cooldownTimer = math.max(0, self.cooldownTimer - dt)
  end

  if self.event == "onStay" and self.cooldownTimer <= 0 then
    for _, object in pairs(self.activeObjects) do
      self:execute(object, "onStay")
      if self.cooldown > 0 then
        break
      end
    end
  end
end

function Trigger:on_object_enter(object)
  self.activeObjects[object.id] = object
  if self.event == "onInteract" then
    self.interactTarget = object
  end
  if self.event == "onEnter" then
    self:execute(object, "onEnter")
  end
end

function Trigger:on_object_exit(object)
  self.activeObjects[object.id] = nil
  if self.interactTarget and self.interactTarget.id == object.id then
    self.interactTarget = nil
  end
  if self.event == "onExit" then
    self:execute(object, "onExit")
  end
end

function Trigger:on_interact(actor)
  if self.event ~= "onInteract" then
    return false
  end

  local target = actor or self.interactTarget
  if not target then
    return false
  end

  if actor and not self.activeObjects[actor.id] then
    local trigger_bounds = get_bounds_from_object(self.gameObject)
    local actor_bounds = get_bounds_from_object(actor)
    if not trigger_bounds or not actor_bounds or not intersects(trigger_bounds, actor_bounds) then
      return false
    end
  end

  return self:execute(target, "onInteract")
end

function Trigger:execute(target, event_type)
  if self.oneShot and self.hasTriggered then
    return false
  end

  if self.cooldownTimer > 0 then
    return false
  end

  local script_component = self.gameObject:get_component("Script")
  if script_component then
    script_component:onTrigger(target, event_type)
  end

  if self.scriptInstance then
    self.gameObject.game.scriptManager:safe_call(self.scriptInstance, event_type, target)
  end

  if self.action and self.action ~= "" then
    self.gameObject.game.logger:info("Trigger action '" .. self.action .. "' fired by " .. self.gameObject.id)
    self.gameObject.game.events:emit("action." .. self.action, {
      trigger = self.gameObject,
      target = target,
      event = event_type,
    })
  end

  self.gameObject.game.events:emit("trigger:" .. event_type, {
    trigger = self.gameObject,
    target = target,
  })

  self.cooldownTimer = self.cooldown
  if self.oneShot then
    self.hasTriggered = true
  end

  return true
end

function Trigger:destroy()
  if self.scriptInstance then
    self.gameObject.game.scriptManager:safe_call(self.scriptInstance, "onDestroy")
  end
  self.activeObjects = {}
  self.interactTarget = nil
  self.scriptInstance = nil
end

return Trigger
