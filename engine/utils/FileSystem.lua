local Path = require("engine.utils.Path")

local FileSystem = {}

local function read_with_io(path)
  local file = io.open(path, "rb")
  if not file then
    return nil
  end
  local content = file:read("*a")
  file:close()
  return content
end

function FileSystem.read_relative(relative_path)
  local candidates = Path.resolve_candidates(relative_path)

  for _, candidate in ipairs(candidates) do
    local info = love.filesystem.getInfo(candidate)
    if info and info.type == "file" then
      local data, err = love.filesystem.read(candidate)
      if data then
        return data, candidate
      end
      return nil, err or ("failed to read " .. candidate)
    end
  end

  for _, candidate in ipairs(candidates) do
    local data = read_with_io(candidate)
    if data then
      return data, candidate
    end
  end

  return nil, "file not found: " .. tostring(relative_path)
end

function FileSystem.exists_relative(relative_path)
  local candidates = Path.resolve_candidates(relative_path)

  for _, candidate in ipairs(candidates) do
    local info = love.filesystem.getInfo(candidate)
    if info then
      return true, candidate
    end
  end

  for _, candidate in ipairs(candidates) do
    local file = io.open(candidate, "rb")
    if file then
      file:close()
      return true, candidate
    end
  end

  return false, nil
end

function FileSystem.get_modified_time(relative_path)
  local candidates = Path.resolve_candidates(relative_path)

  for _, candidate in ipairs(candidates) do
    local info = love.filesystem.getInfo(candidate)
    if info and info.modtime then
      return info.modtime
    end
  end

  for _, candidate in ipairs(candidates) do
    local file = io.open(candidate, "rb")
    if file then
      file:close()
      return nil
    end
  end

  return nil
end

return FileSystem
