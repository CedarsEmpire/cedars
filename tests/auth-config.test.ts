import { afterEach, describe, expect, it, vi } from "vitest";

function makeResponse() {
  return {
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    statusCode: 200,
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    }
  };
}

describe("OIDC browser configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("returns secure auth and logout endpoints after issuer validation", async () => {
    const issuer = "https://auth.example/tenant/";
    vi.stubEnv("AUTH_ISSUER", issuer);
    vi.stubEnv("AUTH_CLIENT_ID", "client-id");
    vi.stubEnv("AUTH_AUDIENCE", "cedars-api");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      issuer,
      authorization_endpoint: "https://auth.example/authorize",
      token_endpoint: "https://auth.example/oauth/token",
      end_session_endpoint: "https://auth.example/oidc/logout",
      code_challenge_methods_supported: ["S256"]
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    const { default: handler } = await import("../api/auth/config.js");
    const response = makeResponse();
    await handler({ method: "GET" } as never, response as never);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      authorizationEndpoint: "https://auth.example/authorize",
      tokenEndpoint: "https://auth.example/oauth/token",
      logoutEndpoint: "https://auth.example/oidc/logout",
      pkceSupported: true
    });
  });

  it("rejects insecure discovered endpoints", async () => {
    vi.stubEnv("AUTH_ISSUER", "https://auth.example/tenant/");
    vi.stubEnv("AUTH_CLIENT_ID", "client-id");
    vi.stubEnv("AUTH_AUDIENCE", "cedars-api");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      issuer: "https://auth.example/tenant/",
      authorization_endpoint: "https://auth.example/authorize",
      token_endpoint: "https://auth.example/oauth/token",
      end_session_endpoint: "http://auth.example/logout",
      code_challenge_methods_supported: ["S256"]
    }), { status: 200, headers: { "Content-Type": "application/json" } })));

    const { default: handler } = await import("../api/auth/config.js");
    const response = makeResponse();
    await handler({ method: "GET" } as never, response as never);

    expect(response.statusCode).toBe(503);
  });
});
