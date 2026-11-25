# OpenBots Marketplace

The official catalog for OpenBots extensions. OpenBots reads `catalog.json` from this
repository, so publishing an extension or a new version of one requires no OpenBots
release: the application refreshes its catalog and installs the pinned Git release.

This repository contains catalog data only. It is not a backend, has no database and
requires no paid hosting. Each extension lives in its own repository.

## Layout

```
catalog.json                     The catalog OpenBots fetches and validates
schemas/catalog.schema.json      Catalog document format (JSON Schema 2020-12)
schemas/manifest.schema.json     Extension manifest format
icons/                           Catalog icons referenced by entries
scripts/validate-catalog.mjs     Dependency-free validator used locally and in CI
.github/workflows/validate-catalog.yml
```

The catalog is **empty by design** at `catalogVersion` `2026.11.25`. It publishes no
placeholder, fictional or unreachable entry.

## Catalog contract

`catalog.json` carries `schemaVersion` (format), `catalogVersion` (monotonic revision,
`YYYY.MM.DD[.N]`), `generatedAt`, and an `extensions` array.

Every extension entry is one immutable release:

| Field | Meaning |
| --- | --- |
| `id` | Stable reverse-DNS identity, unique across the catalog |
| `name`, `description`, `category`, `tags` | Discovery metadata |
| `type` | `plugin`, `skill`, `mcp` or `utcp` |
| `publisher` | `id`, `name`, and `verified` (reviewed by maintainers) |
| `version` | Semver release version |
| `repository.url` | Public HTTPS Git repository; credentials in a URL are rejected |
| `repository.tag` | Release tag that must resolve to `repository.commit` |
| `repository.commit` | Full 40-character immutable commit SHA |
| `repository.manifestPath` | Repository-relative path to the manifest |
| `repository.digest` | `sha256:<hex>` of the deterministic release archive |
| `compatibility.openbots` | Semver range of supported OpenBots versions |
| `compatibility.platforms` | Subset of `win32`, `darwin`, `linux` |
| `icon` | File under `icons/` |
| `documentation` | HTTPS documentation URL |
| `status.enabled`, `status.revoked`, `status.revokedReason` | Availability and revocation |

Branches, short SHAs, moving refs and mutable package ranges are invalid. An entry never
carries a credential, token or password; those exist only in OpenBots OB-ENV.

## Extension repositories

An extension repository contains its source, `openbots.json` manifest (validated against
`schemas/manifest.schema.json`), configuration schema, documentation, dependency
declaration and release information. The manifest declares runtime, permissions,
dependencies, authentication methods and a declarative configuration form; it holds
secret *references*, never values.

## Publishing a release

1. Tag the release (`v1.2.3`) and record the full commit SHA it points at.
2. Confirm the manifest validates against `schemas/manifest.schema.json`.
3. Compute the archive digest deterministically so any reviewer can reproduce it:

   ```bash
   git archive --format=tar --prefix= <commit> | gzip -n -9 | sha256sum
   ```

4. Add or update the entry in `catalog.json`, add the icon, bump `catalogVersion`.
5. Open a pull request. CI runs `node scripts/validate-catalog.mjs`; a maintainer reviews
   identity, publisher trust, permissions, compatibility and the digest.

Updates publish a new entry version pinned to a new commit. History is append-only in
meaning: an existing version is never repointed to a different commit.

## Revocation

A compromised or withdrawn release is revoked by setting `status.revoked` to `true` with
a `revokedReason`; the entry stays in the catalog so installed copies can be identified.
A revoked entry cannot also be enabled. OpenBots refuses new installs of revoked entries
and flags installed copies; it never silently uninstalls user data.

## Trust and custom sources

This repository is the default trusted source. Custom public or private Git sources are
supported by the client and require explicit user trust approval before their entries are
shown as installable. Private repository credentials are supplied through OB-ENV.

## Security rules for reviewers

- Reject an entry whose repository URL is not HTTPS, carries credentials, or resolves to
  a different commit than the pinned `repository.commit`.
- Reject a manifest that requests credential values, undeclared environment variables,
  arbitrary post-install scripts, or permissions broader than its declared purpose.
- Reject a plugin whose code cannot run inside the approved OpenBots isolation boundary.
- Never merge a credential, `.env` file, OAuth client secret or private key.

## Validation

```bash
node scripts/validate-catalog.mjs        # human readable
node scripts/validate-catalog.mjs --json # machine readable
```

The validator checks the schemas, duplicate identities, icon presence, revocation
consistency and the absence of credential-shaped properties. It has no dependencies.
