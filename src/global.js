const STATUS_DONE = 'done';
const STATUS_STARTED = 'started';
const STATUS_NONE = 'none';
const STATUS_DISABLED = 'disabled';
const STATUS_TODO = 'todo';

// Keep backwards compatibility
function compatibiltyStatus(oldStatus) {
	if (oldStatus === true) {
		return STATUS_DONE;
	}

	if (oldStatus === undefined) {
		return STATUS_NONE;
	}

	return oldStatus;
}

/**
 * @param url {string}
 * @return {Promise<boolean>}
 */
async function hasAnyStatusForDomain(url) {
	const urlObj = new URL(url);
	const allItems = await browser.storage.local.get(null);
	return Object.keys(allItems).some(key => key.startsWith(urlObj.protocol + '//' + urlObj.hostname));
}

async function getStatus(url) {
	if (!url) {
		return STATUS_NONE;
	}

	if (!url.startsWith('http')) {
		return STATUS_DISABLED;
	}

	const preparedUrl = prepareUrl(url);
	const value = await browser.storage.local.get(preparedUrl);
	return compatibiltyStatus(value[preparedUrl]);
}

function prepareUrl(url) {
	try {
		const urlObject = new URL(url);
		// In general, hash are ignored.

		// Search must be respected for confluence-wiki. (/pages/viewpage.action?pageId=123)
		// but on other pages the "?lang=en" should be ignored.

		let filteredSearch = urlObject.search.replace(/lang=.*$/, '');

		// In confluence-wiki, there is a suffix when clicking the sidebar which should be ignored.
		// https://wiki.corp.example.com/display/ABC/Link?src=contextnavpagetreemode
		filteredSearch = urlObject.search.replace(/src=contextnavpagetreemode/, '');

		if (filteredSearch === '?') {
			filteredSearch = '';
		}

		return urlObject.origin + urlObject.pathname + filteredSearch;
	} catch (error) {
		console.error(`Can not parse as url=${url}, error=${error}`);
	}
}
