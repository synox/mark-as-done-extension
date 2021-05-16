function save(filename, data) {
    var blob = new Blob([data], {type: 'text/json'});
    if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
    } else {
        var elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
    }
}


document.getElementById("exportButton").addEventListener('click', async event => {
    let allItems = await chrome.storage.local.getP(null);
    let result = Object.entries(allItems)
        .map(entry => {
            return {url: entry[0], status: compatibiltyStatus(entry[1])}
        })
        .sort();

    save("marked-as-done-all.json", JSON.stringify(result));
});


document.getElementById("listButton").addEventListener('click', async event => {
    let allItems = await chrome.storage.local.getP(null);
    let result = Object.entries(allItems)
        .map(entry => {
            return {url: entry[0], status: compatibiltyStatus(entry[1])}
        })
        .sort()
        .reduce((accumulator, currentValue) => {
            let domain;
            try {
                domain = new URL(currentValue.url).origin
            } catch (error) {
                domain = "others";
            }
            accumulator[domain] = [...accumulator[domain] || [], currentValue];
            return accumulator;
        }, {})

    console.log(result);

    let el = document.getElementById("list-result");

    let htmlItems = "";
    for (let domain of Object.keys(result).sort()) {
        htmlItems += `<details><summary>${domain}</summary>
        <ul>`
        for (const item of result[domain]) {
            htmlItems += `<li data-status="${item.status}"><a href="${item.url}" target="_blank">${item.url}</a></li>`
        }
        htmlItems += `</ul></details>`;
    }
    el.innerHTML = htmlItems
});