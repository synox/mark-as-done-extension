const buttons = document.querySelectorAll("button.changeStateButton");

buttons.forEach(button => button.addEventListener('click', async event => {
    let status = button.getAttribute("data-status");
    updateButtons(status)
    let [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    chrome.runtime.sendMessage({type: "set-status", status, tab});
    setTimeout(window.close, 200);
}));

function updateButtons(status) {
    let buttons = document.querySelectorAll("button.changeStateButton")
    buttons.forEach(button => {
        if (button.getAttribute("data-status") === status) {
            button.classList.add("current")
        } else {
            button.classList.remove("current")
        }
    });
}


async function listItemsForCurrentPage() {
    let [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const prefix = new URL(tab.url).origin
    let allItems = await chrome.storage.local.getP(null);
    return Object.entries(allItems)
        .map(entry => {
            return {url: entry[0], status: compatibiltyStatus(entry[1])}
        })
        .filter(entry => entry.url.startsWith(prefix))
        .sort();
}


document.getElementById("listButton").addEventListener('click', async event => {
    let result = await listItemsForCurrentPage();
    let el = document.getElementById("list-result");
    let htmlItems = result.map(item => `<li data-status="${item.status}"><a href="${item.url}" target="_blank">${item.url}</a></li>`)
    el.innerHTML = `<ul>${htmlItems.join("")}</ul>`
});

async function init() {
    let [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    let status = await getStatus(tab.url)
    updateButtons(status)
}

init()