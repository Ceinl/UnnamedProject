import type { AssetItem, GameObject, GameObjectType, Scene, SceneItem, ScriptItem, Vector2 } from "../types/scene";

type ToolType = "select" | "pan" | "place-prop" | "place-collider" | "place-trigger" | "place-spawn";

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
  dirty: false
};

const elements = {
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
  hierarchyList: document.getElementById("hierarchyList") as HTMLDivElement,
  inspectorPanel: document.getElementById("inspectorPanel") as HTMLDivElement,
  assetList: document.getElementById("assetList") as HTMLDivElement,
  scriptList: document.getElementById("scriptList") as HTMLDivElement,
  activeToolBadge: document.getElementById("activeToolBadge") as HTMLDivElement,
  activeAssetBadge: document.getElementById("activeAssetBadge") as HTMLDivElement,
  projectPathLabel: document.getElementById("projectPathLabel") as HTMLSpanElement,
  canvas: document.getElementById("sceneCanvas") as HTMLCanvasElement,
  coordinates: document.getElementById("coordinates") as HTMLSpanElement,
  zoomLevel: document.getElementById("zoomLevel") as HTMLSpanElement,
  status: document.getElementById("status") as HTMLSpanElement
};

const toolButtons = Array.from(document.querySelectorAll(".tool-button")) as HTMLButtonElement[];
const tabButtons = Array.from(document.querySelectorAll(".tab")) as HTMLButtonElement[];

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getScene() {
  return state.sceneData;
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
    "place-spawn": "Place Spawn"
  };
  elements.activeToolBadge.textContent = labels[tool] ?? "Select";
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

function drawGrid(scene: Scene) {
  if (!scene.grid.enabled) return;
  const { left, top, right, bottom } = getViewBounds();
  const gridSize = scene.grid.size;
  ctx.save();
  ctx.strokeStyle = scene.grid.color;
  ctx.globalAlpha = scene.grid.opacity;
  ctx.lineWidth = 1 / state.camera.zoom;

  const startX = Math.floor(left / gridSize) * gridSize;
  const startY = Math.floor(top / gridSize) * gridSize;

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

    if (obj.sprite) {
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
      ctx.strokeStyle = "rgba(77, 157, 142, 0.9)";
      ctx.lineWidth = 2 / state.camera.zoom;
      ctx.strokeRect(-halfW, -halfH, drawW, drawH);
    }

    ctx.restore();
  }

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
    renderScene();
    updateHierarchy();
    updateInspector();
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
  state.camera.position = result.data.camera?.defaultPosition ?? { x: 0, y: 0 };
  state.camera.zoom = result.data.camera?.defaultZoom ?? 1;
  elements.sceneSelect.value = sceneId;
  elements.sceneName.textContent = result.data.name ?? result.id;
  updateZoomLabel();
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
    layers: ["Background", "Props", "Triggers", "Spawns"],
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

function updateHierarchy() {
  const scene = getScene();
  if (!scene) {
    elements.hierarchyList.textContent = "No scene loaded.";
    return;
  }
  if (!scene.objects.length) {
    elements.hierarchyList.textContent = "No objects yet.";
    return;
  }

  elements.hierarchyList.innerHTML = "";
  const sorted = [...scene.objects].sort((a, b) => a.name?.localeCompare(b.name ?? "") ?? 0);
  for (const obj of sorted) {
    const item = document.createElement("button");
    item.className = "list-item";
    if (obj.id === state.selectedObjectId) item.classList.add("is-active");
    item.dataset.id = obj.id;
    item.innerHTML = `${obj.name ?? obj.id} <span>${obj.type}</span>`;
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
    const value = Number(input.value);
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
    const value = Number(input.value);
    if (!Number.isNaN(value)) setSceneValue(scene, field, value);
  } else {
    setSceneValue(scene, field, input.value);
  }
  if (field === "scene.name") {
    elements.sceneName.textContent = input.value || scene.id;
    const option = elements.sceneSelect.querySelector(`option[value="${scene.id}"]`);
    if (option) option.textContent = input.value || scene.id;
  }
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
          ${["prop", "collider", "trigger", "spawn", "light"].map((type) => `
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
      <div class="field">
        <label>Sprite</label>
        <input type="text" data-field="sprite" value="${obj.sprite ?? ""}" />
      </div>
      <div class="field-row">
        <button data-action="use-asset" class="ghost">Use Active Asset</button>
        <button data-action="clear-sprite" class="ghost">Clear</button>
      </div>
      <div class="field-row">
        <div class="field">
          <label>Color</label>
          <input type="color" data-field="color" value="${obj.color ?? "#4d9d8e"}" />
        </div>
        <div class="field">
          <label>Opacity</label>
          <input type="number" data-field="opacity" min="0" max="1" step="0.05" value="${obj.opacity ?? 1}" />
        </div>
      </div>
    </div>
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

function handleCanvasMouseDown(event: MouseEvent) {
  const rect = elements.canvas.getBoundingClientRect();
  const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  const world = screenToWorld(screen);

  if (state.activeTool.startsWith("place")) {
    const typeMap: Record<ToolType, GameObjectType> = {
      "place-prop": "prop",
      "place-collider": "collider",
      "place-trigger": "trigger",
      "place-spawn": "spawn",
      select: "prop",
      pan: "prop"
    };
    const scene = getScene();
    if (!scene) return;
    const snapped = scene.grid.snap
      ? { x: snapPosition(world.x, scene.grid.size), y: snapPosition(world.y, scene.grid.size) }
      : world;
    addObjectAt(snapped, typeMap[state.activeTool]);
    return;
  }

  if (state.activeTool === "pan") {
    state.drag = {
      mode: "pan",
      start: screen,
      originCamera: { ...state.camera.position }
    };
    return;
  }

  const hit = getObjectAt(world);
  if (hit) {
    selectObject(hit.id);
    if (!hit.locked) {
      state.drag = {
        mode: "move",
        start: screen,
        objectId: hit.id,
        origin: { ...hit.position }
      };
    }
  } else {
    selectObject(null);
  }
}

function handleCanvasMouseMove(event: MouseEvent) {
  const rect = elements.canvas.getBoundingClientRect();
  const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  const world = screenToWorld(screen);
  elements.coordinates.textContent = `X: ${Math.round(world.x)}, Y: ${Math.round(world.y)}`;

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
    updateInspector();
    renderScene();
  }
}

function handleCanvasMouseUp() {
  state.drag = null;
}

function handleCanvasWheel(event: WheelEvent) {
  event.preventDefault();
  const rect = elements.canvas.getBoundingClientRect();
  const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  const before = screenToWorld(screen);
  const delta = event.deltaY > 0 ? -CANVAS.zoomStep : CANVAS.zoomStep;
  state.camera.zoom = clamp(state.camera.zoom + delta, CANVAS.minZoom, CANVAS.maxZoom);
  const after = screenToWorld(screen);
  state.camera.position.x += before.x - after.x;
  state.camera.position.y += before.y - after.y;
  updateZoomLabel();
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
  addObjectAt(center, "prop");
}

function handleTabs(tab: string) {
  tabButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.tab === tab));
  elements.assetList.classList.toggle("hidden", tab !== "images");
  elements.scriptList.classList.toggle("hidden", tab !== "scripts");
}

function handleShortcuts(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  if (event.key.toLowerCase() === "v") setActiveTool("select");
  if (event.key.toLowerCase() === "m") setActiveTool("pan");
  if (event.key === "1") setActiveTool("place-prop");
  if (event.key === "2") setActiveTool("place-collider");
  if (event.key === "3") setActiveTool("place-trigger");
  if (event.key === "4") setActiveTool("place-spawn");
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    void saveScene();
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
elements.canvas.addEventListener("mouseleave", handleCanvasMouseUp);
elements.canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });

window.addEventListener("keydown", handleShortcuts);
window.addEventListener("resize", resizeCanvas);
resizeCanvas();
handleTabs("images");
void loadProject();
