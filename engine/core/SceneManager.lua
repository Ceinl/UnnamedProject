local json = require("engine.libs.json")
local FileSystem = require("engine.utils.FileSystem")
local SceneValidation = require("engine.utils.SceneValidation")

local SceneManager = {}
SceneManager.__index = SceneManager

function SceneManager.new(game)
  local self = setmetatable({
    game = game,
    sceneIndex = {},
    currentScene = nil,
    currentSceneId = nil,
    currentScenePath = nil,
  }, SceneManager)

  self:load_scene_index()
  return self
end

local function normalize_scene_index(raw_index)
  if type(raw_index) == "table" and #raw_index > 0 then
    return raw_index
  end

  if type(raw_index) == "table" and type(raw_index.items) == "table" then
    return raw_index.items
  end

  return {}
end

function SceneManager:load_scene_index()
  self.sceneIndex = {}

  local payload, resolved_path_or_err = FileSystem.read_relative("content/scenes/index.json")
  if not payload then
    self.game.logger:warn("Scene index missing: content/scenes/index.json")
    return self.sceneIndex
  end

  local ok, decoded_or_err = pcall(json.decode, payload)
  if not ok then
    self.game.logger:error("Invalid scene index JSON (" .. tostring(resolved_path_or_err) .. "): " .. tostring(decoded_or_err))
    return self.sceneIndex
  end

  local items = normalize_scene_index(decoded_or_err)
  for _, item in ipairs(items) do
    if type(item) == "table" and type(item.id) == "string" and item.id ~= "" then
      local path = item.path
      if type(path) ~= "string" or path == "" then
        path = "content/scenes/" .. item.id .. ".json"
      end
      self.sceneIndex[#self.sceneIndex + 1] = {
        id = item.id,
        name = item.name or item.id,
        path = path,
      }
    end
  end

  return self.sceneIndex
end

function SceneManager:get_scene_ids()
  local ids = {}
  for _, item in ipairs(self.sceneIndex) do
    ids[#ids + 1] = item.id
  end
  return ids
end

function SceneManager:get_default_scene_id()
  if #self.sceneIndex == 0 then
    return nil
  end
  return self.sceneIndex[1].id
end

function SceneManager:_find_scene_entry(scene_id)
  for _, item in ipairs(self.sceneIndex) do
    if item.id == scene_id then
      return item
    end
  end
  return nil
end

function SceneManager:_load_scene_payload(scene_path)
  local content, resolved_or_err = FileSystem.read_relative(scene_path)
  if not content then
    return nil, "Failed to read scene file '" .. scene_path .. "': " .. tostring(resolved_or_err)
  end

  local ok, parsed_or_err = pcall(json.decode, content)
  if not ok then
    return nil, "JSON parse error in scene '" .. scene_path .. "': " .. tostring(parsed_or_err)
  end

  return parsed_or_err
end

function SceneManager:unload()
  if not self.currentSceneId then
    return
  end

  self.game.scriptManager:clear_scene_scripts()
  self.game.objectManager:clear()

  local unloaded_id = self.currentSceneId
  self.currentScene = nil
  self.currentSceneId = nil
  self.currentScenePath = nil

  self.game.events:emit("scene:unloaded", { sceneId = unloaded_id })
end

function SceneManager:load_scene(scene_id)
  if not scene_id then
    return false, "No scene id provided"
  end

  local scene_entry = self:_find_scene_entry(scene_id)
  if not scene_entry then
    return false, "Scene not found in index: " .. scene_id
  end

  local started_at = love.timer.getTime()
  local payload, payload_err = self:_load_scene_payload(scene_entry.path)
  if not payload then
    self.game.logger:error(payload_err)
    return false, payload_err
  end

  local normalized, errors, warnings = SceneValidation.validate(payload, scene_entry.path)

  for _, warning in ipairs(warnings) do
    self.game.logger:warn(warning)
  end

  if #errors > 0 then
    for _, err in ipairs(errors) do
      self.game.logger:error(err)
    end
    return false, "Scene validation failed for " .. scene_entry.path
  end

  self:unload()

  self.currentScene = normalized
  self.currentSceneId = normalized.id
  self.currentScenePath = scene_entry.path

  self.game.camera:apply_scene_defaults(normalized)

  for _, object_data in ipairs(normalized.objects) do
    local object = self.game.objectManager:create(object_data)
    if not object then
      self.game.logger:warn("Skipped object during creation: " .. object_data.id)
    end
  end

  for _, script_path in ipairs(normalized.scripts) do
    self.game.scriptManager:execute_scene_script(script_path)
  end

  local elapsed_ms = (love.timer.getTime() - started_at) * 1000
  self.game.debug.lastSceneLoadMs = elapsed_ms
  self.game.logger:info(string.format("Loaded scene '%s' in %.2f ms", normalized.id, elapsed_ms))

  self.game.events:emit("scene:loaded", {
    sceneId = normalized.id,
    path = scene_entry.path,
    objectCount = #normalized.objects,
  })

  return true
end

function SceneManager:reload_scene()
  if not self.currentSceneId then
    return false, "No scene loaded"
  end
  return self:load_scene(self.currentSceneId)
end

function SceneManager:get_scene_by_offset(offset)
  if #self.sceneIndex == 0 then
    return nil
  end

  local current_index = 1
  for index, item in ipairs(self.sceneIndex) do
    if item.id == self.currentSceneId then
      current_index = index
      break
    end
  end

  local next_index = current_index + offset
  if next_index < 1 then
    next_index = #self.sceneIndex
  elseif next_index > #self.sceneIndex then
    next_index = 1
  end

  return self.sceneIndex[next_index].id
end

return SceneManager
