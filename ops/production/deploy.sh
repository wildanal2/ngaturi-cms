#!/usr/bin/env bash
set -euo pipefail
umask 077
# Staged release entry point; the working directory must be the VM runtime.
controller=$(dirname -- "$(readlink -f -- "${BASH_SOURCE[0]}")")
exec python3 "$controller/release.py" "$@"
