import fs from 'fs';

// read first argument from command line
const browser = process.argv[2];
const file = process.argv[3];

// 1. read manifest.json
const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
const otherBrowser = browser === 'chrome' ? 'firefox' : 'chrome';

// 2. for each top level key, check if it is suffixed with '.firefox' or '.chrome'
for (const key of Object.keys(manifest)) {
  // 3. if it is, remove the suffix and add the key to the manifest if it matches the current browser
  if (key.endsWith(`.${browser}`)) {
    const newKey = key.replace(`.${browser}`, '');
    manifest[newKey] = manifest[key];
    delete manifest[key];
    // 4. if it is not, remove the key to the manifest
  } else if (key.endsWith(`.${otherBrowser}`)) {
    delete manifest[key];
  }
}
// 5. write the manifest back to disk
fs.writeFileSync(file, JSON.stringify(manifest, null, 2));

console.log(`Updated ${file} for ${browser}`)
