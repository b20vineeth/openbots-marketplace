# MP-WP01 — Marketplace Implementation Audit and Gap Register

Date: 2026-11-25
Status: **MP-WP01 complete** — audit and sequencing only; no OpenBots production code changed
OpenBots baseline: `D:\app\proj\openbots-dev`, HEAD `b2dd3a3920f6982f3e64014fea016f552f452c0d`,
branch `fix/OB-wp-r00b-packaged-runtime`, 2026-11-25 15:34 −0600, remote `b20vineeth/openBots`
Marketplace repository: `b20vineeth/openbots-marketplace`, `main` at `2f433e11` before this package

This package replaces the earlier Gate A audit, which was taken at `92914f67` and proposed a signed
`catalog/index.json`. The approved design is a single root `catalog.json` with per-extension Git
repositories, so the previous document is retained only as history (see
[MARKETPLACE-GATE-A-AUDIT.md](MARKETPLACE-GATE-A-AUDIT.md)) and every status below was re-verified
against the current tree.

---

## 1. Method and limitations

Every row below was checked in the working tree at the stated HEAD: file paths, exported services,
protocol groups, handler registration, UI directories and the presence or absence of catalog code.
No claim is made from memory or from the earlier audit.

| Verification | Result |
| --- | --- |
| Source checkout | Verified: HEAD and branch read from Git metadata |
| Working tree | Pre-existing modifications under `doc/*.png`, `doc/audit/screenshots/.run.json` and untracked evidence directories only; no source file modified by this package |
| Protocol surface | `packages/protocol/src/groups/` enumerated: no `marketplace`, `catalog` or `extension` group |
| Server handlers | `packages/server/src/handlers/` enumerated: no `marketplace` or `catalog` handler |
| Settings UI | `packages/app/src/settings/extensions/` enumerated: no Discover surface |
| Plugin list defect | Reproduced against the server test harness at this HEAD; see §5 |
| Packaged Windows rerun | **Not performed** in this pass — it needs the 860 MB packaged build; carried to MP-WP09 |
| macOS | **Not available**; no claim of verification |
| GitHub Actions | **Executes on this repository**: the catalog workflow run `45708623189` concluded `success`. The OpenBots repository's jobs remain blocked by the account billing condition recorded in WP-R00B, so OpenBots-side checks stay local |
| Marketplace repository at start | Docs only (`MARKETPLACE-*.md`, placeholder README); remote reachable over HTTPS; empty catalog absent |

---

## 2. Existing capability matrix

Legend: **I** implemented and source-verified · **P** partial · **D** defective or unreachable ·
**M** missing.

| Area | Status | Source evidence | Assessment |
| --- | --- | --- | --- |
| Discover UI | **M** | `packages/app/src/settings/extensions/` holds only MCP, plugin and skill managers; `packages/app/src/settings/route.ts` tabs are `general`, `projects`, `providers`, `extensions` (plus GUI-extension tabs) | No catalog browsing surface exists |
| Plugin Marketplace services | **P** | `packages/core/src/plugin-marketplace/{aggregate,git,npm,types}.ts`; `aggregate.ts:26-70` | npm and inspected-Git *search* only, plugin kind only, in-memory TTL cache, no persistence, no install |
| Extension repository inspection | **I** | `packages/core/src/extension-repository/{source,git,inspect,detect,security}.ts`; `source.ts:77-104` | URL parsing (https/ssh/git), host checks, hardened clone, static detection, candidate preview |
| Git-based installation | **D** | `packages/core/src/extension-repository/install.ts:12-14` states the pipeline “exposes … but no route or UI calls it”; approval gates at `:65-108` | Correct core, unreachable from product; no marketplace caller |
| Skills management | **I** | `packages/core/src/skill/{discovery,import,managed}.ts`; `packages/server/src/handlers/skill.ts`; `packages/app/src/settings/extensions/{skill-manager,skill-import-dialog,skill-dialog}.tsx` | Git/folder/ZIP preview, conflict handling, atomic copy, global/project scope |
| Plugin management | **P** | `packages/core/src/plugin/management.ts`; `packages/server/src/handlers/plugin.ts`; `packages/app/src/settings/extensions/plugin-manager.tsx` | Inventory/preview/install/remove/enable/configure/update; plugin code runs **in the server process**; no per-plugin permission manifest (`management.ts` install warning) |
| MCP | **I** | `packages/core/src/mcp/{client,oauth,stdio}.ts`; `handlers/mcp.ts`; `settings/extensions/mcp-manager.tsx` | Local/remote MCP, tool catalog, OAuth, `needs_auth` state |
| UTCP | **I** | `packages/core/src/utcp/{connection,manual,runtime}.ts`; `packages/schema/src/utcp.ts` | HTTP manual discovery, project scope, enable/disable, credential references |
| Extension SDK and plugin host | **I** | `packages/core/src/plugin/{host,sdk,instance,source-directory}.ts`; `packages/schema/src/plugin.ts` | Built-in and SDK plugins; built-ins are marked `source: {type:"builtin"}` and are not installable |
| Authentication services | **P** | `packages/server/src/auth.ts`; `packages/server/src/middleware/authorization.ts`; `packages/core/src/mcp/oauth.ts`; `handlers/environment.ts`, `handlers/credential.ts` | Server credential, project authorization and MCP OAuth exist; no provider-neutral extension auth/profile service |
| OB-ENV | **I** | `packages/core/src/environment-variables.ts`; `packages/core/src/credential/{envelope,keystore}.ts`; migrations `20261109233656`, `20261110000751` | AES-256-GCM envelopes with AAD, OS/file key store, scopes, profiles, integrations, grants, reveal/use/delete audit |
| Project permissions | **I** | `packages/server/src/middleware/authorization.ts`; `packages/server/src/location.ts`; per-location service graph in `packages/core/src/location-services.ts` | Requests are resolved to a location/project; project-scoped grants exist |
| Local persistence | **P** | Config documents `openbots.json`/`.jsonc` with `plugins[]` (`packages/core/src/config.ts:565-612`); SQLite environment tables; skill/plugin directories | No catalog snapshot store, install ledger, publisher key record or rollback record |
| Extension lifecycle | **P** | `plugin/management.ts`, `plugin/update.ts`, `skill/import.ts` | Per-surface install/enable/disable/update; no unified ledger, health check, verified rollback or restart recovery for catalog installs |
| Catalog service | **M** | No catalog fetch/validate/cache code in `packages/core/src` or `packages/server/src`; no protocol group | Nothing consumes `catalog.json` today |
| Catalog repository | **I** (this package) | `catalog.json`, `schemas/*.schema.json`, `icons/`, `scripts/validate-catalog.mjs`, `.github/workflows/validate-catalog.yml` | Empty valid catalog published with schemas, validator and CI |
| Publisher trust and integrity | **M** | `extension-repository` has commit pinning but no digest, signature or publisher key (no crypto reference in the package); `schema/extension-repository.ts` records approval identity only | Integrity is trust-on-first-fetch |
| Dynamic configuration | **M** | `plugin/management.ts` accepts free-form `options` and rejects secret-shaped keys; MCP config is hand-shaped in `settings/extensions/mcp-config.ts` | No declarative form interpreter, conditional fields or validation |
| Connection profiles | **P** | OB-ENV profiles/integrations/grants | No extension-level profile identity, verification or reauth state |
| Custom marketplace sources | **M** | None | Only the built-in product; no source registry |
| Audit logging | **P** | Environment access audit; install approval callback in `extension-repository/install.ts` | No catalog refresh, trust, install, update, rollback or revocation events |
| Packaged runtime | **P** | `packages/desktop/script/packaged-smoke.ts` (WP-R00B) | Launches, authenticates and records plugin load; one unresolved list observation (D-WP-R00-23) |

---

## 3. Gap register

Severity: **P0** blocks the approved architecture · **P1** required for a usable marketplace ·
**P2** important hardening · **P3** follow-up.

| ID | Gap | Severity | Work package |
| --- | --- | --- | --- |
| MP-G-01 | No catalog client: fetch, strict schema validation, integrity check, cache, offline state | P0 | MP-WP02 |
| MP-G-02 | No catalog persistence: snapshot, last-successful refresh, ETag, catalog version | P0 | MP-WP02 |
| MP-G-03 | No duplicate-identity, revoked-entry or compatibility evaluation | P0 | MP-WP02 |
| MP-G-04 | No source registry and no trust state for custom sources | P1 | MP-WP07 |
| MP-G-05 | No Discover route, sidebar entry, catalog list/detail or status filters | P0 | MP-WP03 |
| MP-G-06 | No unified installed-extension view joining Skills, Plugins, MCP and UTCP | P1 | MP-WP03 |
| MP-G-07 | Git install pipeline has no caller, no digest/signature verification and no transactional install | P0 | MP-WP05 |
| MP-G-08 | No install ledger (version, commit, digest, publisher, approval, previous version) | P0 | MP-WP05 |
| MP-G-09 | No manifest-driven configuration form; plugin/MCP setup is hand-shaped per surface | P0 | MP-WP04 |
| MP-G-10 | No extension auth/profile model reusing OB-ENV for OAuth, API key, PAT, CLI, device code | P0 | MP-WP04 |
| MP-G-11 | No permission-diff approval on update, no staged activation or health check | P0 | MP-WP06 |
| MP-G-12 | No rollback path that preserves the previous verified version | P0 | MP-WP06 |
| MP-G-13 | No uninstall that removes registration, cached package and credential references atomically | P1 | MP-WP06 |
| MP-G-14 | No marketplace audit events (refresh, trust, install, update, rollback, revoke) | P1 | MP-WP06 |
| MP-G-15 | No restart recovery for interrupted installs/updates | P1 | MP-WP06 |
| MP-G-16 | No revocation enforcement against installed extensions | P1 | MP-WP06 |
| MP-G-17 | Plugin execution remains in-process with no permission manifest or isolation | P0 for plugin installs | MP-WP05 (policy gate) |
| MP-G-18 | Path traversal, symlink/junction protection exists in inspection but is not asserted on the install destination | P1 | MP-WP05 |
| MP-G-19 | No deterministic local test extension or end-to-end marketplace suite | P0 | MP-WP08 |
| MP-G-20 | Packaged-runtime plugin list observation (D-WP-R00-23) unresolved in the packaged build | P3 | MP-WP09 |
| MP-G-21 | Catalog repository had no schemas, validator, CI, icons or contract | P0 | MP-WP01 (delivered) |

---

## 4. Reusable services (do not duplicate)

| Need | Reuse |
| --- | --- |
| Repository URL validation, hardened clone, static detection, candidate preview | `ExtensionRepository` (`source`, `git`, `inspect`, `detect`, `security`) |
| Approval semantics and dependency/script/credential gates | `ExtensionInstall` (`install.ts:65-108`) and `Permission.ApprovalDefault` |
| Skill install, conflict handling, atomic copy | `packages/core/src/skill/import.ts` |
| Plugin lifecycle (`install`, `remove`, `setEnabled`, `configure`, update) | `PluginManagement`, `PluginUpdate` |
| MCP registration, OAuth, `needs_auth` | `packages/core/src/mcp/*`, `handlers/mcp.ts` |
| UTCP registration and credentials | `packages/core/src/utcp/*` |
| Secrets, profiles, grants, audit | OB-ENV (`environment-variables.ts`, `credential/*`, `handlers/environment.ts`) |
| Project scoping and request authorization | `server/location.ts`, `middleware/authorization.ts`, per-location service graph |
| Built-in exclusion | `Plugin.Source` (`builtin`/`sdk`) and existing `externalPlugins()` filtering |
| Persistence | Config documents plus SQLite migrations already used by OB-ENV |

No marketplace engine, credential store or extension runtime is introduced. The catalog service is a
consumer of these services plus two new local tables and one protocol group.

---

## 5. Defect register

### D-WP-R00-23 — packaged runtime reports plugin loading while `GET /api/plugin` returns an empty list

Recorded in WP-R00B as P3 and previously uninvestigated. Investigation in this package:

1. **Source path.** `Plugin.list` returns the inventory of the `Plugin.Service` bound to the
   *request's location* (`packages/core/src/plugin.ts:42-45`); `handlers/plugin.ts` wraps it in the
   standard `{location, data}` response. `ConfigPluginSource.scan` discovers file plugins under the
   `plugin`/`plugins` directory of every configuration directory entry
   (`packages/core/src/config/plugin/source.ts:118-140`), and global configuration entries are
   loaded for every location (`packages/core/src/config.ts:380-403`).
2. **Reproduction executed.** A focused test at HEAD seeded
   `<global>/plugins/smoke.ts`, started the real server through `packages/server/test/fixture/server`,
   and queried `GET /api/plugin` both scoped to a *different* project directory and unscoped. The
   seeded plugin appeared in **both** lists with `source: {type:"local"}`, `state: {status:"active"}`,
   alongside the built-in inventory. Result: **1 pass, 0 fail** in 6.58 s
   (`bun test test/tmp-repro.test.ts` from `packages/server`). The temporary test was removed after
   the run; no source file was changed.
3. **Conclusion.** The defect **does not reproduce at source level**. Global file plugins are
   location-independent and visible through the API. The WP-R00B observation is therefore specific
   to the packaged desktop path (the app's request/host wiring or the smoke's assertions), not to the
   plugin registry. It cannot be closed honestly without re-running the packaged build, which this
   package deliberately avoids (860 MB build, and the brief requires minimising disk and builds).
4. **Carried to MP-WP09** with the exact expectation the rerun must assert: the seeded plugin appears
   in `GET /api/plugin` for both the default and the project location, and the response contains the
   built-in inventory. If the packaged run still returns `data: []`, the defect is in the desktop's
   HTTP path, not in `Plugin.Service`, and the reproducer above is the control.

### Carried defects and blockers (not caused by this design)

| ID | Status | Impact on the marketplace |
| --- | --- | --- |
| D-WP-R00-17 | Partial, owner action | `pwsh`/`rg` absent on the host; affects diagnostic and one installer test, not catalog code |
| Sandbox launcher | Blocked by host Application Control | Plugin/extension isolation cannot be demonstrated on this host; MP-WP05 must fail closed rather than claim isolation |
| NSIS installer | Blocked by host Application Control | Packaged installer verification remains unavailable |
| GitHub Actions | Blocked for `openBots` | The catalog workflow executes on this repository; OpenBots-side jobs still cannot start, so OpenBots checks remain local |

---

## 6. Proposed source changes (for approval, not applied)

| File / area | Change | Package |
| --- | --- | --- |
| `packages/schema/src/marketplace.ts` (new) | Catalog, entry, publisher, source, snapshot, installed record, approval, connection profile schemas | MP-WP02 |
| `packages/schema/src/extension-repository.ts` | Add digest, publisher key, source ID and rollback lineage to approval/plan types | MP-WP05 |
| `packages/core/src/marketplace/catalog.ts` (new) | Fetch, validate, verify digest, ETag, timeout, duplicate/revocation evaluation | MP-WP02 |
| `packages/core/src/marketplace/store.ts` (new) | SQLite snapshot/source/ledger persistence via existing migration path | MP-WP02 |
| `packages/protocol/src/groups/marketplace.ts` (new) | Catalog, refresh, sources, installed, install, update, rollback, uninstall, verify groups | MP-WP02 |
| `packages/protocol/src/api.ts` + generated clients | Register the group; regenerate client | MP-WP02 |
| `packages/server/src/handlers/marketplace.ts` (new) | Handlers delegating to catalog service and existing managers | MP-WP02 |
| `packages/app/src/settings/discover/*` (new) | Discover route, list, filters, detail, install/update/uninstall dialogs | MP-WP03 |
| `packages/app/src/settings/route.ts`, sidebar | Add Discover navigation without changing Skills/Plugins/MCP pages | MP-WP03 |
| `packages/core/src/marketplace/config-form.ts` (new) | Manifest field interpreter (types, conditions, validation, secret references) | MP-WP04 |
| `packages/core/src/marketplace/install.ts` (new) | Transactional orchestration: verify → approve → configure → register → health check | MP-WP05 |
| `packages/core/src/marketplace/lifecycle.ts` (new) | Update staging, rollback, uninstall, restart reconciliation, revocation | MP-WP06 |
| `packages/core/src/marketplace/audit.ts` | Audit events through the existing audit sink | MP-WP06 |
| Migrations | `marketplace_source`, `catalog_snapshot`, `installed_extension`, `marketplace_event` | MP-WP02/06 |

No new backend service, database, hosting dependency, extension manager or credential service is
introduced. Everything runs in the existing server and the existing per-location service graph.

---

## 7. API and schema changes (proposed)

```
GET    /api/marketplace/catalog?refresh=        catalog + cache state (last success, stale, offline)
POST   /api/marketplace/refresh                 conditional refresh with ETag
GET    /api/marketplace/sources                 source registry and trust state
POST   /api/marketplace/sources                 add custom source (untrusted until approved)
POST   /api/marketplace/sources/:id/trust       explicit trust approval
DELETE /api/marketplace/sources/:id             remove a custom source
GET    /api/marketplace/installed               installed records joined to live runtime state
POST   /api/marketplace/install                 plan → approval → install (transactional)
POST   /api/marketplace/update                  staged verified update + health check
POST   /api/marketplace/rollback                restore the previous verified version
POST   /api/marketplace/uninstall               remove registration and package
POST   /api/marketplace/verify                  connection and health verification
```

All routes are project/location scoped through the existing middleware and require explicit approval
payloads; none accepts a credential value.

---

## 8. Security gaps to close before install is enabled

| Gap | Current state | Required control |
| --- | --- | --- |
| Publisher trust | Descriptive only | Reviewed publisher record; `verified` flag; key or tag verification |
| Package integrity | Commit pinning | Digest verification of the fetched archive against the catalog entry |
| Catalog authenticity | None | Digest + optional signature of `catalog.json`, pinned official source |
| Revocation | None | Revoked entries cannot install; installed copies flagged |
| Plugin isolation | In-process execution | Install only inside an approved isolation boundary, otherwise catalog-only |
| Path safety on install | Inspection-side checks | Re-assert destination containment, symlink/junction refusal and entrypoint containment |
| Credential isolation | OB-ENV good | Manifests reference OB-ENV names only; reject inline secrets; redact logs |
| Dependency/script approval | Existing gates unused | Route every catalog install through `ExtensionInstall` approval; never auto-run repo scripts |
| Audit | Partial | Record refresh, trust, approval, install, update, rollback, uninstall and revocation |
| Custom sources | Absent | Untrusted by default; explicit approval; OB-ENV credentials; HTTPS only |

The catalog and manifest are **data**: neither may widen a permission, bypass approval or address a
credential directly.

---

## 9. Work packages and confirmed sequence

| Package | Scope | Depends on | Exit criteria |
| --- | --- | --- | --- |
| **MP-WP01** (this) | Audit, gap register, architecture update, catalog repository infrastructure | — | Source-backed register; empty valid catalog; schemas, validator, CI |
| MP-WP02 | Catalog service, persistence, protocol group, handlers | WP01 | Strict validation, ETag refresh, offline cache, duplicate/revocation detection, last trusted catalog retained on failure |
| MP-WP03 | Discover UI and unified catalog views | WP02 | All/plugins/skills/MCP/UTCP/installed/updates filters, search, detail, offline/error states, existing managers authoritative |
| MP-WP04 | Manifest-driven configuration and OB-ENV authentication | WP02 | Declarative fields incl. conditional/validation; auth methods; multiple profiles; verification/reauth; no secret values stored |
| MP-WP05 | Secure Git installation transaction | WP02, WP04 | Verified commit/digest, manifest validation, permission/dependency approval, atomic install, no orphan credentials |
| MP-WP06 | Lifecycle: update, rollback, uninstall, restart recovery, audit, revocation | WP05 | Permission-diff approval, staged activation, health check, rollback, reconciliation, audit trail |
| MP-WP07 | Custom marketplace sources and private repositories | WP02, WP05 | Explicit trust, OB-ENV credentials, HTTPS-only, removal; official source cannot be removed |
| MP-WP08 | Deterministic local test extension and end-to-end verification | WP02–WP07 | Catalog discovery, offline, install, config, approval, registration, execution, isolation, update, rollback, uninstall, restart, invalid manifest, malicious package |
| MP-WP09 | D-WP-R00-23 packaged reproduction and closure | WP03, packaged host | Packaged smoke asserts the plugin list for default and project locations |

**Sequence confirmed:** WP02 → WP03 → WP04 → WP05 → WP06 → WP07 → WP08, with WP09 running beside
WP03 once a packaged build is available. WP03 and WP04 may proceed in parallel after WP02 because
neither writes the install path; WP05 is the first package that mutates installed state, so it starts
only after WP04's configuration and credential model exists.

---

## 10. Verification evidence for this package

| Check | Command | Result |
| --- | --- | --- |
| Empty catalog accepted | `node scripts/validate-catalog.mjs` | **PASS**, exit 0: `0 catalog entries` |
| Complete entry accepted | validator on a fixture repository copy | **PASS**, exit 0: `1 catalog entry` |
| Duplicate extension ID | fixture | **FAIL as intended**: `duplicates extension id "com.example.demo"` |
| Short/moving commit | fixture | **FAIL as intended**: `does not match ^[0-9a-f]{40}$` |
| Credential-shaped property | fixture | **FAIL as intended**: unexpected property and credential-property rule both fire |
| Revoked without reason | fixture | **FAIL as intended**: `a revoked entry must state revokedReason` |
| Missing icon file | fixture | **FAIL as intended**: `references a missing file` |
| Credentials in repository URL | fixture | **FAIL as intended**: `does not match ^https://[^@\s]+$` |
| Plugin list defect reproduction | `bun test test/tmp-repro.test.ts` in `packages/server` | **1 pass, 0 fail**; plugin visible in scoped and unscoped lists; test removed |
| Production code changed | `git status` in `openbots-dev` | No source change by this package |
| CI on this repository | workflow `validate-catalog.yml` | **PASS** — check run `validate` completed `success`, run `45708623189` |

Negative fixtures ran against a temporary copy of `scripts/`, `schemas/`, `icons/` and
`catalog.json`, so the published catalog was never replaced by invalid data.

---

## 11. Verification results

| Evidence | Result |
| --- | --- |
| Official catalog | `catalogVersion` `2026.11.25`, `extensions: []`, validates |
| Schemas | `schemas/catalog.schema.json` and `schemas/manifest.schema.json` parse as JSON Schema 2020-12 documents with `$id`, `title`, `type: object` |
| Validator | dependency-free, no `node_modules`, exit 0 on the published catalog |
| Negative fixtures | 6 of 6 rejected with the intended message; complete entry accepted |
| Reproducer for D-WP-R00-23 | single focused server test, 1 pass / 0 fail, removed after the run |
| OpenBots tree | unchanged by this package (no source file added, removed or modified) |
| CI | GitHub Actions ran the new workflow on the pull request and reported `validate: success` (run `45708623189`, job `139536944969`) |

---

## 12. Readiness

**Marketplace readiness: NOT READY for production use.** The application has no catalog client, no
Discover surface, no reachable Git install path, no install ledger and no revocation, so no extension
can be published or installed through the approved architecture today.

**Ready for implementation.** MP-WP01 is complete: the gap register is source-backed, every reusable
service is identified, the sequence and dependencies are confirmed, the official catalog repository
now has a valid empty catalog with schemas, validator and CI, and the one carried marketplace-adjacent
defect (D-WP-R00-23) is narrowed with a control reproducer and an explicit packaged rerun.
