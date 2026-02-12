local GameObject = {}
GameObject.__index = GameObject

function GameObject.new(game, data)
  local self = setmetatable({}, GameObject)
  self.game = game
  self.id = data.id
  self.type = data.type
  self.name = data.name or data.id
  self.color = data.color
  self.opacity = data.opacity or 1
  self.tags = data.tags or {}
  self.state = {}
  self.visible = data.visible ~= false
  self.active = true
  self.destroyed = false
  self._components = {}
  self._component_order = {}
  self._creation_index = data._creationIndex or 0
  return self
end

function GameObject:add_component(name, component)
  if self._components[name] then
    self.game.logger:warn("Object '" .. self.id .. "' replaced component '" .. name .. "'")
  else
    self._component_order[#self._component_order + 1] = name
  end

  self._components[name] = component
  return component
end

function GameObject:get_component(name)
  return self._components[name]
end

function GameObject:has_tag(tag)
  for _, value in ipairs(self.tags) do
    if value == tag then
      return true
    end
  end
  return false
end

function GameObject:init_components()
  for _, name in ipairs(self._component_order) do
    local component = self._components[name]
    if component and component.init and not component.initialized then
      local ok, err = pcall(component.init, component)
      if not ok then
        self.game.logger:error("Component init failed [" .. self.id .. ":" .. name .. "] " .. tostring(err))
      else
        component.initialized = true
      end
    end
  end
end

function GameObject:update(dt)
  if not self.active then
    return
  end

  for _, name in ipairs(self._component_order) do
    local component = self._components[name]
    if component and component.enabled ~= false and component.update then
      local ok, err = pcall(component.update, component, dt)
      if not ok then
        self.game.logger:error("Component update failed [" .. self.id .. ":" .. name .. "] " .. tostring(err))
      end
    end
  end
end

function GameObject:draw()
  if not self.visible then
    return
  end

  for _, name in ipairs(self._component_order) do
    local component = self._components[name]
    if component and component.enabled ~= false and component.draw then
      local ok, err = pcall(component.draw, component)
      if not ok then
        self.game.logger:error("Component draw failed [" .. self.id .. ":" .. name .. "] " .. tostring(err))
      end
    end
  end
end

function GameObject:get_draw_z_index()
  local transform = self:get_component("Transform")
  if transform then
    return transform.zIndex or 0
  end

  local sprite = self:get_component("Sprite")
  if sprite then
    return sprite.zIndex or 0
  end

  return 0
end

function GameObject:destroy()
  if self.destroyed then
    return
  end

  for i = #self._component_order, 1, -1 do
    local name = self._component_order[i]
    local component = self._components[name]
    if component and component.destroy then
      local ok, err = pcall(component.destroy, component)
      if not ok then
        self.game.logger:error("Component destroy failed [" .. self.id .. ":" .. name .. "] " .. tostring(err))
      end
    end
  end

  self._components = {}
  self._component_order = {}
  self.destroyed = true
end

return GameObject
