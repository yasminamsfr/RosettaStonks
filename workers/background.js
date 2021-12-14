const filterObject = {
    urls: ["https://tracking.rosettastone.com/*"]
}

chrome.webRequest.onBeforeRequest.addListener((details) => {
        if (!(details.type === "xmlhttprequest") || !(details.method === "POST"))
            return;

        const bodyString = new TextDecoder().decode(details.requestBody?.raw[0]?.bytes)
        if (!bodyString.includes("delta_time"))
            return;

        chrome.storage.sync.set({
            request:
                {
                    id: details.requestId,
                    headers: details.requestHeaders,
                    body: bodyString,
                    ready: false
                }
        })

    },
    filterObject,
    ["requestBody", "extraHeaders"])

chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
    chrome.storage.sync.get(["request"], async ({request}) => {
        if (!request)
            return;

        const id = request.id;
        if (!details.requestId === id)
            return;

        request.headers = details.requestHeaders
        request.ready = true
        await chrome.storage.sync.set({request})

    });

}, filterObject, ["requestHeaders"])