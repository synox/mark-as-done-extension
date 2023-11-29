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
    details.innerHTML = `
      <summary>
        <h2>${domain} (${doneCount}/${totalCount})</h2>
        </summary>
      <table></table>
    `;

    const table = document.createElement('table');
    const items = sortLinksByStatus(linksByDomain[domain]);
    for (const page of items) {
      const row = document.createElement('tr');

      const cellStatus = document.createElement('td');
      cellStatus.innerHTML = `
        ${page.properties.status}
        <img alt="status ${page.properties.status}" 
            src="${chrome.runtime.getURL(`images/icon-${page.properties.status}.png`)}" />
      `;
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
