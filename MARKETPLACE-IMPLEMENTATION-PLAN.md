# OpenBots Marketplace Implementation Plan

Status: updated 2026-11-25 by MP-WP01. Sequence confirmed; MP-WP02 may start.
Every package is delivered as its own reviewable pull request with verification evidence.

MP-WP01 is complete and does not change OpenBots production code. The table is the single source
of truth for order and dependencies; a package starts only when its dependencies are merged.

| Package | Scope | Depends on |
| --- | --- | --- |
| MP-WP01 | Implementation audit, gap register, architecture, catalog repository infrastructure | — |
| MP-WP02 | Catalog service, persistence, protocol group, handlers | MP-WP01 |
| MP-WP03 | Discover UI and unified catalog views | MP-WP02 |
| MP-WP04 | Manifest-driven configuration and OB-ENV authentication profiles | MP-WP02 |
| MP-WP05 | Secure Git installation transaction and approval | MP-WP02, MP-WP04 |
| MP-WP06 | Lifecycle: update, rollback, uninstall, restart recovery, audit, revocation | MP-WP05 |
| MP-WP07 | Custom marketplace sources and private repositories | MP-WP02, MP-WP05 |
| MP-WP08 | Deterministic local test extension and end-to-end verification | MP-WP02–MP-WP07 |
| MP-WP09 | D-WP-R00-23 packaged runtime reproduction and closure | MP-WP03, packaged host |

## MP-WP02 — Catalog service

Acceptance:

- Fetches `catalog.json` from the official source over HTTPS with a bounded timeout and no redirect
  to a non-HTTPS host.
- Strict schema validation; unknown fields, duplicate IDs and malformed releases are rejected.
- Digest verification; signature verification when the catalog carries one.
- Conditional request with `If-None-Match`; a `304` counts as a successful refresh.
- Snapshot, catalog version, digest, source, ETag and last-success time are persisted locally.
- Manual and scheduled refresh; both report success, failure and stale state.
- A failed, malformed or untrusted refresh never replaces the last trusted snapshot; offline mode
  serves it marked stale.
- Revoked entries are surfaced as revoked, never installable.
- Protocol group and handlers are registered and the generated client is updated.
- Tests: valid/invalid catalog, timeout, `304`, offline fallback, duplicate ID, revoked entry,
  malformed JSON, untrusted digest.

## MP-WP03 — Discover

Acceptance:

- Discover route and sidebar entry exist; Settings tabs remain unchanged.
- Views: All, Plugins, Skills, MCP, UTCP, Installed, Updates.
- Search, category filter, publisher filter, compatibility/platform state, source facet.
- Detail view shows version, compatibility, permissions, dependencies, auth methods, documentation
  and integrity data.
- Install/update/uninstall actions are present with disabled reasons where unavailable; built-ins
  never appear as installable.
- Loading, empty, offline, stale, invalid-catalog and refresh-error states are distinct.
- Skills/Plugins/MCP/UTCP management screens remain authoritative; Discover reads their services.
- Tests: filters, empty catalog, stale cache, disabled reasons, navigation preservation.

## MP-WP04 — Configuration and authentication

Acceptance:

- Declarative field interpreter for text, password, secret, url, number, boolean, select.
- Required/optional, default, validation, conditional visibility and documentation links.
- Secret fields write through OB-ENV and store references only; a form submit cannot persist a value.
- Auth methods: OAuth2 + PKCE, OIDC/SSO, API key, PAT, basic, CLI, device code.
- Multiple connection profiles per provider and project; verification, expiry and reauth.
- Tests: each field type, conditional field, validation failure, secret non-persistence, OAuth state
  mismatch, expiry, reauth, project denial, log redaction.

## MP-WP05 — Installation

Acceptance:

- Catalog entry → pinned commit fetch → commit and digest verification → manifest validation →
  identity match with the catalog.
- Permissions, dependencies, scripts and credential requirements shown verbatim; explicit approval
  required for each class.
- Installs only through existing managers into a staging path; no repository script executes.
- Destination path containment, symlink/junction refusal and size limits re-asserted at install.
- Failure removes staged files, registrations and created credential references (no orphans).
- Ledger row written only after registration and health check succeed.
- Plugin entries install only when the isolation boundary is verified; otherwise catalog-only with a
  visible reason.
- Tests: valid install, tampered digest, wrong commit, manifest/catalog mismatch, path traversal,
  symlink package, missing approval, dependency denied, credential denied, rollback of a failed
  install.

## MP-WP06 — Lifecycle

Acceptance:

- Update from installed version to catalog version with verification and permission-diff approval.
- Previous verified version retained until the new one passes health checks; rollback restores it.
- Uninstall removes registration and package and releases credential references without touching
  user data.
- Restart reconciliation discards interrupted staging and re-verifies active versions.
- Revocation blocks install and flags installed copies.
- Audit events for refresh, trust, approval, install, update, rollback, uninstall, revocation.
- Tests: update, permission diff, failed health check rollback, uninstall, restart recovery,
  revocation, audit content without secrets.

## MP-WP07 — Custom sources

Acceptance:

- Official source built in and non-removable.
- Custom source requires canonical HTTPS URL and explicit trust approval before its entries appear.
- Private credentials come from OB-ENV references and never appear in URLs, logs or config.
- Removal is supported; source entries and cache are invalidated.
- Tests: untrusted source hidden, approval required, credential redaction, removal, official source
  protection.

## MP-WP08 — End-to-end verification

Acceptance:

- A deterministic local test extension lives outside the official catalog and is installed from a
  local Git repository through the real pipeline.
- Verified: discovery, schema rejection, offline cache, install, configuration, permission approval,
  runtime registration, execution, project isolation, update detection, rollback, uninstall, restart
  recovery, invalid manifest rejection, malicious package rejection, packaged Windows behaviour.
- macOS recorded only if a host is available; otherwise stated as not tested.
- Existing regression suites still pass; none weakened or skipped.

## MP-WP09 — D-WP-R00-23

Acceptance:

- Packaged Windows smoke asserts `GET /api/plugin` contains the seeded plugin for the default
  location and for the project location, plus the built-in inventory.
- If it fails, the desktop HTTP path is investigated with the source-level control reproducer from
  MP-WP01; the defect is closed with evidence either way.
- No harness assertion weakened to obtain a pass.
