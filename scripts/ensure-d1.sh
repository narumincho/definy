#!/usr/bin/env bash
set -euo pipefail

DB_NAME="${DEFINY_D1_DATABASE_NAME:-definy-db}"
WRANGLER_TOML="${WRANGLER_TOML_PATH:-wrangler.toml}"

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "::warning::CLOUDFLARE_API_TOKEN is not set; skipping D1 database provisioning."
  exit 0
fi

if grep -q "\[\[d1_databases\]\]" "$WRANGLER_TOML"; then
  echo "D1 database binding already configured in $WRANGLER_TOML."
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
cat >> "$WRANGLER_TOML" <<EOF

[[d1_databases]]
binding = "DB"
database_name = "${DB_NAME}"
database_id = "${DB_UUID}"
EOF

echo "Successfully configured D1 binding in ${WRANGLER_TOML}."

# --- Configure Custom Domain & Wildcard Subdomain Routes (narumincho.com) ---
ZONE_NAME="${DEFINY_ZONE_NAME:-narumincho.com}"
WORKER_NAME="${DEFINY_WORKER_NAME:-definy}"

echo "Checking Cloudflare Zone '${ZONE_NAME}' for subdomain routing..."
ZONES_JSON=$(curl -sS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  "https://api.cloudflare.com/client/v4/zones?name=${ZONE_NAME}")

ZONE_SUCCESS=$(echo "$ZONES_JSON" | jq -r '.success // false')
ZONE_ID=$(echo "$ZONES_JSON" | jq -r '.result[0].id // empty')

if [[ "$ZONE_SUCCESS" != "true" || -z "$ZONE_ID" ]]; then
  echo "::warning::Zone '${ZONE_NAME}' not accessible with current CLOUDFLARE_API_TOKEN. To auto-configure definy.${ZONE_NAME} and *-definy.${ZONE_NAME}, grant 'Zone -> Zone -> Read', 'Zone -> Workers Routes -> Edit', and 'Zone -> DNS -> Edit' for ${ZONE_NAME}."
  exit 0
fi

echo "Found Zone '${ZONE_NAME}' (${ZONE_ID}). Ensuring DNS records and Worker Routes..."

ensure_proxied_dns() {
  local record_name="$1"
  local existing_json
  existing_json=$(curl -sS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?name=${record_name}")
  local existing_ok
  existing_ok=$(echo "$existing_json" | jq -r '.success // false')
  if [[ "$existing_ok" != "true" ]]; then
    echo "::warning::Cannot read DNS records for ${record_name} (grant 'Zone -> DNS -> Edit' to auto-create)."
    return 0
  fi
  local count
  count=$(echo "$existing_json" | jq -r '.result | length')
  if [[ "$count" -gt 0 ]]; then
    echo "DNS record for '${record_name}' already exists."
    return 0
  fi
  echo "Creating proxied AAAA (100::) DNS record for '${record_name}'..."
  local create_dns_json
  create_dns_json=$(curl -sS -X POST \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"AAAA\",\"name\":\"${record_name}\",\"content\":\"100::\",\"ttl\":1,\"proxied\":true}" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records")
  local create_dns_ok
  create_dns_ok=$(echo "$create_dns_json" | jq -r '.success // false')
  if [[ "$create_dns_ok" == "true" ]]; then
    echo "Created proxied DNS record for '${record_name}'."
  else
    local err
    err=$(echo "$create_dns_json" | jq -r '.errors[0].message // "Unknown error"')
    echo "::warning::Could not create DNS record '${record_name}' (${err}). Ensure 'Zone -> DNS -> Edit' permission is granted."
  fi
}

ensure_worker_route() {
  local pattern="$1"
  local routes_json="$2"
  local existing_id
  existing_id=$(echo "$routes_json" | jq -r --arg PAT "$pattern" '.result[] | select(.pattern == $PAT) | .id' | head -n 1)
  if [[ -n "$existing_id" ]]; then
    echo "Worker route '${pattern}' already exists (${existing_id})."
    return 0
  fi
  echo "Creating Worker route '${pattern}' -> '${WORKER_NAME}'..."
  local create_route_json
  create_route_json=$(curl -sS -X POST \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"pattern\":\"${pattern}\",\"script\":\"${WORKER_NAME}\"}" \
    "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/workers/routes")
  local create_route_ok
  create_route_ok=$(echo "$create_route_json" | jq -r '.success // false')
  if [[ "$create_route_ok" == "true" ]]; then
    echo "Created Worker route '${pattern}' -> '${WORKER_NAME}'."
  else
    local err
    err=$(echo "$create_route_json" | jq -r '.errors[0].message // "Unknown error"')
    echo "::warning::Could not create Worker route '${pattern}' (${err}). Ensure 'Zone -> Workers Routes -> Edit' permission is granted."
  fi
}

ensure_proxied_dns "definy.${ZONE_NAME}"
ensure_proxied_dns "*.${ZONE_NAME}"

ROUTES_LIST_JSON=$(curl -sS -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/workers/routes")
ROUTES_OK=$(echo "$ROUTES_LIST_JSON" | jq -r '.success // false')
if [[ "$ROUTES_OK" == "true" ]]; then
  ensure_worker_route "definy.${ZONE_NAME}/*" "$ROUTES_LIST_JSON"
  ensure_worker_route "*-definy.${ZONE_NAME}/*" "$ROUTES_LIST_JSON"
else
  ERR_MSG=$(echo "$ROUTES_LIST_JSON" | jq -r '.errors[0].message // "Unknown error"')
  echo "::warning::Cannot list Worker routes for '${ZONE_NAME}' (${ERR_MSG}). Ensure 'Zone -> Workers Routes -> Edit' permission is granted."
fi
