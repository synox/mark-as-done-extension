import { getUserSettings, setUserSettings } from '../storage.js';

function save(filename, data) {
  const blob = new Blob([data], { type: 'text/json' });
  if (window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveBlob(blob, filename);
  } else {
    const elem = window.document.createElement('a');
    elem.href = window.URL.createObjectURL(blob);
    elem.download = filename;
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
  }
}

document.getElementById('exportButton').addEventListener('click', async () => {
  const allItems = await browser.storage.local.get(null);
  const result = Object.entries(allItems)
    .map((entry) => ({ url: entry[0], status: compatibiltyStatus(entry[1]) }))
    .sort();

  save('marked-as-done-all.json', JSON.stringify(result));
});

document.getElementById('importButton').addEventListener('click', async () => {
  document.getElementById('upload').click();
});

document.getElementById('upload').addEventListener('change', handleFiles, false);

function handleFiles() {
  if (this.files.length === 0) {
    console.log('No file selected.');
    return;
  }

  const reader = new FileReader();
  reader.onload = async function fileReadCompleted() {
    // When the reader is done, the content is in reader.result.
    const data = JSON.parse(reader.result);
    const response = await browser.runtime.sendMessage({ type: 'import-data', data });
    document.getElementById('importStatus').append(`import completed. status: ${response}`);
  };

  reader.readAsText(this.files[0]);
}

document.getElementById('resetAllDataButton').addEventListener('click', async (event) => {
  if (event.target.textContent !== 'Are you sure?') {
    event.target.textContent = 'Are you sure?';
  } else {
    await browser.storage.local.clear();
    event.target.textContent = 'Done';
  }
});

document.querySelector('button#listButton').addEventListener('click', async () => {
  window.open('../list/list.html');
});

getUserSettings().then((settings) => {
  console.log('settings', settings);
  document.querySelectorAll('.states-list input').forEach((input) => {
    input.setAttribute('checked', settings.enabledStates.includes(input.dataset.status));
  });
});

setUserSettings({ a3: ['2'] }).then(() => {
  console.log('settings saved');
});
