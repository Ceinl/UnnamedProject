local DialogueManager = {}
DialogueManager.__index = DialogueManager

function DialogueManager.new(game)
  return setmetatable({
    game = game,
    active = false,
    state = {},
  }, DialogueManager)
end

function DialogueManager:update(_dt)
  -- Placeholder for Phase 5 dialogue runtime.
end

function DialogueManager:draw()
  -- Placeholder for Phase 5 dialogue runtime.
end

function DialogueManager:clear()
  self.active = false
  self.state = {}
end

return DialogueManager
