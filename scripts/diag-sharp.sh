#!/usr/bin/env bash
# TEMPORARY: diagnose the missing libvips on Vercel. Remove after.
echo "[diag] npm $(npm --version) node $(node --version)"
ls node_modules/@img/ | sed 's/^/[diag] img: /'
ls -la node_modules/@img/sharp-libvips-linux-x64/lib 2>&1 | sed 's/^/[diag] libvips: /'
node -e 'try{require("sharp");console.log("[diag] require sharp OK")}catch(e){console.log("[diag] require sharp FAIL "+e.message.slice(0,200))}'
if [ "${1:-}" = post ]; then
  grep -rho '[^"]*sharp[^"]*' .next/server/app/page.js.nft.json 2>/dev/null | sort -u | head -20 | sed 's/^/[diag] nft: /'
  ls .next/node_modules 2>&1 | sed 's/^/[diag] .next\/node_modules: /'
fi
true
