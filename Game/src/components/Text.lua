local Component = require("src.components.Component")
local Color = require("src.utils.Color")

local Text = setmetatable({}, { __index = Component })
Text.__index = Text

function Text.new(game_object, data)
  local self = setmetatable(Component.new(game_object), Text)
  self.content = data.content or ""
  self.fontFamily = data.fontFamily
  self.fontSize = data.fontSize or 36
  self.align = data.align or "center"
  self.lineHeight = data.lineHeight or math.floor((self.fontSize or 36) * 1.2)
  self.color = Color.parse(game_object.state.textColor or game_object.color, { 1, 1, 1, 1 })
  self.font = nil
  return self
end

function Text:init()
  self.font = self.gameObject.game.assetManager:load_font(self.fontFamily, self.fontSize)
  self.initialized = true
end

function Text:draw()
  local transform = self.gameObject:get_component("Transform")
  if not transform then
    return
  end

  local width = transform.size.width * transform.scale.x
  local height = transform.size.height * transform.scale.y
  local x = transform.position.x - (width / 2)
  local y = transform.position.y - (height / 2)

  local opacity = 1
  local sprite = self.gameObject:get_component("Sprite")
  if sprite then
    opacity = sprite.opacity or 1
  end

  local previous_font = love.graphics.getFont()
  if self.font then
    love.graphics.setFont(self.font)
  end

  love.graphics.setColor(self.color[1], self.color[2], self.color[3], self.color[4] * opacity)
  love.graphics.printf(self.content or "", x, y, width, self.align)

  if self.gameObject.game.debug.showTextBounds then
    love.graphics.setColor(0.2, 0.7, 1.0, 0.65)
    love.graphics.rectangle("line", x, y, width, height)
  end

  love.graphics.setColor(1, 1, 1, 1)
  if previous_font then
    love.graphics.setFont(previous_font)
  end
end

return Text
