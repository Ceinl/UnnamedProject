local Component = require("src.components.Component")

local Collider = setmetatable({}, { __index = Component })
Collider.__index = Collider

function Collider.new(game_object, data)
  local self = setmetatable(Component.new(game_object), Collider)
  self.shape = data.shape or "box"
  self.offset = {
    x = data.offset and data.offset.x or 0,
    y = data.offset and data.offset.y or 0,
  }
  self.isStatic = data.isStatic ~= false
  self.isTrigger = data.isTrigger == true
  self.density = data.density or 1
  self.friction = data.friction or 0.3
  self.restitution = data.restitution or 0
  self.points = data.points

  self.body = nil
  self.fixture = nil
  self.physics_shape = nil

  return self
end

local function create_shape(self, transform)
  local width = math.max(1, transform.size.width * transform.scale.x)
  local height = math.max(1, transform.size.height * transform.scale.y)

  if self.shape == "circle" then
    local radius = math.max(width, height) / 2
    return love.physics.newCircleShape(self.offset.x, self.offset.y, radius)
  end

  if self.shape == "polygon" and type(self.points) == "table" and #self.points >= 3 then
    local points = {}
    for _, point in ipairs(self.points) do
      points[#points + 1] = point.x
      points[#points + 1] = point.y
    end
    local ok, poly = pcall(love.physics.newPolygonShape, unpack(points))
    if ok and poly then
      return poly
    end
  end

  return love.physics.newRectangleShape(self.offset.x, self.offset.y, width, height)
end

function Collider:init()
  local transform = self.gameObject:get_component("Transform")
  if not transform then
    self.gameObject.game.logger:error("Collider on '" .. self.gameObject.id .. "' missing Transform")
    return
  end

  local world = self.gameObject.game.physicsSystem.world
  if not world then
    self.gameObject.game.logger:error("Physics world not initialized for collider on '" .. self.gameObject.id .. "'")
    return
  end

  local body_type = self.isStatic and "static" or "dynamic"
  self.body = love.physics.newBody(world, transform.position.x, transform.position.y, body_type)
  self.body:setAngle(math.rad(transform.rotation))

  self.physics_shape = create_shape(self, transform)
  self.fixture = love.physics.newFixture(self.body, self.physics_shape, self.density)
  self.fixture:setFriction(self.friction)
  self.fixture:setRestitution(self.restitution)
  self.fixture:setSensor(self.isTrigger)
  self.fixture:setUserData({
    objectId = self.gameObject.id,
    collider = self,
  })

  self.initialized = true
end

function Collider:update(_dt)
  if not self.body then
    return
  end

  local transform = self.gameObject:get_component("Transform")
  if not transform then
    return
  end

  if self.isStatic then
    self.body:setPosition(transform.position.x, transform.position.y)
    self.body:setAngle(math.rad(transform.rotation))
  else
    local x, y = self.body:getPosition()
    transform.position.x = x
    transform.position.y = y
    transform.rotation = math.deg(self.body:getAngle())
  end
end

function Collider:get_aabb()
  local transform = self.gameObject:get_component("Transform")
  if not transform then
    return nil
  end

  local width = transform.size.width * transform.scale.x
  local height = transform.size.height * transform.scale.y

  return {
    x = transform.position.x - (width / 2) + self.offset.x,
    y = transform.position.y - (height / 2) + self.offset.y,
    width = width,
    height = height,
  }
end

function Collider:destroy()
  if self.fixture then
    self.fixture:destroy()
    self.fixture = nil
  end
  if self.body then
    self.body:destroy()
    self.body = nil
  end
  self.physics_shape = nil
end

return Collider
