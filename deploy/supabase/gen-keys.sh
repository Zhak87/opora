#!/usr/bin/env bash
# Создаёт внутренние ключи базы один раз и дописывает их в server.env. Ключи не покидают сервер,
# кроме публичного SB_ANON_KEY (он и так виден в браузере каждому посетителю).
set -euo pipefail
F="${1:-server.env}"
grep -q '^SB_JWT_SECRET=' "$F" 2>/dev/null && { echo "Ключи базы уже есть"; exit 0; }
b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
jwt() {
  local role="$1" secret="$2" now exp header payload sig
  now=$(date +%s); exp=$((now + 10*365*24*3600))
  header=$(printf '{"alg":"HS256","typ":"JWT"}' | b64url)
  payload=$(printf '{"role":"%s","iss":"supabase","iat":%s,"exp":%s}' "$role" "$now" "$exp" | b64url)
  sig=$(printf '%s.%s' "$header" "$payload" | openssl dgst -sha256 -hmac "$secret" -binary | b64url)
  printf '%s.%s.%s' "$header" "$payload" "$sig"
}
SECRET=$(openssl rand -hex 32)
umask 077
{
  echo "SB_DB_PASSWORD=$(openssl rand -hex 24)"
  echo "SB_JWT_SECRET=$SECRET"
  echo "SB_ANON_KEY=$(jwt anon "$SECRET")"
  echo "SB_SERVICE_ROLE_KEY=$(jwt service_role "$SECRET")"
} >> "$F"
echo "Ключи базы созданы"
