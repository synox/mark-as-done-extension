// This script is injected into every page. It is responsible for updating the links
// on the page. It therefore needs to be as small and fast as possible.

// noinspection JSDeprecatedSymbols
console.log('Content script injected');

browser.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
	console.debug('content: received', request);
	if (request.type === 'update-content') {
		console.debug('content: updating content');
		await updateAllLinksOnPage(location.href);

		// Some pages load content later. Need to add a trigger to process the links later.
		if (location.href.startsWith('https://learning.oreilly.com/')) {
			// Button to show the toc
			document.querySelectorAll('a.sbo-toc-thumb').forEach(a => {
				a.addEventListener('click', () => updateAllLinksOnPage(location.href));
			});
		}

		if (location.href.startsWith('https://wiki.corp')) {
			const mutationObserver = new MutationObserver((mutationList, observer) => {
				// Use traditional 'for loops' for IE 11
				for (const mutation of mutationList) {
					if (mutation.type === 'childList') {
						console.debug('Wiki: Sidebar was loaded.');
						updateAllLinksOnPage(location.href);
					}
				}
			});
			mutationObserver.observe(document.querySelector('div.plugin_pagetree_children'),
				{childList: true, subtree: false});
		}
	}
});

/**
 *
 * @param documentUrl {string}
 * @param root {HTMLElement|Document}
 * @return {Promise<void>}
 */
async function updateAllLinksOnPage(documentUrl, root= document) {
	const links = root.querySelectorAll('a');

	console.debug("found ", links.length, "links")
	for (let i = 0; i < links.length; i++) {
		const link = links[i];
		if (isNormalMarkableLink(link, documentUrl)) {
			const status = await getStatus(link.href);

			link.classList.remove('marked-as-done');
			link.classList.remove('marked-as-todo');
			link.classList.remove('marked-as-started');

			if (status !== 'none') {
				link.classList.add('marked-as-' + status);
			}
		}
	}
}


browser.storage.local.onChanged.addListener(async (changes, areaName) => {
	updateAllLinksOnPage(location.href);
});


