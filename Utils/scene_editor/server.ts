import { promises as fs } from "fs";
import path from "path";

const PORT = 5174;
const PUBLIC_DIR = path.join(import.meta.dir, "public");

type ProjectState = {
  projectPath: string | null;
  contentPath: string | null;
};

const state: ProjectState = {
  projectPath: null,
  contentPath: null
};

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const SCRIPT_EXTS = new Set([".lua", ".js", ".py", ".ts"]);

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function badRequest(message: string, status = 400) {
  return jsonResponse({ ok: false, error: message }, status);
}

async function pathExists(targetPath: string) {
  try {
    await fs.stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function validateProjectPath(projectPath: string) {
  if (!(await pathExists(projectPath))) {
    return { ok: false, error: "Directory does not exist" };
  }
  const contentPath = path.join(projectPath, "content", "scenes");
  if (!(await pathExists(contentPath))) {
    return { ok: false, error: "Missing content/scenes directory" };
  }
  return { ok: true, contentPath };
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

async function writeJsonFile(filePath: string, data: unknown) {
  const payload = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, payload, "utf-8");
}

async function getSceneList(contentPath: string) {
  const indexPath = path.join(contentPath, "index.json");
  const indexData = await readJsonFile<{ items: { id: string; name: string }[] }>(indexPath);
  if (indexData?.items?.length) {
    return indexData.items;
  }

  const files = await fs.readdir(contentPath);
  const items = files
    .filter((file) => file.endsWith(".json") && file !== "index.json")
    .map((file) => ({ id: path.basename(file, ".json"), name: path.basename(file, ".json") }));
  return items;
}

async function updateIndex(contentPath: string, items: { id: string; name: string }[]) {
  const indexPath = path.join(contentPath, "index.json");
  await writeJsonFile(indexPath, { items });
}

function isRelativeFilePath(filePath: string) {
  return !path.isAbsolute(filePath) && !filePath.includes("\\");
}

function resolveProjectPath(projectRoot: string, relativePath: string) {
  const resolved = path.resolve(projectRoot, relativePath);
  const rootWithSep = projectRoot.endsWith(path.sep) ? projectRoot : `${projectRoot}${path.sep}`;
  if (resolved !== projectRoot && !resolved.startsWith(rootWithSep)) return null;
  return resolved;
}

async function validateScene(scene: any, projectRoot: string | null) {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!scene || typeof scene !== "object") {
    errors.push("Scene payload is missing or invalid");
    return { errors, warnings };
  }

  if (!scene.id) errors.push("Scene id is required");
  if (!scene.size || typeof scene.size.width !== "number" || typeof scene.size.height !== "number") {
    errors.push("Scene size is required");
  }
  if (!Array.isArray(scene.objects)) {
    errors.push("Scene objects must be an array");
  }

  const idSet = new Set<string>();
  const validColliderShapes = new Set(["box", "circle", "polygon"]);
  const validTriggerEvents = new Set(["onEnter", "onExit", "onStay", "onInteract"]);

  const projectRootPath = projectRoot ?? "";
  const resolvePath = (relativePath: string) => path.join(projectRootPath, relativePath);

  for (const obj of scene.objects ?? []) {
    if (!obj?.id) errors.push("Object id is required");
    if (!obj?.type) errors.push(`Object ${obj?.id ?? "(unknown)"} type is required`);
    if (!obj?.position || typeof obj.position.x !== "number" || typeof obj.position.y !== "number") {
      errors.push(`Object ${obj?.id ?? "(unknown)"} position is required`);
    }
    if (!obj?.size || typeof obj.size.width !== "number" || typeof obj.size.height !== "number") {
      errors.push(`Object ${obj?.id ?? "(unknown)"} size is required`);
    }

    if (obj?.id) {
      if (idSet.has(obj.id)) errors.push(`Duplicate object id: ${obj.id}`);
      idSet.add(obj.id);
    }

    if (obj?.collider) {
      if (!validColliderShapes.has(obj.collider.shape)) {
        errors.push(`Invalid collider shape for ${obj?.id ?? "(unknown)"}`);
      }
    }

    if (obj?.trigger) {
      if (!validTriggerEvents.has(obj.trigger.event)) {
        errors.push(`Invalid trigger event for ${obj?.id ?? "(unknown)"}`);
      }
    }

    const spritePath = obj?.sprite;
    if (spritePath) {
      if (!isRelativeFilePath(spritePath)) errors.push(`Sprite path must be relative: ${spritePath}`);
      else if (projectRoot && !(await pathExists(resolvePath(spritePath)))) {
        warnings.push(`Missing sprite file: ${spritePath}`);
      }
    }

    const scriptPath = obj?.script;
    if (scriptPath) {
      if (!isRelativeFilePath(scriptPath)) errors.push(`Script path must be relative: ${scriptPath}`);
      else if (projectRoot && !(await pathExists(resolvePath(scriptPath)))) {
        errors.push(`Missing script file: ${scriptPath}`);
      }
    }

    const triggerScriptPath = obj?.trigger?.script;
    if (triggerScriptPath) {
      if (!isRelativeFilePath(triggerScriptPath)) errors.push(`Trigger script path must be relative: ${triggerScriptPath}`);
      else if (projectRoot && !(await pathExists(resolvePath(triggerScriptPath)))) {
        errors.push(`Missing trigger script file: ${triggerScriptPath}`);
      }
    }

    if (scene?.size && obj?.position) {
      if (obj.position.x < 0 || obj.position.y < 0 || obj.position.x > scene.size.width || obj.position.y > scene.size.height) {
        warnings.push(`Object ${obj?.id ?? "(unknown)"} is outside scene bounds`);
      }
    }
  }

  if (scene?.background) {
    if (!isRelativeFilePath(scene.background)) errors.push(`Background path must be relative: ${scene.background}`);
    else if (projectRoot && !(await pathExists(resolvePath(scene.background)))) {
      warnings.push(`Missing background file: ${scene.background}`);
    }
  }

  return { errors, warnings };
}

async function scanDirectory(rootDir: string, exts: Set<string>) {
  const results: string[] = [];
  const stack: string[] = [rootDir];

  while (stack.length) {
    const current = stack.pop() as string;
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && exts.has(path.extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

function readUInt32BE(data: Uint8Array, offset: number) {
  return (
    (data[offset] << 24) |
    (data[offset + 1] << 16) |
    (data[offset + 2] << 8) |
    data[offset + 3]
  ) >>> 0;
}

function readUInt16BE(data: Uint8Array, offset: number) {
  return (data[offset] << 8) | data[offset + 1];
}

async function getImageSize(filePath: string) {
  try {
    const file = Bun.file(filePath);
    const buffer = new Uint8Array(await file.arrayBuffer());

    if (
      buffer.length > 24 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return {
        width: readUInt32BE(buffer, 16),
        height: readUInt32BE(buffer, 20)
      };
    }

    if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) {
          offset += 1;
          continue;
        }
        const marker = buffer[offset + 1];
        if (marker === 0xc0 || marker === 0xc2) {
          return {
            height: readUInt16BE(buffer, offset + 5),
            width: readUInt16BE(buffer, offset + 7)
          };
        }
        const segmentLength = readUInt16BE(buffer, offset + 2);
        offset += 2 + segmentLength;
      }
    }

    if (
      buffer.length > 30 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      const chunkType = String.fromCharCode(buffer[12], buffer[13], buffer[14], buffer[15]);
      if (chunkType === "VP8X") {
        const width = 1 + buffer[24] + (buffer[25] << 8) + (buffer[26] << 16);
        const height = 1 + buffer[27] + (buffer[28] << 8) + (buffer[29] << 16);
        return { width, height };
      }
    }
  } catch {
    return { width: 0, height: 0 };
  }

  return { width: 0, height: 0 };
}

async function handleApi(req: Request) {
  const url = new URL(req.url);
  const { pathname } = url;

  if (pathname === "/api/project" && req.method === "GET") {
    const valid = state.projectPath ? await validateProjectPath(state.projectPath) : { ok: false };
    return jsonResponse({
      path: state.projectPath,
      valid: Boolean(valid.ok),
      contentPath: valid.ok ? valid.contentPath : null
    });
  }

  if (pathname === "/api/project/select" && req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (!body?.path) return badRequest("Path is required");
    const result = await validateProjectPath(body.path);
    if (!result.ok) return badRequest(result.error ?? "Invalid project path");
    state.projectPath = body.path;
    state.contentPath = result.contentPath;
    return jsonResponse({ ok: true, contentPath: result.contentPath });
  }

  if (pathname === "/api/scenes" && req.method === "GET") {
    if (!state.contentPath) return badRequest("Project not selected", 409);
    const items = await getSceneList(state.contentPath);
    return jsonResponse({ items });
  }

  if (pathname.startsWith("/api/scene/") && req.method === "GET") {
    if (!state.contentPath) return badRequest("Project not selected", 409);
    const sceneId = pathname.replace("/api/scene/", "");
    const scenePath = path.join(state.contentPath, `${sceneId}.json`);
    const data = await readJsonFile(scenePath);
    if (!data) return badRequest("Scene not found", 404);
    return jsonResponse({ id: sceneId, data });
  }

  if (pathname.startsWith("/api/scene/") && req.method === "POST") {
    if (!state.contentPath) return badRequest("Project not selected", 409);
    const sceneId = pathname.replace("/api/scene/", "");
    const scene = await req.json().catch(() => null);
    if (!scene) return badRequest("Invalid JSON payload");
    if (scene.id && scene.id !== sceneId) return badRequest("Scene id mismatch");

    const validation = await validateScene(scene, state.projectPath);
    if (validation.errors.length) {
      return jsonResponse({ ok: false, validation }, 422);
    }

    const scenePath = path.join(state.contentPath, `${sceneId}.json`);
    await writeJsonFile(scenePath, scene);

    const items = await getSceneList(state.contentPath);
    const name = scene.name ?? sceneId;
    const updated = [...items.filter((item) => item.id !== sceneId), { id: sceneId, name }]
      .sort((a, b) => a.name.localeCompare(b.name));
    await updateIndex(state.contentPath, updated);

    return jsonResponse({ ok: true, validation });
  }

  if (pathname === "/api/assets" && req.method === "GET") {
    if (!state.projectPath) return badRequest("Project not selected", 409);
    const assetsDir = path.join(state.projectPath, "assets");
    if (!(await pathExists(assetsDir))) return jsonResponse({ images: [] });
    const files = await scanDirectory(assetsDir, IMAGE_EXTS);
    const images = await Promise.all(
      files.map(async (filePath) => {
        const size = await getImageSize(filePath);
        return {
          id: path.basename(filePath),
          path: path.relative(state.projectPath as string, filePath).replaceAll("\\", "/"),
          fullPath: filePath,
          size
        };
      })
    );
    return jsonResponse({ images });
  }

  if (pathname === "/api/scripts" && req.method === "GET") {
    if (!state.projectPath) return badRequest("Project not selected", 409);
    const scriptsDir = path.join(state.projectPath, "scripts");
    if (!(await pathExists(scriptsDir))) return jsonResponse({ scripts: [] });
    const files = await scanDirectory(scriptsDir, SCRIPT_EXTS);
    const scripts = files.map((filePath) => ({
      id: path.basename(filePath),
      path: path.relative(state.projectPath as string, filePath).replaceAll("\\", "/"),
      name: path.basename(filePath)
    }));
    return jsonResponse({ scripts });
  }

  if (pathname === "/api/asset" && req.method === "GET") {
    if (!state.projectPath) return badRequest("Project not selected", 409);
    const relativePath = url.searchParams.get("path");
    if (!relativePath) return badRequest("Path is required");
    if (!isRelativeFilePath(relativePath)) return badRequest("Path must be relative");
    const resolved = resolveProjectPath(state.projectPath, relativePath);
    if (!resolved) return badRequest("Invalid path");
    if (!(await pathExists(resolved))) return badRequest("Asset not found", 404);
    return new Response(Bun.file(resolved));
  }

  return null;
}

function serveStatic(req: Request) {
  const url = new URL(req.url);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = path.join(PUBLIC_DIR, pathname);
  const file = Bun.file(filePath);
  return file.exists() ? new Response(file) : null;
}

Bun.serve({
  port: PORT,
  async fetch(req) {
    const apiResponse = await handleApi(req);
    if (apiResponse) return apiResponse;

    const staticResponse = serveStatic(req);
    if (staticResponse) return staticResponse;

    return new Response("Not found", { status: 404 });
  }
});

console.log(`Scene editor server running on http://localhost:${PORT}`);
