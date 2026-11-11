#!/bin/sh
# Builds the favicon and touch icon from assets/logo.svg.
# Needs rsvg-convert (librsvg) and ImageMagick convert.
set -e
cd "$(dirname "$0")/.."
mkdir -p public
cp assets/logo.svg public/favicon.svg
tmp=$(mktemp -d)
for s in 16 32 48; do rsvg-convert -w $s -h $s assets/logo.svg -o "$tmp/$s.png"; done
convert "$tmp/16.png" "$tmp/32.png" "$tmp/48.png" public/favicon.ico
# iOS shows transparency as black, so the touch icon gets the page background.
rsvg-convert -w 180 -h 180 -b "#0F0F23" assets/logo.svg -o public/apple-touch-icon.png
rsvg-convert -w 512 -h 512 assets/logo.svg -o assets/logo-512.png
rm -rf "$tmp"
echo "icons written"
