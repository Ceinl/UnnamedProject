local Component = {}
Component.__index = Component

function Component.new(game_object)
  return setmetatable({
    gameObject = game_object,
    enabled = true,
    initialized = false,
  }, Component)
end

function Component:init()
  self.initialized = true
end

function Component:update(_dt)
  -- override
end

function Component:draw()
  -- override
end

function Component:destroy()
  -- override
end

return Component
