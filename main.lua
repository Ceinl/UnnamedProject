local Engine = require("engine")

function love.load()
  love.graphics.setDefaultFilter("nearest", "nearest")
  Engine.Game:init()
end

function love.update(dt)
  Engine.Game:update(dt)
end

function love.draw()
  Engine.Game:draw()
end

function love.keypressed(key, scancode, isrepeat)
  Engine.Game:keypressed(key, scancode, isrepeat)
end

function love.keyreleased(key)
  Engine.Game:keyreleased(key)
end

function love.mousepressed(x, y, button)
  Engine.Game:mousepressed(x, y, button)
end

function love.mousereleased(x, y, button)
  Engine.Game:mousereleased(x, y, button)
end

function love.resize(width, height)
  Engine.Game:resize(width, height)
end
