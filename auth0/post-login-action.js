/**
 * Auth0 Post-Login Action.
 * Store role assignments in app_metadata, managed by trusted administrators.
 */
exports.onExecutePostLogin = async (event, api) => {
  const roleClaim = event.secrets.CEDARS_ROLE_CLAIM;
  let claimUrl;
  try {
    claimUrl = new URL(roleClaim);
  } catch {
    throw new Error("CEDARS_ROLE_CLAIM must be a namespaced HTTPS URL.");
  }
  if (claimUrl.protocol !== "https:" || !claimUrl.hostname || claimUrl.pathname === "/" || claimUrl.search || claimUrl.hash) {
    throw new Error("CEDARS_ROLE_CLAIM must be a namespaced HTTPS URL.");
  }

  const allowedRoles = new Set([
    "SUPER_ADMIN",
    "FOUNDER",
    "INVESTOR",
    "PARTNER",
    "FINANCE_ADMIN",
    "COMPLIANCE_OFFICER",
    "HEALTHCARE_ADMIN",
    "EDUCATION_ADMIN",
    "USER"
  ]);
  const configuredRole = event.user.app_metadata?.cedars_role;
  const role = typeof configuredRole === "string" && allowedRoles.has(configuredRole)
    ? configuredRole
    : "USER";

  api.accessToken.setCustomClaim(roleClaim, role);
};
