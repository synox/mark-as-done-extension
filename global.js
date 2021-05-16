// noinspection JSDeprecatedSymbols

const ignoreHashRegex = /#.*$/ig;

const STATUS_DONE = "done"
const STATUS_STARTED = "started"
const STATUS_NONE = "none"
const STATUS_TODO = "todo"

let options = {
    // Ignore everything in the URL after the hash
    ignoreUrlHashConfig: true
}

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
    let preparedUrl = await prepareUrl(url);
    const value = await chrome.storage.local.getP(preparedUrl)
    return compatibiltyStatus(value[preparedUrl])
}

async function prepareUrl(url) {
    if (options.ignoreUrlHashConfig) {
        url = url.replaceAll(ignoreHashRegex, "");
    }
    return url;
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
