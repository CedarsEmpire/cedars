export const gridCatalog = [
  // CEDARS CLOUD — 19 canonical Grids
  { id: "compute-ai", name: "Compute & AI Grid", layer: "CEDARS CLOUD", dependsOn: [] },
  { id: "data-processing", name: "Data Processing Grid", layer: "CEDARS CLOUD", dependsOn: [] },
  { id: "saas-business-software", name: "SaaS & Business Software Grid", layer: "CEDARS CLOUD", dependsOn: [] },
  { id: "cybersecurity-automation", name: "Cybersecurity & Automation Grid", layer: "CEDARS CLOUD", dependsOn: [] },
  { id: "wallet", name: "Wallet Grid", layer: "CEDARS CLOUD", dependsOn: [] },
  { id: "ledger", name: "Ledger Grid", layer: "CEDARS CLOUD", dependsOn: [] },
  { id: "money", name: "Money Grid", layer: "CEDARS CLOUD", dependsOn: [] },
  { id: "ai-iq", name: "AI IQ Grid", layer: "CEDARS CLOUD", dependsOn: [] },
  { id: "collective-memory", name: "Collective Memory", layer: "CEDARS CLOUD", dependsOn: [] },
  { id: "ai-discovery-engine", name: "AI Discovery Engine", layer: "CEDARS CLOUD", dependsOn: [] },
  { id: "trust-verification", name: "Trust & Verification", layer: "CEDARS CLOUD", dependsOn: [] },
  { id: "civilization-ledger", name: "Civilization Ledger", layer: "CEDARS CLOUD", dependsOn: [] },
  { id: "bitcoin-trust", name: "Bitcoin Trust Grid", layer: "CEDARS CLOUD", dependsOn: [] },
  { id: "monetary-network", name: "Monetary Network Grid", layer: "CEDARS CLOUD", dependsOn: [] },
  { id: "scarcity-model", name: "Scarcity Model Grid", layer: "CEDARS CLOUD", dependsOn: [] },
  { id: "security-history", name: "Security History Grid", layer: "CEDARS CLOUD", dependsOn: [] },
  { id: "adoption-intelligence", name: "Adoption Intelligence Grid", layer: "CEDARS CLOUD", dependsOn: [] },
  { id: "bitcoin", name: "Bitcoin Grid", layer: "CEDARS CLOUD", dependsOn: [] },
  { id: "cedars-coin", name: "CEDARS Coin Grid", layer: "CEDARS CLOUD", dependsOn: [] },
  // CEDARS UNDERGROUND — 4 canonical Grids
  { id: "mining-minerals", name: "Mining & Minerals Grid", layer: "CEDARS UNDERGROUND", dependsOn: [] },
  { id: "geospatial-geology", name: "Geospatial & Geology Grid", layer: "CEDARS UNDERGROUND", dependsOn: [] },
  { id: "utilities-infrastructure", name: "Utilities & Infrastructure Grid", layer: "CEDARS UNDERGROUND", dependsOn: [] },
  { id: "equipment-maintenance", name: "Equipment & Maintenance Grid", layer: "CEDARS UNDERGROUND", dependsOn: [] },
  // CEDARS EARTH — 11 canonical Grids
  { id: "solar", name: "Solar Grid", layer: "CEDARS EARTH", dependsOn: [] },
  { id: "climate", name: "Climate Grid", layer: "CEDARS EARTH", dependsOn: [] },
  { id: "environmental-intelligence", name: "Environmental Intelligence Grid", layer: "CEDARS EARTH", dependsOn: [] },
  { id: "energy", name: "Energy Grid", layer: "CEDARS EARTH", dependsOn: [] },
  { id: "agriculture", name: "Agriculture Grid", layer: "CEDARS EARTH", dependsOn: [] },
  { id: "food", name: "Food Grid", layer: "CEDARS EARTH", dependsOn: [] },
  { id: "water", name: "Water Grid", layer: "CEDARS EARTH", dependsOn: [] },
  { id: "land", name: "Land Grid", layer: "CEDARS EARTH", dependsOn: [] },
  { id: "buildings-services", name: "Buildings & Services Grid", layer: "CEDARS EARTH", dependsOn: [] },
  { id: "cleaning-maintenance", name: "Cleaning & Maintenance Grid", layer: "CEDARS EARTH", dependsOn: [] },
  { id: "mobility-logistics", name: "Mobility & Logistics Grid", layer: "CEDARS EARTH", dependsOn: [] },
  // CEDARS HUMAN ACTIVITIES — 19 canonical Grids
  { id: "trade-procurement", name: "Trade & Procurement Grid", layer: "CEDARS HUMAN ACTIVITIES", dependsOn: [] },
  { id: "professional-services", name: "Professional Services Grid", layer: "CEDARS HUMAN ACTIVITIES", dependsOn: [] },
  { id: "education-training", name: "Education & Training Grid", layer: "CEDARS HUMAN ACTIVITIES", dependsOn: [] },
  { id: "care-services", name: "Care Services Grid", layer: "CEDARS HUMAN ACTIVITIES", dependsOn: [] },
  { id: "tourism-hospitality", name: "Tourism & Hospitality Grid", layer: "CEDARS HUMAN ACTIVITIES", dependsOn: [] },
  { id: "sales-ai", name: "Sales AI", layer: "CEDARS HUMAN ACTIVITIES", dependsOn: [] },
  { id: "support-ai", name: "Support AI", layer: "CEDARS HUMAN ACTIVITIES", dependsOn: [] },
  { id: "healthcare-ai", name: "Healthcare AI", layer: "CEDARS HUMAN ACTIVITIES", dependsOn: [] },
  { id: "education-ai", name: "Education AI", layer: "CEDARS HUMAN ACTIVITIES", dependsOn: [] },
  { id: "contribution", name: "Contribution Grid", layer: "CEDARS HUMAN ACTIVITIES", dependsOn: [] },
  { id: "innovation", name: "Innovation Grid", layer: "CEDARS HUMAN ACTIVITIES", dependsOn: [] },
  { id: "innovation-network", name: "Innovation Network", layer: "CEDARS HUMAN ACTIVITIES", dependsOn: [] },
  { id: "ai-twins", name: "AI Twins™", layer: "CEDARS HUMAN ACTIVITIES", dependsOn: [] },
  { id: "innovation-dome", name: "Innovation Dome™", layer: "CEDARS HUMAN ACTIVITIES", dependsOn: [] },
  { id: "simulation", name: "Simulation Grid", layer: "CEDARS HUMAN ACTIVITIES", dependsOn: [] },
  { id: "synthetic-reality", name: "Synthetic Reality™", layer: "CEDARS HUMAN ACTIVITIES", dependsOn: [] },
  { id: "human-progress-index", name: "Human Progress Index", layer: "CEDARS HUMAN ACTIVITIES", dependsOn: [] },
  { id: "proof-of-contribution", name: "Proof of Contribution", layer: "CEDARS HUMAN ACTIVITIES", dependsOn: [] },
  { id: "collective-intelligence", name: "Collective Intelligence", layer: "CEDARS HUMAN ACTIVITIES", dependsOn: [] }
] as const;

export const canonicalGridLayerCounts = {
  "CEDARS CLOUD": 19,
  "CEDARS UNDERGROUND": 4,
  "CEDARS EARTH": 11,
  "CEDARS HUMAN ACTIVITIES": 19
} as const;

export type GridLayer = keyof typeof canonicalGridLayerCounts;
export type GridId = (typeof gridCatalog)[number]["id"];
export type GridDesiredState = "STANDBY" | "WORKING" | "MAINTENANCE";
export const gridIds = gridCatalog.map((grid) => grid.id) as [GridId, ...GridId[]];
