# OpenBots Marketplace Gate A: Gap Analysis

Legend: **V** implemented and verified by source/tests; **U** implemented but unverified in this environment; **P** partial; **N** not implemented; **B** blocked by external dependency.

| Requirement | Status | Evidence | Reuse | Required change / risk | Priority |
|---|---|---|---|---|---|
| Discover sidebar | N | `packages/app/src/project-first/sidebar.tsx` has project navigation; no Discover surface found | settings route, extension page host | Add route and navigation without changing management screens | P0 |
| Official Git source | P | `extension-repository` accepts Git sources; no fixed official source registry | `ExtensionInspect.inspectRepository` | Add immutable official source record and refresh policy | P0 |
| Additional public/private repos | P | URL parser and clone support exist; no saved repository records | `ExtensionSource`, `ExtensionGit` | Add registry, credential selector, trust state and removal | P0 |
| Repo auth/trust/refresh/removal | N | Git errors classify auth; no persisted trust/refresh/removal API | `Git.runGit`, OB-ENV | Add credential references, publisher state and audit events | P0 |
| Unified skill/plugin/MCP catalog | P | schema kind supports all three; `plugin-marketplace` maps only plugins | `ExtensionRepository.Candidate`, aggregate/cache | Create catalog index/adapter preserving kind and built-in exclusion | P0 |
| Built-ins excluded | V for plugin screen | `externalPlugins()` filters inventory; built-ins protected in management | existing plugin/skill origin handling | Apply same rule to catalog and install ledger | P0 |
| Search/filter/source browsing | V for npm plugin search; P overall | `PluginMarketplaceAggregate.search` supports text/source/compatibility | aggregate adapter | Extend to all kinds and repository source facets | P1 |
| Install/update/rollback/uninstall | P | skill install atomic; plugin update/remove; Git installer has install only | `SkillImport.install`, `PluginUpdate`, install security | Add version ledger, package digest, rollback transaction and uninstall per kind | P0 |
| Offline cache | P | plugin cache is in-memory TTL only | aggregate cache | Persist signed catalog snapshots with stale/offline state | P1 |
| Compatibility/integrity | P | API/version checks and commit pinning exist; no digest/signature/publisher proof | detector/security | Add schema compatibility, digest, signature and key rotation | P0 |
| Dynamic configuration | N | plugin configure accepts arbitrary JSON options; MCP config is hand-shaped | `EnvironmentVariables`, MCP config | Add manifest schema interpreter, conditional fields and validation | P0 |
| OAuth/SSO/MFA/API key/PAT | P | MCP OAuth and credential storage exist; no generic auth method model | MCP OAuth, OB-ENV | Add provider-neutral auth definitions; IdP/MFA remains provider-owned | P0 |
| CLI/device-code | P | MCP CLI auth and provider CLIs exist | CLI handlers, browser | Add manifest-driven command adapters with safe env/output rules | P1 |
| Database connections | N | no marketplace connection type | OB-ENV profiles | Add declarative DB fields, TLS options, test-only connection verifier | P1 |
| Registration links | N | no manifest field/UI | browser managed popup | Add external URL with allowlist and audit | P1 |
| Verify/expiry/reauth | P for MCP; N generic | OAuth refresh and `needs_auth` MCP status exist | MCP OAuth, credential IDs | Add generic connection state, expiry and reauth events | P0 |
| Multiple accounts/profiles | P | OB-ENV profile/integration fields exist; MCP server identity is name-based | Environment profiles | Add connection profile identity and selection | P0 |
| Provider integrations | P/B | Official endpoints and auth vary by provider | remote MCP, CLI, REST via UTCP | Add manifests with provider prerequisites; no guarantee of admin consent/licensing | P1 |
| Repository structure/CI | N in requested checkout | no fetched repository available | existing schemas/validation | Create catalog/index, manifests, packages, docs, icons, CI and contribution rules | P0 |
| Security controls | P | clone hardening, approval, sandbox and OB-ENV exist | extension security, permission, audit | Add trust/signature, conflict, digest, update and plugin isolation controls | P0 |
| E2E verification | N | existing focused tests cover primitives, not Discover | app/desktop Playwright suites | Add Gate F end-to-end tests and evidence | P0 |

## Highest-risk gaps

1. In-process plugin execution means package installation is a code-execution boundary. A catalog approval alone is insufficient.
2. The existing `ExtensionRepository.Approval` has approval identity and credential/script flags but no publisher signature, digest, repository trust, or update lineage.
3. Existing caches are process-local and are not suitable for offline catalog operation.
4. Provider authentication cannot be safely generalized by guessing field names. Manifests must declare allowed auth methods and secret destinations.

