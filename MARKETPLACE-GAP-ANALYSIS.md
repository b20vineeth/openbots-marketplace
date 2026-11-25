# OpenBots Marketplace Gap Analysis

Status: MP-WP01 register at OpenBots HEAD `b2dd3a39` (2026-11-25). The full evidence, method and
defect investigation are in [MARKETPLACE-MP-WP01-AUDIT.md](MARKETPLACE-MP-WP01-AUDIT.md); this file
is the close-out checklist.

Legend: **I** implemented · **P** partial · **D** defective/unreachable · **M** missing.
Severity: P0 blocks the approved architecture, P1 required for a usable marketplace, P2 hardening.

| ID | Gap | Status | Sev | Closed by |
| --- | --- | --- | --- | --- |
| MP-G-01 | Catalog fetch, strict validation, integrity, cache, offline state | M | P0 | MP-WP02 |
| MP-G-02 | Snapshot persistence, ETag, last successful refresh | M | P0 | MP-WP02 |
| MP-G-03 | Duplicate identity, revocation and compatibility evaluation | M | P0 | MP-WP02 |
| MP-G-04 | Custom source registry and trust state | M | P1 | MP-WP07 |
| MP-G-05 | Discover route, list, detail and status filters | M | P0 | MP-WP03 |
| MP-G-06 | Unified installed view over Skills/Plugins/MCP/UTCP | M | P1 | MP-WP03 |
| MP-G-07 | Reachable, verified, transactional Git install | D | P0 | MP-WP05 |
| MP-G-08 | Install ledger: version, commit, digest, publisher, approval, previous | M | P0 | MP-WP05 |
| MP-G-09 | Manifest-driven configuration form | M | P0 | MP-WP04 |
| MP-G-10 | Extension auth and connection profiles over OB-ENV | P | P0 | MP-WP04 |
| MP-G-11 | Permission-diff approval, staged activation, health check | M | P0 | MP-WP06 |
| MP-G-12 | Rollback preserving the previous verified version | M | P0 | MP-WP06 |
| MP-G-13 | Atomic uninstall including credential references | M | P1 | MP-WP06 |
| MP-G-14 | Marketplace audit events | P | P1 | MP-WP06 |
| MP-G-15 | Restart recovery for interrupted installs | M | P1 | MP-WP06 |
| MP-G-16 | Revocation enforcement against installed copies | M | P1 | MP-WP06 |
| MP-G-17 | Plugin isolation / permission manifest for in-process plugins | M | P0 | MP-WP05 gate |
| MP-G-18 | Path/symlink containment re-asserted at install destination | P | P1 | MP-WP05 |
| MP-G-19 | Deterministic local test extension and E2E suite | M | P0 | MP-WP08 |
| MP-G-20 | Packaged plugin list observation (D-WP-R00-23) | D | P3 | MP-WP09 |
| MP-G-21 | Catalog repository schemas, validator, icons, CI, contract | I | P0 | MP-WP01 |

## What is already implemented

Git source parsing and hardened cloning, static extension detection, approval-aware installation
primitives, skill install with atomic copy, plugin inventory and lifecycle, MCP (local/remote/OAuth),
UTCP, OB-ENV encrypted credentials with grants and audit, project-scoped authorization, per-location
service graphs, and separate authoritative management screens. None of these is replaced; each is
consumed by the marketplace.

## Highest-risk gaps

1. **MP-G-07 / MP-G-08** — the Git install pipeline exists but nothing calls it, and there is no
   digest or ledger, so there is no trustworthy install path today.
2. **MP-G-17** — plugins run in the server process. Catalog approval cannot substitute for an
   isolation boundary; until it is demonstrated, plugin entries stay catalog-only.
3. **MP-G-01 / MP-G-02** — caches today are in-memory and process-local, so offline operation and
   "retain the last trusted catalog" are impossible without new persistence.
4. **MP-G-09 / MP-G-10** — guessing provider configuration fields is unsafe; the manifest must declare
   fields, auth methods and secret destinations.

## Not gaps

- No dedicated marketplace backend, database or hosting is required or planned.
- No duplicate extension manager or credential service is required; the design adds one catalog
  consumer, one protocol group and local tables.
- No provider-specific Marketplace plugin (Jira, GitHub, Kibana, Jenkins, Azure DevOps) is in scope.
