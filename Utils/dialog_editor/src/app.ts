type Dict<T> = Record<string, T>;

type GraphEdgeType = "next" | "choice";

type GraphEdge = {
  from: string;
  to: string;
  type: GraphEdgeType;
};

type DialogueChoice = {
  label?: string;
  say?: string;
  next?: string;
  chatMarker?: string;
  hidden?: boolean;
  lockedLabel?: string;
  requires?: RequirementSet;
  effects?: Effect[];
};

type DialogueChoiceGroup = {
  time?: string;
  choices?: DialogueChoice[];
};

type DialogueNode = {
  text?: string;
  textBy?: Dict<string>;
  action?: string;
  next?: string;
  end?: boolean;
  chat?: boolean;
  chatMarker?: string;
  chatInstant?: boolean;
  choices?: DialogueChoice[];
  choicesBy?: DialogueChoiceGroup[];
  requires?: RequirementSet;
  effects?: Effect[];
  display?: Dict<unknown>;
};

type DialogueInteraction = {
  key?: string;
  label?: string;
  hotkey?: string;
  entry?: string;
  action?: string;
  lockedLabel?: string;
  resume?: boolean;
  hidden?: boolean;
  entryByTime?: Dict<string>;
  requires?: RequirementSet;
};

type RequirementSet = Dict<unknown>;
type Effect = Dict<unknown>;

type DialogueGraph = {
  start?: string;
  chatStart?: string;
  nodes: Dict<DialogueNode>;
  interactions?: DialogueInteraction[];
  display?: Dict<unknown>;
};

type DialogueItem = { id: string };

type GraphPoint = { x: number; y: number };

type LinkDrag = {
  fromId: string;
};

type State = {
  dialogues: DialogueItem[];
  currentId: string | null;
  data: DialogueGraph | null;
  nodeOrder: string[];
  currentNodeId: string | null;
  dirty: boolean;
  graphPositions: Dict<GraphPoint>;
  linkDrag: LinkDrag | null;
  mouseGraph: GraphPoint;
  camera: { x: number; y: number; zoom: number };
  focusMode: boolean;
};

const GRAPH = {
  nodeW: 200,
  nodeH: 84,
  gapX: 240,
  gapY: 140,
  pad: 56
};

const state: State = {
  dialogues: [],
  currentId: null,
  data: null,
  nodeOrder: [],
  currentNodeId: null,
  dirty: false,
  graphPositions: {},
  linkDrag: null,
  mouseGraph: { x: 0, y: 0 },
  camera: { x: 0, y: 0, zoom: 1 },
  focusMode: false
};

const dom = {
  dialogueList: document.getElementById("dialogueList") as HTMLDivElement,
  nodeList: document.getElementById("nodeList") as HTMLDivElement,
  graphView: document.getElementById("graphView") as HTMLDivElement,
  graphEdges: document.getElementById("graphEdges") as SVGSVGElement,
  graphNodes: document.getElementById("graphNodes") as HTMLDivElement,
  dialogsPanel: document.getElementById("dialogsPanel") as HTMLDivElement,
  graphSettingsPanel: document.getElementById("graphSettingsPanel") as HTMLDivElement,
  inspectorPanel: document.getElementById("inspectorPanel") as HTMLDivElement,
  inspector: document.getElementById("inspector") as HTMLDivElement,
  graphSettings: document.getElementById("graphSettings") as HTMLDivElement,
  statusText: document.getElementById("statusText") as HTMLDivElement,
  overlay: document.getElementById("overlay") as HTMLDivElement,
  dock: document.getElementById("dock") as HTMLDivElement,
  graphCanvas: document.querySelector(".graph-canvas") as HTMLDivElement,
  newDialogue: document.getElementById("newDialogue") as HTMLButtonElement,
  saveDialogue: document.getElementById("saveDialogue") as HTMLButtonElement,
  zoomIn: document.getElementById("zoomIn") as HTMLButtonElement,
  zoomOut: document.getElementById("zoomOut") as HTMLButtonElement,
  zoomReset: document.getElementById("zoomReset") as HTMLButtonElement
};

const panelButtons = Array.from(dom.dock.querySelectorAll<HTMLButtonElement>("[data-panel]"));
const closeButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-close]"));
const panels = [dom.dialogsPanel, dom.graphSettingsPanel, dom.inspectorPanel];

const jsonHeaders = { "Content-Type": "application/json" };

function setStatus(text: string) {
  dom.statusText.textContent = text;
}

function markDirty(isDirty = true) {
  state.dirty = isDirty;
  renderStatus();
}

function renderStatus() {
  const id = state.currentId ?? "None";
  const dirty = state.dirty ? "Dirty" : "Saved";
  dom.statusText.textContent = `${id} · ${dirty}`;
}

function toGraphPoint(clientX: number, clientY: number): GraphPoint {
  const rect = dom.graphCanvas.getBoundingClientRect();
  const x = (clientX - rect.left - state.camera.x) / state.camera.zoom;
  const y = (clientY - rect.top - state.camera.y) / state.camera.zoom;
  return { x, y };
}

function updateGraphTransform() {
  dom.graphView.style.transform = `translate(${state.camera.x}px, ${state.camera.y}px) scale(${state.camera.zoom})`;
  updateZoomLabel();
}

function updateZoomLabel() {
  dom.zoomReset.textContent = `${Math.round(state.camera.zoom * 100)}%`;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

async function loadDialogues() {
  setStatus("Loading...");
  try {
    const data = await fetchJson<{ items: DialogueItem[] }>("/api/dialogues");
    state.dialogues = data.items ?? [];
    renderDialogueList();
    renderStatus();
  } catch (err) {
    setStatus("Failed to load dialogues");
    console.error(err);
  }
}

async function loadDialogue(id: string) {
  setStatus("Loading...");
  try {
    const data = await fetchJson<{ id: string; data: DialogueGraph }>(`/api/dialogue/${id}`);
    state.currentId = data.id;
    state.data = data.data;
    state.nodeOrder = Object.keys(state.data.nodes ?? {});
    state.currentNodeId = state.nodeOrder[0] ?? null;
    loadPositions();
    autoLayout();
    markDirty(false);
    renderAll();
  } catch (err) {
    setStatus("Failed to load dialogue");
    console.error(err);
  }
}

async function createDialogue(id: string) {
  const base: DialogueGraph = {
    start: "start",
    nodes: {
      start: { text: "" }
    },
    interactions: [{ key: "talk", label: "Talk", entry: "start" }],
    display: { theme: "default" }
  };
  await saveDialogue(id, base);
  await loadDialogues();
  await loadDialogue(id);
}

async function saveDialogue(id?: string, data?: DialogueGraph) {
  if (!id) id = state.currentId ?? undefined;
  if (!id) return;
  const payload = data ?? state.data;
  if (!payload) return;

  setStatus("Saving...");
  try {
    const res = await fetchJson<{ ok: boolean; validation: { errors: string[]; warnings: string[] } }>(
      `/api/dialogue/${id}`,
      {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify(payload)
      }
    );
    if (res.validation?.errors?.length) {
      setStatus(`Errors: ${res.validation.errors.length}`);
    } else if (res.validation?.warnings?.length) {
      setStatus(`Warnings: ${res.validation.warnings.length}`);
    } else {
      setStatus("Saved");
    }
    markDirty(false);
  } catch (err) {
    setStatus("Save failed");
    console.error(err);
  }
}

function renderDialogueList() {
  dom.dialogueList.innerHTML = "";
  state.dialogues.forEach((item) => {
    const btn = document.createElement("button");
    btn.textContent = item.id;
    if (item.id === state.currentId) btn.classList.add("active");
    btn.addEventListener("click", () => loadDialogue(item.id));
    dom.dialogueList.appendChild(btn);
  });
}

function renderNodeList() {
  dom.nodeList.innerHTML = "";
  state.nodeOrder.forEach((id) => {
    const btn = document.createElement("button");
    btn.textContent = id;
    if (id === state.currentNodeId) btn.classList.add("active");
    btn.addEventListener("click", () => {
      state.currentNodeId = id;
      renderInspector();
      renderGraph();
    });
    dom.nodeList.appendChild(btn);
  });
}

function renderGraph() {
  if (!state.data) return;
  dom.graphNodes.innerHTML = "";
  const edges: GraphEdge[] = [];

  Object.entries(state.data.nodes).forEach(([id, node]) => {
    if (node.next) edges.push({ from: id, to: node.next, type: "next" });
    node.choices?.forEach((choice) => {
      if (choice.next) edges.push({ from: id, to: choice.next, type: "choice" });
    });
  });

  Object.entries(state.data.nodes).forEach(([id, node]) => {
    const pos = state.graphPositions[id] ?? { x: 0, y: 0 };
    const el = document.createElement("div");
    el.className = "node";
    if (id === state.currentNodeId) el.classList.add("selected");
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;

    const title = document.createElement("h4");
    title.textContent = id;
    const text = document.createElement("div");
    text.className = "node-text";
    text.textContent = node.text || "(empty)";
    el.appendChild(title);
    el.appendChild(text);

    const handle = document.createElement("div");
    handle.className = "handle";
    handle.addEventListener("mousedown", (event) => {
      event.stopPropagation();
      state.linkDrag = { fromId: id };
    });
    el.appendChild(handle);

    el.addEventListener("mousedown", (event) => {
      if ((event.target as HTMLElement).classList.contains("handle")) return;
      event.stopPropagation();
      state.currentNodeId = id;
      renderInspector();
      renderNodeList();
      const start = toGraphPoint(event.clientX, event.clientY);
      const startPos = { ...pos };
      const onMove = (moveEvent: MouseEvent) => {
        const cur = toGraphPoint(moveEvent.clientX, moveEvent.clientY);
        const dx = cur.x - start.x;
        const dy = cur.y - start.y;
        state.graphPositions[id] = { x: startPos.x + dx, y: startPos.y + dy };
        renderGraph();
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        savePositions();
        markDirty();
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });

    el.addEventListener("click", (event) => {
      event.stopPropagation();
      state.currentNodeId = id;
      renderInspector();
      renderNodeList();
      renderGraph();
    });

    dom.graphNodes.appendChild(el);
  });

  renderEdges(edges);
}

function renderEdges(edges: GraphEdge[]) {
  const canvasW = dom.graphCanvas.clientWidth;
  const canvasH = dom.graphCanvas.clientHeight;
  const positions = Object.values(state.graphPositions);
  const maxX = positions.length ? Math.max(...positions.map((p) => p.x)) + GRAPH.nodeW + GRAPH.pad : canvasW;
  const maxY = positions.length ? Math.max(...positions.map((p) => p.y)) + GRAPH.nodeH + GRAPH.pad : canvasH;
  const width = Math.max(canvasW, maxX);
  const height = Math.max(canvasH, maxY);
  dom.graphEdges.setAttribute("width", `${width}`);
  dom.graphEdges.setAttribute("height", `${height}`);
  dom.graphEdges.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const paths: string[] = [];
  edges.forEach((edge) => {
    const fromPos = state.graphPositions[edge.from];
    const toPos = state.graphPositions[edge.to];
    if (!fromPos || !toPos) return;
    const x1 = fromPos.x + GRAPH.nodeW;
    const y1 = fromPos.y + GRAPH.nodeH / 2;
    const x2 = toPos.x;
    const y2 = toPos.y + GRAPH.nodeH / 2;
    const c1x = x1 + 80;
    const c2x = x2 - 80;
    const d = `M ${x1} ${y1} C ${c1x} ${y1} ${c2x} ${y2} ${x2} ${y2}`;
    const color = edge.type === "next" ? "var(--accent)" : "var(--accent-2)";
    const width = edge.type === "next" ? 3 : 2;
    paths.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" />`);
  });

  if (state.linkDrag) {
    const fromPos = state.graphPositions[state.linkDrag.fromId];
    if (fromPos) {
      const x1 = fromPos.x + GRAPH.nodeW;
      const y1 = fromPos.y + GRAPH.nodeH / 2;
      const x2 = state.mouseGraph.x;
      const y2 = state.mouseGraph.y;
      const c1x = x1 + 80;
      const c2x = x2 - 80;
      const d = `M ${x1} ${y1} C ${c1x} ${y1} ${c2x} ${y2} ${x2} ${y2}`;
      paths.push(
        `<path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 6" />`
      );
    }
  }

  dom.graphEdges.innerHTML = paths.join("\n");
}

function renderInspector() {
  dom.inspector.innerHTML = "";
  if (!state.data || !state.currentNodeId) return;
  const node = state.data.nodes[state.currentNodeId];
  if (!node) return;

  dom.inspector.appendChild(buildInput("Text", node.text ?? "", (value) => {
    node.text = value;
    markDirty();
    renderGraph();
  }, true));

  dom.inspector.appendChild(buildSelect("Next", node.next ?? "", state.nodeOrder, (value) => {
    node.next = value || undefined;
    markDirty();
    renderGraph();
  }));

  dom.inspector.appendChild(buildCheckbox("End", node.end ?? false, (value) => {
    node.end = value || undefined;
    markDirty();
  }));

  dom.inspector.appendChild(buildInput("Action", node.action ?? "", (value) => {
    node.action = value || undefined;
    markDirty();
  }));

  dom.inspector.appendChild(buildCheckbox("Chat", node.chat ?? false, (value) => {
    node.chat = value || undefined;
    markDirty();
  }));

  dom.inspector.appendChild(buildInput("Chat Marker", node.chatMarker ?? "", (value) => {
    node.chatMarker = value || undefined;
    markDirty();
  }));

  dom.inspector.appendChild(buildCheckbox("Chat Instant", node.chatInstant ?? false, (value) => {
    node.chatInstant = value || undefined;
    markDirty();
  }));

  dom.inspector.appendChild(buildJsonEditor("Requires", node.requires, (value) => {
    node.requires = value;
    markDirty();
  }));

  dom.inspector.appendChild(buildJsonEditor("Effects", node.effects, (value) => {
    node.effects = value as Effect[] | undefined;
    markDirty();
  }));

  const choicesHeader = document.createElement("div");
  choicesHeader.className = "panel-title";
  choicesHeader.textContent = "Choices";
  dom.inspector.appendChild(choicesHeader);

  const choices = node.choices ?? [];
  choices.forEach((choice, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "choice-block";

    wrapper.appendChild(buildInput(`Label ${index + 1}`, choice.label ?? "", (value) => {
      choice.label = value || undefined;
      markDirty();
    }));

    wrapper.appendChild(buildInput("Say", choice.say ?? "", (value) => {
      choice.say = value || undefined;
      markDirty();
    }, true));

    wrapper.appendChild(buildSelect("Next", choice.next ?? "", state.nodeOrder, (value) => {
      choice.next = value || undefined;
      markDirty();
      renderGraph();
    }));

    wrapper.appendChild(buildInput("Chat Marker", choice.chatMarker ?? "", (value) => {
      choice.chatMarker = value || undefined;
      markDirty();
    }));

    wrapper.appendChild(buildCheckbox("Hidden", choice.hidden ?? false, (value) => {
      choice.hidden = value || undefined;
      markDirty();
    }));

    wrapper.appendChild(buildInput("Locked Label", choice.lockedLabel ?? "", (value) => {
      choice.lockedLabel = value || undefined;
      markDirty();
    }));

    wrapper.appendChild(buildJsonEditor("Requires", choice.requires, (value) => {
      choice.requires = value;
      markDirty();
    }));

    wrapper.appendChild(buildJsonEditor("Effects", choice.effects, (value) => {
      choice.effects = value as Effect[] | undefined;
      markDirty();
    }));

    const remove = document.createElement("button");
    remove.className = "btn";
    remove.textContent = "Remove Choice";
    remove.addEventListener("click", () => {
      choices.splice(index, 1);
      node.choices = choices.length ? choices : undefined;
      markDirty();
      renderInspector();
      renderGraph();
    });
    wrapper.appendChild(remove);

    dom.inspector.appendChild(wrapper);
  });

  const addChoice = document.createElement("button");
  addChoice.className = "btn";
  addChoice.textContent = "Add Choice";
  addChoice.addEventListener("click", () => {
    const nextChoice: DialogueChoice = { label: "Choice", next: "" };
    node.choices = node.choices ? [...node.choices, nextChoice] : [nextChoice];
    markDirty();
    renderInspector();
  });
  dom.inspector.appendChild(addChoice);
}

function renderGraphSettings() {
  dom.graphSettings.innerHTML = "";
  if (!state.data) return;
  const nodes = state.nodeOrder;

  dom.graphSettings.appendChild(buildSelect("Start", state.data.start ?? "", nodes, (value) => {
    state.data!.start = value || undefined;
    markDirty();
  }));

  dom.graphSettings.appendChild(buildSelect("Chat Start", state.data.chatStart ?? "", nodes, (value) => {
    state.data!.chatStart = value || undefined;
    markDirty();
  }));

  dom.graphSettings.appendChild(buildJsonEditor("Interactions", state.data.interactions, (value) => {
    state.data!.interactions = value as DialogueInteraction[] | undefined;
    markDirty();
  }));

  dom.graphSettings.appendChild(buildJsonEditor("Display", state.data.display, (value) => {
    state.data!.display = value as Dict<unknown> | undefined;
    markDirty();
  }));
}

function renderAll() {
  renderDialogueList();
  renderNodeList();
  renderGraph();
  renderInspector();
  renderGraphSettings();
  renderStatus();
}

function buildInput(labelText: string, value: string, onChange: (value: string) => void, multiline = false) {
  const row = document.createElement("div");
  row.className = "row";
  const label = document.createElement("label");
  label.textContent = labelText;
  row.appendChild(label);
  if (multiline) {
    const input = document.createElement("textarea");
    input.value = value;
    input.rows = 3;
    input.addEventListener("input", () => onChange(input.value));
    row.appendChild(input);
  } else {
    const input = document.createElement("input");
    input.value = value;
    input.addEventListener("input", () => onChange(input.value));
    row.appendChild(input);
  }
  return row;
}

function buildSelect(labelText: string, value: string, options: string[], onChange: (value: string) => void) {
  const row = document.createElement("div");
  row.className = "row";
  const label = document.createElement("label");
  label.textContent = labelText;
  const select = document.createElement("select");
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "None";
  select.appendChild(empty);
  options.forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt;
    select.appendChild(option);
  });
  select.value = value;
  select.addEventListener("change", () => onChange(select.value));
  row.appendChild(label);
  row.appendChild(select);
  return row;
}

function buildCheckbox(labelText: string, value: boolean, onChange: (value: boolean) => void) {
  const row = document.createElement("div");
  row.className = "row";
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = value;
  input.addEventListener("change", () => onChange(input.checked));
  row.appendChild(label);
  row.appendChild(input);
  return row;
}

function buildJsonEditor(labelText: string, value: unknown, onChange: (value: unknown) => void) {
  const row = document.createElement("div");
  row.className = "row";
  const label = document.createElement("label");
  label.textContent = labelText;
  const input = document.createElement("textarea");
  input.rows = 4;
  input.value = value ? JSON.stringify(value, null, 2) : "";
  input.addEventListener("change", () => {
    if (!input.value.trim()) {
      onChange(undefined);
      return;
    }
    try {
      onChange(JSON.parse(input.value));
      input.style.borderColor = "var(--stroke)";
    } catch {
      input.style.borderColor = "var(--danger)";
    }
  });
  row.appendChild(label);
  row.appendChild(input);
  return row;
}

function autoLayout() {
  if (!state.data) return;
  const nodes = state.data.nodes;
  const roots = [state.data.start, state.data.chatStart].filter(Boolean) as string[];
  const depth: Dict<number> = {};
  const visited = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [];
  roots.forEach((root) => queue.push({ id: root, depth: 0 }));

  while (queue.length) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    depth[current.id] = current.depth;
    const node = nodes[current.id];
    if (!node) continue;
    if (node.next) queue.push({ id: node.next, depth: current.depth + 1 });
    node.choices?.forEach((choice) => {
      if (choice.next) queue.push({ id: choice.next, depth: current.depth + 1 });
    });
  }

  const columns: Dict<string[]> = {};
  Object.keys(nodes).forEach((id) => {
    const d = depth[id];
    if (d === undefined) return;
    columns[d] = columns[d] || [];
    columns[d].push(id);
  });

  const maxDepth = Math.max(0, ...Object.values(depth));
  const orphans = Object.keys(nodes).filter((id) => depth[id] === undefined);
  orphans.forEach((id, index) => {
    const d = maxDepth + 1 + Math.floor(index / 4);
    columns[d] = columns[d] || [];
    columns[d].push(id);
  });

  Object.entries(columns).forEach(([depthKey, ids]) => {
    ids.forEach((id, index) => {
      if (state.graphPositions[id]) return;
      const x = GRAPH.pad + Number(depthKey) * GRAPH.gapX;
      const y = GRAPH.pad + index * GRAPH.gapY;
      state.graphPositions[id] = { x, y };
    });
  });
}

function loadPositions() {
  if (!state.currentId) return;
  const key = `dialogue_graph_${state.currentId}`;
  const raw = localStorage.getItem(key);
  if (!raw) {
    state.graphPositions = {};
    return;
  }
  try {
    state.graphPositions = JSON.parse(raw) as Dict<GraphPoint>;
  } catch {
    state.graphPositions = {};
  }
}

function savePositions() {
  if (!state.currentId) return;
  const key = `dialogue_graph_${state.currentId}`;
  localStorage.setItem(key, JSON.stringify(state.graphPositions));
}

function ensureUniqueId(base: string) {
  if (!state.data) return base;
  let id = base;
  let i = 1;
  while (state.data.nodes[id]) {
    id = `${base}_${i}`;
    i += 1;
  }
  return id;
}

function addNodeAt(point: GraphPoint) {
  if (!state.data) return;
  const id = ensureUniqueId("node");
  state.data.nodes[id] = { text: "" };
  state.nodeOrder.push(id);
  state.graphPositions[id] = { x: point.x, y: point.y };
  state.currentNodeId = id;
  markDirty();
  renderAll();
}

function handleLinkDrop(targetId: string) {
  if (!state.data || !state.linkDrag) return;
  const fromId = state.linkDrag.fromId;
  if (fromId === targetId) {
    state.linkDrag = null;
    renderGraph();
    return;
  }
  const fromNode = state.data.nodes[fromId];
  if (!fromNode.next && !fromNode.choices?.length) {
    fromNode.next = targetId;
  } else if (fromNode.next && fromNode.next !== targetId && !fromNode.choices?.length) {
    const firstNext = fromNode.next;
    fromNode.next = undefined;
    fromNode.choices = [
      { label: "Option 1", next: firstNext },
      { label: "Option 2", next: targetId }
    ];
  } else if (fromNode.next !== targetId) {
    const nextIndex = (fromNode.choices?.length ?? 0) + 1;
    const label = window.prompt("Choice label", `Option ${nextIndex}`) ?? "";
    fromNode.choices = fromNode.choices || [];
    fromNode.choices.push({ label: label || `Option ${nextIndex}`, next: targetId });
  }
  state.linkDrag = null;
  markDirty();
  renderGraph();
  renderInspector();
}

function toggleFocusMode() {
  state.focusMode = !state.focusMode;
  dom.dock.classList.toggle("hidden", state.focusMode);
  if (state.focusMode) closePanels();
}

function closePanels() {
  panels.forEach((panel) => panel.classList.remove("active"));
  panelButtons.forEach((btn) => btn.classList.remove("active"));
  dom.overlay.classList.remove("active");
}

function openPanel(panelId: string) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  if (panel.classList.contains("active")) {
    closePanels();
    return;
  }
  panels.forEach((item) => item.classList.remove("active"));
  panelButtons.forEach((btn) => btn.classList.remove("active"));
  panel.classList.add("active");
  dom.overlay.classList.add("active");
  const btn = panelButtons.find((button) => button.dataset.panel === panelId);
  if (btn) btn.classList.add("active");
}

function applyZoom(newZoom: number, clientX: number, clientY: number) {
  const rect = dom.graphCanvas.getBoundingClientRect();
  const mx = clientX - rect.left;
  const my = clientY - rect.top;
  const gx = (mx - state.camera.x) / state.camera.zoom;
  const gy = (my - state.camera.y) / state.camera.zoom;
  state.camera.zoom = Math.min(1.8, Math.max(0.4, newZoom));
  state.camera.x = mx - gx * state.camera.zoom;
  state.camera.y = my - gy * state.camera.zoom;
  updateGraphTransform();
}

function bindEvents() {
  panelButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const panelId = btn.dataset.panel;
      if (panelId) openPanel(panelId);
    });
  });

  closeButtons.forEach((btn) => {
    btn.addEventListener("click", () => closePanels());
  });

  dom.overlay.addEventListener("click", () => closePanels());

  dom.newDialogue.addEventListener("click", () => {
    const id = window.prompt("New dialogue ID", "new_dialogue");
    if (!id) return;
    createDialogue(id);
  });

  dom.saveDialogue.addEventListener("click", () => saveDialogue());

  dom.zoomIn.addEventListener("click", () => {
    const rect = dom.graphCanvas.getBoundingClientRect();
    applyZoom(state.camera.zoom * 1.1, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });

  dom.zoomOut.addEventListener("click", () => {
    const rect = dom.graphCanvas.getBoundingClientRect();
    applyZoom(state.camera.zoom * 0.9, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });

  dom.zoomReset.addEventListener("click", () => {
    const rect = dom.graphCanvas.getBoundingClientRect();
    applyZoom(1, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });

  dom.graphCanvas.addEventListener("dblclick", (event) => {
    const point = toGraphPoint(event.clientX, event.clientY);
    addNodeAt(point);
  });

  dom.graphCanvas.addEventListener("mousedown", (event) => {
    const target = event.target as HTMLElement;
    if (target.closest(".node")) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const camStart = { ...state.camera };
    const onMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      state.camera.x = camStart.x + dx;
      state.camera.y = camStart.y + dy;
      updateGraphTransform();
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  dom.graphCanvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const delta = Math.sign(event.deltaY);
    const zoom = state.camera.zoom * (delta > 0 ? 0.9 : 1.1);
    applyZoom(zoom, event.clientX, event.clientY);
  }, { passive: false });

  dom.graphCanvas.addEventListener("mousemove", (event) => {
    state.mouseGraph = toGraphPoint(event.clientX, event.clientY);
    if (state.linkDrag) renderGraph();
  });

  dom.graphCanvas.addEventListener("mouseup", (event) => {
    if (!state.linkDrag) return;
    const target = (event.target as HTMLElement).closest(".node");
    if (target) {
      const id = target.querySelector("h4")?.textContent;
      if (id) handleLinkDrop(id);
    } else {
      state.linkDrag = null;
      renderGraph();
    }
  });

  dom.graphCanvas.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (target.closest(".node")) return;
    state.currentNodeId = null;
    renderInspector();
    renderNodeList();
    renderGraph();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "h") {
      toggleFocusMode();
    }
    if (event.key === "Escape") {
      closePanels();
    }
  });
}

function init() {
  updateGraphTransform();
  bindEvents();
  loadDialogues();
}

init();
