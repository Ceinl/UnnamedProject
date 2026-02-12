local GameObject = require("engine.entities.GameObject")
local Transform = require("engine.components.Transform")
local Sprite = require("engine.components.Sprite")
local Collider = require("engine.components.Collider")
local Trigger = require("engine.components.Trigger")
local Script = require("engine.components.Script")
local Text = require("engine.components.Text")

local ObjectManager = {}
ObjectManager.__index = ObjectManager

function ObjectManager.new(game)
  return setmetatable({
    game = game,
    objects = {},
    order = {},
    destroy_queue = {},
    dirty_sort = false,
    creation_counter = 0,
  }, ObjectManager)
end

function ObjectManager:create(data)
  self.creation_counter = self.creation_counter + 1
  data._creationIndex = self.creation_counter

  local object = GameObject.new(self.game, data)

  object:add_component("Transform", Transform.new(object, data))

  if data.type ~= "text" then
    object:add_component("Sprite", Sprite.new(object, data))
  end

  if data.text then
    object:add_component("Text", Text.new(object, data.text))
  end

  if data.collider then
    object:add_component("Collider", Collider.new(object, data.collider))
  end

  if data.trigger then
    object:add_component("Trigger", Trigger.new(object, data.trigger))
  end

  if data.script then
    object:add_component("Script", Script.new(object, {
      scriptPath = data.script,
      params = data.scriptParams or {},
    }))
  end

  object:init_components()

  self.objects[object.id] = object
  self.order[#self.order + 1] = object
  self.dirty_sort = true

  return object
end

function ObjectManager:destroy(object_id)
  local object = self.objects[object_id]
  if not object then
    return false
  end
  self.destroy_queue[object_id] = true
  return true
end

function ObjectManager:_flush_destroy_queue()
  if next(self.destroy_queue) == nil then
    return
  end

  local new_order = {}
  for _, object in ipairs(self.order) do
    if self.destroy_queue[object.id] then
      object:destroy()
      self.objects[object.id] = nil
    else
      new_order[#new_order + 1] = object
    end
  end

  self.order = new_order
  self.destroy_queue = {}
  self.dirty_sort = true
end

function ObjectManager:findById(object_id)
  return self.objects[object_id]
end

function ObjectManager:findByTag(tag)
  local matches = {}
  for _, object in ipairs(self.order) do
    if object:has_tag(tag) then
      matches[#matches + 1] = object
    end
  end
  return matches
end

function ObjectManager:get_all()
  return self.order
end

function ObjectManager:_ensure_sorted()
  if not self.dirty_sort then
    return
  end

  table.sort(self.order, function(a, b)
    local z_a = a:get_draw_z_index()
    local z_b = b:get_draw_z_index()

    if z_a ~= z_b then
      return z_a < z_b
    end

    if a._creation_index ~= b._creation_index then
      return a._creation_index < b._creation_index
    end

    return a.id < b.id
  end)

  self.dirty_sort = false
end

function ObjectManager:update(dt)
  self:_flush_destroy_queue()

  for _, object in ipairs(self.order) do
    object:update(dt)
  end
end

function ObjectManager:draw()
  self:_ensure_sorted()
  for _, object in ipairs(self.order) do
    object:draw()
  end
end

function ObjectManager:get_count()
  return #self.order
end

function ObjectManager:clear()
  self.destroy_queue = {}

  for i = #self.order, 1, -1 do
    self.order[i]:destroy()
  end

  self.objects = {}
  self.order = {}
  self.dirty_sort = false
end

return ObjectManager
