function nullFunc() {}

/*
function showDebugMessage(msg) {
    browser.notifications.create("invertColorDebug", {
        type: "basic",
        iconUrl: browser.runtime.getURL("icons/on.svg"),
        title: "Debug",
        message: msg,
      });
}
*/

// set color for tabId by current setting
function setTabColors(tabId) {
    browser.storage.local.get().then((res) => {
        setTabColorsToState(tabId, res.InvertColorsState, res.ImgColorNoInvert);
    });
}

// 
// ignoreWhitList: force invertTabColors
async function setTabColorsToState(tabId, state, imgNoInvert, ignoreWhitList) {
    let inverted = false;
    if (state == true) {
        inverted = await invertTabColors(tabId, ignoreWhitList);
        if (inverted && imgNoInvert) {
            invertTabImg(tabId, ignoreWhitList);
        }
    }

    if (!inverted) {
        revertTabImg(tabId);
        revertTabColors(tabId);
    }
    await browser.sessions.setTabValue(tabId, "invertColors", inverted).then(nullFunc(), nullFunc());
    await browser.sessions.setTabValue(tabId, "imgNoInvert", imgNoInvert).then(nullFunc(), nullFunc());

    setPageIconState(tabId, inverted);
    showDebugMessage("tabId:"+tabId+", state:"+state+", imgNoInvert:"+imgNoInvert+", inverted:"+inverted+", force:"+ignoreWhitList);
}

function toggleColors(changeState, tab) {
    browser.storage.local.get().then((res) => {
        if (tab) {
            browser.sessions.getTabValue(tab.id, "invertColors").then(tabState => {
                tabState = !tabState;
                setTabColorsToState(tab.id, tabState, res.ImgColorNoInvert, changeState);
            }, nullFunc());
        } else {
            var state = res.InvertColorsState ? res.InvertColorsState : false;
            state = changeState ? !state : state;
            setActionBarIconState(state);

            browser.storage.local.set({
                InvertColorsState: state,
                ImgColorNoInvert: res.ImgColorNoInvert
            });

            browser.tabs.query({}).then((tabs) => {
                for (var tab of tabs) {
                    setTabColorsToState(tab.id, state, res.ImgColorNoInvert, changeState);
                };
            });
        }
    });
}

// for wrapping onClickData parameter, see: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/menus/onClicked#Parameters
function toggleColorsContextMenu(tabInfo, onClickData) {
    toggleColors(true, tabInfo);
}

// set action bar icon
function setActionBarIconState(state) {
    if (state) {
        browser.browserAction.setIcon({
            path: "icons/on.svg"
        });
        browser.browserAction.setTitle({
            title: "Colors Inverted"
        });
    } else {
        browser.browserAction.setIcon({
            path: "icons/off.svg"
        });
        browser.browserAction.setTitle({
            title: "Colors Normal"
        });
    }
}

function setPageIconState(tabId, state) {
    if (state) {
        browser.pageAction.setIcon({
            tabId: tabId,
            path: "icons/on.svg"
        });
        browser.pageAction.setTitle({
            tabId: tabId,
            title: "Revert Current Page Colors"
        });
    } else {
        browser.pageAction.setIcon({
            tabId: tabId,
            path: "icons/off.svg"
        });
        browser.pageAction.setTitle({
            tabId: tabId,
            title: "Invert Current Page Colors"
        });
    }
}

function invertTabImg(tabId, force) {
    if (tabId) {
        browser.storage.local.get("urlIncludeList").then(function (res) {
            res.urlIncludeList = res.urlIncludeList || {}

            browser.tabs.get(tabId).then(function (tab) {
                if (force || toBaseURL(tab.url) in res.urlIncludeList) {
                    browser.tabs.insertCSS(tabId, {
                        file: "image.css"
                    });
                }
            });
        })
    } else {
        /*
        browser.tabs.insertCSS(tabId, {
            file: "image.css"
        });
        */
    }
}

function revertTabImg(tabId) {
    browser.tabs.removeCSS(tabId, {
        file: "image.css"
    });
}

// force: force invert even not in whitelist
async function invertTabColors(tabId, force) {
    toInvert = false;
    if (tabId) {
        let res = await browser.storage.local.get("urlIncludeList");
        res.urlIncludeList = res.urlIncludeList || {};
        let tab = await browser.tabs.get(tabId);
        if (force || (toBaseURL(tab.url) in res.urlIncludeList)) {
            toInvert = true;
        }
    } else {
        /*
        browser.tabs.insertCSS(tabId, {
            file: "style.css"
        });
        */
    }
    if (toInvert) {
        browser.tabs.insertCSS(tabId, {
            file: "style.css"
        });
    }
    return toInvert;
}

function revertTabColors(tabId) {
    browser.tabs.removeCSS(tabId, {
        file: "style.css"
    });
}

function handleTabUpdated(tabId, changeInfo, tabInfo) {
    browser.pageAction.show(tabId);
    if (changeInfo.status) {
        setTabColors(tabId);
    }
}

function handleStorageUpdate(changes, area) {
    if (area == "local") {
        for (var item of Object.keys(changes)) {
            if (item == "InvertColorsState" || item == "ImgColorNoInvert") {
                browser.storage.local.get().then((res) => {
                    var state = res.InvertColorsState ? res.InvertColorsState : false;
                    setActionBarIconState(state);

                    browser.tabs.query({}).then((tabs) => {
                        for (var tab of tabs) {
                            setTabColorsToState(tab.id, state, res.ImgColorNoInvert);
                        };
                    });
                });
            }
        }
    }
}

function toBaseURL(fullURL) {
    return fullURL.replace(/(http(s)?:\/\/)|(\/.*){1}/g, '');
}

browser.contextMenus.create({
    id: "InvertColors",
    title: "Invert Colors"
});

browser.tabs.onUpdated.addListener(handleTabUpdated);
browser.storage.onChanged.addListener(handleStorageUpdate);
browser.pageAction.onClicked.addListener((tab) => {
    toggleColors(true, tab);
});
browser.contextMenus.onClicked.addListener((info, tab) => {
    toggleColorsContextMenu(tab, info);
});

browser.commands.onCommand.addListener((command) => {

    if (command === "global_invert") {
        toggleColors(true);
    }

});

toggleColors(false);