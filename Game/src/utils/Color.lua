local Color = {}

local NAMED = {
  white = { 1, 1, 1, 1 },
  black = { 0, 0, 0, 1 },
  red = { 1, 0, 0, 1 },
  green = { 0, 1, 0, 1 },
  blue = { 0, 0, 1, 1 },
  yellow = { 1, 1, 0, 1 },
}

local function clamp01(value)
  if value < 0 then
    return 0
  end
  if value > 1 then
    return 1
  end
  return value
end

function Color.parse(value, fallback)
  if type(value) ~= "string" or value == "" then
    return fallback or { 1, 1, 1, 1 }
  end

  local lower = value:lower()
  if NAMED[lower] then
    local c = NAMED[lower]
    return { c[1], c[2], c[3], c[4] }
  end

  local hex = lower:match("^#([0-9a-f]+)$")
  if hex then
    if #hex == 3 then
      local r = tonumber(hex:sub(1, 1) .. hex:sub(1, 1), 16) / 255
      local g = tonumber(hex:sub(2, 2) .. hex:sub(2, 2), 16) / 255
      local b = tonumber(hex:sub(3, 3) .. hex:sub(3, 3), 16) / 255
      return { r, g, b, 1 }
    elseif #hex == 6 then
      local r = tonumber(hex:sub(1, 2), 16) / 255
      local g = tonumber(hex:sub(3, 4), 16) / 255
      local b = tonumber(hex:sub(5, 6), 16) / 255
      return { r, g, b, 1 }
    elseif #hex == 8 then
      local r = tonumber(hex:sub(1, 2), 16) / 255
      local g = tonumber(hex:sub(3, 4), 16) / 255
      local b = tonumber(hex:sub(5, 6), 16) / 255
      local a = tonumber(hex:sub(7, 8), 16) / 255
      return { r, g, b, a }
    end
  end

  local r, g, b, a = value:match("^rgba?%(([^,]+),([^,]+),([^,%)]+),?([^%)]+)?%)$")
  if r then
    local rn = tonumber((r:gsub("%s+", "")) or "")
    local gn = tonumber((g:gsub("%s+", "")) or "")
    local bn = tonumber((b:gsub("%s+", "")) or "")
    local an = tonumber(((a or "1"):gsub("%s+", "")) or "1")
    if rn and gn and bn and an then
      return {
        clamp01(rn / 255),
        clamp01(gn / 255),
        clamp01(bn / 255),
        clamp01(an),
      }
    end
  end

  return fallback or { 1, 1, 1, 1 }
end

return Color
