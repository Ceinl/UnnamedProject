local PhysicsSystem = {}
PhysicsSystem.__index = PhysicsSystem

function PhysicsSystem.new(game)
  local gravity = game.config.gravity or { x = 0, y = 0 }
  local world = love.physics.newWorld(gravity.x or 0, gravity.y or 0, true)

  local self = setmetatable({
    game = game,
    world = world,
  }, PhysicsSystem)

  self:_setup_callbacks()
  return self
end

local function get_object_from_fixture(game, fixture)
  if not fixture then
    return nil
  end
  local user_data = fixture:getUserData()
  if type(user_data) ~= "table" then
    return nil
  end
  return game.objectManager:findById(user_data.objectId)
end

function PhysicsSystem:_setup_callbacks()
  self.world:setCallbacks(
    function(fixture_a, fixture_b, contact)
      local object_a = get_object_from_fixture(self.game, fixture_a)
      local object_b = get_object_from_fixture(self.game, fixture_b)
      if object_a and object_b then
        self.game.events:emit("physics:beginContact", {
          objectA = object_a,
          objectB = object_b,
          contact = contact,
        })
      end
    end,
    function(fixture_a, fixture_b, contact)
      local object_a = get_object_from_fixture(self.game, fixture_a)
      local object_b = get_object_from_fixture(self.game, fixture_b)
      if object_a and object_b then
        self.game.events:emit("physics:endContact", {
          objectA = object_a,
          objectB = object_b,
          contact = contact,
        })
      end
    end
  )
end

function PhysicsSystem:update(dt)
  if self.world then
    self.world:update(dt)
  end
end

function PhysicsSystem:draw_debug()
  if self.world and type(self.world.draw) == "function" then
    love.graphics.setColor(0.2, 1.0, 0.2, 0.8)
    love.graphics.setLineWidth(1)
    self.world:draw()
    love.graphics.setColor(1, 1, 1, 1)
  end
end

function PhysicsSystem:destroy()
  if self.world then
    self.world:destroy()
    self.world = nil
  end
end

return PhysicsSystem
