local Game = require("engine.core.Game")
local Camera = require("engine.core.Camera")
local EventBus = require("engine.core.EventBus")
local ObjectManager = require("engine.core.ObjectManager")
local SceneManager = require("engine.core.SceneManager")

local AssetManager = require("engine.managers.AssetManager")
local ScriptManager = require("engine.managers.ScriptManager")
local StateManager = require("engine.managers.StateManager")
local DialogueManager = require("engine.managers.DialogueManager")

local PhysicsSystem = require("engine.systems.PhysicsSystem")
local TriggerSystem = require("engine.systems.TriggerSystem")
local RenderSystem = require("engine.systems.RenderSystem")
local DialogueSystem = require("engine.systems.DialogueSystem")

local GameObject = require("engine.entities.GameObject")

local Transform = require("engine.components.Transform")
local Sprite = require("engine.components.Sprite")
local Collider = require("engine.components.Collider")
local Trigger = require("engine.components.Trigger")
local Script = require("engine.components.Script")
local Text = require("engine.components.Text")
local Component = require("engine.components.Component")

local Logger = require("engine.utils.Logger")
local FileSystem = require("engine.utils.FileSystem")
local Path = require("engine.utils.Path")
local Color = require("engine.utils.Color")
local TableUtils = require("engine.utils.TableUtils")
local SceneValidation = require("engine.utils.SceneValidation")

local json = require("engine.libs.json")

return {
    Game = Game,
    
    Camera = Camera,
    EventBus = EventBus,
    ObjectManager = ObjectManager,
    SceneManager = SceneManager,
    
    AssetManager = AssetManager,
    ScriptManager = ScriptManager,
    StateManager = StateManager,
    DialogueManager = DialogueManager,
    
    PhysicsSystem = PhysicsSystem,
    TriggerSystem = TriggerSystem,
    RenderSystem = RenderSystem,
    DialogueSystem = DialogueSystem,
    
    GameObject = GameObject,
    
    Transform = Transform,
    Sprite = Sprite,
    Collider = Collider,
    Trigger = Trigger,
    Script = Script,
    Text = Text,
    Component = Component,
    
    Logger = Logger,
    FileSystem = FileSystem,
    Path = Path,
    Color = Color,
    TableUtils = TableUtils,
    SceneValidation = SceneValidation,
    
    json = json,
}
