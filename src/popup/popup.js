import { getPageState, getUserSettings, listPageStateGroupedByDomain } from '../storage.js';
import {
  STATUS_DISABLED, removeUrl, sortLinksByStatus, normalizeUrl,
} from '../global.js';

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageInfo = await getPageState(normalizeUrl(tab.url));
  console.log('pageInfo', pageInfo);
  if (!pageInfo || pageInfo.status === STATUS_DISABLED) {
    // show reduced popup on disabled sites
  }

  // await updatePopup(pageInfo, tab.url, false);
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
  //   .forEach((button) => button.addEventListener('click', () => handleChangeStatus(button)));
}

async function handleChangeStatus(button) {
  const status = button.getAttribute('data-status');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  const updatedPageInfo = await getPageState(normalizeUrl(tab.url));
  updatedPageInfo.status = status;

  // not waiting for response to not block user interaction
  chrome.runtime.sendMessage({ type: 'change-page-status', status, tab });

  if (status === 'none') {
    window.close();
  } else {
    setTimeout(window.close, 1200);
    await updatePopup(updatedPageInfo, tab.url, true);
  }
}

/**
 *
 * @param pageInfo {PageInfo}
 * @param url {string}
 * @param animate {boolean}
 */
async function updatePopup(pageInfo, url, animate = false) {
  console.debug('update with status', pageInfo);

  if (animate) {
    document.body.classList.add('appear-from-top');
  }

  document.querySelectorAll('.controls').forEach((controls) => {
    if (controls.getAttribute('data-status') === pageInfo.status) {
      controls.classList.add('current');
    } else {
      controls.classList.remove('current');
    }
  });

  // remove buttons for disabled states
  const settings = await getUserSettings();
  document.querySelectorAll('.changeStateButton').forEach((button) => {
    if (button.dataset.status !== 'none' && !settings.enabledStates.includes(button.dataset.status)) {
      button.remove();
    }
  });
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
  const allLinks = await listPageStateGroupedByDomain();
  return allLinks[origin] || [];
}

init().catch(console.error);
