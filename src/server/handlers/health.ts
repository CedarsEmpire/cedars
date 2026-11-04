import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function healthHandler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed." });
  }

  return response.status(200).json({ status: "ok", service: "cedars-os-api" });
}