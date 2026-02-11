local Game = require("src.core.Game")

function love.load()
  love.graphics.setDefaultFilter("nearest", "nearest")
  Game:init()
end

function love.update(dt)
  Game:update(dt)
end

function love.draw()
  Game:draw()
end

function love.keypressed(key, scancode, isrepeat)
  Game:keypressed(key, scancode, isrepeat)
end

function love.keyreleased(key)
  Game:keyreleased(key)
end

function love.mousepressed(x, y, button)
  Game:mousepressed(x, y, button)
end

function love.mousereleased(x, y, button)
  Game:mousereleased(x, y, button)
end

function love.resize(width, height)
  Game:resize(width, height)
end
