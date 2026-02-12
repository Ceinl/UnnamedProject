local StateManager = {}
StateManager.__index = StateManager

function StateManager.new(_game)
  return setmetatable({
    values = {},
  }, StateManager)
end

function StateManager:set(key, value)
  self.values[key] = value
end

function StateManager:get(key, default)
  local value = self.values[key]
  if value == nil then
    return default
  end
  return value
end

function StateManager:increment(key, amount)
  amount = amount or 1
  local value = self:get(key, 0)
  value = value + amount
  self:set(key, value)
  return value
end

function StateManager:clear()
  self.values = {}
end

return StateManager
