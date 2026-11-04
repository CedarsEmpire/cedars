import { readFile } from "node:fs/promises";

const file = new URL("../acceptance/sprint-1-evidence.json", import.meta.url);
const allowed = {
  historical: ["RECOVERED", "PARTIALLY_RECOVERED", "UNRECOVERABLE", "UNKNOWN"],
  reproduction: ["NOT_STARTED", "IN_PROGRESS", "BUILD_FAILED", "REPRODUCED", "REPRODUCTION_VALIDATED"],
  release: ["PASS", "FAIL", "BLOCKED", "UNKNOWN", "NOT_APPLICABLE"],
  gate: ["PASS", "FAIL", "BLOCKED", "UNKNOWN", "NOT_APPLICABLE"]
};

function requireValue(condition, message) {
  if (!condition) throw new Error(message);
}

const record = JSON.parse(await readFile(file, "utf8"));
requireValue(record.protocol === "CEDARS_PRODUCTION_ACCEPTANCE_VERIFY", "Unexpected protocol identifier");
requireValue(record.decision_policy === "FAIL_CLOSED", "Decision policy must remain FAIL_CLOSED");
requireValue(allowed.historical.includes(record.historical_deployment_evidence?.status), "Invalid historical evidence status");
requireValue(allowed.reproduction.includes(record.controlled_reproduction_evidence?.status), "Invalid reproduction evidence status");
requireValue(allowed.release.includes(record.production_release_acceptance?.status), "Invalid production acceptance status");

const target = record.historical_deployment_evidence.target;
requireValue(target.project === "cedars-vkz3", "Historical project identity mismatch");
requireValue(target.deployment_id === "dpl_5nAG79uXog242izu5KPVPFLxzcZ6", "Historical deployment identity mismatch");
requireValue(target.build_id === "bld_k8gyxh8n9", "Historical build identity mismatch");
requireValue(target.source_commit === "127ce7e5a04b0687e0551a8ae0058f9431a2c92c", "Historical source commit mismatch");
requireValue(record.controlled_reproduction_evidence.source.commit === target.source_commit, "Reproduction commit must match the recorded investigation commit");

const historyStatus = record.historical_deployment_evidence.status;
const reproductionStatus = record.controlled_reproduction_evidence.status;
const release = record.production_release_acceptance;
const gateValues = Object.values(release.gates ?? {});
requireValue(gateValues.length > 0 && gateValues.every(value => allowed.gate.includes(value)), "Invalid or missing release gate status");

if (historyStatus === "UNKNOWN" && reproductionStatus !== "NOT_STARTED") {
  throw new Error("Controlled reproduction cannot start until historical recovery has a formally recorded disposition.");
}
if (release.status === "PASS") {
  requireValue(historyStatus !== "UNKNOWN", "Release cannot PASS while historical evidence disposition is UNKNOWN");
  requireValue(
    reproductionStatus === "REPRODUCTION_VALIDATED",
    "Release cannot PASS until controlled reproduction is REPRODUCTION_VALIDATED."
  );
  requireValue(gateValues.every(value => value === "PASS" || value === "NOT_APPLICABLE"), "Release cannot PASS while any mandatory gate is not PASS");
  requireValue(release.authorization && release.authorization.recorded === true, "Release PASS requires recorded executive authorization");
}
if (release.status === "NOT_APPLICABLE") {
  requireValue(release.authorization?.approved === true && release.authorization?.rationale, "NOT_APPLICABLE requires documented approval and rationale");
}
if (historyStatus === "UNRECOVERABLE") {
  requireValue(record.historical_deployment_evidence.recovery_attempts.length > 0, "UNRECOVERABLE requires documented recovery attempts");
  requireValue(record.historical_deployment_evidence.disposition_recorded_by && record.historical_deployment_evidence.disposition_recorded_at, "UNRECOVERABLE requires a recorded disposition owner and timestamp");
}
if (record.activation_controls.production !== "FROZEN" ||
    record.activation_controls.financial_execution !== "OFF" ||
    record.activation_controls.public_launch !== "OFF" ||
    record.activation_controls.production_changes_authorized !== false) {
  throw new Error("This evidence protocol cannot authorize production, financial, public-launch, or production-configuration activation.");
}

console.log("Acceptance evidence ledger structure: VALID");
console.log(`HISTORICAL_EVIDENCE=${historyStatus}`);
console.log(`CONTROLLED_REPRODUCTION=${reproductionStatus}`);
console.log(`PRODUCTION_RELEASE_ACCEPTANCE=${release.status}`);
console.log("RELEASE_ELIGIBILITY=" + (release.status === "PASS" ? "APPROVED_FOR_SEPARATE_ACTIVATION_REVIEW" : "BLOCKED"));
console.log("Activation controls: production FROZEN; financial execution OFF; public launch OFF.");
