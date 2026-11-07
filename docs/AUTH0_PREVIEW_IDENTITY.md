# CEDARS OS™ Auth0 Preview Identity

## Scope and safety

This configuration is for the Preview branch only. It does not authorize Production changes, public launch, financial execution, fiat transactions, payment processing, token issuance or transfers. No database migration is included in this identity integration.

The Hybrid Preview browser client uses Auth0 Authorization Code Flow with PKCE. The Auth0 SPA SDK keeps its token cache in memory; CEDARS does not collect Auth0 passwords and the browser client does not contain a client secret.

## Confirmed Auth0 application values

- Tenant domain: `dev-64wfbh1yg7q40lb0.us.auth0.com`
- API identifier / audience: `cedars-os-api`
- SPA application: `CEDARS OS Preview Web`
- SPA Client ID: `sICxTZjuglWMWiHzjjgkVouQWX0zPGpq`
- API: `CEDARS OS Preview API`
- API signing algorithm: `RS256`

The browser callback is `/hybrid-preview.html` on the Preview branch alias. Use the exact alias shown in the current deployment metadata; do not substitute a Production domain.

## Auth0 SPA application settings

Set the following allowed URLs on **CEDARS OS Preview Web**:

- Allowed Callback URLs: `https://cedars-aq5h-git-preview-auth0-pkce-preview-cedars-empire1.vercel.app/hybrid-preview.html`
- Allowed Logout URLs: `https://cedars-aq5h-git-preview-auth0-pkce-preview-cedars-empire1.vercel.app/hybrid-preview.html`
- Allowed Web Origins: `https://cedars-aq5h-git-preview-auth0-pkce-preview-cedars-empire1.vercel.app`

Keep the application as a Single Page Application. Use Authorization Code + PKCE (S256). Do not create or expose a browser Client Secret. If the Preview branch alias changes, update these three URL lists to the verified new alias.

## API role claim

Create an Auth0 Post-Login Action and add an Action secret named `CEDARS_ROLE_CLAIM` with this exact value:

`https://dev-64wfbh1yg7q40lb0.us.auth0.com/cedars/role`

Use this Action code:

```js
exports.onExecutePostLogin = async (event, api) => {
  const claimName = event.secrets.CEDARS_ROLE_CLAIM;
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

  // Only trusted app_metadata may grant a role. User-editable user_metadata is ignored.
  const configuredRole = event.user.app_metadata?.cedars_role;
  const role = allowedRoles.has(configuredRole) ? configuredRole : "USER";
  api.accessToken.setCustomClaim(claimName, role);
};
```

Deploy the Action and attach it to the Login flow. New users without an explicitly assigned trusted role receive `USER`. Never assign FOUNDER, SUPER_ADMIN or other elevated roles based on self-registration, email address, or user-editable metadata.

## Preview-only Vercel environment

For project `cedars-aq5h`, configure the following five variables for the Preview target and only the Git branch `preview/auth0-pkce-preview`:

| Variable | Value |
|---|---|
| `AUTH_JWKS_URL` | `https://dev-64wfbh1yg7q40lb0.us.auth0.com/.well-known/jwks.json` |
| `AUTH_ISSUER` | `https://dev-64wfbh1yg7q40lb0.us.auth0.com/` |
| `AUTH_AUDIENCE` | `cedars-os-api` |
| `AUTH_CLIENT_ID` | `sICxTZjuglWMWiHzjjgkVouQWX0zPGpq` |
| `AUTH_ROLE_CLAIM` | `https://dev-64wfbh1yg7q40lb0.us.auth0.com/cedars/role` |

These values are identifiers and public verification metadata, not passwords or client secrets. Keep the scope Preview-only and branch-restricted. Do not create any Production variables.

## Verification gates

1. Auth0 application allows the exact Preview callback, logout and web-origin URLs.
2. Auth0 Action is deployed and attached to Login flow; its secret matches `AUTH_ROLE_CLAIM`.
3. A new test user receives `USER` by default; no elevated role is inferred.
4. Sign-in completes through Auth0 Universal Login and returns to the Hybrid Preview page.
5. Sign-out clears the Auth0 session.
6. A separately authorized API request validates issuer, audience, signature and trusted role claim.
7. Readiness is checked again. Identity configuration alone does not make the platform ready or LIVE.

The browser sign-in flow is not evidence of API role acceptance, database control-plane readiness, Grid integrations, worker execution or production acceptance.
