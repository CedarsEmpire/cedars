export const TOOL_NAMES = Object.freeze([
  "repository.read",
  "ci.read",
  "preview.read",
  "previewDatabase.readMetadata"
]);

export const AGENTS = Object.freeze([
  {
    id: "commander",
    name: "AI Team Commander",
    purpose: "Decompose the approved objective, coordinate specialists, and reconcile evidence.",
    tools: []
  },
  {
    id: "security-compliance",
    name: "Security & Compliance",
    purpose: "Inspect source and CI evidence for security and compliance risks.",
    tools: ["repository.read", "ci.read"]
  },
  {
    id: "repository-ci",
    name: "Repository & CI",
    purpose: "Inspect repository source, workflow definitions, and CI evidence.",
    tools: ["repository.read", "ci.read"]
  },
  {
    id: "runtime-database",
    name: "Runtime & Database",
    purpose: "Inspect Preview deployment health and Preview database metadata only.",
    tools: ["preview.read", "previewDatabase.readMetadata"]
  },
  {
    id: "independent-qa",
    name: "Independent QA",
    purpose: "Reproduce and challenge claims using independent read-only evidence.",
    tools: ["repository.read", "ci.read", "preview.read"]
  },
  {
    id: "release-governance",
    name: "Release Governance",
    purpose: "Map evidence to milestones without changing status or granting acceptance.",
    tools: ["ci.read", "preview.read"]
  }
]);

export const RUNTIME_BOUNDARIES = Object.freeze({
  mode: "READ_ONLY",
  environment: "PREVIEW_ONLY",
  productionAccess: false,
  databaseWrites: false,
  repositoryWrites: false,
  deploymentWrites: false,
  externalCommunications: false,
  financialExecution: false,
  fiatTransactions: false,
  publicLaunch: false,
  statusPromotion: false
});
