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
        // in general, the search and hash are ignored
        return urlObject.origin + urlObject.pathname;
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
