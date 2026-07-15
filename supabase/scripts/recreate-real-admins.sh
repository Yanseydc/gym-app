#!/usr/bin/env bash
# Recovery procedure for ipxsfhzytofrqnihcwcf (the real "Gym App" project)
# after `supabase db reset --linked` wipes public schema data and auth.users.
#
# Scope: recreates ONLY the 3 gyms and the 3 administrative accounts that
# existed before the reset. It deliberately does NOT recreate Denis/Gabriela
# (client role) or any client_user_links -- those, and their underlying
# clients rows, are created afterwards through the app's normal flows
# (client creation UI + portal-access invite) as part of the smoke test.
#
# Order: gyms -> auth.users -> profiles. auth.users must exist before
# profiles (FK), and profiles need the gym ids gyms provides.
#
# Idempotent: safe to run more than once.
#   - gyms: `insert ... on conflict (id) do nothing`.
#   - auth.users: looked up by email first via the Admin API; only created
#     if not found, so re-running never creates duplicates.
#   - profiles: `insert ... on conflict (id) do update`, so re-running
#     just re-asserts the same role/gym_id rather than erroring.
#
# No secret ever appears in this file. Required env vars (export them in
# your own shell before running -- never paste values into this script):
#   SUPABASE_SERVICE_ROLE_KEY  - service_role key for ipxsfhzytofrqnihcwcf
#   SUPABASE_ANON_KEY          - anon key for ipxsfhzytofrqnihcwcf
#   SUPABASE_DB_PASSWORD       - Postgres password for ipxsfhzytofrqnihcwcf
#
# Password recovery: this script does not set a password for anyone. After
# creating each auth user it calls the public `/auth/v1/recover` endpoint
# (the same "forgot password" flow the login page itself uses), which sends
# a real recovery email through the project's configured mailer to the
# Site URL's `/auth/update-password` redirect (see the Auth config
# inventory from the read-only pre-reset check). Each of the 3 people signs
# in by following that email, same as any other password reset.

set -euo pipefail

PROJECT_REF="ipxsfhzytofrqnihcwcf"
API_URL="https://${PROJECT_REF}.supabase.co"
DB_HOST="aws-0-us-east-1.pooler.supabase.com"

: "${SUPABASE_SERVICE_ROLE_KEY:?Export SUPABASE_SERVICE_ROLE_KEY in your shell first}"
: "${SUPABASE_ANON_KEY:?Export SUPABASE_ANON_KEY in your shell first}"
: "${SUPABASE_DB_PASSWORD:?Export SUPABASE_DB_PASSWORD in your shell first}"

psql_exec() {
  PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
    "postgresql://postgres.${PROJECT_REF}@${DB_HOST}:5432/postgres" \
    -v ON_ERROR_STOP=1 "$@"
}

# ---------------------------------------------------------------------
# 1) Gyms -- exact original ids, so nothing referencing them elsewhere
#    (if anything survives outside this DB) goes stale.
# ---------------------------------------------------------------------
echo "==> Recreating gyms..."
psql_exec <<'SQL'
begin;
insert into public.gyms (id, name) values
  ('d74c8f07-9e3a-40b6-b1cf-835da92ae579', 'Demo Gym'),
  ('bd88ab13-277d-4e5b-9540-58b73989f910', 'Gym Yansey'),
  ('e76111af-ecbe-4d63-a413-88321fe2c0c9', 'Kalitron Gym')
on conflict (id) do nothing;
commit;
SQL

# ---------------------------------------------------------------------
# 2) auth.users -- idempotent lookup-or-create via the Admin API.
# ---------------------------------------------------------------------
find_or_create_user() {
  local email="$1"
  local existing
  # NOTE: the Admin API's `?email=` query param is NOT a real server-side
  # filter on this GoTrue version -- verified empirically: querying with
  # three different emails returned the same first user for all three,
  # which silently skipped creating two of them the first time this
  # script ran. Fetch the list and filter client-side with jq instead of
  # trusting the query param.
  existing=$(curl -s --max-time 20 "$API_URL/auth/v1/admin/users?per_page=200" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    | jq -r --arg email "$email" '.users[] | select(.email == $email) | .id' | head -1)

  if [ -n "$existing" ]; then
    echo "  $email already exists -> $existing" >&2
    echo "$existing"
    return 0
  fi

  local resp id
  resp=$(curl -s --max-time 20 -X POST "$API_URL/auth/v1/admin/users" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\",\"email_confirm\":true}")
  id=$(echo "$resp" | jq -r '.id // empty')
  if [ -z "$id" ]; then
    echo "ERROR creating $email: $resp" >&2
    return 1
  fi
  echo "  $email created -> $id" >&2
  echo "$id"
}

echo "==> Recreating the 3 administrative auth users..."
SUPER_ADMIN_ID=$(find_or_create_user "yansey.dc@gmail.com")
ADMIN_DEMO_ID=$(find_or_create_user "yesnay.dc@gmail.com")
ADMIN_KALITRON_ID=$(find_or_create_user "gustavo.carbajal74@gmail.com")

# ---------------------------------------------------------------------
# 3) profiles -- role + gym_id matching the pre-reset inventory exactly.
# ---------------------------------------------------------------------
echo "==> Recreating profiles..."
psql_exec <<SQL
begin;
insert into public.profiles (id, email, role, gym_id) values
  ('$SUPER_ADMIN_ID', 'yansey.dc@gmail.com', 'super_admin', null),
  ('$ADMIN_DEMO_ID', 'yesnay.dc@gmail.com', 'admin', 'd74c8f07-9e3a-40b6-b1cf-835da92ae579'),
  ('$ADMIN_KALITRON_ID', 'gustavo.carbajal74@gmail.com', 'admin', 'e76111af-ecbe-4d63-a413-88321fe2c0c9')
on conflict (id) do update
  set role = excluded.role,
      gym_id = excluded.gym_id,
      email = excluded.email;
commit;
SQL

# ---------------------------------------------------------------------
# 4) Password recovery emails -- same "forgot password" flow the app's
#    login page already uses, through the project's own configured
#    mailer and Site URL redirect. No password is ever set or printed by
#    this script.
#
# Best-effort and independent from the steps above: gyms/auth.users/
# profiles are already committed by this point, so nothing here can undo
# them. The built-in mailer can rate-limit (smtp_max_frequency was 60/hour
# per the pre-reset inventory), so each email is requested independently --
# one failing or being rate-limited does not stop the others, and the
# curl failure path (`|| echo "000"`) prevents `set -e` from aborting the
# loop on a network hiccup.
# ---------------------------------------------------------------------
echo "==> Requesting password-recovery emails (best-effort, independent per address)..."
SENT_EMAILS=()
PENDING_EMAILS=()
for email in "yansey.dc@gmail.com" "yesnay.dc@gmail.com" "gustavo.carbajal74@gmail.com"; do
  http_code=$(curl -s --max-time 20 -o /dev/null -w "%{http_code}" -X POST "$API_URL/auth/v1/recover" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\"}" || echo "000")
  if [ "$http_code" = "200" ] || [ "$http_code" = "204" ]; then
    echo "  [OK]      $email (HTTP $http_code)"
    SENT_EMAILS+=("$email")
  else
    echo "  [PENDING] $email (HTTP $http_code -- possibly rate-limited, retry later)"
    PENDING_EMAILS+=("$email")
  fi
done

echo ""
echo "==> Recovery email summary:"
echo "  Sent:    ${SENT_EMAILS[*]:-(none)}"
echo "  Pending: ${PENDING_EMAILS[*]:-(none)}"
if [ "${#PENDING_EMAILS[@]}" -gt 0 ]; then
  echo ""
  echo "  Retry a pending address later with:"
  for email in "${PENDING_EMAILS[@]}"; do
    echo "    curl -X POST \"$API_URL/auth/v1/recover\" -H \"apikey: \$SUPABASE_ANON_KEY\" -H \"Content-Type: application/json\" -d '{\"email\":\"$email\"}'"
  done
fi

echo "==> Done."
echo "Denis (denis.dominguez@yopmail.com) and Gabriela (gabriela.cruz@yopmail.com)"
echo "were intentionally NOT recreated -- create their clients + portal access"
echo "through the app's normal flows during the smoke test."
