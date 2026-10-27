#!/usr/bin/env bash
set -euo pipefail
umask 077
project_id=back-round
account_id=back-round-server
account_email="$account_id@$project_id.iam.gserviceaccount.com"
key_dir="$HOME/back-round-server-private"
key_file="$key_dir/firebase-admin.json"
for command_name in gcloud python3 cloudshell; do command -v "$command_name" >/dev/null || { echo "Missing command: $command_name" >&2; exit 1; }; done
error_file=$(mktemp)
trap 'rm -f "$error_file"' EXIT
if ! gcloud iam service-accounts describe "$account_email" --project="$project_id" >/dev/null 2>"$error_file"; then
  if ! grep -Eq 'NOT_FOUND|does not exist' "$error_file"; then cat "$error_file" >&2; exit 1; fi
  gcloud iam service-accounts create "$account_id" --project="$project_id" --display-name="Back round game server"
fi
for role_name in roles/datastore.user roles/firebaseauth.viewer; do
  done_role=0
  for attempt in 1 2 3 4; do
    if gcloud projects add-iam-policy-binding "$project_id" --member="serviceAccount:$account_email" --role="$role_name" --condition=None --quiet >/dev/null 2>"$error_file"; then done_role=1; break; fi
    if ! grep -Eq 'does not exist|NOT_FOUND' "$error_file" || [ "$attempt" = 4 ]; then cat "$error_file" >&2; exit 1; fi
    sleep "$((attempt * 5))"
  done
  [ "$done_role" = 1 ] || exit 1
done
mkdir -p "$key_dir"
chmod 700 "$key_dir"
if [ ! -e "$key_file" ]; then
  gcloud iam service-accounts keys create "$key_file" --iam-account="$account_email" --project="$project_id"
fi
chmod 600 "$key_file"
python3 - "$key_file" "$project_id" "$account_email" <<'PY'
import json,sys
with open(sys.argv[1]) as f: data=json.load(f)
if data.get('type')!='service_account' or data.get('project_id')!=sys.argv[2] or data.get('client_email')!=sys.argv[3] or not data.get('private_key'):
    raise SystemExit('The existing key file does not match the game server identity. No download was started.')
PY
echo "Game server identity prepared. Downloading firebase-admin.json."
echo "Keep this file private. Add it only to the Render game server secret configuration."
cloudshell download "$key_file"
