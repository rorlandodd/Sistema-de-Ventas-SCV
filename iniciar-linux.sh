#!/bin/sh
set -eu
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then echo 'Instala Node.js 24.x antes de iniciar.'; exit 1; fi
[ -f .env ] || cp .env.example .env
exec node --env-file-if-exists=.env server/index.mjs
