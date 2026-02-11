type Dict<T> = Record<string, T>;

type DialogueChoice = {
  label?: string;
  say?: string;
  next?: string;
  chatMarker?: string;
  hidden?: boolean;
  lockedLabel?: string;
  requires?: Dict<unknown>;
  effects?: Dict<unknown>[];
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
  choicesBy?: Dict<unknown>[];
  requires?: Dict<unknown>;
  effects?: Dict<unknown>[];
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
  requires?: Dict<unknown>;
};

type DialogueGraph = {
  start?: string;
  chatStart?: string;
  nodes: Dict<DialogueNode>;
  interactions?: DialogueInteraction[];
  display?: Dict<unknown>;
};

type ValidationResult = {
  errors: string[];
  warnings: string[];
};

const ROOT = import.meta.dir;
const PUBLIC_DIR = `${ROOT}/public`;
const CONTENT_DIR = `${ROOT}/content/dialogue`;
const INDEX_PATH = `${CONTENT_DIR}/index.json`;

function sanitizeId(raw: string) {
  const trimmed = raw.trim().replace(/\.json$/i, "");
  const safe = trimmed.replace(/[^a-zA-Z0-9_-]/g, "_");
  return safe || "dialogue";
}

async function ensureIndex() {
  const exists = await Bun.file(INDEX_PATH).exists();
  if (!exists) {
    await Bun.write(INDEX_PATH, JSON.stringify({ items: [] }, null, 2));
  }
}

async function readIndex() {
  await ensureIndex();
  const data = await Bun.file(INDEX_PATH).json();
  return data as { items: { id: string }[] };
}

async function writeIndex(items: { id: string }[]) {
  const sorted = items
    .map((item) => ({ id: item.id }))
    .sort((a, b) => a.id.localeCompare(b.id));
  await Bun.write(INDEX_PATH, JSON.stringify({ items: sorted }, null, 2));
}

function validateGraph(data: DialogueGraph): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== "object") {
    errors.push("Invalid dialogue graph");
    return { errors, warnings };
  }

  if (!data.nodes || typeof data.nodes !== "object") {
    errors.push("Missing nodes");
    return { errors, warnings };
  }

  Object.entries(data.nodes).forEach(([id, node]) => {
    if (!node || typeof node !== "object") {
      errors.push(`Invalid node: ${id}`);
    }
  });

  const hasNode = (id?: string) => (id ? Boolean(data.nodes[id]) : false);

  if (data.start && !hasNode(data.start)) {
    warnings.push("Start node is missing");
  }

  if (data.chatStart && !hasNode(data.chatStart)) {
    warnings.push("Chat start node is missing");
  }

  Object.entries(data.nodes).forEach(([id, node]) => {
    if (!node) return;
    if (node.next && !hasNode(node.next)) {
      warnings.push(`Node ${id} next references missing node`);
    }
    node.choices?.forEach((choice, index) => {
      if (choice.next && !hasNode(choice.next)) {
        warnings.push(`Node ${id} choice ${index + 1} references missing node`);
      }
    });

    const hasContent = Boolean(
      node.text ||
        node.action ||
        node.next ||
        node.end ||
        (node.choices && node.choices.length)
    );
    if (!hasContent) {
      warnings.push(`Node ${id} is empty`);
    }
  });

  return { errors, warnings };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

Bun.serve({
  port: 5173,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    if (path === "/api/dialogues" && req.method === "GET") {
      const index = await readIndex();
      return json(index);
    }

    if (path.startsWith("/api/dialogue/") && req.method === "GET") {
      const rawId = path.replace("/api/dialogue/", "");
      const id = sanitizeId(rawId);
      const filePath = `${CONTENT_DIR}/${id}.json`;
      const exists = await Bun.file(filePath).exists();
      if (!exists) return json({ error: "Not found" }, 404);
      const data = await Bun.file(filePath).json();
      return json({ id, data });
    }

    if (path.startsWith("/api/dialogue/") && req.method === "POST") {
      const rawId = path.replace("/api/dialogue/", "");
      const id = sanitizeId(rawId);
      const data = (await req.json()) as DialogueGraph;
      const validation = validateGraph(data);

      const filePath = `${CONTENT_DIR}/${id}.json`;
      await Bun.write(filePath, JSON.stringify(data, null, 2));

      const index = await readIndex();
      if (!index.items.find((item) => item.id === id)) {
        index.items.push({ id });
        await writeIndex(index.items);
      }

      return json({ ok: true, validation });
    }

    const filePath = `${PUBLIC_DIR}${path === "/" ? "/index.html" : path}`;
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file);
    }

    return new Response("Not found", { status: 404 });
  }
});
