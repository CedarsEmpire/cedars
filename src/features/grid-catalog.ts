export const gridCatalog = [
  { id: "bluetooth", name: "Bluetooth Mesh", layer: "Access & connectivity", dependsOn: ["power", "identity", "computer"] },
  { id: "satellite", name: "Satellite & backhaul", layer: "Access & connectivity", dependsOn: ["power", "computer", "internet", "space-supply"] },
  { id: "internet", name: "Internet access", layer: "Access & connectivity", dependsOn: ["satellite", "power", "identity"] },
  { id: "computer", name: "Computer & edge", layer: "Access & connectivity", dependsOn: ["power", "internet", "identity"] },
  { id: "sound", name: "Sound & acoustic", layer: "Access & connectivity", dependsOn: ["power", "computer", "identity"] },
  { id: "identity", name: "Identity & network security", layer: "Access & connectivity", dependsOn: ["computer", "governance", "safety"] },
  { id: "power", name: "Power & electricity", layer: "Essential resources & environment", dependsOn: ["manufacturing", "water", "safety"] },
  { id: "water", name: "Water services", layer: "Essential resources & environment", dependsOn: ["power", "climate", "rain"] },
  { id: "rain", name: "Rain & watershed", layer: "Essential resources & environment", dependsOn: ["climate", "water", "computer"] },
  { id: "air", name: "Air: CO2 & oxygen", layer: "Essential resources & environment", dependsOn: ["climate", "power", "computer"] },
  { id: "organics", name: "Soil & biological cycles", layer: "Essential resources & environment", dependsOn: ["food", "water", "governance"] },
  { id: "climate", name: "Climate & resilience", layer: "Essential resources & environment", dependsOn: ["air", "rain", "water", "research"] },
  { id: "manufacturing", name: "Manufacturing", layer: "Materials & production", dependsOn: ["power", "computer", "mobility", "elements"] },
  { id: "food", name: "Agriculture & food", layer: "Materials & production", dependsOn: ["water", "computer", "commerce", "organics"] },
  { id: "elements", name: "Periodic table & materials", layer: "Materials & production", dependsOn: ["research", "governance", "repair"] },
  { id: "metals", name: "Gold & diamond", layer: "Materials & production", dependsOn: ["elements", "governance", "research"] },
  { id: "mercury", name: "Mercury hazard control", layer: "Materials & production", dependsOn: ["air", "water", "safety", "governance"] },
  { id: "energy", name: "Oil & gas transition", layer: "Materials & production", dependsOn: ["power", "manufacturing", "safety", "climate"] },
  { id: "repair", name: "Repair & circular materials", layer: "Materials & production", dependsOn: ["manufacturing", "elements", "commerce"] },
  { id: "mobility", name: "Transport & logistics", layer: "Materials & production", dependsOn: ["power", "computer", "safety", "commerce"] },
  { id: "built", name: "Buildings & infrastructure", layer: "Materials & production", dependsOn: ["manufacturing", "power", "water", "safety"] },
  { id: "workers", name: "AI worker network", layer: "People, services & digital coordination", dependsOn: ["computer", "identity", "governance", "knowledge"] },
  { id: "education", name: "Learning & skills", layer: "People, services & digital coordination", dependsOn: ["computer", "workers", "knowledge"] },
  { id: "health", name: "Health & care", layer: "People, services & digital coordination", dependsOn: ["power", "water", "workers", "safety"] },
  { id: "commerce", name: "Commerce & livelihoods", layer: "People, services & digital coordination", dependsOn: ["finance", "mobility", "identity", "governance"] },
  { id: "finance", name: "Money & regulated finance", layer: "People, services & digital coordination", dependsOn: ["identity", "governance", "commerce"] },
  { id: "crypto", name: "Cryptocurrency & digital assets", layer: "People, services & digital coordination", dependsOn: ["identity", "governance", "computer"] },
  { id: "governance", name: "Governance & audit", layer: "People, services & digital coordination", dependsOn: ["identity", "safety", "knowledge"] },
  { id: "safety", name: "Safety & emergency response", layer: "People, services & digital coordination", dependsOn: ["internet", "power", "health", "governance"] },
  { id: "knowledge", name: "Knowledge & data exchange", layer: "People, services & digital coordination", dependsOn: ["identity", "computer", "governance", "research"] },
  { id: "lunar-green", name: "Moon Green · lunar food systems", layer: "Planetary & frontier systems", dependsOn: ["water", "power", "food", "space-supply", "research"] },
  { id: "jupiter", name: "Jupiter · planetary science", layer: "Planetary & frontier systems", dependsOn: ["satellite", "research", "space-supply"] },
  { id: "space-supply", name: "Space systems & supply chains", layer: "Planetary & frontier systems", dependsOn: ["satellite", "manufacturing", "governance", "safety"] },
  { id: "research", name: "Research & simulation", layer: "Planetary & frontier systems", dependsOn: ["computer", "knowledge", "governance", "elements"] }
] as const;

export type GridId = (typeof gridCatalog)[number]["id"];
export type GridDesiredState = "STANDBY" | "WORKING" | "MAINTENANCE";

export const gridIds = gridCatalog.map((grid) => grid.id) as [GridId, ...GridId[]];