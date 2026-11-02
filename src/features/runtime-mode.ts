export type RuntimeMode = "DISCONNECTED" | "SIMULATOR";

export function getRuntimeMode(): RuntimeMode {
  if (process.env.CEDARS_RUNTIME_MODE !== "simulator") return "DISCONNECTED";
  if ((process.env.VERCEL_ENV ?? process.env.NODE_ENV) === "production") return "DISCONNECTED";
  return "SIMULATOR";
}