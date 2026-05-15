export type VercelRequest = {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  body?: any;
  headers: Record<string, string | string[] | undefined>;
};

export type VercelResponse = {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
  send(body: unknown): VercelResponse;
  setHeader(name: string, value: string): void;
  end(body?: unknown): void;
};
