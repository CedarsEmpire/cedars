# Country-aware global registration — architecture decision

Status: **Preview design only — not a database migration or production authorization**  
Scope: CEDARS OS™ registration, identity, Command Centre reporting and country-aware policy.

## 1. Registration requirements

- Support the full maintained ISO 3166-1 country/territory directory and international calling codes; do not hard-code Uganda as the only country.
- Provide a searchable country selector and a telephone calling-code selector.
- Keep **country of residence**, **registration country**, and **telephone-number country** as distinct attributes. They are not interchangeable and must not be inferred from IP address, flag, or telephone prefix.
- Store telephone numbers in canonical E.164 form after server-side validation. Retain the selected ISO-2 region and calling code as structured attributes where operationally useful.
- Support shared calling codes (for example, NANP territories) without treating a calling code as a unique country identifier.
- Verify ownership of a phone number before marking it verified. Normalize before duplicate checks; never trust client-supplied country or E.164 values without server validation.
- Country metadata must come from a maintained, versioned source. Record the dataset/version and refresh process; do not hand-maintain an incomplete list in application code.

## 2. Recommended logical data model

Use one globally consistent relational schema with country as a first-class dimension. Do **not** create a separate database for every country by default.

### `countries` (reference data)
- `iso2` — primary key, ISO 3166-1 alpha-2
- `iso3` — ISO 3166-1 alpha-3
- `name` — localized display name (with a canonical English name)
- `calling_codes` — one-to-many relationship, not a unique country key
- `is_registration_supported` — governed availability flag
- `metadata_version`, `updated_at`

### `user_profiles`
- `user_id` — unique foreign key to `users`
- `registration_country_iso2` — country selected at registration
- `residence_country_iso2` — user-declared country of residence
- Optional separately governed fields for service region and preferred locale.
- Country values reference `countries.iso2`; changes are audited.

### `user_phones`
- `id`, `user_id`
- `phone_e164` — canonical international number; unique where the account policy requires it
- `phone_country_iso2` — selected numbering-plan region (nullable where numbering plan does not map to one region)
- `calling_code`, `national_number` — structured components for display and support
- `is_primary`, `verified_at`, `verification_status`
- Never store OTPs or verification secrets in this table.

### `country_policies`
- `country_iso2`, `policy_type`, `policy_version`, `effective_from`, `effective_to`
- `status`, `configuration`, `approved_by`, `approved_at`
- Country-specific registration, privacy, retention, age and service-availability rules must be reviewed and approved by the responsible governance/legal owners before activation.

## 3. Command Centre and Admin requirements

- Provide aggregate registration counts by registration country and residence country, with clear definitions and timestamps.
- Do not label registration country as nationality or verified residence.
- Admin country enable/disable controls must be audited and fail closed. Disabling new registration in a country must not silently delete or disable existing user accounts.
- Apply country policy through versioned, server-side rules; the browser is not an authorization boundary.
- Restrict personal phone-number visibility by role and purpose. Prefer aggregate country reporting over exposing full phone numbers.

## 4. Data residency and regional database strategy

Start with the shared schema and country-keyed records. Introduce regional data stores or residency routing only where a documented legal or contractual requirement, threat model, and operational capability justify it. If regionalization is approved later, define data ownership, replication boundaries, access controls, backups, retention, deletion, and cross-region transfer rules before moving records.

Country selection alone does not authorize data localization or establish a person's nationality, tax residence, or legal status.

## 5. Implementation and release gates

1. Use a maintained country/telephone metadata library or generated, version-pinned dataset for the full global directory.
2. Validate selected country, phone number and E.164 value on the server using current numbering metadata.
3. Add Prisma models and migration only after the Preview database credentials and migration workflow are verified and the user explicitly authorizes schema changes.
4. Test countries with unique calling codes, shared calling codes, variable national number lengths, and territories.
5. Test duplicate-number handling, unverified numbers, unsupported-country policy, and privacy/role restrictions.
6. Verify Command Centre country aggregates against controlled Preview records.

## 6. Explicit boundaries

This design does not authorize account creation, authentication activation, SMS delivery, paid messaging, financial execution, fiat transactions, Production deployment, public launch, or a database migration. The Preview registration page remains a non-submitting prototype. Production remains frozen and financial execution/public launch remain OFF.
