# OpenBots Marketplace Architecture (Git-Backed JSON Catalog)

Status: approved design, updated 2026-11-25 by MP-WP01.
Supersedes the earlier signed `catalog/index.json` proposal.

## 1. Shape

There is no Marketplace backend, no marketplace database and no paid hosting dependency.

- **One official catalog repository** — `https://github.com/b20vineeth/openbots-marketplace` —
  publishes `catalog.json`, its JSON Schemas, icons and validation CI.
- **One repository per extension** publishes source, manifest, configuration schema,
  documentation, dependencies and release information, addressed by an immutable commit.
- **OpenBots stores local state** — installed records, catalog cache, permissions and connection
  profiles — in its own profile. Credential **values** exist only in OB-ENV.

```
GitHub: openbots-marketplace            GitHub: per-extension repository
  catalog.json  ──references──────────▶  source + openbots.json + docs
  schemas/*.json                          tag v1.2.3 → commit 3f9c…
  icons/*                                 release digest sha256:…

                │ fetch + validate + verify
                ▼
OpenBots server ── catalog service ── local cache + installed ledger (SQLite/profile)
                │
                ├── Discover UI (catalog only; management screens stay authoritative)
                ├── existing ExtensionRepository (clone, inspect, detect, security)
                ├── existing Skill / Plugin / MCP / UTCP managers (registration)
                ├── existing OB-ENV (credentials, grants, audit)
                └── existing approval + project authorization
```

## 2. Catalog document

`catalog.json` is the contract; `schemas/catalog.schema.json` is normative. Fields:

| Group | Fields |
| --- | --- |
| Document | `schemaVersion`, `catalogVersion`, `generatedAt`, `extensions` |
| Identity | `id` (reverse-DNS), `name`, `description`, `type`, `category` |
| Publisher | `publisher.id`, `publisher.name`, `publisher.verified` |
| Release | `version`, `repository.url`, `repository.tag`, `repository.commit`, `repository.manifestPath`, `repository.digest` |
| Compatibility | `compatibility.openbots`, `compatibility.platforms` |
| Discovery | `icon`, `tags`, `documentation` |
| Availability | `status.enabled`, `status.revoked`, `status.revokedReason` |

Rules:

- An entry names one **release**, not a branch. `repository.commit` is a full 40-character SHA;
  `repository.tag` must resolve to it.
- `repository.digest` is the SHA-256 of the deterministic archive of that commit
  (`git archive --format=tar --prefix= <commit> | gzip -n -9`), so any reviewer can reproduce it.
- `type` is one of `plugin`, `skill`, `mcp`, `utcp`; the catalog does not flatten their risk classes.
- Built-in extensions never appear. An entry is always `external`.
- An empty `extensions` array is a valid catalog. No placeholder or fictional entry is published.
- A revoked entry stays in the catalog with a reason so installed copies can be identified; it is
  never also `enabled`.

The manifest (`schemas/manifest.schema.json`) lives in the extension repository at
`repository.manifestPath` and declares runtime, permissions, dependencies, auth methods and a
declarative configuration form. It mirrors the same identity as the catalog entry; a mismatch is a
rejection, not a merge.

## 3. Catalog service

A core service inside the existing server process, bound to the request location like every other
service (`buildLocationServiceMap`), so project authorization applies unchanged.

Responsibilities:

1. Fetch `catalog.json` from the configured source over HTTPS with a bounded timeout.
2. Validate strictly against the pinned schema; unknown fields fail.
3. Verify the catalog digest and, when present, its signature against the pinned publisher key.
4. Reject duplicate extension IDs and evaluate revoked entries.
5. Send conditional requests (`If-None-Match`/ETag) when the host supports them.
6. Persist the accepted snapshot, its version, digest, source and last-successful-refresh time.
7. Serve the last trusted snapshot when a refresh fails, marked stale/offline. A malformed or
   untrusted response **never** replaces a valid cache.
8. Refresh on explicit request and on a bounded schedule; expose both through the protocol.

Compatibility evaluation compares `compatibility.openbots` with the running version and the
entry's platform list with the host, and marks entries unsupported rather than hiding them.

Custom sources use the same service with a source record: canonical HTTPS URL, trust state
(untrusted until approved), OB-ENV credential reference, ETag, last success. The official source is
built in and cannot be removed.

## 4. Discover

A new route and sidebar entry. Discover is a catalog surface, not a second management surface.

- Views: All, Plugins, Skills, MCP servers, UTCP integrations, Installed, Available updates.
- Search; category and publisher filters; compatibility and platform state; source facet.
- Detail: description, publisher and verification, version and release notes, compatibility,
  permissions, dependencies, auth methods, documentation and integrity information.
- Actions: Install, Update, Uninstall, Refresh — each disabled with a reason when unavailable
  (revoked, incompatible, unsupported platform, built-in, plugin isolation not verified).
- States: loading, empty, stale/offline, invalid catalog, refresh failure, no trusted source.
- Existing Skills, Plugins, MCP and UTCP screens remain authoritative for installed runtime state;
  Discover reads the same services to show installed/update states instead of maintaining a copy.

## 5. Installation pipeline (transactional)

1. Read the catalog entry; validate compatibility, platform and publisher trust.
2. Fetch the pinned commit only (no branch, no default HEAD).
3. Verify the immutable commit and the package digest.
4. Read and validate the manifest against the schema and the catalog identity.
5. Present permissions, dependencies, scripts and credential requirements verbatim.
6. Require explicit approval (permission categories, dependencies, credential access).
7. Collect configuration through the manifest-driven form.
8. Write credentials through OB-ENV only; store references.
9. Install through the existing `ExtensionInstall`/`SkillImport`/manager paths into a staging
   directory.
10. Register with the appropriate runtime (plugin registry, skill roots, MCP config, UTCP registry).
11. Health-check; only then activate and commit the ledger row.
12. On any failure, remove the staged package, registrations and created credential references.

No repository script, hook or postinstall command is ever executed automatically. A declared
dependency or script requires its own approval, and absence of approval fails the install rather
than silently skipping it.

## 6. Configuration and authentication

Configuration is manifest-driven, never provider-specific:

- Field types: `text`, `password`, `secret`, `url`, `number`, `boolean`, `select`.
- Required/optional, default, placeholder, description, validation (pattern, length, numeric range).
- Conditional visibility (`when: {field, equals}`).
- `password`/`secret` fields name an OB-ENV variable (`secret.env`); the form never persists a value.

Authentication reuses existing infrastructure: OAuth authorization-code with PKCE and state in the
managed browser, OIDC/SSO delegated to the identity provider, API keys, personal access tokens, CLI
auth and device code. MFA is completed by the IdP. A connection profile records provider, account
label, project scope, auth method, OB-ENV references, status, expiry, last verification and reauth
state. Reauthentication rewrites the credential envelope and never the manifest.

## 7. Lifecycle

| State | Behaviour |
| --- | --- |
| Installed | Ledger row with version, commit, digest, publisher, source, approval and previous version |
| Configured | Options and OB-ENV references; no secret values |
| Enabled / Disabled | Existing manager state; ledger mirrors it |
| Verify | Health check plus credential verification, recorded with a timestamp |
| Update | Compare installed vs catalog, require approval for new permissions/dependencies/credentials, stage, health-check, switch atomically |
| Rollback | Previous verified package is retained until the new version passes; rollback restores it |
| Uninstall | Registration removed, package removed, credential references released; user data untouched |
| Restart recovery | Interrupted installs/updates reconcile from ledger state: staged packages are discarded, active versions re-verified |

## 8. Security model

- Catalog and manifests are **data**. They cannot widen a permission, bypass approval, name an
  arbitrary environment variable or address a credential value.
- HTTPS-only repository URLs, no userinfo in the URL; private source credentials come from OB-ENV.
- Path containment, symlink/junction refusal, entrypoint containment and archive-size limits on the
  install destination, not only during inspection.
- Publisher verification, release digest, revocation and audit records are mandatory fields of the
  trust decision.
- In-process plugins are the highest-risk class: they install only when the approved isolation
  boundary is verified on the host, otherwise the entry is catalog-only. No claim of sandboxing
  without demonstration.
- Every install, update, rollback, uninstall, refresh, trust change and revocation is written to an
  audit log without secret material.

## 9. Reused schemas and services

`packages/schema/src/extension-repository.ts`, `plugin-marketplace.ts`, `mcp.ts`, `utcp.ts`,
`environment.ts`, `permission.ts`, `sandbox.ts`, `plugin.ts`; `ExtensionRepository`,
`ExtensionInstall`, `PluginManagement`, `PluginUpdate`, `SkillImport`, MCP client/OAuth, UTCP runtime,
OB-ENV, project authorization. Additions are a `marketplace` schema module and protocol group, local
tables for sources/snapshots/ledger/audit, and slides into the existing services — not parallel ones.
