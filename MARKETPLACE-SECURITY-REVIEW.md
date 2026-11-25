# OpenBots Marketplace Security Review

Status: updated 2026-11-25 by MP-WP01 for the Git-backed JSON catalog design.

## Posture

The existing extension pipeline is a good inspection foundation: `ExtensionGit` disables hooks and
hostile Git configuration, bounds clone and tree size, blocks submodules and unsafe symlinks, checks
the origin host, and runs static detection. `ExtensionInstall` requires an approver identity and
gates dependencies, scripts and credential sharing separately. `ExtensionInspect` pins the commit it
inspected. OB-ENV stores credentials as AES-256-GCM envelopes outside the repository and the profile.

What is missing is the trust chain around that pipeline: nothing calls it, and it has no digest,
publisher verification, install ledger, revocation or rollback. MP-WP01 records that as the gap
register; this document states the controls the marketplace must enforce.

## Trust chain

| Control | Required behaviour |
| --- | --- |
| Official source | Built in, HTTPS-only, pinned in the server; cannot be removed or shadowed |
| Catalog authenticity | Digest of `catalog.json` verified against the accepted snapshot; signature checked when present |
| Publisher | Reviewed publisher record; `verified` shown as a claim only when reviewed; unverified stays visibly unverified |
| Release integrity | Tag must resolve to the pinned full commit; archive digest must match the catalog before the manifest is read |
| Immutable install | Ledger records commit, digest, publisher, source, approval and previous version; a version is never repointed |
| Revocation | Revoked entries cannot install; installed copies are flagged; reason recorded |
| Custom sources | Untrusted until explicit user approval; credential via OB-ENV; removal supported |
| Catalog failure | Malformed, unsigned-when-required or digest-mismatched refreshes never replace the last trusted snapshot |

## Trust boundary of each extension kind

| Kind | Risk | Install rule |
| --- | --- | --- |
| Skill | Instructions and files; no execution by the skill loader | Allowed with approval; files land in a project or global skill root |
| MCP (remote) | Network calls through a server whose auth the user grants | Allowed with approval; origin, auth and project scope enforced |
| UTCP | HTTP operations described by a provider document | Allowed with approval; credential references only |
| Plugin | **Executes inside the OpenBots server process** | Allowed only when the approved isolation boundary is verified on the host; otherwise catalog-only and visibly unavailable |

No catalog metadata or manifest may change which of these rules applies. `type` selects the runtime;
it does not grant trust.

## Installation controls

- Fetch only the pinned commit; reject branch names, short SHAs and mutable tags.
- Validate the manifest against `schemas/manifest.schema.json` and against the catalog entry
  (id, version, publisher, type). A mismatch aborts.
- Re-assert path containment, symlink/junction refusal, entrypoint containment and size limits at the
  install destination, not only during inspection.
- Never execute repository scripts, lifecycle hooks, postinstall commands or `git` filters.
- Require explicit approval for: permission categories, dependencies, install scripts and credential
  access. "Allow all" does not imply any of them.
- Install transactionally: stage, register, health-check, then activate. On failure remove staged
  files, registrations and created credential references.
- Keep the previous verified package until the new version passes its health checks; roll back on
  failure.

## Credentials

- Manifests may name an OB-ENV variable (`secret.env`); they may not carry a value.
- `catalog.json` is scanned for credential-shaped properties by `scripts/validate-catalog.mjs`; a
  catalog carrying them fails validation.
- OAuth uses authorization code + PKCE, state validation and a loopback callback; tokens are stored in
  OB-ENV and refreshed without touching manifests.
- MFA and SSO are completed by the identity provider; OpenBots never collects MFA secrets.
- CLI and device-code flows may not promote arbitrary output to a secret unless the manifest declares
  the extractor and the user approves it.
- Logs, audit records and error messages redact credential values and URLs carrying userinfo.

## Project isolation and authorization

Every catalog, install, update, rollback, verify and uninstall request is bound to a location/project
through the existing middleware. Catalog cache and ledger rows are keyed by project scope; a project
cannot read or mutate another project's installed records or connection profiles. Global-scope
operations require the same approval as project-scope ones.

## Audit

Recorded without secrets: source refresh (success, failure, stale, digest), trust changes, approval
(publisher, permissions, dependencies, scripts, credentials), install, update, rollback, uninstall,
verification, revocation. Audit records are append-only and survive restart.

## Known limits to state honestly

- Plugin isolation is **not demonstrated** on the audited host: the AppContainer launcher is blocked
  by the host's Application Control policy, and the product fails closed. Until isolation is verified,
  plugin entries must not be installed.
- The packaged Windows installer and the sandbox launcher are blocked by the same host policy; this is
  an environment limitation, not a passing control.
- macOS verification is unavailable; no platform claim is made for it.
- CI cannot run jobs because of the account billing condition; local checks are the current evidence.

## Provider compatibility notes

These are external constraints that manifests describe, not bypass. Verified against official
documentation on 2026-11-22 and to be revalidated when a provider entry is published.

| Provider | Official path | Auth / restrictions |
| --- | --- | --- |
| Jira, Confluence, Bitbucket | Atlassian remote MCP; REST APIs | OAuth 2.1 or API token; org/site admin controls, scopes, IP allowlists |
| Azure DevOps | Microsoft remote/local MCP and REST | Entra identity and organization; custom app registration may be required; PAT fallback |
| GitHub | Official remote/local GitHub MCP and REST | OAuth or PAT; enterprise managed users may restrict PATs; SSO policies apply |
| Figma | Remote MCP or desktop MCP | Dev/Full seat and paid plan requirements; rate limits |
| AWS | AWS MCP managed endpoint / Agent Toolkit | IAM/Identity Center, SigV4 or AWS Sign-In OAuth; least privilege; service charges remain |
| Argo CD | `argoproj-labs/mcp-for-argocd` or CLI/API | JWT/API token and Argo RBAC; self-hosted network policy |
| Kibana / Elastic | Elastic Agent Builder MCP endpoint | API key or OAuth 2.1 by deployment; space and license limits |
| Jenkins | Jenkins MCP Server plugin | API token/basic auth; controller must enable the plugin; Jenkins permissions apply |
| SonarQube | Official SonarQube MCP Server | Token or hosted OAuth; self-hosted uses tokens; license and version prerequisites |

## Decisions that must hold

- No credential value in `catalog.json`, a manifest, a Git repository, an install log or an error.
- No manifest may request arbitrary environment variables; OB-ENV names plus explicit grants only.
- No remote MCP URL may bypass origin, network or project policy.
- No plugin install may be approved on the strength of catalog metadata alone.
