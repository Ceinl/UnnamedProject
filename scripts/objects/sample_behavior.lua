-- Sample object behavior script
-- Attach this to game objects to give them custom behavior

local MyBehavior = {}

-- Called when the object is first created
function MyBehavior:onLoad(params)
  print("Object loaded with params:", params)
end

-- Called once all components are ready
function MyBehavior:onInit()
  print("Object initialized")
end

-- Called every frame
function MyBehavior:update(dt)
  -- Add your game logic here
end

-- Called every frame for rendering
function MyBehavior:draw()
  -- Custom drawing code (optional)
end

-- Called when this object collides with another
function MyBehavior:onCollisionEnter(other, contact)
  print("Collision with:", other.name)
end

-- Called when collision ends
function MyBehavior:onCollisionExit(other, contact)
  print("Collision ended with:", other.name)
end

-- Called when object is destroyed
function MyBehavior:onDestroy()
  print("Object destroyed")
end

return MyBehavior
