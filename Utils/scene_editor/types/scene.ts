export type Vector2 = {
  x: number;
  y: number;
};

export type Vector2Size = {
  width: number;
  height: number;
};

export type GameObjectType = "prop" | "trigger" | "collider" | "spawn" | "light";

export type ColliderShape = "box" | "circle" | "polygon";

export type GameObject = {
  id: string;
  type: GameObjectType;
  name?: string;
  position: Vector2;
  size: Vector2Size;
  rotation: number;
  scale: Vector2;
  sprite?: string;
  color?: string;
  opacity: number;
  zIndex: number;
  collider?: {
    shape: ColliderShape;
    offset?: Vector2;
    isStatic: boolean;
    isTrigger: boolean;
  };
  trigger?: {
    event: "onEnter" | "onExit" | "onStay" | "onInteract";
    script?: string;
    action?: string;
    cooldown?: number;
    oneShot: boolean;
  };
  script?: string;
  scriptParams?: Record<string, unknown>;
  tags?: string[];
  locked?: boolean;
  visible?: boolean;
  editorVisible?: boolean;
};

export type Scene = {
  id: string;
  name?: string;
  size: Vector2Size;
  background?: string;
  backgroundColor?: string;
  grid: {
    enabled: boolean;
    size: number;
    snap: boolean;
    color: string;
    opacity: number;
  };
  camera: {
    defaultPosition: Vector2;
    defaultZoom: number;
    bounds?: { min: Vector2; max: Vector2 };
  };
  objects: GameObject[];
  layers?: string[];
  scripts?: string[];
  version: string;
  lastModified: string;
};

export type SceneItem = {
  id: string;
  name: string;
};

export type AssetItem = {
  id: string;
  path: string;
  fullPath: string;
  size: { width: number; height: number };
};

export type ScriptItem = {
  id: string;
  path: string;
  name: string;
};
