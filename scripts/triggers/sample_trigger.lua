-- Sample trigger behavior script
-- Attach to trigger zones for custom events

local TriggerBehavior = {}

function TriggerBehavior:onLoad(params)
  print("Trigger loaded")
end

-- Called when an object enters the trigger zone
function TriggerBehavior:onEnter(targetObject)
  print("Object entered trigger:", targetObject.name)
end

-- Called when an object exits the trigger zone
function TriggerBehavior:onExit(targetObject)
  print("Object exited trigger:", targetObject.name)
end

-- Called every frame while object is inside (if event type is "onStay")
function TriggerBehavior:onStay(targetObject)
  -- Continuous behavior while inside
end

-- Called when player presses interact key (if event type is "onInteract")
function TriggerBehavior:onInteract(targetObject)
  print("Player interacted with trigger")
end

return TriggerBehavior
