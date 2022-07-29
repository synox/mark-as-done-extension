// noinspection JSDeprecatedSymbols

const STATUS_DONE = "done"
const STATUS_STARTED = "started"
const STATUS_NONE = "none"
const STATUS_TODO = "todo"

// keep backwards compatibility
function compatibiltyStatus(oldStatus) {

    if (oldStatus === true) {
        return STATUS_DONE
    } else if (oldStatus === undefined) {
        return STATUS_NONE;
    }

    return oldStatus;
}

async function getStatus(url) {
    if (!url) {
        return STATUS_NONE
    }
    let preparedUrl = prepareUrl(url);
    const value = await chrome.storage.local.getP(preparedUrl)
    return compatibiltyStatus(value[preparedUrl])
}

function prepareUrl(url) {
    try {
        let urlObject = new URL(url)
        // in general, hash are ignored.

        //Search must be respected for confluence-wiki. (/pages/viewpage.action?pageId=123)
        // but on other pages the "?lang=en" should be ignored.

        let filteredSearch = urlObject.search.replace(/lang=.*$/, "")

        // In confluence-wiki, there is a suffix when clicking the sidebar which should be ignored.
        // https://wiki.corp.adobe.com/display/WEM/Creating+a+Public+Share+Link?src=contextnavpagetreemode
        filteredSearch = urlObject.search.replace(/src=contextnavpagetreemode/, "")

        if (filteredSearch === "?") {
            filteredSearch = ""
        }
        return urlObject.origin + urlObject.pathname + filteredSearch;
    } catch (error) {
        console.error(`Can not parse as url=${url}, error=${error}`)
    }
}

function promisify(api, context) {
    return (...args) => {
        return new Promise((resolve, reject) => {

            let customCallback = (result) => {
                if (chrome.runtime.lastError) {
                    return reject(chrome.runtime.lastError);
                } else {
                    return resolve(result);
                }
            };

            args.push(customCallback); // append our custom callback to the end of arguments
            api.call(context, ...args); // call the original function
        });
    };
}

// the official promise version of chrome.storage.local.get does not work.
chrome.storage.local.getP = promisify(chrome.storage.local.get, chrome.storage.local)
