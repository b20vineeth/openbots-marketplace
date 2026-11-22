# OpenBots Marketplace Security Review

## Security posture

The current extension pipeline is a strong inspection foundation, but it is not a complete marketplace trust system. `ExtensionGit` disables hooks and hostile Git configuration, bounds clone/tree size, blocks submodules and unsafe symlinks, checks origin host, and runs static detection. `ExtensionInstall` requires explicit approval for candidates and separately gates scripts, dependencies and credentials. These controls should be retained and placed behind the marketplace service.

## Required controls

| Control | Current state | Gate requirement |
|---|---|---|
| Repository trust | URL/host validation; no publisher trust record | Official key pinning, user-source trust state and explicit review |
| Publisher verification | Publisher is descriptive metadata only | Signed manifest and/or signed tag/commit; key ID and rotation policy |
| Integrity | Commit pinning; no package digest ledger | SHA-256 digest of catalog/manifest/package and immutable install record |
| Manifest validation | Effect schemas for candidates/configs | Versioned marketplace schema, strict unknown-field policy and CI validation |
| Malicious extension detection | Static checks and permission review | Package scan, script declaration review, denylist, provenance and review workflow |
| Arbitrary scripts | Skills do not execute; plugin/npm paths remain risky | No lifecycle scripts by default; isolated plugin runner or catalog-only policy |
| Credentials | OB-ENV encrypted envelopes, grants and audit | Manifests may reference credential IDs/keys only; never values or tokens |
| OAuth redirects | MCP callback binds loopback and checks state | Per-provider redirect allowlist, PKCE, state/nonce, issuer/resource validation |
| Project scope | Server paired-device and location authorization; environment grants | Every install/profile/use request carries and checks project scope |
| Approval | Existing permission categories and extension audit hooks | Show exact source, digest, commands, permissions, credentials and dependencies |
| Identity conflicts | Existing names/targets conflict checks in managers | Global ID/publisher/kind conflict rules and signed source ownership |
| Audit logging | Environment access audit and permission audit exist | Add repository refresh, trust, install, update, rollback, auth and verification events |
| Update/rollback | Skill atomic copy and plugin update exist separately | Transactional ledger, staged activation, health check and rollback |

## Provider compatibility notes

These are external constraints that manifests must describe, not bypass:

| Provider | Official path | Auth / restrictions |
|---|---|---|
| Jira, Confluence, Bitbucket | Atlassian remote MCP `https://mcp.atlassian.com/v2/mcp`; REST APIs | OAuth 2.1 or API token; org/site admin controls, scopes, IP allowlists; Jira admin/delete groups require admin enablement. |
| Azure DevOps | Microsoft remote/local MCP and REST | Remote server uses Microsoft Entra and an Entra-backed organization; non-Microsoft clients may need custom app registration. Azure CLI/PAT are fallbacks; Azure DevOps OAuth is deprecated for new apps. |
| GitHub | Official remote/local GitHub MCP and REST | OAuth or PAT; enterprise managed users may have PAT restrictions; fine-grained permissions and SSO policies apply. |
| Figma | Remote `https://mcp.figma.com/mcp` or desktop MCP | Dev/Full seat and supported paid plan requirements; rate limits apply; client support/waitlist and government endpoint vary. |
| AWS | AWS MCP managed endpoint / Agent Toolkit | IAM/Identity Center, SigV4 or AWS Sign-In OAuth; least privilege and CloudTrail; service/resource charges remain. |
| Argo CD | `argoproj-labs/mcp-for-argocd` or CLI/API | JWT/API token and Argo RBAC; remote MCP must protect inbound callers separately from the outbound Argo token; self-hosted network policy required. |
| Kibana / Elastic | Elastic Agent Builder MCP endpoint | API key or OAuth 2.1 depending deployment; space/project URL and feature/license limits apply. |
| Jenkins | Jenkins MCP Server plugin | Jenkins API token/basic auth; controller must install/enable plugin and standard Jenkins permissions apply. |
| SonarQube | Official SonarQube MCP Server | Token or hosted Cloud OAuth; self-hosted server uses tokens; source-available license and version/edition prerequisites apply. |

Provider facts are based on official documentation checked on 2026-11-22; availability, pricing, endpoints, scopes and client support can change and must be revalidated during Gate D/F.

## Security decisions required

- Do not put actual credentials, OAuth client secrets, PATs, database passwords or API keys in `openbots-marketplace`.
- Do not allow a manifest to request arbitrary environment variables; require named OB-ENV references and explicit grants.
- Do not allow a remote MCP URL to bypass origin, network or project policy.
- Do not make “Allow all” approval implicitly approve credentials, dependencies, scripts or plugin execution.
- Do not claim plugin sandboxing until the runtime boundary is demonstrated on Windows and macOS.

