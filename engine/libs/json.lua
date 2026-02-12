local json = {}

local function decode_error(input, index, message)
  error(string.format("JSON decode error at char %d: %s", index, message .. "\n" .. input), 0)
end

local function skip_whitespace(input, index)
  local byte = string.byte(input, index)
  while byte == 32 or byte == 9 or byte == 10 or byte == 13 do
    index = index + 1
    byte = string.byte(input, index)
  end
  return index
end

local function parse_string(input, index)
  local result = {}
  index = index + 1

  while true do
    local char = string.byte(input, index)
    if not char then
      decode_error(input, index, "unterminated string")
    end

    if char == 34 then
      return table.concat(result), index + 1
    end

    if char == 92 then
      local escape = string.byte(input, index + 1)
      if escape == 34 or escape == 92 or escape == 47 then
        result[#result + 1] = string.char(escape)
        index = index + 2
      elseif escape == 98 then
        result[#result + 1] = "\b"
        index = index + 2
      elseif escape == 102 then
        result[#result + 1] = "\f"
        index = index + 2
      elseif escape == 110 then
        result[#result + 1] = "\n"
        index = index + 2
      elseif escape == 114 then
        result[#result + 1] = "\r"
        index = index + 2
      elseif escape == 116 then
        result[#result + 1] = "\t"
        index = index + 2
      elseif escape == 117 then
        local hex = string.sub(input, index + 2, index + 5)
        if not hex:match("^[0-9a-fA-F]+$") then
          decode_error(input, index, "invalid unicode escape")
        end
        local code = tonumber(hex, 16)
        if code <= 0x7F then
          result[#result + 1] = string.char(code)
        elseif code <= 0x7FF then
          local b1 = 0xC0 + math.floor(code / 0x40)
          local b2 = 0x80 + (code % 0x40)
          result[#result + 1] = string.char(b1, b2)
        else
          local b1 = 0xE0 + math.floor(code / 0x1000)
          local b2 = 0x80 + (math.floor(code / 0x40) % 0x40)
          local b3 = 0x80 + (code % 0x40)
          result[#result + 1] = string.char(b1, b2, b3)
        end
        index = index + 6
      else
        decode_error(input, index, "invalid escape sequence")
      end
    else
      result[#result + 1] = string.char(char)
      index = index + 1
    end
  end
end

local function parse_number(input, index)
  local start_index = index
  local char = string.byte(input, index)

  if char == 45 then
    index = index + 1
    char = string.byte(input, index)
  end

  if char == 48 then
    index = index + 1
    char = string.byte(input, index)
  else
    if not char or char < 49 or char > 57 then
      decode_error(input, index, "invalid number")
    end
    while char and char >= 48 and char <= 57 do
      index = index + 1
      char = string.byte(input, index)
    end
  end

  if char == 46 then
    index = index + 1
    char = string.byte(input, index)
    if not char or char < 48 or char > 57 then
      decode_error(input, index, "invalid number fraction")
    end
    while char and char >= 48 and char <= 57 do
      index = index + 1
      char = string.byte(input, index)
    end
  end

  if char == 69 or char == 101 then
    index = index + 1
    char = string.byte(input, index)
    if char == 43 or char == 45 then
      index = index + 1
      char = string.byte(input, index)
    end
    if not char or char < 48 or char > 57 then
      decode_error(input, index, "invalid number exponent")
    end
    while char and char >= 48 and char <= 57 do
      index = index + 1
      char = string.byte(input, index)
    end
  end

  local number = tonumber(string.sub(input, start_index, index - 1))
  if not number then
    decode_error(input, start_index, "invalid number conversion")
  end

  return number, index
end

local function parse_literal(input, index, literal, value)
  if string.sub(input, index, index + #literal - 1) == literal then
    return value, index + #literal
  end
  decode_error(input, index, "invalid literal")
end

local parse_value

local function parse_array(input, index)
  local array = {}
  index = skip_whitespace(input, index + 1)

  if string.byte(input, index) == 93 then
    return array, index + 1
  end

  while true do
    local value
    value, index = parse_value(input, index)
    array[#array + 1] = value

    index = skip_whitespace(input, index)
    local char = string.byte(input, index)
    if char == 93 then
      return array, index + 1
    end
    if char ~= 44 then
      decode_error(input, index, "expected ',' or ']' in array")
    end
    index = skip_whitespace(input, index + 1)
  end
end

local function parse_object(input, index)
  local object = {}
  index = skip_whitespace(input, index + 1)

  if string.byte(input, index) == 125 then
    return object, index + 1
  end

  while true do
    if string.byte(input, index) ~= 34 then
      decode_error(input, index, "expected string key")
    end

    local key
    key, index = parse_string(input, index)
    index = skip_whitespace(input, index)

    if string.byte(input, index) ~= 58 then
      decode_error(input, index, "expected ':' after key")
    end

    index = skip_whitespace(input, index + 1)
    local value
    value, index = parse_value(input, index)
    object[key] = value

    index = skip_whitespace(input, index)
    local char = string.byte(input, index)
    if char == 125 then
      return object, index + 1
    end
    if char ~= 44 then
      decode_error(input, index, "expected ',' or '}' in object")
    end
    index = skip_whitespace(input, index + 1)
  end
end

parse_value = function(input, index)
  index = skip_whitespace(input, index)
  local char = string.byte(input, index)

  if char == 34 then
    return parse_string(input, index)
  end
  if char == 123 then
    return parse_object(input, index)
  end
  if char == 91 then
    return parse_array(input, index)
  end
  if char == 45 or (char and char >= 48 and char <= 57) then
    return parse_number(input, index)
  end
  if char == 116 then
    return parse_literal(input, index, "true", true)
  end
  if char == 102 then
    return parse_literal(input, index, "false", false)
  end
  if char == 110 then
    return parse_literal(input, index, "null", nil)
  end

  decode_error(input, index, "unexpected character")
end

function json.decode(input)
  if type(input) ~= "string" then
    error("json.decode expects a string", 2)
  end

  local value, index = parse_value(input, 1)
  index = skip_whitespace(input, index)
  if index <= #input then
    decode_error(input, index, "trailing characters")
  end
  return value
end

local function is_array(value)
  if type(value) ~= "table" then
    return false
  end

  local count = 0
  for key, _ in pairs(value) do
    if type(key) ~= "number" or key <= 0 or key % 1 ~= 0 then
      return false
    end
    if key > count then
      count = key
    end
  end

  for i = 1, count do
    if value[i] == nil then
      return false
    end
  end

  return true
end

local function escape_string(value)
  return value
    :gsub("\\", "\\\\")
    :gsub('"', '\\"')
    :gsub("\b", "\\b")
    :gsub("\f", "\\f")
    :gsub("\n", "\\n")
    :gsub("\r", "\\r")
    :gsub("\t", "\\t")
end

local function encode_value(value)
  local t = type(value)

  if t == "nil" then
    return "null"
  end
  if t == "boolean" then
    return value and "true" or "false"
  end
  if t == "number" then
    if value ~= value or value == math.huge or value == -math.huge then
      error("cannot encode non-finite number")
    end
    return tostring(value)
  end
  if t == "string" then
    return '"' .. escape_string(value) .. '"'
  end
  if t ~= "table" then
    error("unsupported json type: " .. t)
  end

  if is_array(value) then
    local parts = {}
    for i = 1, #value do
      parts[#parts + 1] = encode_value(value[i])
    end
    return "[" .. table.concat(parts, ",") .. "]"
  end

  local keys = {}
  for key, _ in pairs(value) do
    if type(key) ~= "string" then
      error("object keys must be strings")
    end
    keys[#keys + 1] = key
  end
  table.sort(keys)

  local parts = {}
  for _, key in ipairs(keys) do
    parts[#parts + 1] = '"' .. escape_string(key) .. '":' .. encode_value(value[key])
  end
  return "{" .. table.concat(parts, ",") .. "}"
end

function json.encode(value)
  return encode_value(value)
end

return json
