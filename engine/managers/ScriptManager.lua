local Path = require("engine.utils.Path")

local ScriptManager = {}
ScriptManager.__index = ScriptManager

function ScriptManager.new(game)
  return setmetatable({
    game = game,
    script_cache = {},
    scene_scripts = {},
    enable_hot_reload = true,
  }, ScriptManager)
end

function ScriptManager:_load_chunk(candidate)
  local info = love.filesystem.getInfo(candidate)
  if info and info.type == "file" then
    local ok, chunk_or_err = pcall(love.filesystem.load, candidate)
    if ok and type(chunk_or_err) == "function" then
      return chunk_or_err
    end
  end

  local chunk, err = loadfile(candidate)
  if chunk then
    return chunk
  end

  return nil, err
end

function ScriptManager:load_script(relative_path, force_reload)
  if type(relative_path) ~= "string" or relative_path == "" then
    return nil, "empty script path"
  end

  if not Path.is_safe_relative(relative_path) then
    return nil, "unsafe script path: " .. relative_path
  end

  if self.script_cache[relative_path] and not force_reload then
    return self.script_cache[relative_path].module
  end

  local candidates = Path.resolve_candidates(relative_path)

  local last_err = "script not found"
  for _, candidate in ipairs(candidates) do
    local chunk, err = self:_load_chunk(candidate)
    if chunk then
      local ok_exec, module_or_err = pcall(chunk)
      if not ok_exec then
        last_err = module_or_err
      else
        local module = module_or_err
        if module == nil then
          module = {}
        end
        if type(module) ~= "table" then
          module = { run = module }
        end

        self.script_cache[relative_path] = {
          module = module,
          loadedAt = love.timer.getTime(),
        }
        return module
      end
    elseif err then
      last_err = err
    end
  end

  return nil, tostring(last_err)
end

function ScriptManager:create_instance(relative_path, params)
  local module, err = self:load_script(relative_path)
  if not module then
    return nil, err
  end

  local instance = setmetatable({}, { __index = module })

  self:safe_call(instance, "onLoad", params)
  self:safe_call(instance, "onInit")

  return instance
end

function ScriptManager:safe_call(instance, method_name, ...)
  if not instance then
    return false
  end

  local fn = instance[method_name]
  if type(fn) ~= "function" then
    return false
  end

  local ok, err = pcall(fn, instance, ...)
  if not ok then
    self.game.logger:error("Script error in " .. tostring(method_name) .. ": " .. tostring(err))
    return false, err
  end

  return true
end

function ScriptManager:execute_scene_script(relative_path)
  local instance, err = self:create_instance(relative_path, {})
  if not instance then
    self.game.logger:error("Failed to load scene script '" .. tostring(relative_path) .. "': " .. tostring(err))
    return nil
  end

  self.scene_scripts[#self.scene_scripts + 1] = {
    path = relative_path,
    instance = instance,
  }

  return instance
end

function ScriptManager:update(dt)
  for _, entry in ipairs(self.scene_scripts) do
    self:safe_call(entry.instance, "update", dt)
  end
end

function ScriptManager:draw()
  for _, entry in ipairs(self.scene_scripts) do
    self:safe_call(entry.instance, "draw")
  end
end

function ScriptManager:clear_scene_scripts()
  for _, entry in ipairs(self.scene_scripts) do
    self:safe_call(entry.instance, "onDestroy")
  end
  self.scene_scripts = {}
end

function ScriptManager:reload_cached_scripts()
  local existing = {}
  for path, _ in pairs(self.script_cache) do
    existing[#existing + 1] = path
  end

  self.script_cache = {}

  for _, path in ipairs(existing) do
    local _, err = self:load_script(path, true)
    if err then
      self.game.logger:warn("Hot reload failed for " .. path .. ": " .. tostring(err))
    end
  end
end

return ScriptManager
