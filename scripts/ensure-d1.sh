#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${DEFINY_D1_DATABASE_NAME:-definy-db}"
WRANGLER_TOML="${WRANGLER_TOML_PATH:-wrangler.toml}"
SEED_SQL_PATH="${DEFINY_SEED_SQL_PATH:-target/definy_seed.sql}"

run_wrangler() {
  if command -v npx >/dev/null 2>&1; then
    npx --yes wrangler@4 "$@"
  else
    wrangler "$@"
  fi
}

# --local 指定時はローカルの Wrangler D1 (SQLite) にスキーマを投入する
if [[ "${1:-}" == "--local" ]]; then
  echo "Applying initial schema to local D1 database '${DB_NAME}'..."
  run_wrangler d1 execute "${DB_NAME}" --local --file="migrations/0001_initial_schema.sql"
  echo "Successfully applied schema to local D1 database '${DB_NAME}'."
  exit 0
fi

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "::warning::CLOUDFLARE_API_TOKEN is not set; skipping remote D1 database provisioning and seeding."
  exit 0
fi

echo "Resolving Cloudflare Account ID..."
ACCOUNTS_JSON=$(curl -sS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  "https://api.cloudflare.com/client/v4/accounts")

ACCOUNT_ID=$(echo "$ACCOUNTS_JSON" | jq -r '.result[0].id // empty')
if [[ -z "$ACCOUNT_ID" ]]; then
  echo "::warning::Could not resolve Cloudflare Account ID from token. Skipping D1 binding."
  exit 0
fi

echo "Checking for existing D1 database '${DB_NAME}' in account ${ACCOUNT_ID}..."
LIST_JSON=$(curl -sS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database?name=${DB_NAME}")

LIST_SUCCESS=$(echo "$LIST_JSON" | jq -r '.success // false')
if [[ "$LIST_SUCCESS" != "true" ]]; then
  ERR_MSG=$(echo "$LIST_JSON" | jq -r '.errors[0].message // "Unknown error"')
  echo "::warning::Cloudflare D1 API returned an error (${ERR_MSG}). Ensure CLOUDFLARE_API_TOKEN has 'Account -> D1 -> Edit' permission."
  exit 0
fi

DB_UUID=$(echo "$LIST_JSON" | jq -r --arg NAME "$DB_NAME" '.result[] | select(.name == $NAME) | .uuid' | head -n 1)

if [[ -z "$DB_UUID" ]]; then
  echo "Creating D1 database '${DB_NAME}'..."
  CREATE_JSON=$(curl -sS -X POST \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${DB_NAME}\"}" \
    "https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database")

  CREATE_SUCCESS=$(echo "$CREATE_JSON" | jq -r '.success // false')
  if [[ "$CREATE_SUCCESS" != "true" ]]; then
    ERR_MSG=$(echo "$CREATE_JSON" | jq -r '.errors[0].message // "Unknown error"')
    echo "::warning::Failed to create D1 database '${DB_NAME}' (${ERR_MSG}). Ensure CLOUDFLARE_API_TOKEN has 'Account -> D1 -> Edit' permission."
    exit 0
  fi

  DB_UUID=$(echo "$CREATE_JSON" | jq -r '.result.uuid // empty')
fi

if [[ -z "$DB_UUID" ]]; then
  echo "::warning::Could not obtain D1 database UUID for '${DB_NAME}'."
  exit 0
fi

echo "Binding D1 database '${DB_NAME}' (${DB_UUID}) as env.DB in ${WRANGLER_TOML}..."
if grep -q "\[\[d1_databases\]\]" "$WRANGLER_TOML"; then
  python3 -c '
import sys, re
path, uuid = sys.argv[1], sys.argv[2]
with open(path, "r", encoding="utf-8") as f:
    content = f.read()
content = re.sub(r"(database_id\s*=\s*\")[^\"]*(\")", rf"\g<1>{uuid}\2", content)
with open(path, "w", encoding="utf-8") as f:
    f.write(content)
' "$WRANGLER_TOML" "$DB_UUID"
else
  cat >> "$WRANGLER_TOML" <<EOF

[[d1_databases]]
binding = "DB"
database_name = "${DB_NAME}"
database_id = "${DB_UUID}"
EOF
fi

echo "Successfully configured D1 binding in ${WRANGLER_TOML}."

if [[ -f "$SEED_SQL_PATH" ]]; then
  echo "Applying schema and builtin seeds to remote D1 database '${DB_NAME}' (${DB_UUID})..."
  run_wrangler d1 execute "${DB_NAME}" --remote --file="${SEED_SQL_PATH}"
  echo "Successfully seeded remote D1 database '${DB_NAME}'."
else
  echo "::warning::Seed SQL file '${SEED_SQL_PATH}' not found; skipping remote D1 seed execution."
fi
