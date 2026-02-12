local Color = require("src.utils.Color")

local RenderSystem = {}
RenderSystem.__index = RenderSystem

function RenderSystem.new(game)
  return setmetatable({
    game = game,
    defaultBackgroundColor = { 0.06, 0.06, 0.1, 1 },
    hudFont = love.graphics.newFont(13),
  }, RenderSystem)
end

function RenderSystem:_draw_background(scene)
  local bg_color = self.defaultBackgroundColor
  if scene and scene.backgroundColor then
    bg_color = Color.parse(scene.backgroundColor, self.defaultBackgroundColor)
  end

  love.graphics.clear(bg_color[1], bg_color[2], bg_color[3], bg_color[4])
end

function RenderSystem:_draw_world_background(scene)
  if scene and scene.background then
    local image = self.game.assetManager:load_image(scene.background)
    if image then
      local scene_width = scene.size and scene.size.width or image:getWidth()
      local scene_height = scene.size and scene.size.height or image:getHeight()
      local sx = scene_width / image:getWidth()
      local sy = scene_height / image:getHeight()
      love.graphics.setColor(1, 1, 1, 1)
      love.graphics.draw(image, 0, 0, 0, sx, sy)
    end
  end
end

function RenderSystem:_draw_debug_colliders()
  if not self.game.debug.showColliders then
    return
  end

  love.graphics.setColor(0.2, 1, 0.25, 0.65)

  for _, object in ipairs(self.game.objectManager:get_all()) do
    local collider = object:get_component("Collider")
    if collider then
      local bounds = collider:get_aabb()
      if bounds then
        love.graphics.rectangle("line", bounds.x, bounds.y, bounds.width, bounds.height)
      end
    end
  end

  love.graphics.setColor(1, 1, 1, 1)
end

function RenderSystem:_draw_hud()
  if not self.game.debug.showStats then
    return
  end

  local lines = {
    string.format("FPS: %d", love.timer.getFPS()),
    string.format("Memory (Lua MB): %.2f", collectgarbage("count") / 1024),
    string.format("Objects: %d", self.game.objectManager:get_count()),
  }

  if self.game.sceneManager.currentSceneId then
    lines[#lines + 1] = "Scene: " .. self.game.sceneManager.currentSceneId
  end

  if self.game.debug.lastSceneLoadMs then
    lines[#lines + 1] = string.format("Scene load: %.2f ms", self.game.debug.lastSceneLoadMs)
  end

  local warnings = self.game.logger:get_recent(5)
  if #warnings > 0 then
    lines[#lines + 1] = "--- Logs ---"
    for _, entry in ipairs(warnings) do
      lines[#lines + 1] = string.format("[%s] %s", entry.level, entry.message)
    end
  end

  local previous_font = love.graphics.getFont()
  love.graphics.setFont(self.hudFont)

  local x = 12
  local y = 12
  local max_width = 420

  love.graphics.setColor(0, 0, 0, 0.55)
  love.graphics.rectangle("fill", x - 8, y - 8, max_width, (#lines * 16) + 14, 6, 6)

  love.graphics.setColor(1, 1, 1, 1)
  for _, line in ipairs(lines) do
    love.graphics.print(line, x, y)
    y = y + 16
  end

  love.graphics.setFont(previous_font)
end

function RenderSystem:draw()
  local scene = self.game.sceneManager.currentScene

  self:_draw_background(scene)

  self.game.camera:attach()
  self:_draw_world_background(scene)
  self.game.objectManager:draw()
  self.game.scriptManager:draw()
  self:_draw_debug_colliders()
  self.game.triggerSystem:draw_debug()
  self.game.camera:detach()

  self.game.dialogueSystem:draw()
  self:_draw_hud()
end

return RenderSystem
