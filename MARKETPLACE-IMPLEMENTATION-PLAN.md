# OpenBots Marketplace Implementation Plan

Gate A is complete. The following gates are planning only and must be approved before implementation.

## Gate B: Git Marketplace and Repository Registry

Scope: official `openbots-marketplace` source, additional repositories, refresh, trust, catalog snapshots and source persistence.

Acceptance criteria:

- Official source is present by default and cannot be removed.
- Public and private HTTPS/SSH sources validate canonical host, ref and subdirectory.
- Private auth uses an OB-ENV/OS helper reference and never logs or persists a token.
- Refresh records commit, digest, timestamp and credential-free failure state.
- Offline mode serves the last verified snapshot and clearly marks it stale.
- Duplicate source and extension identity conflicts are rejected.
- Tests cover URL parsing, auth failure redaction, source CRUD, refresh cancellation, cache expiry/offline behavior and conflict detection.

## Gate C: Discover UI and Dynamic Configuration

Scope: sidebar route, catalog search/filter/source views, detail page and manifest-driven setup form.

Acceptance criteria:

- Discover shows optional skills, plugins and MCP only; built-ins do not appear.
- Search, kind, compatibility, source and installed-state filters work.
- Setup screens are generated from manifests and support conditional fields, links and validation.
- Existing Skills, Plugins and MCP screens remain independently routable and authoritative.
- Project scope is visible before install/configuration.
- Component tests cover loading, stale/offline, malformed manifest, field conditions and navigation preservation.

## Gate D: Authentication and OB-ENV Integration

Scope: connection profiles, OAuth/SSO, API keys/PATs, CLI/device code, expiry and verification.

Acceptance criteria:

- OAuth uses PKCE/state/redirect allowlists and managed browser callbacks.
- MFA is handled by the authorized IdP; OpenBots never collects MFA secrets.
- Secret values are written only through OB-ENV/credential services.
- Profiles support multiple accounts, project scope, expiry, refresh and reauth.
- CLI/device-code output cannot be interpreted as a secret unless a manifest-approved extractor is used.
- Tests cover successful/failed OAuth, state mismatch, expiry, reauth, project denial, redaction and secret non-persistence.

## Gate E: Installation, Updates and Security

Scope: approval, signatures, integrity, install ledger, rollback, uninstall and plugin execution boundary.

Acceptance criteria:

- Manifest, publisher signature, commit and package digest are verified before install.
- Approval shows exact permissions, commands, dependencies, credentials and project scope.
- Skills and MCP installs use existing atomic/registration paths.
- Plugin installation is either isolated and policy-enforced or remains catalog-only; no silent in-process trust expansion.
- Updates are staged, health-checked and rollback-capable.
- Audit records source, publisher, digest, approval, connection profile and result without secrets.
- Security tests cover tampered manifest/package, malicious symlink/submodule, script mutation, duplicate identity, rollback failure and sandbox denial.

## Gate F: End-to-End Verification

Acceptance criteria:

- A clean app run adds official source, refreshes catalog, searches and opens an entry.
- A public Git skill installs and appears in Skills management.
- A remote MCP entry authenticates, connects, expires and reauthenticates.
- A private source authenticates without token leakage.
- A plugin is blocked or safely isolated according to the approved policy.
- Offline refresh uses a verified snapshot.
- Screenshots and logs prove To-Do/approval, audit, configuration, runtime and rollback states.
- Windows and macOS verification is recorded separately; no platform is claimed without evidence.

