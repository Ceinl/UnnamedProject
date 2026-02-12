local Component = require("engine.components.Component")

local Transform = setmetatable({}, { __index = Component })
Transform.__index = Transform

function Transform.new(game_object, data)
  local self = setmetatable(Component.new(game_object), Transform)
  self.position = {
    x = data.position and data.position.x or 0,
    y = data.position and data.position.y or 0,
  }
  self.rotation = data.rotation or 0
  self.scale = {
    x = data.scale and data.scale.x or 1,
    y = data.scale and data.scale.y or 1,
  }
  self.size = {
    width = data.size and data.size.width or 32,
    height = data.size and data.size.height or 32,
  }
  self.zIndex = data.zIndex or 0
  return self
end

function Transform:set_position(x, y)
  self.position.x = x
  self.position.y = y
end

function Transform:set_rotation(rotation)
  self.rotation = rotation
end

function Transform:set_scale(x, y)
  self.scale.x = x
  self.scale.y = y
end

function Transform:set_size(width, height)
  self.size.width = width
  self.size.height = height
end

function Transform:get_bounds()
  local width = self.size.width * self.scale.x
  local height = self.size.height * self.scale.y
  return {
    x = self.position.x - (width / 2),
    y = self.position.y - (height / 2),
    width = width,
    height = height,
  }
end

return Transform
