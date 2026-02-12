local Path = require("engine.utils.Path")
local TableUtils = require("engine.utils.TableUtils")

local SceneValidation = {}

local VALID_OBJECT_TYPES = {
  prop = true,
  trigger = true,
  collider = true,
  spawn = true,
  light = true,
  text = true,
}

local VALID_COLLIDER_SHAPES = {
  box = true,
  circle = true,
  polygon = true,
}

local VALID_TRIGGER_EVENTS = {
  onEnter = true,
  onExit = true,
  onStay = true,
  onInteract = true,
}

local VALID_TEXT_ALIGN = {
  left = true,
  center = true,
  right = true,
}

local function is_number(value)
  return type(value) == "number" and value == value and value ~= math.huge and value ~= -math.huge
end

local function is_string(value)
  return type(value) == "string" and value ~= ""
end

local function add_error(errors, file_path, object_id, field, message)
  errors[#errors + 1] = string.format("%s | object=%s | field=%s | %s", file_path, object_id or "<scene>", field, message)
end

local function add_warning(warnings, file_path, object_id, field, message)
  warnings[#warnings + 1] = string.format("%s | object=%s | field=%s | %s", file_path, object_id or "<scene>", field, message)
end

local function sanitize_tags(raw)
  if type(raw) ~= "table" then
    return {}
  end

  local out = {}
  local seen = {}
  for _, value in ipairs(raw) do
    if type(value) == "string" and value ~= "" and not seen[value] then
      out[#out + 1] = value
      seen[value] = true
    end
  end

  return out
end

local function ensure_relative_path(path_value)
  if path_value == nil then
    return true
  end
  if type(path_value) ~= "string" or path_value == "" then
    return false
  end
  return Path.is_safe_relative(path_value)
end

local function normalize_object(raw, index, file_path, errors, warnings, id_set)
  local object_id = raw and raw.id or ("index_" .. tostring(index))

  if type(raw) ~= "table" then
    add_error(errors, file_path, object_id, "object", "must be an object")
    return nil
  end

  if not is_string(raw.id) then
    add_error(errors, file_path, object_id, "id", "is required and must be non-empty string")
    return nil
  end
  object_id = raw.id

  if id_set[object_id] then
    add_error(errors, file_path, object_id, "id", "duplicate object id")
    return nil
  end
  id_set[object_id] = true

  if not is_string(raw.type) then
    add_error(errors, file_path, object_id, "type", "is required and must be non-empty string")
    return nil
  end

  if not VALID_OBJECT_TYPES[raw.type] then
    add_warning(warnings, file_path, object_id, "type", "unsupported type, object skipped")
    return nil
  end

  if type(raw.position) ~= "table" or not is_number(raw.position.x) or not is_number(raw.position.y) then
    add_error(errors, file_path, object_id, "position", "must contain numeric x and y")
    return nil
  end

  if type(raw.size) ~= "table" or not is_number(raw.size.width) or not is_number(raw.size.height) then
    add_error(errors, file_path, object_id, "size", "must contain numeric width and height")
    return nil
  end

  local normalized = {
    id = object_id,
    type = raw.type,
    name = is_string(raw.name) and raw.name or object_id,
    position = {
      x = raw.position.x,
      y = raw.position.y,
    },
    size = {
      width = raw.size.width,
      height = raw.size.height,
    },
    rotation = is_number(raw.rotation) and raw.rotation or 0,
    scale = {
      x = (type(raw.scale) == "table" and is_number(raw.scale.x)) and raw.scale.x or 1,
      y = (type(raw.scale) == "table" and is_number(raw.scale.y)) and raw.scale.y or 1,
    },
    opacity = is_number(raw.opacity) and math.max(0, math.min(1, raw.opacity)) or 1,
    zIndex = is_number(raw.zIndex) and raw.zIndex or 0,
    color = is_string(raw.color) and raw.color or nil,
    sprite = is_string(raw.sprite) and raw.sprite or nil,
    script = is_string(raw.script) and raw.script or nil,
    scriptParams = type(raw.scriptParams) == "table" and TableUtils.deep_copy(raw.scriptParams) or {},
    tags = sanitize_tags(raw.tags),
    visible = raw.visible ~= false,
    locked = raw.locked == true,
    _loadIndex = index,
  }

  if normalized.sprite and not ensure_relative_path(normalized.sprite) then
    add_error(errors, file_path, object_id, "sprite", "must be a safe relative path")
  end

  if normalized.script and not ensure_relative_path(normalized.script) then
    add_error(errors, file_path, object_id, "script", "must be a safe relative path")
  end

  if raw.collider ~= nil then
    if type(raw.collider) ~= "table" then
      add_error(errors, file_path, object_id, "collider", "must be an object when provided")
    else
      local shape = is_string(raw.collider.shape) and raw.collider.shape or "box"
      if not VALID_COLLIDER_SHAPES[shape] then
        add_error(errors, file_path, object_id, "collider.shape", "must be box, circle, or polygon")
        shape = "box"
      end

      normalized.collider = {
        shape = shape,
        offset = {
          x = (type(raw.collider.offset) == "table" and is_number(raw.collider.offset.x)) and raw.collider.offset.x or 0,
          y = (type(raw.collider.offset) == "table" and is_number(raw.collider.offset.y)) and raw.collider.offset.y or 0,
        },
        isStatic = raw.collider.isStatic ~= false,
        isTrigger = raw.collider.isTrigger == true,
        density = is_number(raw.collider.density) and raw.collider.density or 1,
        friction = is_number(raw.collider.friction) and raw.collider.friction or 0.3,
        restitution = is_number(raw.collider.restitution) and raw.collider.restitution or 0,
      }

      if shape == "polygon" and type(raw.collider.points) == "table" then
        normalized.collider.points = {}
        for point_index, point in ipairs(raw.collider.points) do
          if type(point) == "table" and is_number(point.x) and is_number(point.y) then
            normalized.collider.points[#normalized.collider.points + 1] = { x = point.x, y = point.y }
          else
            add_error(errors, file_path, object_id, "collider.points[" .. point_index .. "]", "must contain numeric x and y")
          end
        end
      elseif shape == "polygon" then
        add_warning(warnings, file_path, object_id, "collider.points", "missing points, falling back to box")
        normalized.collider.shape = "box"
      end
    end
  end

  if raw.trigger ~= nil then
    if type(raw.trigger) ~= "table" then
      add_error(errors, file_path, object_id, "trigger", "must be an object when provided")
    else
      local event_type = is_string(raw.trigger.event) and raw.trigger.event or "onEnter"
      if not VALID_TRIGGER_EVENTS[event_type] then
        add_error(errors, file_path, object_id, "trigger.event", "must be onEnter, onExit, onStay, or onInteract")
        event_type = "onEnter"
      end

      local trigger_script = is_string(raw.trigger.script) and raw.trigger.script or nil
      if trigger_script and not ensure_relative_path(trigger_script) then
        add_error(errors, file_path, object_id, "trigger.script", "must be a safe relative path")
      end

      normalized.trigger = {
        event = event_type,
        script = trigger_script,
        action = is_string(raw.trigger.action) and raw.trigger.action or nil,
        cooldown = is_number(raw.trigger.cooldown) and math.max(0, raw.trigger.cooldown) or 0,
        oneShot = raw.trigger.oneShot == true,
      }
    end
  end

  if raw.type == "text" then
    if type(raw.text) ~= "table" then
      raw.text = { content = raw.name or raw.id }
    end

    local align = is_string(raw.text.align) and raw.text.align or "center"
    if not VALID_TEXT_ALIGN[align] then
      add_error(errors, file_path, object_id, "text.align", "must be left, center, or right")
      align = "center"
    end

    normalized.text = {
      content = type(raw.text.content) == "string" and raw.text.content or "",
      fontFamily = is_string(raw.text.fontFamily) and raw.text.fontFamily or nil,
      fontSize = is_number(raw.text.fontSize) and math.max(8, raw.text.fontSize) or 36,
      align = align,
      lineHeight = is_number(raw.text.lineHeight) and math.max(8, raw.text.lineHeight) or nil,
    }

    if normalized.text.fontFamily and not ensure_relative_path(normalized.text.fontFamily) then
      add_error(errors, file_path, object_id, "text.fontFamily", "must be a safe relative path")
    end
  end

  return normalized
end

local function sort_objects_deterministically(objects)
  table.sort(objects, function(a, b)
    if a.zIndex ~= b.zIndex then
      return a.zIndex < b.zIndex
    end
    if a._loadIndex ~= b._loadIndex then
      return a._loadIndex < b._loadIndex
    end
    return a.id < b.id
  end)
end

function SceneValidation.validate(scene_data, file_path)
  local errors = {}
  local warnings = {}

  if type(scene_data) ~= "table" then
    add_error(errors, file_path, nil, "scene", "root must be an object")
    return nil, errors, warnings
  end

  local scene_id = scene_data.id
  if not is_string(scene_id) then
    add_error(errors, file_path, nil, "id", "is required and must be non-empty string")
    scene_id = "invalid_scene"
  end

  if type(scene_data.size) ~= "table" or not is_number(scene_data.size.width) or not is_number(scene_data.size.height) then
    add_error(errors, file_path, nil, "size", "must contain numeric width and height")
  end

  if type(scene_data.objects) ~= "table" then
    add_error(errors, file_path, nil, "objects", "must be an array")
  end

  if #errors > 0 then
    return nil, errors, warnings
  end

  local normalized = {
    id = scene_id,
    name = is_string(scene_data.name) and scene_data.name or scene_id,
    version = is_string(scene_data.version) and scene_data.version or "1.0.0",
    lastModified = is_string(scene_data.lastModified) and scene_data.lastModified or os.date("!%Y-%m-%dT%H:%M:%SZ"),
    size = {
      width = scene_data.size.width,
      height = scene_data.size.height,
    },
    background = is_string(scene_data.background) and scene_data.background or nil,
    backgroundColor = is_string(scene_data.backgroundColor) and scene_data.backgroundColor or "#101018",
    grid = {
      enabled = type(scene_data.grid) == "table" and scene_data.grid.enabled ~= false,
      size = (type(scene_data.grid) == "table" and is_number(scene_data.grid.size) and scene_data.grid.size > 0) and scene_data.grid.size or 32,
      snap = type(scene_data.grid) == "table" and scene_data.grid.snap == true,
      color = (type(scene_data.grid) == "table" and is_string(scene_data.grid.color) and scene_data.grid.color) or "rgba(255,255,255,0.1)",
      opacity = (type(scene_data.grid) == "table" and is_number(scene_data.grid.opacity)) and math.max(0, math.min(1, scene_data.grid.opacity)) or 0.5,
    },
    camera = {
      defaultPosition = {
        x = (type(scene_data.camera) == "table" and type(scene_data.camera.defaultPosition) == "table" and is_number(scene_data.camera.defaultPosition.x)) and scene_data.camera.defaultPosition.x or 0,
        y = (type(scene_data.camera) == "table" and type(scene_data.camera.defaultPosition) == "table" and is_number(scene_data.camera.defaultPosition.y)) and scene_data.camera.defaultPosition.y or 0,
      },
      defaultZoom = (type(scene_data.camera) == "table" and is_number(scene_data.camera.defaultZoom)) and scene_data.camera.defaultZoom or 1,
      bounds = type(scene_data.camera) == "table" and type(scene_data.camera.bounds) == "table" and TableUtils.deep_copy(scene_data.camera.bounds) or nil,
    },
    layers = type(scene_data.layers) == "table" and TableUtils.deep_copy(scene_data.layers) or {},
    scripts = type(scene_data.scripts) == "table" and TableUtils.deep_copy(scene_data.scripts) or {},
    objects = {},
  }

  if normalized.background and not ensure_relative_path(normalized.background) then
    add_error(errors, file_path, nil, "background", "must be a safe relative path")
  end

  for script_index, script_path in ipairs(normalized.scripts) do
    if type(script_path) ~= "string" or not ensure_relative_path(script_path) then
      add_error(errors, file_path, nil, "scripts[" .. script_index .. "]", "must be safe relative path strings")
    end
  end

  local id_set = {}
  for index, raw_object in ipairs(scene_data.objects) do
    local object = normalize_object(raw_object, index, file_path, errors, warnings, id_set)
    if object then
      normalized.objects[#normalized.objects + 1] = object
    end
  end

  if #errors > 0 then
    return nil, errors, warnings
  end

  sort_objects_deterministically(normalized.objects)

  return normalized, errors, warnings
end

return SceneValidation
