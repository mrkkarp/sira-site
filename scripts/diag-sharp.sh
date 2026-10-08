#!/usr/bin/env bash
# TEMPORARY: diagnose the missing libvips on Vercel. Remove after.
echo "[diag] npm $(npm --version) node $(node --version)"
ls node_modules/@img/ | sed 's/^/[diag] img: /'
ls -la node_modules/@img/sharp-libvips-linux-x64/lib 2>&1 | sed 's/^/[diag] libvips: /'
node -e 'try{require("sharp");console.log("[diag] require sharp OK")}catch(e){console.log("[diag] require sharp FAIL "+e.message.slice(0,200))}'
if [ "${1:-}" = post ]; then
  echo "[diag] nft total: $(find .next -name '*.nft.json' | wc -l)"
  echo "[diag] nft with libvips-linux-x64: $(grep -rl 'sharp-libvips-linux-x64' --include='*.nft.json' .next | wc -l)"
  echo "[diag] nft with sharp-linux-x64: $(grep -rl 'sharp-linux-x64' --include='*.nft.json' .next | wc -l)"
  f=$(find .next/server/app -name 'page.js.nft.json' | head -1); echo "[diag] sample nft: $f"
  grep -o '[^"]*sharp[^"]*' "$f" | sort -u | head -15 | sed 's/^/[diag] nft: /'
  ls -la .next/node_modules/sharp-20c6a5da84e2135f 2>&1 | sed 's/^/[diag] link: /'
  ls .next/node_modules 2>&1 | sed 's/^/[diag] .next\/node_modules: /'
fi
true
