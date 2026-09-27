#!/bin/sh
set -eu

cd /home/container
export CI=true
export PORT="${SERVER_PORT:-${PORT:-3000}}"

# VortexSpace may save its pnpm bootstrap as an application dependency.
node --input-type=commonjs <<'NODE'
const fs = require('node:fs');
const file = 'package.json';
const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
if (manifest.name !== 'synapse-frontend') {
  throw new Error('This startup script is only intended for synapse-frontend');
}
if (Object.hasOwn(manifest.dependencies ?? {}, 'pnpm')) {
  fs.copyFileSync(file, 'package.json.before-vortex-fix');
  delete manifest.dependencies.pnpm;
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
}
NODE

echo "Installing frontend dependencies..."
NODE_ENV=development pnpm install --frozen-lockfile --prod=false

echo "Building frontend..."
node node_modules/typescript/bin/tsc -b
NODE_ENV=production node node_modules/vite/bin/vite.js build

export NODE_ENV=production
echo "Starting Synapse frontend..."
exec pnpm dlx serve@14.2.6 dist --single --no-clipboard --no-port-switching --listen "tcp://0.0.0.0:$PORT"
