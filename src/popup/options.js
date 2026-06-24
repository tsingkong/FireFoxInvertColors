function loadOptions() {
	browser.storage.local.get().then((res) => {
		showOption(res.InvertColorsState, res.ImgColorNoInvert, res.urlIncludeList);
	});
}

function showOption(state, imgNoInvert, urlIncludeList) {
	document.querySelector("#InvertColorsState").checked = state;
	document.querySelector('#ImgColorNoInvert').checked = imgNoInvert;

	document.querySelector('#listOfURLsToInclude').innerText = "";

	for (let [url, action] of Object.entries(urlIncludeList)) {
		let li = document.createElement("li");

		var clear = document.createElement("span");
		clear.setAttribute("id", url);
		clear.setAttribute("class", "urlToClear");
		clear.innerText = "[✗]";
		clear.onclick = clearURLToInclusionList;

		var urlSpan = document.createElement("span");
		urlSpan.innerText = url;

		li.appendChild(clear);
		li.appendChild(urlSpan);

		document.querySelector('#listOfURLsToInclude').appendChild(li);
	}
}

function updateOptions(e) {
	browser.storage.local.set({
		InvertColorsState: document.querySelector('#InvertColorsState').checked,
		ImgColorNoInvert: document.querySelector('#ImgColorNoInvert').checked
	});

	e.preventDefault();
}

function addURLToInclusionList(e) {
	browser.storage.local.get("urlIncludeList").then(function (res) {
		res.urlIncludeList = res.urlIncludeList || {}
		res.urlIncludeList[document.querySelector('#urlToInclude').Value] = 'Include';
		browser.storage.local.set({
			"urlIncludeList": res.urlIncludeList
		});

	})
}

function clearURLToInclusionList(e) {
	var url = e.target.id;

	browser.storage.local.get("urlIncludeList").then(function (res) {
		res.urlIncludeList = res.urlIncludeList || {}

		if (url in res.urlIncludeList) {
			delete res.urlIncludeList[url];
			browser.storage.local.set({
				"urlIncludeList": res.urlIncludeList
			});

			loadOptions();
		}

	})
}

browser.tabs.query({
	active: true,
	currentWindow: true
}).then(function (tabs) {
	document.querySelector("#urlToInclude").Value = toBaseURL(tabs[0].url);
});

function toBaseURL(fullURL) {
	return fullURL.replace(/(http(s)?:\/\/)|(\/.*){1}/g, '');
}

document.addEventListener('DOMContentLoaded', loadOptions);
document.querySelector("#mainForm").addEventListener("submit", updateOptions);

document.querySelector("#includeURL").addEventListener("submit", addURLToInclusionList);