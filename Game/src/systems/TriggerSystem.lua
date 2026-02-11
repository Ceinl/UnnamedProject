local TriggerSystem = {}
TriggerSystem.__index = TriggerSystem

function TriggerSystem.new(game)
  return setmetatable({
    game = game,
    active_pairs = {},
  }, TriggerSystem)
end

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

function TriggerSystem:update(_dt)
  local objects = self.game.objectManager:get_all()
  local next_pairs = {}

  for _, trigger_object in ipairs(objects) do
    local trigger_component = trigger_object:get_component("Trigger")
    if trigger_component then
      local trigger_bounds = get_bounds_from_object(trigger_object)
      if trigger_bounds then
        for _, target_object in ipairs(objects) do
          if target_object.id ~= trigger_object.id and target_object.active and target_object.visible then
            local target_bounds = get_bounds_from_object(target_object)
            if target_bounds and intersects(trigger_bounds, target_bounds) then
              local key = trigger_object.id .. "->" .. target_object.id
              next_pairs[key] = {
                triggerId = trigger_object.id,
                targetId = target_object.id,
              }

              if not self.active_pairs[key] then
                trigger_component:on_object_enter(target_object)
              end
            end
          end
        end
      end
    end
  end

  for key, previous in pairs(self.active_pairs) do
    if not next_pairs[key] then
      local trigger_object = self.game.objectManager:findById(previous.triggerId)
      local target_object = self.game.objectManager:findById(previous.targetId)
      if trigger_object and target_object then
        local trigger_component = trigger_object:get_component("Trigger")
        if trigger_component then
          trigger_component:on_object_exit(target_object)
        end
      end
    end
  end

  self.active_pairs = next_pairs
end

function TriggerSystem:handle_interact(actor)
  local activated = false
  local objects = self.game.objectManager:get_all()

  for _, object in ipairs(objects) do
    local trigger_component = object:get_component("Trigger")
    if trigger_component and trigger_component.event == "onInteract" then
      if trigger_component:on_interact(actor) then
        activated = true
      end
    end
  end

  return activated
end

function TriggerSystem:draw_debug()
  if not self.game.debug.showTriggers then
    return
  end

  love.graphics.setColor(1.0, 0.7, 0.15, 0.6)

  for _, object in ipairs(self.game.objectManager:get_all()) do
    local trigger_component = object:get_component("Trigger")
    if trigger_component then
      local bounds = get_bounds_from_object(object)
      if bounds then
        love.graphics.rectangle("line", bounds.x, bounds.y, bounds.width, bounds.height)
      end
    end
  end

  love.graphics.setColor(1, 1, 1, 1)
end

return TriggerSystem
