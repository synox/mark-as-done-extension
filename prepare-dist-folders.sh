#!/usr/bin/env bash
set -e

mkdir -p dist
rm -rf dist/*

for browser in chrome firefox; do
  mkdir -p dist/$browser/src

  cp -r src images dist/$browser/
  cp manifest-template.json dist/$browser/manifest.json
  node update_manifest.mjs $browser dist/$browser/manifest.json
done
