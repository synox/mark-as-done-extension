import {
  getPageState, listPagesForDomain, listPagesGroupedByDomain, removePageState, updatePageState,
} from '../storage.js';
import {
  sortLinksByStatus, normalizeUrl,
} from '../global.js';

function addButtonHandlers() {
  document.getElementById('mark-as-unread-button').addEventListener('click', (event) => {
    event.preventDefault();
    handleChangeState('todo');
  });
  document.getElementById('mark-as-finished-button').addEventListener('click', (event) => {
    event.preventDefault();
    handleChangeState('done');
  });
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageInfo = await getPageState(normalizeUrl(tab.url));

  addButtonHandlers();
  await updatePopup(pageInfo, tab.url);
  //
  // let currentSiteLinks = await getAllLinksForDomain(new URL(tab.url).origin);
  // // Remove current page from list, only show other pages on the same domain
  // currentSiteLinks = removeUrl(currentSiteLinks, tab.url);
  // addRelatedLinks(currentSiteLinks);
  //
  // document.querySelector('#listButton').addEventListener('click', () => {
  //   setTimeout(window.close, 200);
  // });
  //
  // document.querySelectorAll('button.changeStateButton, a.changeStateButton')
  //   .forEach((button) => button.addEventListener('click', () => handleChangeState(button)));
}

async function handleChangeState(status) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await updatePageState(tab.url, { status });

  const updatedPageInfo = await getPageState(normalizeUrl(tab.url));
  updatedPageInfo.status = status;

  await updatePopup(updatedPageInfo, tab.url);

  // not waiting for response to not block user interaction
  chrome.runtime.sendMessage({ type: 'change-page-status', status, tab });

  // if (status === 'none') {
  //   window.close();
  // } else {
  //   setTimeout(window.close, 1200);
  //   await updatePopup(updatedPageInfo, tab.url, true);
  // }
}

/**
 * @param  page {PageInfo}
 * @param tabUrl {string}
 * @return {HTMLElement}
 */
function createPageElement(page, tabUrl) {
  /**
   * <div class="page not-current-unread">
   *         <a href="some page">
   *           <p class="title">The Account and profile</p>
   *           <p class="metadata">asdf.com - Nov 12</p>
   *         </a>
   *           <button class="outline">remove</button>
   *       </div>
   */
  const div = document.createElement('div');
  div.classList.add('page');

  if (page.url === tabUrl) {
    div.classList.add('current');
  }

  const a = document.createElement('a');
  a.href = page.url;
  const title = document.createElement('p');
  title.classList.add('title');
  title.textContent = page.properties.title || new URL(page.url).pathname;
  const metadata = document.createElement('p');
  metadata.classList.add('metadata');
  const { hostname } = new URL(page.url);
  const lastModified = new Date(page.properties.lastModified).toLocaleDateString();
  metadata.textContent = `${hostname} - ${lastModified}`;
  const button = document.createElement('button');
  button.classList.add('outline');
  button.textContent = 'remove';
  button.addEventListener('click', async () => {
    await removePageState(page.url);
    div.remove();
  });
  a.append(title);
  a.append(metadata);
  div.append(a);
  div.append(button);
  return div;
}

/**
 *
 * @param pageInfo {PageInfo}
 * @param url {string}
 */
async function updatePopup(pageInfo, tabUrl) {
  console.debug('update with status', pageInfo);

  if (pageInfo && pageInfo.properties.status === 'todo') {
    document.getElementById('mark-as-unread-button').classList.add('hidden');
    document.getElementById('mark-as-finished-button').classList.remove('hidden');
  } else if (pageInfo && pageInfo.properties.status === 'done') {
    document.getElementById('mark-as-unread-button').classList.add('hidden');
    document.getElementById('mark-as-finished-button').classList.add('hidden');
  } else {
    document.getElementById('mark-as-unread-button').classList.remove('hidden');
    document.getElementById('mark-as-finished-button').classList.add('hidden');
  }

  const currentDomainFilter = document.getElementById('current-domain-filter');
  currentDomainFilter.closest('label').querySelector('span').textContent = new URL(tabUrl).hostname;
  const onlyShowCurrentDomain = currentDomainFilter.checked;

  document.querySelector('main section.unread .pages').innerHTML = '';
  document.querySelector('main section.finished .pages').innerHTML = '';

  if (onlyShowCurrentDomain) {
    const pages = await listPagesForDomain(new URL(tabUrl).origin);
    for (const page of pages) {
      const pageElement = createPageElement(page, tabUrl);
      if (page.properties.status === 'todo') {
        document.querySelector('main section.unread .pages').append(pageElement);
      } else {
        document.querySelector('main section.finished .pages').append(pageElement);
      }
    }
  }
}

function addRelatedLinks(currentDomainEntries) {
  const listElement = document.querySelector('.related-links ul');

  if (currentDomainEntries.length === 0) {
    listElement.parentElement.remove();
    return;
  }
  sortLinksByStatus(currentDomainEntries);
  currentDomainEntries.forEach((entry) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = entry.url;
    a.innerText = entry.title || new URL(entry.url).pathname;
    // open in new tab, otherwise it does not work in Google Chrome
    a.target = '_blank';

    const icon = document.createElement('img');
    icon.src = chrome.runtime.getURL(`images/icon-${entry.status}.png`);
    a.prepend(icon);
    li.append(a);

    listElement.append(li);
    a.addEventListener('click', () => {
      setTimeout(window.close, 200);
    });
  });
}

/**
 * @param {string} origin - The origin URL to get links from.
 * @returns {Promise<Array.<LinkInfo>>} links
 */
async function getAllLinksForDomain(origin) {
  const allLinks = await listPagesGroupedByDomain();
  return allLinks[origin] || [];
}

init().catch(console.error);
