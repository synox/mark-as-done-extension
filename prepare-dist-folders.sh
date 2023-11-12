#!/usr/bin/env bash
set -e

browser=$1
mkdir -p dist
rm -rf "dist/$browser"

mkdir -p dist/$browser/src

cp -r src images dist/$browser/
cp manifest-template.json dist/$browser/manifest.json
node update_manifest.mjs $browser dist/$browser/manifest.json
