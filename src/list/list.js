
async function init() {
  const linksByDomain = await getAllLinksByDomain();
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
    const ul = document.createElement('ul');
    const items = linksByDomain[domain];
    sortLinksByStatus(items);
    // eslint-disable-next-line no-restricted-syntax
    for (const item of items) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = item.url;
      a.innerText = item.url;
      a.target = '_blank';
      // a.classList.add(`marked-as--${item.status}`);
      const icon = document.createElement('img');
      icon.src = browser.runtime.getURL(`images/icon-${item.status}.png`);
      a.prepend(icon);
      li.append(a);
      ul.append(li);
    }
    details.append(ul);
    listElement.append(details);
  }
}

init().catch(console.error);
