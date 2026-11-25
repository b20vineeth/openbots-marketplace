#!/usr/bin/env node
/**
 * Dependency-free validator for the OpenBots Marketplace repository.
 *
 * It implements the JSON Schema subset used by schemas/catalog.schema.json and
 * schemas/manifest.schema.json, then applies the semantic rules a schema cannot express:
 * duplicate extension identities, missing icon files, revocation consistency and the
 * prohibition on credential material anywhere in the catalog.
 *
 * Usage: node scripts/validate-catalog.mjs [--json]
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const failures = []
const notes = []

const fail = (where, message) => failures.push(`${where}: ${message}`)
const readJSON = (file, where) => {
  try {
    return JSON.parse(readFileSync(file, "utf8"))
  } catch (cause) {
    fail(where, `cannot parse JSON (${cause instanceof Error ? cause.message : String(cause)})`)
    return undefined
  }
}

const typeOf = (value) => {
  if (value === null) return "null"
  if (Array.isArray(value)) return "array"
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number"
  return typeof value
}

const matchesType = (value, expected) => {
  const actual = typeOf(value)
  if (expected === "number") return actual === "number" || actual === "integer"
  return actual === expected
}

function resolveRef(ref, document) {
  if (!ref.startsWith("#/")) throw new Error(`Unsupported $ref ${ref}`)
  return ref
    .slice(2)
    .split("/")
    .reduce((current, key) => (current === undefined ? undefined : current[key]), document)
}

function validate(value, schema, document, where) {
  if (schema === true || schema === undefined) return
  if (schema === false) {
    fail(where, "no value is allowed here")
    return
  }
  if (schema.$ref) {
    const target = resolveRef(schema.$ref, document)
    if (target === undefined) throw new Error(`Unresolved $ref ${schema.$ref}`)
    validate(value, target, document, where)
    return
  }
  if (schema.const !== undefined && value !== schema.const)
    fail(where, `must equal ${JSON.stringify(schema.const)}`)
  if (schema.enum && !schema.enum.includes(value))
    fail(where, `must be one of ${schema.enum.map((item) => JSON.stringify(item)).join(", ")}`)
  if (schema.type) {
    const allowed = Array.isArray(schema.type) ? schema.type : [schema.type]
    if (!allowed.some((item) => matchesType(value, item)))
      fail(where, `must be ${allowed.join(" or ")}, received ${typeOf(value)}`)
  }
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength)
      fail(where, `must be at least ${schema.minLength} characters`)
    if (schema.maxLength !== undefined && value.length > schema.maxLength)
      fail(where, `must be at most ${schema.maxLength} characters`)
    if (schema.pattern !== undefined && !new RegExp(schema.pattern, "u").test(value))
      fail(where, `does not match ${schema.pattern}`)
    if (schema.format === "uri") {
      try {
        const parsed = new URL(value)
        if (!parsed.protocol.startsWith("http")) fail(where, "must be an absolute http(s) URI")
      } catch {
        fail(where, "must be an absolute URI")
      }
    }
    if (schema.format === "date-time" && Number.isNaN(Date.parse(value)))
      fail(where, "must be an RFC 3339 date-time")
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) fail(where, `must be >= ${schema.minimum}`)
    if (schema.maximum !== undefined && value > schema.maximum) fail(where, `must be <= ${schema.maximum}`)
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems)
      fail(where, `must contain at least ${schema.minItems} item(s)`)
    if (schema.maxItems !== undefined && value.length > schema.maxItems)
      fail(where, `must contain at most ${schema.maxItems} item(s)`)
    if (schema.uniqueItems) {
      const seen = new Set()
      for (const item of value) {
        const key = JSON.stringify(item)
        if (seen.has(key)) fail(where, `contains a duplicate item ${key}`)
        seen.add(key)
      }
    }
    if (schema.items)
      value.forEach((item, index) => validate(item, schema.items, document, `${where}[${index}]`))
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of schema.required ?? [])
      if (!(key in value)) fail(where, `is missing required property "${key}"`)
    const properties = schema.properties ?? {}
    for (const [key, item] of Object.entries(value)) {
      const child = properties[key]
      if (child !== undefined) validate(item, child, document, `${where}.${key}`)
      else if (schema.additionalProperties === false) fail(where, `has unexpected property "${key}"`)
      else if (typeof schema.additionalProperties === "object")
        validate(item, schema.additionalProperties, document, `${where}.${key}`)
    }
  }
}

// The catalog must never carry credential-shaped data, in any nesting.
const secretKey = /(?:secret|password|passwd|token|api[_-]?key|credential|private[_-]?key)/i
function assertNoCredentialMaterial(value, where) {
  if (Array.isArray(value)) return value.forEach((item, index) => assertNoCredentialMaterial(item, `${where}[${index}]`))
  if (!value || typeof value !== "object") return
  for (const [key, item] of Object.entries(value)) {
    if (secretKey.test(key) && key !== "secretReference")
      fail(where, `must not contain credential-shaped property "${key}"; credentials live only in OB-ENV`)
    assertNoCredentialMaterial(item, `${where}.${key}`)
  }
}

const catalogPath = path.join(root, "catalog.json")
const catalogSchemaPath = path.join(root, "schemas", "catalog.schema.json")
const manifestSchemaPath = path.join(root, "schemas", "manifest.schema.json")

for (const schemaPath of [catalogSchemaPath, manifestSchemaPath]) {
  const schema = readJSON(schemaPath, path.relative(root, schemaPath))
  if (schema === undefined) continue
  if (schema.type !== "object" || !schema.$schema || !schema.title)
    fail(path.relative(root, schemaPath), "must declare $schema, title and type object")
}

const catalogSchema = readJSON(catalogSchemaPath, "schemas/catalog.schema.json")
const catalog = readJSON(catalogPath, "catalog.json")

if (catalog !== undefined && catalogSchema !== undefined) {
  validate(catalog, catalogSchema, catalogSchema, "catalog")
  assertNoCredentialMaterial(catalog, "catalog")

  if (Array.isArray(catalog.extensions)) {
    const ids = new Set()
    for (const [index, entry] of catalog.extensions.entries()) {
      const where = `catalog.extensions[${index}]`
      if (!entry || typeof entry !== "object") continue
      if (typeof entry.id === "string") {
        if (ids.has(entry.id)) fail(where, `duplicates extension id "${entry.id}"`)
        ids.add(entry.id)
      }
      if (typeof entry.icon === "string" && !existsSync(path.join(root, entry.icon)))
        fail(`${where}.icon`, `references a missing file "${entry.icon}"`)
      const status = entry.status
      if (status && typeof status === "object") {
        if (status.revoked === true && typeof status.revokedReason !== "string")
          fail(`${where}.status`, "a revoked entry must state revokedReason")
        if (status.revoked === true && status.enabled === true)
          fail(`${where}.status`, "a revoked entry cannot also be enabled")
      }
    }
    notes.push(`${catalog.extensions.length} catalog entr${catalog.extensions.length === 1 ? "y" : "ies"}`)
  }
}

// Manifests are published by each extension repository. When this repository vendors one for
// review, it is validated here too.
const manifestSchema = readJSON(manifestSchemaPath, "schemas/manifest.schema.json")
const extensionRoot = path.join(root, "extensions")
if (manifestSchema !== undefined && existsSync(extensionRoot)) {
  let count = 0
  for (const directory of readdirSync(extensionRoot)) {
    const manifestPath = path.join(extensionRoot, directory, "openbots.json")
    if (!existsSync(manifestPath) || !statSync(manifestPath).isFile()) continue
    const manifest = readJSON(manifestPath, path.relative(root, manifestPath))
    if (manifest === undefined) continue
    validate(manifest, manifestSchema, manifestSchema, path.relative(root, manifestPath))
    count += 1
  }
  notes.push(`${count} vendored manifest${count === 1 ? "" : "s"}`)
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ ok: failures.length === 0, failures, notes }, null, 2))
} else {
  for (const note of notes) console.log(`- ${note}`)
  for (const failure of failures) console.error(`FAIL ${failure}`)
  console.log(failures.length === 0 ? "catalog validation: PASS" : `catalog validation: FAIL (${failures.length})`)
}
process.exit(failures.length === 0 ? 0 : 1)
