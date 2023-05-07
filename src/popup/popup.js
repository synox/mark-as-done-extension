document.querySelectorAll('button.changeStateButton, a.changeStateButton')
  .forEach((button) => button.addEventListener('click', () => handleClickStatusButton(button)));

async function handleClickStatusButton(button) {
  const status = button.getAttribute('data-status');
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  await browser.runtime.sendMessage({ type: 'change-page-status', status, tab });

  if (status === 'none') {
    setTimeout(window.close, 200);
  } else {
    await updatePopup(status, tab.url, true);
    setTimeout(window.close, 1200);
  }
}

/**
 *
 * @param status {LinkStatus}
 * @param url {string}
 * @param animate {boolean}
 * @return {Promise<void>}
 */
async function updatePopup(status, url, animate = false) {
  console.debug('update with status', status);

  if (animate) {
    document.body.classList.add('appear-from-top');
  }

  document.querySelectorAll('.controls').forEach((controls) => {
    if (controls.getAttribute('data-status') === status) {
      controls.classList.add('current');
    } else {
      controls.classList.remove('current');
    }
  });

  const currentSiteLinks = await getAllLinksForDomain(new URL(url).origin);
  updateStatusForUrl(currentSiteLinks, url, status);
  addRelatedLinks(currentSiteLinks);
}

function addRelatedLinks(currentSiteLinks) {
  const relatedLinks = document.querySelector('.related-links ul');
  sortLinksByStatus(currentSiteLinks);
  currentSiteLinks.forEach((link) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = link.url;
    a.innerText = new URL(link.url).pathname;
    const icon = document.createElement('img');
    icon.src = browser.runtime.getURL(`images/icon-${link.status}.png`);
    a.prepend(icon);
    li.append(a);

    relatedLinks.append(li);
    a.addEventListener('click', () => {
      setTimeout(window.close, 200);
    });
  });
}

async function init() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  let status = await getStatus(tab.url);
  if (status === STATUS_DISABLED) {
    // don't show popup on disabled sites
    window.close();
    return;
  }

  let animate = false;

  // On first click, change to initial status
  if (status === 'none') {
    status = 'todo'; // TODO #1: make initial status configurable
    browser.runtime.sendMessage({ type: 'change-page-status', status, tab });
    animate = true;
  }

  await updatePopup(status, tab.url, animate);
}

init();
