import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  token?: string;
  cookies: Map<string, string>;
  setCookies: { name: string; value: string; options: any }[];
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export class NextResponse extends Response {
  static json(data: any, init?: ResponseInit) {
    const body = JSON.stringify(data);
    const headers = new Headers(init?.headers);
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    return new NextResponse(body, {
      ...init,
      headers,
    });
  }
}

export function cookies() {
  const ctx = requestContext.getStore();
  return {
    get: (name: string) => {
      const val = ctx?.cookies.get(name);
      return val !== undefined ? { name, value: val } : undefined;
    },
    set: (name: string, value: string, options?: any) => {
      ctx?.setCookies.push({ name, value, options: options || {} });
    },
    delete: (name: string) => {
      ctx?.setCookies.push({ name, value: "", options: { maxAge: 0 } });
    },
  };
}
