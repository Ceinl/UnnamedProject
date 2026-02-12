local Camera = {}
Camera.__index = Camera

function Camera.new()
  return setmetatable({
    x = 0,
    y = 0,
    zoom = 1,
    minZoom = 0.2,
    maxZoom = 4,
  }, Camera)
end

function Camera:set_position(x, y)
  self.x = x or self.x
  self.y = y or self.y
end

function Camera:set_zoom(zoom)
  zoom = zoom or self.zoom
  if zoom < self.minZoom then
    zoom = self.minZoom
  elseif zoom > self.maxZoom then
    zoom = self.maxZoom
  end
  self.zoom = zoom
end

function Camera:apply_scene_defaults(scene)
  if not scene or not scene.camera then
    self:set_position(0, 0)
    self:set_zoom(1)
    return
  end

  local position = scene.camera.defaultPosition or { x = 0, y = 0 }
  self:set_position(position.x or 0, position.y or 0)
  self:set_zoom(scene.camera.defaultZoom or 1)
end

function Camera:attach()
  local w, h = love.graphics.getDimensions()
  love.graphics.push()
  love.graphics.translate(w / 2, h / 2)
  love.graphics.scale(self.zoom, self.zoom)
  love.graphics.translate(-self.x, -self.y)
end

function Camera:detach()
  love.graphics.pop()
end

return Camera
