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

browser.storage.local.onChanged.addListener(async (changes, areaName) => {
	updateAllLinksOnPage(location.href);
});


