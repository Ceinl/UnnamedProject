local EventBus = {}
EventBus.__index = EventBus

function EventBus.new()
  return setmetatable({ listeners = {} }, EventBus)
end

function EventBus:on(event_name, handler)
  if type(handler) ~= "function" then
    return function()
      -- no-op unsubscribe
    end
  end

  local list = self.listeners[event_name]
  if not list then
    list = {}
    self.listeners[event_name] = list
  end

  list[#list + 1] = handler
  local index = #list

  return function()
    if self.listeners[event_name] and self.listeners[event_name][index] == handler then
      self.listeners[event_name][index] = false
    end
  end
end

function EventBus:emit(event_name, payload)
  local list = self.listeners[event_name]
  if not list then
    return
  end

  for _, handler in ipairs(list) do
    if type(handler) == "function" then
      handler(payload)
    end
  end
end

function EventBus:clear()
  self.listeners = {}
end

return EventBus
