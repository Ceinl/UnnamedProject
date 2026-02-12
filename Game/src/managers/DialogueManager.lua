local DialogueManager = {}
DialogueManager.__index = DialogueManager

function DialogueManager.new(game)
  return setmetatable({
    game = game,
    active = false,
    state = {},
    speaker = "",
    lines = {},
    index = 1,
    font = nil,
  }, DialogueManager)
end

function DialogueManager:start_dialogue(lines, speaker)
  if type(lines) ~= "table" or #lines == 0 then
    return false
  end

  self.active = true
  self.lines = lines
  self.index = 1
  self.speaker = speaker or ""
  self.font = self.game.assetManager:load_font(nil, 22)
  return true
end

function DialogueManager:is_active()
  return self.active
end

function DialogueManager:get_current_line()
  if not self.active then
    return nil
  end
  return self.lines[self.index]
end

function DialogueManager:advance()
  if not self.active then
    return false
  end

  if self.index < #self.lines then
    self.index = self.index + 1
    return true
  end

  self:clear()
  return false
end

function DialogueManager:handle_keypressed(key)
  if not self.active then
    return false
  end

  if key == "return" or key == "kpenter" or key == "space" or key == "e" then
    self:advance()
    return true
  end

  return false
end

function DialogueManager:handle_mousepressed(_x, _y, button)
  if not self.active then
    return false
  end

  if button == 1 then
    self:advance()
    return true
  end

  return false
end

function DialogueManager:update(_dt)
  -- Simple dialogue has no per-frame logic
end

function DialogueManager:draw()
  if not self.active then
    return
  end

  local line = self:get_current_line() or ""
  local w, h = love.graphics.getDimensions()
  local margin = 40
  local box_height = 160
  local box_y = h - box_height - margin

  love.graphics.setColor(0, 0, 0, 0.75)
  love.graphics.rectangle("fill", margin, box_y, w - margin * 2, box_height, 12, 12)
  love.graphics.setColor(1, 1, 1, 1)
  love.graphics.rectangle("line", margin, box_y, w - margin * 2, box_height, 12, 12)

  if self.font then
    love.graphics.setFont(self.font)
  end

  local text_x = margin + 20
  local text_y = box_y + 24
  local text_width = w - margin * 2 - 40

  if self.speaker ~= "" then
    love.graphics.printf(self.speaker .. ":", text_x, text_y - 20, text_width, "left")
  end

  love.graphics.printf(line, text_x, text_y, text_width, "left")
  love.graphics.setColor(1, 1, 1, 1)
end

function DialogueManager:clear()
  self.active = false
  self.state = {}
  self.lines = {}
  self.index = 1
  self.speaker = ""
end

return DialogueManager
