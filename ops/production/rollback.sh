#!/usr/bin/env bash
set -euo pipefail
[[ $# -eq 0 ]] || { printf 'usage: ./rollback.sh\n' >&2; exit 2; }
exec "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/deploy.sh" --rollback
