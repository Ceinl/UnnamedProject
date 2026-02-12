local Logger = {}
Logger.__index = Logger

function Logger.new(max_entries)
  return setmetatable({
    max_entries = max_entries or 200,
    entries = {},
  }, Logger)
end

function Logger:_push(level, message)
  local entry = {
    time = os.date("%H:%M:%S"),
    level = level,
    message = tostring(message),
  }

  self.entries[#self.entries + 1] = entry
  if #self.entries > self.max_entries then
    table.remove(self.entries, 1)
  end

  print(string.format("[%s] [%s] %s", entry.time, level, entry.message))
end

function Logger:info(message)
  self:_push("INFO", message)
end

function Logger:warn(message)
  self:_push("WARN", message)
end

function Logger:error(message)
  self:_push("ERROR", message)
end

function Logger:get_recent(limit)
  limit = limit or 8
  local out = {}
  local start_index = math.max(1, #self.entries - limit + 1)
  for i = start_index, #self.entries do
    out[#out + 1] = self.entries[i]
  end
  return out
end

return Logger
