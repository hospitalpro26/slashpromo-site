#!/usr/bin/env bash
# Run on an owner-controlled machine, not an ephemeral public CI runner.
set -euo pipefail
umask 077
if [[ $# -ne 1 ]]; then echo "Usage: bash android/create-owner-key.sh /absolute/private/path/slashpromo-release.p12" >&2; exit 2; fi
key="$1"
[[ "$key" = /* ]] || { echo "Use an absolute path outside the repository." >&2; exit 2; }
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
parent="$(cd "$(dirname "$key")" && pwd -P)"
key="$parent/$(basename "$key")"
case "$key" in "$root"|"$root"/*) echo "Never store the key in the repository." >&2; exit 2;; esac
[[ ! -e "$key" && ! -L "$key" ]] || { echo "Key already exists; refusing to overwrite." >&2; exit 2; }
keytool -genkeypair -storetype PKCS12 -keystore "$key" -alias slashpromo -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Slashpromo Android"
echo "Back up the private key and password securely. Only the public SHA-256 fingerprint is shareable."
keytool -list -v -keystore "$key" -alias slashpromo
