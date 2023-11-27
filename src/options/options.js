import { getDataExport, listPages, updatePageState } from '../storage.js';

function startFileDownload(filename, data) {
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
  const result = await getDataExport();

  startFileDownload('marked-as-done-all.json', JSON.stringify(result));
});

document.getElementById('importButton').addEventListener('click', () => {
  document.getElementById('upload').click();
});

document.getElementById('upload').addEventListener(
  'change',
  function handleFiles() {
    if (this.files.length === 0) {
      console.error('No file selected.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async function fileReadCompleted() {
      // When the reader is done, the content is in reader.result.
      const data = JSON.parse(reader.result);
      const response = await chrome.runtime.sendMessage({ type: 'import-data', data });
      document.getElementById('importStatus').append(`import completed. status: ${response}`);
    };

    reader.readAsText(this.files[0]);
  },
  false,
);

document.getElementById('resetAllDataButton').addEventListener('click', async (event) => {
  if (event.target.textContent !== 'Are you sure?') {
    event.target.textContent = 'Are you sure?';
  } else {
    await chrome.storage.local.clear();
    event.target.textContent = 'Done';
  }
});

document.getElementById('updateTitles').addEventListener('click', async () => {
  const withoutTitle = (await listPages())
    .filter((page) => !page.properties.title);

  for (const page of withoutTitle) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(page.url);
      if (response.ok) {
        // eslint-disable-next-line no-await-in-loop
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const title = doc.querySelector('title')?.textContent;
        if (title) {
          // eslint-disable-next-line no-await-in-loop
          await updatePageState(page.url, { title });
        }
      }
    } catch (error) {
      console.log('cannot update title for ', page.url);
    }
  }
});
