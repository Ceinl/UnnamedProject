local DialogueSystem = {}
DialogueSystem.__index = DialogueSystem

function DialogueSystem.new(game)
  return setmetatable({ game = game }, DialogueSystem)
end

function DialogueSystem:update(dt)
  self.game.dialogueManager:update(dt)
end

function DialogueSystem:draw()
  self.game.dialogueManager:draw()
end

return DialogueSystem
