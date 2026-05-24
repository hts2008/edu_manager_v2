import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join } from "node:path";
import router from "../api/router.js";

const root = process.cwd();
const distDir = join(root, "frontend", "dist");
const port = Number(process.env.PORT || 3000);

const mimeTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function collectBody(req: IncomingMessage) {
  return new Promise<unknown>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("error", reject);
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(raw);
      }
    });
  });
}

function createVercelResponse(res: ServerResponse) {
  let statusCode = 200;
  return {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      res.statusCode = statusCode;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(body));
      return this;
    },
    send(body: unknown) {
      res.statusCode = statusCode;
      if (Buffer.isBuffer(body)) {
        res.end(body);
      } else if (typeof body === "string") {
        res.end(body);
      } else {
        res.end(JSON.stringify(body));
      }
      return this;
    },
    setHeader(name: string, value: string) {
      res.setHeader(name, value);
    },
    end(body?: unknown) {
      res.statusCode = statusCode;
      if (Buffer.isBuffer(body) || typeof body === "string") res.end(body);
      else if (body === undefined) res.end();
      else res.end(JSON.stringify(body));
    },
  };
}

async function handleApi(req: IncomingMessage, res: ServerResponse, url: URL) {
  const path = url.pathname.replace(/^\/api\/?/, "");
  const query: Record<string, string | string[]> = {};
  url.searchParams.forEach((value, key) => {
    if (query[key]) {
      query[key] = Array.isArray(query[key])
        ? [...query[key], value]
        : [query[key] as string, value];
    } else {
      query[key] = value;
    }
  });
  query.path = path;

  await router(
    {
      method: req.method,
      query,
      headers: req.headers as Record<string, string | string[] | undefined>,
      body: await collectBody(req),
    },
    createVercelResponse(res)
  );
}

async function serveStatic(req: IncomingMessage, res: ServerResponse, url: URL) {
  const cleanPath = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const filePath = cleanPath ? join(distDir, cleanPath) : join(distDir, "index.html");
  const target = existsSync(filePath) ? filePath : join(distDir, "index.html");
  const content = await readFile(target);
  res.statusCode = 200;
  res.setHeader("Content-Type", mimeTypes[extname(target)] || "application/octet-stream");
  res.end(content);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }
    await serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ success: false, error: { code: "LOCAL_SERVER_ERROR" } }));
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`local smoke server listening on http://127.0.0.1:${port}`);
});
