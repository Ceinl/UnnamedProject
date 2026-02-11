local TableUtils = {}

function TableUtils.shallow_copy(source)
  local target = {}
  for key, value in pairs(source or {}) do
    target[key] = value
  end
  return target
end

function TableUtils.deep_copy(source, seen)
  if type(source) ~= "table" then
    return source
  end

  seen = seen or {}
  if seen[source] then
    return seen[source]
  end

  local target = {}
  seen[source] = target

  for key, value in pairs(source) do
    target[TableUtils.deep_copy(key, seen)] = TableUtils.deep_copy(value, seen)
  end

  return setmetatable(target, getmetatable(source))
end

function TableUtils.merge(base, override)
  local result = TableUtils.deep_copy(base or {})
  for key, value in pairs(override or {}) do
    if type(value) == "table" and type(result[key]) == "table" then
      result[key] = TableUtils.merge(result[key], value)
    else
      result[key] = TableUtils.deep_copy(value)
    end
  end
  return result
end

function TableUtils.contains(list, value)
  for _, item in ipairs(list or {}) do
    if item == value then
      return true
    end
  end
  return false
end

return TableUtils
