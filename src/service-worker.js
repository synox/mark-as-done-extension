
async function activateIcon(tab) {
	// Update Icon in toolbar
	const status = await getStatus(tab.url);
	await browser.browserAction.setPopup({popup: 'src/popup/popup.html', tabId: tab.id});
	await updateIcon(tab.id, status);
}

async function activateTabContent(tab) {
	console.debug('activateTabContent', tab.id);

	await browser.tabs.executeScript(tab.id, {file: 'src/global.js'});
	await browser.tabs.executeScript(tab.id, {file: 'src/inject/inject.js'});
	await browser.tabs.insertCSS(tab.id, {file: 'src/inject/inject.css'});
	browser.tabs.sendMessage(tab.id, {type: 'update-content'});
}

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	// Only inject script if the current domain has any status set
	if (tab.url && tab.url.startsWith('http') && await hasAnyStatusForDomain(tab.url)) {
		if (tab.status === 'loading') {
			await activateIcon(tab);
		} else if (tab.status === 'complete') {
			console.log('tab was updated', tab.url);
			await activateTabContent(tab);
		}
	} else {
		console.log('domain is disabled', tab.url);
		await updateIcon(tab.id, 'disabled');
	}
});

browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
	// Status changed in popup
	if (message.type === 'change-page-status') {
		console.log('updating status to', message.status);
		// make sure the scripts are injected
		if(!await hasAnyStatusForDomain(message.tab.url)) {
			await activateTabContent(message.tab);
		}
		await storePageStatus(message.tab.url, message.status);
		browser.tabs.sendMessage(message.tab.id, {type: 'update-content'});
		await updateIcon(message.tab.id, message.status);
	}

	if (message.type === 'import-data') {
		for (const entry of message.data) {
			browser.storage.local.set({[entry.url]: entry.status});
		}

		sendResponse('success');
	}
},
);

async function updateIcon(tabId, status) {
	await browser.browserAction.setIcon({tabId, path: `images/icon-${status}.png`});
}

async function storePageStatus(url, status) {
	const preparedUrl = prepareUrl(url);

	if (status === STATUS_NONE) {
		return browser.storage.local.remove(preparedUrl);
	}

	// This special syntax uses the value of preparedUrl as the key of the object
	return browser.storage.local.set({[preparedUrl]: status});
}

