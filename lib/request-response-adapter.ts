import type { VercelRequest, VercelResponse } from "./vercel-types.js";

export type ResponseSnapshot = {
  body?: unknown;
  finished: boolean;
  statusCode: number;
};

export function observeResponse(res: VercelResponse) {
  const snapshot: ResponseSnapshot = {
    finished: false,
    statusCode: 200,
  };

  const observed: VercelResponse = {
    status(code) {
      snapshot.statusCode = code;
      res.status(code);
      return observed;
    },
    json(body) {
      snapshot.body = body;
      snapshot.finished = true;
      res.json(body);
      return observed;
    },
    send(body) {
      snapshot.body = body;
      snapshot.finished = true;
      res.send(body);
      return observed;
    },
    setHeader(name, value) {
      res.setHeader(name, value);
    },
    end(body) {
      snapshot.body = body;
      snapshot.finished = true;
      res.end(body);
    },
  };

  return { res: observed, snapshot };
}

export function createTestRequest(
  overrides: Partial<VercelRequest> = {}
): VercelRequest {
  return {
    headers: {},
    method: "GET",
    query: {},
    ...overrides,
  };
}

export function createTestResponse() {
  const headers: Record<string, string> = {};
  const state: ResponseSnapshot = { finished: false, statusCode: 200 };
  const res: VercelResponse = {
    status(code) {
      state.statusCode = code;
      return res;
    },
    json(body) {
      state.body = body;
      state.finished = true;
      return res;
    },
    send(body) {
      state.body = body;
      state.finished = true;
      return res;
    },
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
    },
    end(body) {
      state.body = body;
      state.finished = true;
    },
  };

  return { headers, res, state };
}
