local Component = require("src.components.Component")
local Color = require("src.utils.Color")

local Sprite = setmetatable({}, { __index = Component })
Sprite.__index = Sprite

function Sprite.new(game_object, data)
  local self = setmetatable(Component.new(game_object), Sprite)
  self.path = data.sprite
  self.color = Color.parse(data.color, { 1, 1, 1, 1 })
  self.opacity = data.opacity or 1
  self.visible = data.visible ~= false
  self.zIndex = data.zIndex or 0
  self.image = nil
  return self
end

function Sprite:init()
  if self.path then
    self.image = self.gameObject.game.assetManager:load_image(self.path)
  end
  self.initialized = true
end

function Sprite:draw()
  if not self.visible then
    return
  end

  local transform = self.gameObject:get_component("Transform")
  if not transform then
    return
  end

  love.graphics.push()
  love.graphics.translate(transform.position.x, transform.position.y)
  love.graphics.rotate(math.rad(transform.rotation))

  local w = transform.size.width
  local h = transform.size.height
  local sx = transform.scale.x
  local sy = transform.scale.y

  if self.image then
    local image_w = self.image:getWidth()
    local image_h = self.image:getHeight()
    local scale_x = (w / image_w) * sx
    local scale_y = (h / image_h) * sy
    love.graphics.setColor(self.color[1], self.color[2], self.color[3], self.color[4] * self.opacity)
    love.graphics.draw(self.image, -w / 2, -h / 2, 0, scale_x, scale_y)
  else
    love.graphics.setColor(self.color[1], self.color[2], self.color[3], self.color[4] * self.opacity)
    love.graphics.rectangle("fill", -(w * sx) / 2, -(h * sy) / 2, w * sx, h * sy)
  end

  love.graphics.pop()
  love.graphics.setColor(1, 1, 1, 1)
end

return Sprite
