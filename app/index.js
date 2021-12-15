const status = document.getElementById("status")
const timeCounter = document.getElementById("timeCounter");

const [form] = document.getElementsByTagName("form");
const timeInput = form.getElementsByTagName("input")[0];
const submitButton = form.getElementsByTagName("button")[0];


let appReady = false;

function print_data(data) {
    chrome.tabs.query({
        active: true,
        currentWindow: true
    }).then(([tab]) => {
        chrome.scripting.executeScript({
            target: {
                tabId: tab.id
            },
            func: (data) => console.log(data),
            args: [data]
        }, () => null)
    });
}


chrome.storage.onChanged.addListener(UpdateStatusPanel)
window.onload = async () => {
    print_data("pre update")
    UpdateStatusPanel();
    print_data("post update")
    timeInput.addEventListener("change", (e) => {
        e.preventDefault()
        const value = parseInt(e.target.value)
        if (value <= 0 || isNaN(value)) {
            timeInput.value = 1;
        } else {
            timeInput.value = value;
        }
    })


    form.onsubmit = (e) => {
        e.preventDefault()
        if (!appReady)
            return

        const minutes = parseInt(timeInput.value);
        if (minutes <= 0 || isNaN(minutes))
            return;

        SendRequest(minutes)

    };
}

function SendRequest(minutes) {
    chrome.storage.sync.get(["request"], ({request}) => {
        const body = new DOMParser().parseFromString(request.body, "text/xml");
        const maxTime = 20 * 60 * 1000;

        const rootTag = body.documentElement.tagName


        request.headers["Access-Control-Allow-Origin"] = "*"

        const promises = []
        while (minutes > 0) {
            body.documentElement.getElementsByTagName("delta_time")[0].innerHTML =
                (minutes > 20 ? 20 : minutes).toString()
            body.documentElement.getElementsByTagName("updated_at")[0].innerHTML =
                Date.now().toString()
            const data = `<${rootTag}>${body.documentElement.innerHTML}</${rootTag}>`
            promises.push(fetch(request.url, {
                method: "POST",
                headers: request.headers,
                body: data
            }).then((res) => print_data(res.status))
                .catch((err) => print_data(err.stack)))

            minutes -= 20;

        }

        const text = submitButton.innerText
        submitButton.innerText = "...";
        Promise.all(promises).then(() => {
            submitButton.innerText = text
        })


    })
}


function UpdateStatusPanel() {
    chrome.storage.sync.get(["request", "ready"], ({request, ready}) => {
        status.innerText = ready ? "ready" : "not ready";
        appReady = ready;
        form.childNodes.forEach((el) => {
            el.disabled = !ready;
        })
        if (ready) {
            const format = new Intl.NumberFormat("en-US", {
                minimumIntegerDigits: 2,
                maximumFractionDigits: 0
            });
            const offset = Math.floor((Date.now() - request.timestamp) / 1000)
            const [hours, minutes] = [
                format.format(Math.floor(offset / 3600)),
                format.format(Math.floor(offset / 60) % 60)
            ]
            timeCounter.innerText = `${hours}h${minutes}m`
        }

    })
}
