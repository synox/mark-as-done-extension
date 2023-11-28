import { STATUS_DONE } from '../global.js';
import { listPages } from '../storage.js';
import { sortLinksByStatus } from '../filter-utils.js';

async function init() {
  const pages = await listPages();
  const linksByDomain = Object.groupBy(pages.values(), (page) => new URL(page.url).origin);

  for (const domain of Object.keys(linksByDomain).toSorted()) {
    const totalCount = linksByDomain[domain].length;
    const doneCount = linksByDomain[domain].filter((item) => item.properties.status === STATUS_DONE).length;
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    const h2 = document.createElement('h2');
    h2.innerText = `${domain} (${doneCount}/${totalCount})`;
    summary.append(h2);
    details.append(summary);

    const table = document.createElement('table');
    const items = sortLinksByStatus(linksByDomain[domain]);

    for (const page of items) {
      const row = document.createElement('tr');

      const cellStatus = document.createElement('td');
      cellStatus.innerText = page.properties.status;
      const icon = document.createElement('img');
      icon.src = chrome.runtime.getURL(`images/icon-${page.properties.status}.png`);
      cellStatus.prepend(icon);
      row.append(cellStatus);

      const a = document.createElement('a');
      a.href = page.url;
      a.innerText = page.properties.title || page.url.replace(domain, '');
      a.target = '_blank';

      const cellLink = document.createElement('td');
      cellLink.append(a);
      row.append(cellLink);

      table.append(row);
    }
    details.append(table);
    document.querySelector('.links').append(details);
  }
}

init().catch(console.error);
