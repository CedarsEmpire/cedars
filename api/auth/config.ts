import type { VercelRequest, VercelResponse } from "@vercel/node";

type OidcDiscovery = {
  issuer?: string;
  authorization_endpoint?: string;
  token_endpoint?: string;
  end_session_endpoint?: string;
  code_challenge_methods_supported?: string[];
};

let cachedDiscovery: { issuer: string; discovery: OidcDiscovery } | undefined;

function normalizedIssuer(value: string) {
  return new URL(value).href.replace(/\/$/, "");
}

function secureEndpoint(value: string | undefined, name: string) {
  if (!value) return undefined;
  const endpoint = new URL(value);
  if (endpoint.protocol !== "https:") throw new Error(`OIDC ${name} must use HTTPS.`);
  return endpoint.href;
}

export default async function authConfigHandler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }

  response.setHeader("Cache-Control", "no-store");
  const issuer = process.env.AUTH_ISSUER;
  const clientId = process.env.AUTH_CLIENT_ID;
  const audience = process.env.AUTH_AUDIENCE;
  if (!issuer || !clientId || !audience) {
    return response.status(503).json({ error: "OIDC authentication is not configured." });
  }

  try {
    if (new URL(issuer).protocol !== "https:") throw new Error("OIDC issuer must use HTTPS.");
    let discovery = cachedDiscovery?.issuer === issuer ? cachedDiscovery.discovery : undefined;
    if (!discovery) {
      const discoveryUrl = `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
      const discoveryResponse = await fetch(discoveryUrl, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10_000)
      });
      if (!discoveryResponse.ok) throw new Error("OIDC discovery unavailable");
      discovery = await discoveryResponse.json() as OidcDiscovery;
      if (!discovery.issuer || normalizedIssuer(discovery.issuer) !== normalizedIssuer(issuer)) {
        throw new Error("OIDC issuer mismatch");
      }
      if (!discovery.authorization_endpoint || !discovery.token_endpoint) {
        throw new Error("OIDC endpoints missing");
      }
      secureEndpoint(discovery.authorization_endpoint, "authorization endpoint");
      secureEndpoint(discovery.token_endpoint, "token endpoint");
      secureEndpoint(discovery.end_session_endpoint, "logout endpoint");
      cachedDiscovery = { issuer, discovery };
    }

    return response.status(200).json({
      issuer,
      clientId,
      audience,
      authorizationEndpoint: secureEndpoint(discovery.authorization_endpoint, "authorization endpoint"),
      tokenEndpoint: secureEndpoint(discovery.token_endpoint, "token endpoint"),
      logoutEndpoint: secureEndpoint(discovery.end_session_endpoint, "logout endpoint"),
      pkceSupported: discovery.code_challenge_methods_supported?.includes("S256") ?? false
    });
  } catch {
    return response.status(503).json({ error: "OIDC provider discovery failed validation." });
  }
}