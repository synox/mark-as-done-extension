#!/usr/bin/env bash
set -e

mkdir -p dist
rm -rf dist/*
mkdir -p dist/firefox dist/chrome

cp -r src/* dist/firefox
cp -r src/* dist/chrome

cp manifest-template.json dist/firefox/manifest.json
cp manifest-template.json dist/chrome/manifest.json
node update_manifest.mjs firefox dist/firefox/manifest.json
node update_manifest.mjs chrome dist/chrome/manifest.json
