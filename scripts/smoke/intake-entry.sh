#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/../.." && pwd)"
temp_dir="$(mktemp -d)"
trap 'rm -rf "$temp_dir"' EXIT

local_repo="$temp_dir/local-repo"
mkdir -p "$local_repo"
git -C "$local_repo" init >/dev/null 2>&1
printf 'demo\n' > "$local_repo/README.md"
git -C "$local_repo" add README.md
git -C "$local_repo" \
  -c user.name='Smoke Test' \
  -c user.email='smoke@example.com' \
  commit -m 'init' >/dev/null 2>&1

bright_builds_stub="$temp_dir/bright-builds-stub.sh"
cat > "$bright_builds_stub" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
command="$1"
shift
case "$command" in
  status)
    cat <<'OUT'
Target repository: repo
Repo state: installable
Recommended action: install
OUT
    ;;
  install|update)
    exit 0
    ;;
esac
EOF
chmod +x "$bright_builds_stub"

(cd "$local_repo" && \
  CODEX_HOME="$temp_dir/.codex" \
  YOLO_PORT_BRIGHT_BUILDS_SCRIPT="$bright_builds_stub" \
  node "$repo_root/bin/yolo-port.js" --dry-run --mode yolo --yes >/dev/null)

origin_repo="$temp_dir/origin.git"
mkdir -p "$origin_repo"
git -C "$origin_repo" init --bare >/dev/null 2>&1

remote_output="$temp_dir/remote-output.txt"
(cd "$temp_dir" && \
  CODEX_HOME="$temp_dir/.codex-remote" \
  node "$repo_root/bin/yolo-port.js" "file://$origin_repo" --dry-run --mode yolo --yes >"$remote_output")

grep -q "Remote repository:" "$remote_output"
test ! -e "$temp_dir/origin"
