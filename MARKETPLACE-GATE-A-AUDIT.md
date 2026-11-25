# OpenBots Gate A: Discover Marketplace Architecture Audit

> **Superseded by [MARKETPLACE-MP-WP01-AUDIT.md](MARKETPLACE-MP-WP01-AUDIT.md) (2026-11-25).**
> Kept as history. Three statements are no longer current: the OpenBots baseline moved from
> `92914f67` to `b2dd3a39`; the approved design is a root `catalog.json` with per-extension Git
> repositories (not a signed `catalog/index.json`); and D-WP-R00-23 (packaged plugin list) was added
> and investigated in MP-WP01, where it did not reproduce at source level.

Date: 2026-11-22  
Status: **Audit complete, implementation not started**  
Scope: OpenBots source checkout observed at `D:\app\proj\openbots-dev`, commit `92914f67e4827dd159c5b7a8de0cf26ad43e1429` on `fix/OB-project-folder-icons`.

## Executive finding

OpenBots already has most of the execution primitives needed for a marketplace: Git URL parsing and hardened cloning, static extension detection, approval-aware skill/MCP installation, npm plugin discovery, MCP OAuth, UTCP, OB-ENV encrypted credentials, project authorization, sandbox policies, and separate Skills, Plugins, and MCP settings surfaces.

The requested Discover marketplace is **not release-ready**. The primary gaps are a repository registry and catalog API, a unified catalog for all three extension kinds, dynamic manifest-driven setup, private-repository credential flow, publisher/signature verification, package integrity and rollback, and public server/UI wiring. The current plugin marketplace is discovery-only and intentionally blocks plugin installation because plugins run in the server process.

## Repository verification

| Check | Result | Evidence / limitation |
|---|---|---|
| Requested repository | Blocked | `https://github.com/b20vineeth/openbots-marketplace.git` could not be cloned because the environment could not start a DNS/network thread. |
| Local target directory | Verified empty before work | `D:\app\proj\openbots-marketplace` had no checkout. |
| OpenBots source checkout | Verified by readable Git metadata | `D:\app\proj\openbots-dev`, HEAD `92914f67...`, branch `fix/OB-project-folder-icons`. |
| Current worktree status | Unverified | Git reports “this operation must be run in a work tree” in the managed checkout. |
| Latest `origin/main` | Blocked | Fetch could not write `.git/FETCH_HEAD` (`Permission denied`). Existing `FETCH_HEAD` was inspected but not treated as fresh. |
| Worktrees | Partially verified | Existing `.worktrees` and `.audit` entries were listed; no worktree was deleted or modified. |
| Marketplace PR/branch history | Unverified for the requested repository | Remote checkout was unavailable. Local OpenBots refs contain marketplace-related commits listed below. |

Local OpenBots marketplace-related history observed: `6c48fe1b` (inspect/install extensions from Git), `a6c2c43e` (MCP marketplace discovery), `d7dd3218` (skills from Git/folder/ZIP), `0a058ecd` (npm/Git plugin discovery), `094b7dc0` (plugin and skill settings management), and `8637b53f` (runtime verification). These are source evidence, not proof of the requested marketplace repository state.

## Existing infrastructure audit

| Area | Existing source and API | Assessment |
|---|---|---|
| Skills | `packages/core/src/skill/{discovery,import,managed}.ts`; `packages/server/src/handlers/skill.ts`; `packages/protocol/src/groups/skill.ts`; `packages/app/src/settings/extensions/skill-manager.tsx`, `skill-import-dialog.tsx` | Git/folder/ZIP preview, conflict handling, atomic copy and global/project scope exist. |
| Plugins | `packages/core/src/plugin/management.ts`; `packages/server/src/handlers/plugin.ts`; `packages/protocol/src/groups/plugin.ts`; `packages/app/src/settings/extensions/plugin-manager.tsx` | Installed inventory, preview, install/remove/enable/configure/update exist. Plugin options reject secret-shaped keys. Package installation still executes third-party code in the server process and has no per-plugin manifest permission model. |
| MCP | `packages/core/src/mcp/{client,oauth,stdio}.ts`; `packages/server/src/handlers/mcp.ts`; `packages/protocol/src/groups/mcp.ts`; `packages/app/src/settings/extensions/mcp-manager.tsx` | Local and remote MCP, connect/disconnect, config persistence, tool catalog and OAuth exist. |
| UTCP | `packages/core/src/utcp/{connection,manual,runtime}.ts`; `packages/schema/src/utcp.ts` | HTTP manual discovery, project scope, enable/disable, refresh and credential references exist. |
| Git extension pipeline | `packages/core/src/extension-repository/{source,git,inspect,detect,install,security}.ts`; `packages/schema/src/extension-repository.ts`; `packages/core/test/extension-repository.test.ts` | URL validation, shallow/pinned clone, host check, hooks/config neutralization, limits, symlink/submodule/path checks, static detection and approval-aware install are verified by focused tests. No public marketplace registry route consumes this pipeline. |
| Plugin marketplace | `packages/core/src/plugin-marketplace/{aggregate,git,npm,types}.ts`; `packages/schema/src/plugin-marketplace.ts`; `packages/core/test/plugin-marketplace.test.ts` | npm and inspected-Git plugin search, filtering, dedupe and short-lived in-memory cache exist. It only maps plugin candidates; installation is explicitly unavailable. |
| Credentials / OB-ENV | `packages/core/src/environment-variables.ts`; `packages/core/src/credential/{envelope,keystore}.ts`; migrations `20261109233656_ob-env-secure-environment-management.ts`, `20261110000751_ob-env-environments-and-defaults.ts`; `packages/server/src/handlers/environment.ts` | AES-256-GCM envelopes with AAD, OS/file key store, scopes/profiles/integrations, grants, reveal/use/delete audit are present. Marketplace manifests must store references and metadata only, never values. |
| OAuth / browser auth | `packages/core/src/mcp/oauth.ts`, `packages/core/src/oauth/page.ts`; `packages/app/src/settings/browser/browser.tsx`; desktop browser E2E under `packages/desktop/e2e/browser` | MCP OAuth callback/state handling and managed browser infrastructure exist. A generic provider-agnostic OAuth/SSO profile service is not present. |
| CLI auth | `packages/cli/src/commands/handlers/mcp/{auth,add,resolve,logout}.ts`; provider CLI adapters in `packages/core/src/plugin/provider` | MCP CLI auth exists; generic CLI/device-code manifest execution and safe output-to-credential binding do not. |
| Project authorization | `packages/server/src/auth.ts`, `packages/server/src/middleware/authorization.ts`, location middleware and project-scoped environment grants | Paired credentials can be limited to project IDs; route-level marketplace/project checks still need to be designed. |
| Sandbox | `packages/core/src/sandbox/*`, `packages/core/src/sandbox/policy.ts`, `packages/core/src/sandbox/capability.ts` | Capability classification, read-only denials and platform drivers exist. Third-party in-process plugins are not isolated by this mechanism. |
| Persistence/config | Config plugin/MCP documents, environment SQL tables, skill roots, plugin registry and update service | Existing persistence can be reused. There is no marketplace source registry, catalog snapshot, install ledger, publisher key record or rollback ledger. |
| Sidebar/routing | `packages/app/src/project-first/sidebar.tsx`; `packages/app/src/settings/route.ts`; runtime extension settings/page modules | Settings routing and independent management screens exist. A Discover route/sidebar item is absent in the audited checkout. |

## Consolidated readiness report

**Readiness: NOT READY for Gate B implementation.** Gate A is complete as a source audit, subject to the repository/network verification blocker above.

Blockers:

1. The requested marketplace repository could not be fetched in this environment.
2. OpenBots Git status/fetch is not operational in the managed checkout, so branch/PR freshness is not claimable.
3. There is no public repository-registry/catalog protocol or persistence model.
4. Plugin execution is in-process; a marketplace cannot safely treat arbitrary plugin packages as equivalent to skills or remote MCP until isolation and permissions are resolved.
5. Generic dynamic authentication and connection profiles are not implemented.

Decisions requiring approval before Gate B:

- Make `openbots-marketplace` the signed official source, with source ID and trust policy fixed in OpenBots.
- Decide whether third-party plugins are initially catalog-only, or installed only when isolated by a separate process/sandbox.
- Choose publisher verification: signed commits/tags, signed manifests, or both.
- Define the manifest version and compatibility policy.
- Define whether private Git credentials may come from existing OS Git helpers, OB-ENV, or both.
- Define catalog refresh and offline-cache retention rules.

