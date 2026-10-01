#!/usr/bin/env bash
set -euo pipefail
[[ $(id -u) -eq 0 ]] || { printf 'Run as root\n' >&2; exit 1; }
: "${NGATURI_BIND_IP:?Set the host IPv4 bind address}"
: "${NGATURI_HOST_PORT:?Set the host application port}"
: "${NGATURI_INGRESS_SOURCE:?Set the trusted ingress IPv4 source}"
export NGATURI_BIND_IP NGATURI_HOST_PORT NGATURI_INGRESS_SOURCE
python3 - <<'PY'
import ipaddress,os,re
for key in ['NGATURI_BIND_IP','NGATURI_INGRESS_SOURCE']:
    address=ipaddress.IPv4Address(os.environ[key])
    if address.is_unspecified or address.is_multicast:
        raise SystemExit('A specific unicast IPv4 address is required')
if not re.fullmatch(r'[0-9]+', os.environ['NGATURI_HOST_PORT']) or not 1 <= int(os.environ['NGATURI_HOST_PORT']) <= 65535:
    raise SystemExit('Invalid port')
PY
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
rules=$(mktemp)
trap 'rm -- "$rules"' EXIT
cat > "$rules" <<RULES
# Only this table is replaced. Docker and other host firewall tables remain intact.
destroy table inet ngaturi_ingress
table inet ngaturi_ingress {
  chain prerouting {
    type filter hook prerouting priority -110; policy accept;
    ip daddr $NGATURI_BIND_IP tcp dport $NGATURI_HOST_PORT ip saddr $NGATURI_INGRESS_SOURCE counter accept
    ip daddr $NGATURI_BIND_IP tcp dport $NGATURI_HOST_PORT counter drop
  }
}
RULES
/usr/sbin/nft -c -f "$rules"
install -d -m 755 /etc/ngaturi
install -m 600 "$rules" /etc/ngaturi/ingress.nft
install -m 644 "$script_dir/../ops/ngaturi-ingress.service" /etc/systemd/system/ngaturi-ingress.service
install -d -m 755 /etc/systemd/system/docker.service.d
cat > /etc/systemd/system/docker.service.d/ngaturi-ingress.conf <<'UNIT'
[Unit]
Requires=ngaturi-ingress.service
After=ngaturi-ingress.service
UNIT
systemctl daemon-reload
systemctl enable ngaturi-ingress.service
if systemctl is-active --quiet ngaturi-ingress.service; then
  # Restarting a required unit also restarts Docker and unrelated containers.
  systemctl reload ngaturi-ingress.service
else
  systemctl start ngaturi-ingress.service
fi
systemctl is-active --quiet ngaturi-ingress.service
printf 'Ngaturi ingress rule installed and persistent; other firewall tables preserved\n'
