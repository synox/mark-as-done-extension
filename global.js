// noinspection JSDeprecatedSymbols

const ignoreHashRegex = /#.*$/ig;

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
    let preparedUrl = await prepareUrl(url);
    const value = await chrome.storage.local.getP(preparedUrl)
    return compatibiltyStatus(value[preparedUrl])
}

// in general, the anchor is not respected
async function prepareUrl(url) {
    url = url.replaceAll(ignoreHashRegex, "");
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
