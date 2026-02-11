import type { AssetItem, GameObject, GameObjectType, Scene, SceneItem, ScriptItem, Vector2 } from "../types/scene";

type ToolType = "select" | "pan" | "place-prop" | "place-collider" | "place-trigger" | "place-spawn" | "place-text";
type HierarchyFilter = "all" | GameObjectType;

type DragState =
  | {
      mode: "move";
      start: Vector2;
      objectId: string;
      origin: Vector2;
    }
  | {
      mode: "pan";
      start: Vector2;
      originCamera: Vector2;
    };

type EditorState = {
  projectPath: string | null;
  contentPath: string | null;
  scenes: SceneItem[];
  currentSceneId: string | null;
  sceneData: Scene | null;
  assets: AssetItem[];
  scripts: ScriptItem[];
  activeAssetPath: string | null;
  activeScriptPath: string | null;
  selectedObjectId: string | null;
  activeTool: ToolType;
  camera: {
    position: Vector2;
    zoom: number;
  };
  drag: DragState | null;
  dirty: boolean;
  panOverride: boolean;
  pendingSelectId: string | null;
  pendingClearSelection: boolean;
  dragMoved: boolean;
  pointerWorld: Vector2 | null;
  hierarchySearch: string;
  hierarchyFilter: HierarchyFilter;
  ui: {
    leftSidebarVisible: boolean;
    rightSidebarVisible: boolean;
    focusMode: boolean;
    previousLeftSidebarVisible: boolean;
    previousRightSidebarVisible: boolean;
  };
};

const state: EditorState = {
  projectPath: null,
  contentPath: null,
  scenes: [],
  currentSceneId: null,
  sceneData: null,
  assets: [],
  scripts: [],
  activeAssetPath: null,
  activeScriptPath: null,
  selectedObjectId: null,
  activeTool: "select",
  camera: {
    position: { x: 0, y: 0 },
    zoom: 1
  },
  drag: null,
  dirty: false,
  panOverride: false,
  pendingSelectId: null,
  pendingClearSelection: false,
  dragMoved: false,
  pointerWorld: null,
  hierarchySearch: "",
  hierarchyFilter: "all",
  ui: {
    leftSidebarVisible: true,
    rightSidebarVisible: true,
    focusMode: false,
    previousLeftSidebarVisible: true,
    previousRightSidebarVisible: true
  }
};

const elements = {
  workspace: document.getElementById("workspace") as HTMLDivElement,
  leftSidebar: document.getElementById("leftSidebar") as HTMLDivElement,
  rightSidebar: document.getElementById("rightSidebar") as HTMLDivElement,
  canvasShell: document.querySelector(".canvas-shell") as HTMLDivElement,
  canvasToolbar: document.getElementById("canvasToolbar") as HTMLDivElement,
  canvasOverlay: document.getElementById("canvasOverlay") as HTMLDivElement,
  showLeftSidebarButton: document.getElementById("showLeftSidebarButton") as HTMLButtonElement,
  showRightSidebarButton: document.getElementById("showRightSidebarButton") as HTMLButtonElement,
  toggleLeftSidebarButton: document.getElementById("toggleLeftSidebarButton") as HTMLButtonElement,
  toggleRightSidebarButton: document.getElementById("toggleRightSidebarButton") as HTMLButtonElement,
  toggleFocusModeButton: document.getElementById("toggleFocusModeButton") as HTMLButtonElement,
  projectSelector: document.getElementById("projectSelector") as HTMLDivElement,
  projectPathInput: document.getElementById("projectPathInput") as HTMLInputElement,
  projectSelectButton: document.getElementById("projectSelectButton") as HTMLButtonElement,
  projectStatus: document.getElementById("projectStatus") as HTMLSpanElement,
  sceneSelect: document.getElementById("sceneSelect") as HTMLSelectElement,
  sceneName: document.getElementById("sceneName") as HTMLDivElement,
  saveButton: document.getElementById("saveButton") as HTMLButtonElement,
  newSceneButton: document.getElementById("newSceneButton") as HTMLButtonElement,
  newSceneModal: document.getElementById("newSceneModal") as HTMLDivElement,
  newSceneId: document.getElementById("newSceneId") as HTMLInputElement,
  newSceneName: document.getElementById("newSceneName") as HTMLInputElement,
  newSceneWidth: document.getElementById("newSceneWidth") as HTMLInputElement,
  newSceneHeight: document.getElementById("newSceneHeight") as HTMLInputElement,
  createSceneButton: document.getElementById("createSceneButton") as HTMLButtonElement,
  cancelNewSceneButton: document.getElementById("cancelNewSceneButton") as HTMLButtonElement,
  addObjectButton: document.getElementById("addObjectButton") as HTMLButtonElement,
  hierarchySearch: document.getElementById("hierarchySearch") as HTMLInputElement,
  hierarchyList: document.getElementById("hierarchyList") as HTMLDivElement,
  objectCountBadge: document.getElementById("objectCountBadge") as HTMLSpanElement,
  inspectorPanel: document.getElementById("inspectorPanel") as HTMLDivElement,
  assetList: document.getElementById("assetList") as HTMLDivElement,
  scriptList: document.getElementById("scriptList") as HTMLDivElement,
  activeToolBadge: document.getElementById("activeToolBadge") as HTMLDivElement,
  activeAssetBadge: document.getElementById("activeAssetBadge") as HTMLDivElement,
  snapStateBadge: document.getElementById("snapStateBadge") as HTMLDivElement,
  toggleGridButton: document.getElementById("toggleGridButton") as HTMLButtonElement,
  toggleSnapButton: document.getElementById("toggleSnapButton") as HTMLButtonElement,
  gridSizeInput: document.getElementById("gridSizeInput") as HTMLInputElement,
  zoomOutButton: document.getElementById("zoomOutButton") as HTMLButtonElement,
  zoomInButton: document.getElementById("zoomInButton") as HTMLButtonElement,
  focusSelectionButton: document.getElementById("focusSelectionButton") as HTMLButtonElement,
  fitSceneButton: document.getElementById("fitSceneButton") as HTMLButtonElement,
  projectPathLabel: document.getElementById("projectPathLabel") as HTMLSpanElement,
  canvas: document.getElementById("sceneCanvas") as HTMLCanvasElement,
  canvasContainer: document.querySelector(".canvas-container") as HTMLDivElement,
  coordinates: document.getElementById("coordinates") as HTMLSpanElement,
  zoomLevel: document.getElementById("zoomLevel") as HTMLSpanElement,
  status: document.getElementById("status") as HTMLSpanElement,
  statusBar: document.querySelector(".status-bar") as HTMLDivElement
};

const toolButtons = Array.from(document.querySelectorAll(".tool-button")) as HTMLButtonElement[];
const tabButtons = Array.from(document.querySelectorAll(".tab")) as HTMLButtonElement[];
const hierarchyFilterButtons = Array.from(document.querySelectorAll(".chip[data-filter]")) as HTMLButtonElement[];

const ctx = elements.canvas.getContext("2d");
if (!ctx) throw new Error("Canvas context unavailable");

const imageCache = new Map<string, HTMLImageElement>();
const assetLookup = new Map<string, AssetItem>();

const CANVAS = {
  minZoom: 0.2,
  maxZoom: 4,
  zoomStep: 0.1
};

function setStatus(message: string) {
  elements.status.textContent = message;
}

function markDirty(value = true) {
  state.dirty = value;
  if (state.dirty) {
    setStatus("Unsaved changes");
  }
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error ?? `Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function sanitizeId(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/_+/g, "_")
    .slice(0, 64);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getScene() {
  return state.sceneData;
}

function getPlacementTypeFromTool(tool: ToolType): GameObjectType | null {
  const typeMap: Record<ToolType, GameObjectType | null> = {
    "place-prop": "prop",
    "place-collider": "collider",
    "place-trigger": "trigger",
    "place-spawn": "spawn",
    "place-text": "text",
    select: null,
    pan: null
  };
  return typeMap[tool];
}

function setActiveTool(tool: ToolType) {
  state.activeTool = tool;
  toolButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tool === tool);
  });
  const labels: Record<ToolType, string> = {
    select: "Select",
    pan: "Pan",
    "place-prop": "Place Prop",
    "place-collider": "Place Collider",
    "place-trigger": "Place Trigger",
    "place-spawn": "Place Spawn",
    "place-text": "Place Text"
  };
  elements.activeToolBadge.textContent = labels[tool] ?? "Select";
  elements.canvas.style.cursor = tool === "pan" ? "grab" : "crosshair";
  renderScene();
}

function setActiveAsset(path: string | null) {
  state.activeAssetPath = path;
  const label = path ? path.split("/").pop() : "No asset selected";
  elements.activeAssetBadge.textContent = label ?? "No asset selected";
  updateAssetList();
}

function setActiveScript(path: string | null) {
  state.activeScriptPath = path;
  updateScriptList();
}

function updateSceneControls() {
  const scene = getScene();
  if (!scene) {
    elements.toggleGridButton.textContent = "Grid: Off";
    elements.toggleSnapButton.textContent = "Snap: Off";
    elements.snapStateBadge.textContent = "Snap: Off";
    elements.gridSizeInput.value = "32";
    return;
  }
  elements.toggleGridButton.textContent = scene.grid.enabled ? "Grid: On" : "Grid: Off";
  elements.toggleSnapButton.textContent = scene.grid.snap ? "Snap: On" : "Snap: Off";
  elements.snapStateBadge.textContent = scene.grid.snap ? "Snap: On" : "Snap: Off";
  elements.gridSizeInput.value = `${scene.grid.size}`;
}

function updateUiVisibility() {
  elements.workspace.classList.toggle("left-hidden", !state.ui.leftSidebarVisible);
  elements.workspace.classList.toggle("right-hidden", !state.ui.rightSidebarVisible);
  elements.canvasShell.classList.toggle("chrome-hidden", state.ui.focusMode);
  elements.statusBar.classList.toggle("chrome-hidden", state.ui.focusMode);

  elements.showLeftSidebarButton.classList.toggle("hidden", state.ui.leftSidebarVisible);
  elements.showRightSidebarButton.classList.toggle("hidden", state.ui.rightSidebarVisible);

  elements.toggleLeftSidebarButton.classList.toggle("is-active", state.ui.leftSidebarVisible);
  elements.toggleRightSidebarButton.classList.toggle("is-active", state.ui.rightSidebarVisible);
  elements.toggleFocusModeButton.classList.toggle("is-active", state.ui.focusMode);

  elements.toggleLeftSidebarButton.textContent = state.ui.leftSidebarVisible ? "Left" : "Left Off";
  elements.toggleRightSidebarButton.textContent = state.ui.rightSidebarVisible ? "Right" : "Right Off";
  elements.toggleFocusModeButton.textContent = state.ui.focusMode ? "Focus On" : "Focus";
}

function setLeftSidebarVisible(value: boolean) {
  if (value && state.ui.focusMode) {
    state.ui.focusMode = false;
  }
  state.ui.leftSidebarVisible = value;
  updateUiVisibility();
  resizeCanvas();
}

function setRightSidebarVisible(value: boolean) {
  if (value && state.ui.focusMode) {
    state.ui.focusMode = false;
  }
  state.ui.rightSidebarVisible = value;
  updateUiVisibility();
  resizeCanvas();
}

function toggleFocusMode() {
  if (!state.ui.focusMode) {
    state.ui.previousLeftSidebarVisible = state.ui.leftSidebarVisible;
    state.ui.previousRightSidebarVisible = state.ui.rightSidebarVisible;
    state.ui.leftSidebarVisible = false;
    state.ui.rightSidebarVisible = false;
    state.ui.focusMode = true;
  } else {
    state.ui.leftSidebarVisible = state.ui.previousLeftSidebarVisible;
    state.ui.rightSidebarVisible = state.ui.previousRightSidebarVisible;
    state.ui.focusMode = false;
  }
  updateUiVisibility();
  resizeCanvas();
}

function getImageUrl(relativePath: string) {
  return `/api/asset?path=${encodeURIComponent(relativePath)}`;
}

function loadImage(relativePath: string) {
  if (imageCache.has(relativePath)) return imageCache.get(relativePath) as HTMLImageElement;
  const image = new Image();
  image.src = getImageUrl(relativePath);
  imageCache.set(relativePath, image);
  image.onload = () => renderScene();
  return image;
}

function resizeCanvas() {
  const rect = elements.canvas.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;
  const dpr = devicePixelRatio || 1;
  elements.canvas.width = Math.floor(rect.width * dpr);
  elements.canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  renderScene();
}

function screenToWorld(point: Vector2) {
  return {
    x: point.x / state.camera.zoom + state.camera.position.x,
    y: point.y / state.camera.zoom + state.camera.position.y
  };
}

function getViewBounds() {
  const rect = elements.canvas.getBoundingClientRect();
  const left = state.camera.position.x;
  const top = state.camera.position.y;
  const right = left + rect.width / state.camera.zoom;
  const bottom = top + rect.height / state.camera.zoom;
  return { left, top, right, bottom };
}

function getSnappedWorldPosition(point: Vector2, scene: Scene) {
  if (!scene.grid.snap || !scene.grid.size) return point;
  return {
    x: snapPosition(point.x, scene.grid.size),
    y: snapPosition(point.y, scene.grid.size)
  };
}

function getToolColor(type: GameObjectType) {
  const colors: Record<GameObjectType, string> = {
    prop: "rgba(77, 177, 164, 0.9)",
    collider: "rgba(240, 181, 92, 0.9)",
    trigger: "rgba(203, 134, 99, 0.9)",
    spawn: "rgba(141, 191, 113, 0.9)",
    light: "rgba(240, 181, 92, 0.9)",
    text: "rgba(138, 175, 255, 0.92)"
  };
  return colors[type];
}

function getToolFillColor(type: GameObjectType) {
  const colors: Record<GameObjectType, string> = {
    prop: "rgba(77, 177, 164, 0.2)",
    collider: "rgba(240, 181, 92, 0.2)",
    trigger: "rgba(203, 134, 99, 0.2)",
    spawn: "rgba(141, 191, 113, 0.2)",
    light: "rgba(240, 181, 92, 0.2)",
    text: "rgba(138, 175, 255, 0.2)"
  };
  return colors[type];
}

function drawGrid(scene: Scene) {
  if (!scene.grid.enabled || scene.grid.size < 4) return;
  const { left, top, right, bottom } = getViewBounds();
  const gridSize = scene.grid.size;
  const majorStep = gridSize * 4;
  ctx.save();
  ctx.lineWidth = 1 / state.camera.zoom;

  const startX = Math.floor(left / gridSize) * gridSize;
  const startY = Math.floor(top / gridSize) * gridSize;

  ctx.strokeStyle = scene.grid.color;
  ctx.globalAlpha = clamp(scene.grid.opacity * 0.55, 0, 1);
  for (let x = startX; x <= right; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  }
  for (let y = startY; y <= bottom; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(233, 241, 255, 0.2)";
  ctx.globalAlpha = clamp(scene.grid.opacity * 0.75, 0, 1);
  const majorStartX = Math.floor(left / majorStep) * majorStep;
  const majorStartY = Math.floor(top / majorStep) * majorStep;
  for (let x = majorStartX; x <= right; x += majorStep) {
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
  }
  for (let y = majorStartY; y <= bottom; y += majorStep) {
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(136, 164, 198, 0.35)";
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1.5 / state.camera.zoom;
  ctx.beginPath();
  ctx.moveTo(0, top);
  ctx.lineTo(0, bottom);
  ctx.moveTo(left, 0);
  ctx.lineTo(right, 0);
  ctx.stroke();

  ctx.restore();
}

function drawSceneBounds(scene: Scene) {
  ctx.save();
  ctx.strokeStyle = "rgba(236, 242, 255, 0.42)";
  ctx.lineWidth = 2 / state.camera.zoom;
  ctx.strokeRect(0, 0, scene.size.width, scene.size.height);
  ctx.fillStyle = "rgba(245, 160, 95, 0.08)";
  ctx.fillRect(0, 0, scene.size.width, scene.size.height);
  ctx.restore();
}

function drawWrappedText(text: string, maxWidth: number, lineHeight: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  if (!words.length) {
    lines.push("");
  } else {
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }

  const totalHeight = Math.max(lineHeight, lines.length * lineHeight);
  const startY = -totalHeight / 2 + lineHeight / 2;
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], 0, startY + i * lineHeight, maxWidth);
  }
}

function drawPlacementPreview(scene: Scene) {
  const placementType = getPlacementTypeFromTool(state.activeTool);
  if (!placementType || !state.pointerWorld) return;
  const previewPosition = getSnappedWorldPosition(state.pointerWorld, scene);
  let width = 64;
  let height = 64;
  if (placementType === "text") {
    width = 320;
    height = 96;
  }
  if (placementType === "prop" && state.activeAssetPath) {
    const asset = assetLookup.get(state.activeAssetPath);
    if (asset?.size?.width && asset?.size?.height) {
      width = asset.size.width;
      height = asset.size.height;
    }
  }
  const halfW = width / 2;
  const halfH = height / 2;

  ctx.save();
  ctx.translate(previewPosition.x, previewPosition.y);
  ctx.fillStyle = getToolFillColor(placementType);
  ctx.strokeStyle = getToolColor(placementType);
  ctx.lineWidth = 2 / state.camera.zoom;
  ctx.setLineDash([8 / state.camera.zoom, 6 / state.camera.zoom]);
  ctx.fillRect(-halfW, -halfH, width, height);
  ctx.strokeRect(-halfW, -halfH, width, height);
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(-10 / state.camera.zoom, 0);
  ctx.lineTo(10 / state.camera.zoom, 0);
  ctx.moveTo(0, -10 / state.camera.zoom);
  ctx.lineTo(0, 10 / state.camera.zoom);
  ctx.stroke();
  ctx.restore();
}

function renderScene() {
  const scene = getScene();
  const rect = elements.canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);

  if (!scene) return;

  const dpr = devicePixelRatio || 1;
  ctx.setTransform(
    state.camera.zoom * dpr,
    0,
    0,
    state.camera.zoom * dpr,
    -state.camera.position.x * state.camera.zoom * dpr,
    -state.camera.position.y * state.camera.zoom * dpr
  );

  ctx.fillStyle = scene.backgroundColor ?? "#10120e";
  ctx.fillRect(0, 0, scene.size.width, scene.size.height);

  if (scene.background) {
    const image = loadImage(scene.background);
    if (image.complete && image.naturalWidth) {
      ctx.drawImage(image, 0, 0, scene.size.width, scene.size.height);
    }
  }

  drawSceneBounds(scene);
  drawGrid(scene);

  const objects = [...scene.objects].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  for (const obj of objects) {
    if (obj.editorVisible === false) continue;
    ctx.save();
    ctx.translate(obj.position.x, obj.position.y);
    ctx.rotate(((obj.rotation ?? 0) * Math.PI) / 180);
    ctx.globalAlpha = obj.opacity ?? 1;

    const scaleX = obj.scale?.x ?? 1;
    const scaleY = obj.scale?.y ?? 1;
    const drawW = obj.size.width * scaleX;
    const drawH = obj.size.height * scaleY;
    const halfW = drawW / 2;
    const halfH = drawH / 2;

    if (obj.type === "text") {
      const textSettings = obj.text ?? { content: "Text" };
      const fontSize = Math.max(8, textSettings.fontSize ?? 36);
      const fontFamily = textSettings.fontFamily ?? "Spline Sans, sans-serif";
      const fontWeight = 600;
      const lineHeight = Math.max(10, textSettings.lineHeight ?? Math.round(fontSize * 1.2));
      const align = textSettings.align ?? "center";
      const content = (textSettings.content ?? "").trim() || obj.name?.trim() || "Text";

      ctx.textBaseline = "middle";
      ctx.textAlign = align;
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = obj.color ?? "#e8ecff";

      const textX = align === "left" ? -halfW : align === "right" ? halfW : 0;
      ctx.translate(textX, 0);
      drawWrappedText(content, Math.max(32, drawW), lineHeight);
      ctx.translate(-textX, 0);
    } else if (obj.sprite) {
      const image = loadImage(obj.sprite);
      if (image.complete && image.naturalWidth) {
        ctx.drawImage(image, -halfW, -halfH, drawW, drawH);
      } else {
        ctx.fillStyle = obj.color ?? "#4d9d8e";
        ctx.fillRect(-halfW, -halfH, drawW, drawH);
      }
    } else {
      ctx.fillStyle = obj.color ?? "#4d9d8e";
      ctx.fillRect(-halfW, -halfH, drawW, drawH);
    }

    if (obj.type === "trigger") {
      ctx.strokeStyle = "rgba(195, 116, 79, 0.8)";
      ctx.lineWidth = 2 / state.camera.zoom;
      ctx.strokeRect(-halfW, -halfH, drawW, drawH);
    }

    if (obj.id === state.selectedObjectId) {
      ctx.strokeStyle = "rgba(77, 177, 164, 0.95)";
      ctx.lineWidth = 2 / state.camera.zoom;
      ctx.strokeRect(-halfW, -halfH, drawW, drawH);
      ctx.strokeStyle = "rgba(240, 181, 92, 0.9)";
      ctx.lineWidth = 1.5 / state.camera.zoom;
      ctx.beginPath();
      ctx.moveTo(-halfW, 0);
      ctx.lineTo(halfW, 0);
      ctx.moveTo(0, -halfH);
      ctx.lineTo(0, halfH);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawPlacementPreview(scene);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

async function loadProject() {
  const project = await fetchJSON<{ path: string | null; valid: boolean; contentPath: string | null }>(
    "/api/project"
  );
  if (!project.valid) {
    elements.projectSelector.classList.add("is-visible");
    setStatus("Select a project to begin");
    return;
  }
  state.projectPath = project.path;
  state.contentPath = project.contentPath;
  elements.projectPathLabel.textContent = project.path ?? "No project loaded";
  elements.projectSelector.classList.remove("is-visible");
  await loadAssets();
  await loadScripts();
  await loadScenes();
}

async function selectProject() {
  const pathValue = elements.projectPathInput.value.trim();
  if (!pathValue) return;
  elements.projectStatus.textContent = "Validating project...";
  try {
    const response = await fetchJSON<{ ok: boolean; contentPath: string }>("/api/project/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathValue })
    });

    if (response.ok) {
      state.projectPath = pathValue;
      state.contentPath = response.contentPath;
      elements.projectPathLabel.textContent = pathValue;
      elements.projectSelector.classList.remove("is-visible");
      setStatus("Project loaded");
      await loadAssets();
      await loadScripts();
      await loadScenes();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Project validation failed";
    elements.projectStatus.textContent = message;
    setStatus("Project validation failed");
  }
}

async function loadAssets() {
  const result = await fetchJSON<{ images: AssetItem[] }>("/api/assets");
  state.assets = result.images;
  assetLookup.clear();
  for (const asset of state.assets) {
    assetLookup.set(asset.path, asset);
  }
  updateAssetList();
}

async function loadScripts() {
  const result = await fetchJSON<{ scripts: ScriptItem[] }>("/api/scripts");
  state.scripts = result.scripts;
  updateScriptList();
}

async function loadScenes() {
  const result = await fetchJSON<{ items: SceneItem[] }>("/api/scenes");
  state.scenes = result.items;
  elements.sceneSelect.innerHTML = "";

  if (!state.scenes.length) {
    const option = document.createElement("option");
    option.textContent = "No scenes";
    option.value = "";
    elements.sceneSelect.appendChild(option);
    state.currentSceneId = null;
    state.sceneData = null;
    elements.sceneName.textContent = "No scene loaded";
    state.pointerWorld = null;
    renderScene();
    updateHierarchy();
    updateInspector();
    updateSceneControls();
    return;
  }

  for (const scene of state.scenes) {
    const option = document.createElement("option");
    option.value = scene.id;
    option.textContent = scene.name;
    elements.sceneSelect.appendChild(option);
  }

  const defaultScene = state.currentSceneId ?? state.scenes[0].id;
  await loadScene(defaultScene);
}

async function loadScene(sceneId: string) {
  setStatus("Loading scene...");
  const result = await fetchJSON<{ id: string; data: Scene }>(`/api/scene/${sceneId}`);
  state.currentSceneId = result.id;
  state.sceneData = result.data;
  state.selectedObjectId = null;
  state.pointerWorld = null;
  state.camera.position = result.data.camera?.defaultPosition ?? { x: 0, y: 0 };
  state.camera.zoom = result.data.camera?.defaultZoom ?? 1;
  elements.sceneSelect.value = sceneId;
  elements.sceneName.textContent = result.data.name ?? result.id;
  updateZoomLabel();
  updateSceneControls();
  updateHierarchy();
  updateInspector();
  renderScene();
  setStatus("Scene loaded");
  markDirty(false);
}

async function saveScene() {
  if (!state.currentSceneId || !state.sceneData) return;
  setStatus("Saving scene...");
  const payload = { ...state.sceneData, lastModified: new Date().toISOString() };
  const result = await fetchJSON<{ ok: boolean; validation: { errors: string[]; warnings: string[] } }>(
    `/api/scene/${state.currentSceneId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  );
  if (result.validation.warnings.length) {
    setStatus(`Saved with warnings (${result.validation.warnings.length})`);
  } else {
    setStatus("Scene saved");
  }
  markDirty(false);
}

function openNewSceneModal() {
  elements.newSceneModal.classList.add("is-visible");
  elements.newSceneId.value = "";
  elements.newSceneName.value = "";
}

function closeNewSceneModal() {
  elements.newSceneModal.classList.remove("is-visible");
}

function createEmptyScene(id: string, name: string, width: number, height: number): Scene {
  return {
    id,
    name,
    size: { width, height },
    backgroundColor: "#111512",
    grid: {
      enabled: true,
      size: 32,
      snap: true,
      color: "rgba(245, 241, 230, 0.08)",
      opacity: 1
    },
    camera: {
      defaultPosition: { x: 0, y: 0 },
      defaultZoom: 1
    },
    objects: [],
    layers: ["Background", "Props", "Text", "Triggers", "Spawns"],
    scripts: [],
    version: "1.0.0",
    lastModified: new Date().toISOString()
  };
}

async function createScene() {
  const rawId = elements.newSceneId.value.trim();
  const id = sanitizeId(rawId);
  const name = elements.newSceneName.value.trim() || id;
  const width = Number(elements.newSceneWidth.value) || 3200;
  const height = Number(elements.newSceneHeight.value) || 1800;
  if (!id) {
    setStatus("Scene id is required");
    return;
  }
  const scene = createEmptyScene(id, name, width, height);
  try {
    await fetchJSON(`/api/scene/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scene)
    });
    closeNewSceneModal();
    await loadScenes();
    await loadScene(id);
    setStatus("Scene created");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Scene creation failed";
    setStatus(message);
  }
}

function updateZoomLabel() {
  elements.zoomLevel.textContent = `${Math.round(state.camera.zoom * 100)}%`;
}

function updateObjectCountBadge(count: number) {
  const label = count === 1 ? "1 object" : `${count} objects`;
  elements.objectCountBadge.textContent = label;
}

function getHierarchyObjects(scene: Scene) {
  const query = state.hierarchySearch.trim().toLowerCase();
  return [...scene.objects]
    .filter((obj) => (state.hierarchyFilter === "all" ? true : obj.type === state.hierarchyFilter))
    .filter((obj) => {
      if (!query) return true;
      const haystack = `${obj.id} ${obj.name ?? ""} ${obj.type}`.toLowerCase();
      return haystack.includes(query);
    })
    .sort((a, b) => {
      const az = a.zIndex ?? 0;
      const bz = b.zIndex ?? 0;
      if (az !== bz) return bz - az;
      return (a.name ?? a.id).localeCompare(b.name ?? b.id);
    });
}

function setHierarchyFilter(filter: HierarchyFilter) {
  state.hierarchyFilter = filter;
  hierarchyFilterButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === filter);
  });
  updateHierarchy();
}

function updateHierarchy() {
  const scene = getScene();
  if (!scene) {
    elements.hierarchyList.textContent = "No scene loaded.";
    updateObjectCountBadge(0);
    return;
  }
  updateObjectCountBadge(scene.objects.length);
  if (!scene.objects.length) {
    elements.hierarchyList.textContent = "No objects yet.";
    return;
  }

  const filtered = getHierarchyObjects(scene);
  if (!filtered.length) {
    elements.hierarchyList.textContent = "No objects match the filter.";
    return;
  }

  elements.hierarchyList.innerHTML = "";
  for (const obj of filtered) {
    const item = document.createElement("button");
    item.className = "list-item";
    if (obj.id === state.selectedObjectId) item.classList.add("is-active");
    item.dataset.id = obj.id;
    const body = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = obj.name?.trim() || obj.id;
    const subtitle = document.createElement("small");
    subtitle.textContent = obj.id;
    body.appendChild(title);
    body.appendChild(subtitle);
    const type = document.createElement("span");
    type.textContent = obj.type;
    item.appendChild(body);
    item.appendChild(type);
    item.addEventListener("click", () => selectObject(obj.id));
    elements.hierarchyList.appendChild(item);
  }
}

function updateAssetList() {
  elements.assetList.innerHTML = "";
  if (!state.assets.length) {
    elements.assetList.textContent = "No images found.";
    return;
  }
  for (const asset of state.assets) {
    const card = document.createElement("button");
    card.className = "asset-card";
    if (asset.path === state.activeAssetPath) card.classList.add("is-active");
    card.dataset.path = asset.path;
    const img = document.createElement("img");
    img.src = getImageUrl(asset.path);
    img.alt = asset.id;
    const name = document.createElement("span");
    name.textContent = asset.id;
    card.appendChild(img);
    card.appendChild(name);
    card.addEventListener("click", () => {
      setActiveAsset(asset.path);
      setActiveTool("place-prop");
    });
    elements.assetList.appendChild(card);
  }
}

function updateScriptList() {
  elements.scriptList.innerHTML = "";
  if (!state.scripts.length) {
    elements.scriptList.textContent = "No scripts found.";
    return;
  }
  for (const script of state.scripts) {
    const item = document.createElement("button");
    item.className = "script-item";
    if (script.path === state.activeScriptPath) item.classList.add("is-active");
    item.textContent = script.path;
    item.addEventListener("click", () => setActiveScript(script.path));
    elements.scriptList.appendChild(item);
  }
}

function selectObject(id: string | null) {
  state.selectedObjectId = id;
  updateHierarchy();
  updateInspector();
  renderScene();
}

function getSelectedObject() {
  const scene = getScene();
  if (!scene || !state.selectedObjectId) return null;
  return scene.objects.find((obj) => obj.id === state.selectedObjectId) ?? null;
}

function setObjectValue(obj: GameObject, path: string, value: unknown) {
  const parts = path.split(".");
  let target: any = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!target[key]) target[key] = {};
    target = target[key];
  }
  target[parts[parts.length - 1]] = value;
}

function applyInputValue(input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, obj: GameObject) {
  const field = input.dataset.field;
  if (!field) return;
  if (input instanceof HTMLInputElement && input.type === "checkbox") {
    setObjectValue(obj, field, input.checked);
  } else if (field === "tags") {
    setObjectValue(obj, field, parseTags(input.value));
  } else if (input instanceof HTMLInputElement && input.type === "number") {
    let value = Number(input.value);
    if (field === "text.fontSize") value = clamp(Math.round(value), 8, 256);
    if (field === "text.lineHeight") value = clamp(Math.round(value), 8, 512);
    if (!Number.isNaN(value)) setObjectValue(obj, field, value);
  } else if (input instanceof HTMLTextAreaElement && field === "scriptParams") {
    try {
      const parsed = input.value ? JSON.parse(input.value) : {};
      setObjectValue(obj, field, parsed);
      setStatus("Script params updated");
    } catch {
      setStatus("Invalid JSON in script params");
    }
  } else {
    setObjectValue(obj, field, input.value);
  }
  if (field === "type") {
    if (obj.type === "trigger" && !obj.trigger) {
      obj.trigger = { event: "onEnter", oneShot: false, cooldown: 0 };
    }
    if (obj.type === "collider" && !obj.collider) {
      obj.collider = { shape: "box", offset: { x: 0, y: 0 }, isStatic: true, isTrigger: false };
    }
    if (obj.type === "text" && !obj.text) {
      obj.text = {
        content: obj.name?.trim() || "Text",
        fontFamily: "Spline Sans, sans-serif",
        fontSize: 36,
        align: "center",
        lineHeight: 44
      };
      if (!obj.color) obj.color = "#e8ecff";
      obj.sprite = undefined;
    }
    updateInspector();
  }
  markDirty();
  updateHierarchy();
  renderScene();
}

function setSceneValue(scene: Scene, path: string, value: unknown) {
  const cleanPath = path.replace(/^scene\./, "");
  const parts = cleanPath.split(".");
  let target: any = scene;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!target[key]) target[key] = {};
    target = target[key];
  }
  target[parts[parts.length - 1]] = value;
}

function applySceneInputValue(input: HTMLInputElement | HTMLSelectElement, scene: Scene) {
  const field = input.dataset.field;
  if (!field) return;
  if (input instanceof HTMLInputElement && input.type === "checkbox") {
    setSceneValue(scene, field, input.checked);
  } else if (input instanceof HTMLInputElement && input.type === "number") {
    let value = Number(input.value);
    if (field === "scene.grid.size") {
      value = clamp(Math.round(value), 4, 256);
      input.value = `${value}`;
    }
    if (field === "scene.grid.opacity") {
      value = clamp(value, 0, 1);
      input.value = `${value}`;
    }
    if (!Number.isNaN(value)) setSceneValue(scene, field, value);
  } else {
    setSceneValue(scene, field, input.value);
  }
  if (field === "scene.name") {
    elements.sceneName.textContent = input.value || scene.id;
    const option = elements.sceneSelect.querySelector(`option[value="${scene.id}"]`);
    if (option) option.textContent = input.value || scene.id;
  }
  updateSceneControls();
  markDirty();
  renderScene();
}

function updateSceneInspector(scene: Scene) {
  elements.inspectorPanel.classList.remove("muted");
  elements.inspectorPanel.innerHTML = `
    <div class="inspector-section">
      <h3>Scene</h3>
      <div class="field">
        <label>Name</label>
        <input type="text" data-field="scene.name" value="${scene.name ?? scene.id}" />
      </div>
      <div class="field-row">
        <div class="field">
          <label>Width</label>
          <input type="number" data-field="scene.size.width" value="${scene.size.width}" />
        </div>
        <div class="field">
          <label>Height</label>
          <input type="number" data-field="scene.size.height" value="${scene.size.height}" />
        </div>
      </div>
      <div class="field">
        <label>Background Image</label>
        <input type="text" data-field="scene.background" value="${scene.background ?? ""}" />
      </div>
      <div class="field">
        <label>Background Color</label>
        <input type="color" data-field="scene.backgroundColor" value="${scene.backgroundColor ?? "#111512"}" />
      </div>
    </div>
    <div class="inspector-section">
      <h3>Grid</h3>
      <label class="field">
        <span>Enabled</span>
        <input type="checkbox" data-field="scene.grid.enabled" ${scene.grid.enabled ? "checked" : ""} />
      </label>
      <label class="field">
        <span>Snap</span>
        <input type="checkbox" data-field="scene.grid.snap" ${scene.grid.snap ? "checked" : ""} />
      </label>
      <div class="field-row">
        <div class="field">
          <label>Size</label>
          <input type="number" data-field="scene.grid.size" value="${scene.grid.size}" />
        </div>
        <div class="field">
          <label>Opacity</label>
          <input type="number" step="0.05" min="0" max="1" data-field="scene.grid.opacity" value="${scene.grid.opacity}" />
        </div>
      </div>
    </div>
    <div class="inspector-section">
      <h3>Camera</h3>
      <div class="field-row">
        <div class="field">
          <label>Default X</label>
          <input type="number" data-field="scene.camera.defaultPosition.x" value="${scene.camera.defaultPosition?.x ?? 0}" />
        </div>
        <div class="field">
          <label>Default Y</label>
          <input type="number" data-field="scene.camera.defaultPosition.y" value="${scene.camera.defaultPosition?.y ?? 0}" />
        </div>
      </div>
      <div class="field">
        <label>Default Zoom</label>
        <input type="number" step="0.05" data-field="scene.camera.defaultZoom" value="${scene.camera.defaultZoom ?? 1}" />
      </div>
    </div>
  `;

  const inputs = elements.inspectorPanel.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-field]");
  inputs.forEach((input) => {
    input.addEventListener("input", () => applySceneInputValue(input, scene));
    input.addEventListener("change", () => applySceneInputValue(input, scene));
  });
}

function updateInspector() {
  const obj = getSelectedObject();
  if (!obj) {
    const scene = getScene();
    if (scene) {
      updateSceneInspector(scene);
      return;
    }
    elements.inspectorPanel.classList.add("muted");
    elements.inspectorPanel.textContent = "Select an object to edit.";
    return;
  }

  elements.inspectorPanel.classList.remove("muted");
  const textSettings = obj.text ?? {
    content: "",
    fontFamily: "Spline Sans, sans-serif",
    fontSize: 36,
    align: "center" as const,
    lineHeight: 44
  };
  const textContentEscaped = escapeHtml(textSettings.content ?? "");
  const textFontEscaped = escapeHtml(textSettings.fontFamily ?? "Spline Sans, sans-serif");

  elements.inspectorPanel.innerHTML = `
    <div class="inspector-section">
      <h3>Identity</h3>
      <div class="field">
        <label>ID</label>
        <input type="text" data-field="id" value="${obj.id}" disabled />
      </div>
      <div class="field">
        <label>Name</label>
        <input type="text" data-field="name" value="${obj.name ?? ""}" />
      </div>
      <div class="field">
        <label>Type</label>
        <select data-field="type">
          ${["prop", "collider", "trigger", "spawn", "light", "text"].map((type) => `
            <option value="${type}" ${obj.type === type ? "selected" : ""}>${type}</option>
          `).join("")}
        </select>
      </div>
      <div class="field">
        <label>Tags</label>
        <input type="text" data-field="tags" value="${(obj.tags ?? []).join(", ")}" />
      </div>
    </div>
    <div class="inspector-section">
      <h3>Transform</h3>
      <div class="field-row">
        <div class="field">
          <label>X</label>
          <input type="number" data-field="position.x" value="${obj.position.x}" />
        </div>
        <div class="field">
          <label>Y</label>
          <input type="number" data-field="position.y" value="${obj.position.y}" />
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Width</label>
          <input type="number" data-field="size.width" value="${obj.size.width}" />
        </div>
        <div class="field">
          <label>Height</label>
          <input type="number" data-field="size.height" value="${obj.size.height}" />
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Rotation</label>
          <input type="number" data-field="rotation" value="${obj.rotation ?? 0}" />
        </div>
        <div class="field">
          <label>Z-Index</label>
          <input type="number" data-field="zIndex" value="${obj.zIndex ?? 0}" />
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Scale X</label>
          <input type="number" data-field="scale.x" value="${obj.scale?.x ?? 1}" />
        </div>
        <div class="field">
          <label>Scale Y</label>
          <input type="number" data-field="scale.y" value="${obj.scale?.y ?? 1}" />
        </div>
      </div>
    </div>
    <div class="inspector-section">
      <h3>Visual</h3>
      ${obj.type !== "text" ? `
      <div class="field">
        <label>Sprite</label>
        <input type="text" data-field="sprite" value="${obj.sprite ?? ""}" />
      </div>
      <div class="field-row">
        <button data-action="use-asset" class="ghost">Use Active Asset</button>
        <button data-action="clear-sprite" class="ghost">Clear</button>
      </div>
      ` : ""}
      <div class="field-row">
        <div class="field">
          <label>Color</label>
          <input type="color" data-field="color" value="${obj.color ?? "#e8ecff"}" />
        </div>
        <div class="field">
          <label>Opacity</label>
          <input type="number" data-field="opacity" min="0" max="1" step="0.05" value="${obj.opacity ?? 1}" />
        </div>
      </div>
    </div>
    ${obj.type === "text" ? `
    <div class="inspector-section">
      <h3>Text</h3>
      <div class="field">
        <label>Content</label>
        <textarea data-field="text.content">${textContentEscaped}</textarea>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Font Size</label>
          <input type="number" min="8" max="256" data-field="text.fontSize" value="${textSettings.fontSize ?? 36}" />
        </div>
        <div class="field">
          <label>Line Height</label>
          <input type="number" min="8" max="512" data-field="text.lineHeight" value="${textSettings.lineHeight ?? 44}" />
        </div>
      </div>
      <div class="field">
        <label>Font Family</label>
        <input type="text" data-field="text.fontFamily" value="${textFontEscaped}" />
      </div>
      <div class="field">
        <label>Alignment</label>
        <select data-field="text.align">
          ${["left", "center", "right"].map((align) => `
            <option value="${align}" ${textSettings.align === align ? "selected" : ""}>${align}</option>
          `).join("")}
        </select>
      </div>
    </div>
    ` : ""}
    <div class="inspector-section">
      <h3>Collider</h3>
      <label class="field">
        <span>Enabled</span>
        <input type="checkbox" data-action="toggle-collider" ${obj.collider ? "checked" : ""} />
      </label>
      ${obj.collider ? `
      <div class="field">
        <label>Shape</label>
        <select data-field="collider.shape">
          ${["box", "circle", "polygon"].map((shape) => `
            <option value="${shape}" ${obj.collider?.shape === shape ? "selected" : ""}>${shape}</option>
          `).join("")}
        </select>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Offset X</label>
          <input type="number" data-field="collider.offset.x" value="${obj.collider?.offset?.x ?? 0}" />
        </div>
        <div class="field">
          <label>Offset Y</label>
          <input type="number" data-field="collider.offset.y" value="${obj.collider?.offset?.y ?? 0}" />
        </div>
      </div>
      <div class="field-row">
        <label class="field">
          <span>Static</span>
          <input type="checkbox" data-field="collider.isStatic" ${obj.collider?.isStatic ? "checked" : ""} />
        </label>
        <label class="field">
          <span>Trigger</span>
          <input type="checkbox" data-field="collider.isTrigger" ${obj.collider?.isTrigger ? "checked" : ""} />
        </label>
      </div>
      ` : ""}
    </div>
    <div class="inspector-section">
      <h3>Trigger</h3>
      <label class="field">
        <span>Enabled</span>
        <input type="checkbox" data-action="toggle-trigger" ${obj.trigger ? "checked" : ""} />
      </label>
      ${obj.trigger ? `
      <div class="field">
        <label>Event</label>
        <select data-field="trigger.event">
          ${["onEnter", "onExit", "onStay", "onInteract"].map((eventType) => `
            <option value="${eventType}" ${obj.trigger?.event === eventType ? "selected" : ""}>${eventType}</option>
          `).join("")}
        </select>
      </div>
      <div class="field">
        <label>Trigger Script</label>
        <input type="text" data-field="trigger.script" value="${obj.trigger?.script ?? ""}" />
      </div>
      <div class="field-row">
        <button data-action="use-trigger-script" class="ghost">Use Active Script</button>
        <button data-action="clear-trigger-script" class="ghost">Clear</button>
      </div>
      <div class="field">
        <label>Action</label>
        <input type="text" data-field="trigger.action" value="${obj.trigger?.action ?? ""}" />
      </div>
      <div class="field-row">
        <div class="field">
          <label>Cooldown</label>
          <input type="number" data-field="trigger.cooldown" value="${obj.trigger?.cooldown ?? 0}" />
        </div>
        <label class="field">
          <span>One Shot</span>
          <input type="checkbox" data-field="trigger.oneShot" ${obj.trigger?.oneShot ? "checked" : ""} />
        </label>
      </div>
      ` : ""}
    </div>
    <div class="inspector-section">
      <h3>Script</h3>
      <div class="field">
        <label>Script</label>
        <input type="text" data-field="script" value="${obj.script ?? ""}" />
      </div>
      <div class="field-row">
        <button data-action="use-script" class="ghost">Use Active Script</button>
        <button data-action="clear-script" class="ghost">Clear</button>
      </div>
      <div class="field">
        <label>Params (JSON)</label>
        <textarea data-field="scriptParams">${obj.scriptParams ? JSON.stringify(obj.scriptParams, null, 2) : ""}</textarea>
      </div>
    </div>
    <div class="inspector-section">
      <h3>Visibility</h3>
      <label class="field">
        <span>Visible in Game</span>
        <input type="checkbox" data-field="visible" ${obj.visible !== false ? "checked" : ""} />
      </label>
      <label class="field">
        <span>Visible in Editor</span>
        <input type="checkbox" data-field="editorVisible" ${obj.editorVisible !== false ? "checked" : ""} />
      </label>
      <label class="field">
        <span>Locked</span>
        <input type="checkbox" data-field="locked" ${obj.locked ? "checked" : ""} />
      </label>
      <button data-action="delete-object" class="ghost">Delete Object</button>
    </div>
  `;

  const inputs = elements.inspectorPanel.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    "[data-field]"
  );
  inputs.forEach((input) => {
    input.addEventListener("input", () => applyInputValue(input, obj));
    input.addEventListener("change", () => applyInputValue(input, obj));
  });

  const actionElements = elements.inspectorPanel.querySelectorAll<HTMLElement>("[data-action]");
  actionElements.forEach((element) => {
    if (element instanceof HTMLInputElement) {
      element.addEventListener("change", () => handleInspectorAction(element.dataset.action ?? "", obj));
      return;
    }
    element.addEventListener("click", (event) => {
      event.preventDefault();
      handleInspectorAction(element.dataset.action ?? "", obj);
    });
  });
}

function handleInspectorAction(action: string, obj: GameObject) {
  if (action === "use-asset") {
    if (state.activeAssetPath) {
      obj.sprite = state.activeAssetPath;
      const asset = assetLookup.get(state.activeAssetPath);
      if (asset?.size?.width && asset?.size?.height) {
        obj.size.width = asset.size.width;
        obj.size.height = asset.size.height;
      }
      markDirty();
      updateInspector();
      renderScene();
    }
  }
  if (action === "clear-sprite") {
    obj.sprite = undefined;
    markDirty();
    updateInspector();
    renderScene();
  }
  if (action === "use-script") {
    if (state.activeScriptPath) {
      obj.script = state.activeScriptPath;
      markDirty();
      updateInspector();
    }
  }
  if (action === "clear-script") {
    obj.script = undefined;
    markDirty();
    updateInspector();
  }
  if (action === "use-trigger-script") {
    if (state.activeScriptPath) {
      obj.trigger = obj.trigger ?? { event: "onEnter", oneShot: false };
      obj.trigger.script = state.activeScriptPath;
      markDirty();
      updateInspector();
    }
  }
  if (action === "clear-trigger-script" && obj.trigger) {
    obj.trigger.script = undefined;
    markDirty();
    updateInspector();
  }
  if (action === "toggle-collider") {
    if (obj.collider) {
      obj.collider = undefined;
    } else {
      obj.collider = { shape: "box", offset: { x: 0, y: 0 }, isStatic: true, isTrigger: false };
    }
    markDirty();
    updateInspector();
  }
  if (action === "toggle-trigger") {
    if (obj.trigger) {
      obj.trigger = undefined;
    } else {
      obj.trigger = { event: "onEnter", oneShot: false, cooldown: 0 };
    }
    markDirty();
    updateInspector();
  }
  if (action === "delete-object") {
    const scene = getScene();
    if (!scene) return;
    scene.objects = scene.objects.filter((item) => item.id !== obj.id);
    selectObject(null);
    markDirty();
    updateHierarchy();
    renderScene();
  }
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function createObjectId(type: GameObjectType) {
  const scene = getScene();
  if (!scene) return `${type}_1`;
  let index = scene.objects.length + 1;
  let id = `${type}_${index}`;
  const ids = new Set(scene.objects.map((obj) => obj.id));
  while (ids.has(id)) {
    index += 1;
    id = `${type}_${index}`;
  }
  return id;
}

function createObject(type: GameObjectType, position: Vector2): GameObject {
  const base: GameObject = {
    id: createObjectId(type),
    type,
    name: type.charAt(0).toUpperCase() + type.slice(1),
    position,
    size: { width: 64, height: 64 },
    rotation: 0,
    scale: { x: 1, y: 1 },
    opacity: 1,
    zIndex: 0,
    color: "#4d9d8e",
    tags: [],
    visible: true,
    editorVisible: true,
    locked: false
  };

  if (type === "trigger") {
    base.color = "#c3744f";
    base.opacity = 0.4;
    base.trigger = { event: "onEnter", oneShot: false, cooldown: 0 };
  }
  if (type === "collider") {
    base.color = "#d8a14a";
    base.collider = { shape: "box", offset: { x: 0, y: 0 }, isStatic: true, isTrigger: false };
  }
  if (type === "spawn") {
    base.color = "#7ea05d";
  }
  if (type === "text") {
    base.color = "#e8ecff";
    base.size = { width: 320, height: 96 };
    base.text = {
      content: "Text",
      fontFamily: "Spline Sans, sans-serif",
      fontSize: 36,
      align: "center",
      lineHeight: 44
    };
  }

  if (state.activeAssetPath && type === "prop") {
    base.sprite = state.activeAssetPath;
    const asset = assetLookup.get(state.activeAssetPath);
    if (asset?.size?.width && asset?.size?.height) {
      base.size.width = asset.size.width;
      base.size.height = asset.size.height;
    }
  }
  return base;
}

function addObjectAt(position: Vector2, type: GameObjectType) {
  const scene = getScene();
  if (!scene) return;
  const obj = createObject(type, position);
  const maxZ = scene.objects.reduce((max, item) => Math.max(max, item.zIndex ?? 0), 0);
  obj.zIndex = maxZ + 1;
  scene.objects.push(obj);
  selectObject(obj.id);
  markDirty();
  updateHierarchy();
  renderScene();
}

function snapPosition(value: number, gridSize: number) {
  return Math.round(value / gridSize) * gridSize;
}

function getObjectAt(world: Vector2) {
  const scene = getScene();
  if (!scene) return null;
  const objects = [...scene.objects].sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0));
  for (const obj of objects) {
    if (obj.editorVisible === false) continue;
    const scaleX = obj.scale?.x ?? 1;
    const scaleY = obj.scale?.y ?? 1;
    const halfW = (obj.size.width * scaleX) / 2;
    const halfH = (obj.size.height * scaleY) / 2;
    if (
      world.x >= obj.position.x - halfW &&
      world.x <= obj.position.x + halfW &&
      world.y >= obj.position.y - halfH &&
      world.y <= obj.position.y + halfH
    ) {
      return obj;
    }
  }
  return null;
}

function getCanvasScreenPoint(event: MouseEvent | WheelEvent) {
  const rect = elements.canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function zoomCamera(delta: number, screenPoint?: Vector2) {
  const rect = elements.canvas.getBoundingClientRect();
  const point = screenPoint ?? { x: rect.width / 2, y: rect.height / 2 };
  const before = screenToWorld(point);
  state.camera.zoom = clamp(state.camera.zoom + delta, CANVAS.minZoom, CANVAS.maxZoom);
  const after = screenToWorld(point);
  state.camera.position.x += before.x - after.x;
  state.camera.position.y += before.y - after.y;
  updateZoomLabel();
  renderScene();
}

function fitSceneToViewport() {
  const scene = getScene();
  if (!scene) return;
  const rect = elements.canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const padding = 80;
  const zoomX = (rect.width - padding) / scene.size.width;
  const zoomY = (rect.height - padding) / scene.size.height;
  state.camera.zoom = clamp(Math.min(zoomX, zoomY), CANVAS.minZoom, CANVAS.maxZoom);
  state.camera.position.x = scene.size.width / 2 - rect.width / (2 * state.camera.zoom);
  state.camera.position.y = scene.size.height / 2 - rect.height / (2 * state.camera.zoom);
  updateZoomLabel();
  renderScene();
}

function focusSelection() {
  const scene = getScene();
  const selected = getSelectedObject();
  if (!scene || !selected) {
    setStatus("Select an object to focus");
    return;
  }
  const rect = elements.canvas.getBoundingClientRect();
  state.camera.position.x = selected.position.x - rect.width / (2 * state.camera.zoom);
  state.camera.position.y = selected.position.y - rect.height / (2 * state.camera.zoom);
  renderScene();
}

function setGridSize(value: number) {
  const scene = getScene();
  if (!scene) return;
  const next = clamp(Math.round(value), 4, 256);
  scene.grid.size = next;
  markDirty();
  updateSceneControls();
  if (!state.selectedObjectId) updateInspector();
  renderScene();
}

function toggleGrid() {
  const scene = getScene();
  if (!scene) return;
  scene.grid.enabled = !scene.grid.enabled;
  markDirty();
  updateSceneControls();
  if (!state.selectedObjectId) updateInspector();
  renderScene();
}

function toggleSnap() {
  const scene = getScene();
  if (!scene) return;
  scene.grid.snap = !scene.grid.snap;
  markDirty();
  updateSceneControls();
  if (!state.selectedObjectId) updateInspector();
  renderScene();
}

function handleCanvasMouseDown(event: MouseEvent) {
  const screen = getCanvasScreenPoint(event);
  const world = screenToWorld(screen);

  const isPanButton = event.button === 1 || event.button === 2;
  if (state.panOverride || isPanButton) {
    elements.canvas.style.cursor = "grabbing";
    state.drag = {
      mode: "pan",
      start: screen,
      originCamera: { ...state.camera.position }
    };
    state.pendingSelectId = null;
    state.pendingClearSelection = false;
    state.dragMoved = false;
    return;
  }

  if (event.button !== 0) return;

  const hit = getObjectAt(world);
  const placementType = getPlacementTypeFromTool(state.activeTool);

  if (placementType && !event.altKey) {
    const scene = getScene();
    if (!scene) return;
    const snapped = getSnappedWorldPosition(world, scene);
    addObjectAt(snapped, placementType);
    if (!event.shiftKey) setActiveTool("select");
    return;
  }
  if (hit) {
    state.pendingSelectId = hit.id;
    state.pendingClearSelection = false;
    state.dragMoved = false;
    if (!hit.locked) {
      state.drag = {
        mode: "move",
        start: screen,
        objectId: hit.id,
        origin: { ...hit.position }
      };
    }
  } else {
    state.pendingSelectId = null;
    state.pendingClearSelection = true;
    state.dragMoved = false;
  }
}

function handleCanvasMouseMove(event: MouseEvent) {
  const screen = getCanvasScreenPoint(event);
  const world = screenToWorld(screen);
  state.pointerWorld = world;
  const scene = getScene();
  const placementType = getPlacementTypeFromTool(state.activeTool);
  if (scene && placementType && scene.grid.snap) {
    const snapped = getSnappedWorldPosition(world, scene);
    elements.coordinates.textContent = `X: ${Math.round(snapped.x)}, Y: ${Math.round(snapped.y)} (snap)`;
  } else {
    elements.coordinates.textContent = `X: ${Math.round(world.x)}, Y: ${Math.round(world.y)}`;
  }
  if (!state.drag) {
    renderScene();
  }

  if (!state.drag) return;

  if (state.drag.mode === "pan") {
    const dx = (screen.x - state.drag.start.x) / state.camera.zoom;
    const dy = (screen.y - state.drag.start.y) / state.camera.zoom;
    state.camera.position.x = state.drag.originCamera.x - dx;
    state.camera.position.y = state.drag.originCamera.y - dy;
    renderScene();
    return;
  }

  if (state.drag.mode === "move") {
    const scene = getScene();
    if (!scene) return;
    const obj = scene.objects.find((item) => item.id === state.drag?.objectId);
    if (!obj) return;
    const distance = Math.hypot(screen.x - state.drag.start.x, screen.y - state.drag.start.y);
    if (distance > 3) state.dragMoved = true;
    const dx = (screen.x - state.drag.start.x) / state.camera.zoom;
    const dy = (screen.y - state.drag.start.y) / state.camera.zoom;
    let nextX = state.drag.origin.x + dx;
    let nextY = state.drag.origin.y + dy;
    if (scene.grid.snap) {
      nextX = snapPosition(nextX, scene.grid.size);
      nextY = snapPosition(nextY, scene.grid.size);
    }
    obj.position.x = nextX;
    obj.position.y = nextY;
    markDirty();
    if (state.selectedObjectId === obj.id) {
      updateInspector();
    }
    renderScene();
  }
}

function handleCanvasMouseUp() {
  const pendingId = state.pendingSelectId;
  const shouldClear = state.pendingClearSelection;
  const moved = state.dragMoved;
  state.drag = null;
  state.pendingSelectId = null;
  state.pendingClearSelection = false;
  state.dragMoved = false;
  if (pendingId && !moved) {
    selectObject(pendingId);
  } else if (shouldClear && !moved) {
    selectObject(null);
  }
  elements.canvas.style.cursor = state.activeTool === "pan" ? "grab" : "crosshair";
}

function handleCanvasWheel(event: WheelEvent) {
  event.preventDefault();
  const delta = event.deltaY > 0 ? -CANVAS.zoomStep : CANVAS.zoomStep;
  zoomCamera(delta, getCanvasScreenPoint(event));
}

function handleCanvasMouseLeave() {
  state.pointerWorld = null;
  handleCanvasMouseUp();
  renderScene();
}

function addObjectFromButton() {
  const scene = getScene();
  if (!scene) return;
  const { left, top, right, bottom } = getViewBounds();
  const center = {
    x: (left + right) / 2,
    y: (top + bottom) / 2
  };
  addObjectAt(getSnappedWorldPosition(center, scene), "prop");
}

function handleTabs(tab: string) {
  tabButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.tab === tab));
  elements.assetList.classList.toggle("hidden", tab !== "images");
  elements.scriptList.classList.toggle("hidden", tab !== "scripts");
}

function handleShortcuts(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  if (event.code === "Space") {
    event.preventDefault();
    state.panOverride = true;
    elements.canvas.style.cursor = "grab";
  }
  if (event.key.toLowerCase() === "v") setActiveTool("select");
  if (event.key.toLowerCase() === "m") setActiveTool("pan");
  if (event.key === "1") setActiveTool("place-prop");
  if (event.key === "2") setActiveTool("place-collider");
  if (event.key === "3") setActiveTool("place-trigger");
  if (event.key === "4") setActiveTool("place-spawn");
  if (event.key === "5") setActiveTool("place-text");
  if ((event.key === "+" || event.key === "=") && !event.metaKey && !event.ctrlKey) {
    event.preventDefault();
    zoomCamera(CANVAS.zoomStep);
  }
  if ((event.key === "-" || event.key === "_") && !event.metaKey && !event.ctrlKey) {
    event.preventDefault();
    zoomCamera(-CANVAS.zoomStep);
  }
  if (event.key === "[") setLeftSidebarVisible(!state.ui.leftSidebarVisible);
  if (event.key === "]") setRightSidebarVisible(!state.ui.rightSidebarVisible);
  if (event.key === "\\") toggleFocusMode();
  if (event.key.toLowerCase() === "f") focusSelection();
  if (event.key.toLowerCase() === "g") toggleGrid();
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    void saveScene();
  }
}

function handleKeyUp(event: KeyboardEvent) {
  if (event.code === "Space") {
    state.panOverride = false;
    elements.canvas.style.cursor = state.activeTool === "pan" ? "grab" : "crosshair";
  }
}

elements.projectSelectButton.addEventListener("click", () => void selectProject());
elements.sceneSelect.addEventListener("change", (event) => {
  const target = event.target as HTMLSelectElement;
  if (target.value) void loadScene(target.value);
});
elements.saveButton.addEventListener("click", () => void saveScene());
elements.newSceneButton.addEventListener("click", openNewSceneModal);
elements.cancelNewSceneButton.addEventListener("click", closeNewSceneModal);
elements.createSceneButton.addEventListener("click", () => void createScene());
elements.addObjectButton.addEventListener("click", addObjectFromButton);
elements.toggleLeftSidebarButton.addEventListener("click", () => setLeftSidebarVisible(!state.ui.leftSidebarVisible));
elements.toggleRightSidebarButton.addEventListener("click", () => setRightSidebarVisible(!state.ui.rightSidebarVisible));
elements.toggleFocusModeButton.addEventListener("click", toggleFocusMode);
elements.showLeftSidebarButton.addEventListener("click", () => setLeftSidebarVisible(true));
elements.showRightSidebarButton.addEventListener("click", () => setRightSidebarVisible(true));
elements.toggleGridButton.addEventListener("click", toggleGrid);
elements.toggleSnapButton.addEventListener("click", toggleSnap);
elements.zoomOutButton.addEventListener("click", () => zoomCamera(-CANVAS.zoomStep));
elements.zoomInButton.addEventListener("click", () => zoomCamera(CANVAS.zoomStep));
elements.focusSelectionButton.addEventListener("click", focusSelection);
elements.fitSceneButton.addEventListener("click", fitSceneToViewport);
elements.gridSizeInput.addEventListener("change", () => {
  setGridSize(Number(elements.gridSizeInput.value));
});
elements.hierarchySearch.addEventListener("input", () => {
  state.hierarchySearch = elements.hierarchySearch.value;
  updateHierarchy();
});

hierarchyFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = (button.dataset.filter ?? "all") as HierarchyFilter;
    setHierarchyFilter(filter);
  });
});

toolButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tool = button.dataset.tool as ToolType;
    if (tool) setActiveTool(tool);
  });
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const tab = button.dataset.tab ?? "images";
    handleTabs(tab);
  });
});

elements.canvas.addEventListener("mousedown", handleCanvasMouseDown);
elements.canvas.addEventListener("mousemove", handleCanvasMouseMove);
elements.canvas.addEventListener("mouseup", handleCanvasMouseUp);
elements.canvas.addEventListener("mouseleave", handleCanvasMouseLeave);
elements.canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });

window.addEventListener("keydown", handleShortcuts);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("resize", resizeCanvas);
if ("ResizeObserver" in window && elements.canvasContainer) {
  const observer = new ResizeObserver(() => resizeCanvas());
  observer.observe(elements.canvasContainer);
}
elements.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
resizeCanvas();
handleTabs("images");
setHierarchyFilter("all");
updateSceneControls();
updateUiVisibility();
void loadProject();
