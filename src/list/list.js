import { STATUS_DONE } from '../global.js';
import { listPagesGroupedByDomain } from '../storage.js';
import { sortLinksByStatus } from '../filter-utils.js';

async function init() {
  const linksByDomain = await listPagesGroupedByDomain();
  const listElement = document.querySelector('.links');

  // eslint-disable-next-line no-restricted-syntax
  for (const domain of Object.keys(linksByDomain).sort()) {
    const totalCount = linksByDomain[domain].length;
    const doneCount = linksByDomain[domain].filter((item) => item.status === STATUS_DONE).length;
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    const h2 = document.createElement('h2');
    h2.innerText = `${domain} (${doneCount}/${totalCount})`;
    summary.append(h2);
    details.append(summary);

    const table = document.createElement('table');
    const items = linksByDomain[domain];
    sortLinksByStatus(items);
    // eslint-disable-next-line no-restricted-syntax
    for (const item of items) {
      const row = document.createElement('tr');

      const cellStatus = document.createElement('td');
      cellStatus.innerText = item.properties.status;
      const icon = document.createElement('img');
      icon.src = chrome.runtime.getURL(`images/icon-${item.properties.status}.png`);
      cellStatus.prepend(icon);
      row.append(cellStatus);

      const a = document.createElement('a');
      a.href = item.url;
      a.innerText = item.properties.title || item.url.replace(domain, '');
      a.target = '_blank';

      const cellLink = document.createElement('td');
      cellLink.append(a);
      row.append(cellLink);

      table.append(row);
    }
    details.append(table);
    listElement.append(details);
  }
}

init().catch(console.error);
