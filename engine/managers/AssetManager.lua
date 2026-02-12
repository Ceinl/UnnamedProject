local FileSystem = require("engine.utils.FileSystem")
local Path = require("engine.utils.Path")

local AssetManager = {}
AssetManager.__index = AssetManager

function AssetManager.new(game)
  return setmetatable({
    game = game,
    images = {},
    fonts = {},
    missing_image = nil,
  }, AssetManager)
end

function AssetManager:_create_missing_image()
  if self.missing_image then
    return self.missing_image
  end

  local data = love.image.newImageData(2, 2)
  data:setPixel(0, 0, 1, 0, 1, 1)
  data:setPixel(1, 1, 1, 0, 1, 1)
  data:setPixel(1, 0, 0, 0, 0, 1)
  data:setPixel(0, 1, 0, 0, 0, 1)
  self.missing_image = love.graphics.newImage(data)

  return self.missing_image
end

function AssetManager:load_image(relative_path)
  if type(relative_path) ~= "string" or relative_path == "" then
    return self:_create_missing_image()
  end

  if self.images[relative_path] then
    return self.images[relative_path]
  end

  local candidates = Path.resolve_candidates(relative_path)

  for _, candidate in ipairs(candidates) do
    local info = love.filesystem.getInfo(candidate)
    if info and info.type == "file" then
      local ok, image = pcall(love.graphics.newImage, candidate)
      if ok and image then
        self.images[relative_path] = image
        return image
      end
    end
  end

  local data = FileSystem.read_relative(relative_path)
  if data then
    local ok_file_data, file_data = pcall(love.filesystem.newFileData, data, relative_path)
    if ok_file_data and file_data then
      local ok_image, image = pcall(love.graphics.newImage, file_data)
      if ok_image and image then
        self.images[relative_path] = image
        return image
      end
    end
  end

  self.game.logger:warn("Missing image asset: " .. relative_path)
  local fallback = self:_create_missing_image()
  self.images[relative_path] = fallback
  return fallback
end

function AssetManager:load_font(relative_path, size)
  size = size or 12
  local key = (relative_path or "<default>") .. "@" .. tostring(size)

  if self.fonts[key] then
    return self.fonts[key]
  end

  if type(relative_path) ~= "string" or relative_path == "" then
    local font = love.graphics.newFont(size)
    self.fonts[key] = font
    return font
  end

  local candidates = Path.resolve_candidates(relative_path)

  for _, candidate in ipairs(candidates) do
    local info = love.filesystem.getInfo(candidate)
    if info and info.type == "file" then
      local ok, font = pcall(love.graphics.newFont, candidate, size)
      if ok and font then
        self.fonts[key] = font
        return font
      end
    end
  end

  local bytes = FileSystem.read_relative(relative_path)
  if bytes then
    local ok_data, file_data = pcall(love.filesystem.newFileData, bytes, relative_path)
    if ok_data and file_data then
      local ok_font, font = pcall(love.graphics.newFont, file_data, size)
      if ok_font and font then
        self.fonts[key] = font
        return font
      end
    end
  end

  self.game.logger:warn("Missing font asset: " .. relative_path .. " (using default)")
  local fallback = love.graphics.newFont(size)
  self.fonts[key] = fallback
  return fallback
end

function AssetManager:clear()
  self.images = {}
  self.fonts = {}
end

return AssetManager
