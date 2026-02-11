local Path = {}

local function starts_with(value, prefix)
  return string.sub(value, 1, #prefix) == prefix
end

function Path.normalize(path)
  if type(path) ~= "string" then
    return ""
  end

  local normalized = path:gsub("\\", "/")
  normalized = normalized:gsub("^%./", "")

  local parts = {}
  for part in normalized:gmatch("[^/]+") do
    if part == "." or part == "" then
      -- skip
    elseif part == ".." then
      if #parts > 0 then
        table.remove(parts)
      end
    else
      parts[#parts + 1] = part
    end
  end

  return table.concat(parts, "/")
end

function Path.is_safe_relative(path)
  if type(path) ~= "string" then
    return false
  end

  if path == "" then
    return false
  end

  local normalized = path:gsub("\\", "/")
  if starts_with(normalized, "/") then
    return false
  end
  if normalized:match("^[A-Za-z]:") then
    return false
  end

  for part in normalized:gmatch("[^/]+") do
    if part == ".." then
      return false
    end
  end

  return true
end

function Path.resolve_candidates(relative_path)
  local normalized = Path.normalize(relative_path)
  if normalized == "" then
    return {}
  end

  local candidates = {
    normalized,
    "./" .. normalized,
    "../" .. normalized,
  }

  local unique = {}
  local result = {}
  for _, item in ipairs(candidates) do
    if not unique[item] then
      unique[item] = true
      result[#result + 1] = item
    end
  end

  return result
end

return Path
