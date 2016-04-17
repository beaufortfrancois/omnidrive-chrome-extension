const LOGIN_TEXT = 'Click here to authenticate...';
const NEW_DOC = 'new doc';
const NEW_SHEET = 'new sheet';
const NEW_SLIDE = 'new slide';
const NEW_DRAWING = 'new drawing';
const NEW_FORM = 'new form';

/**
 * We keep track of the request object in order to cancel it easily.
 */

var xhr = null;

/**
 * We keep track of the timeout ID to delay requests to Google Drive.
 */

var timeoutId = null;

/**
 * If user hits <Enter> key, open a tab to Google Drive Web Search if text
 * starts with Drive Domain or to the Google Drive item if user selected it.
 */

chrome.omnibox.onInputEntered.addListener(function (text) {
    if (text == LOGIN_TEXT) {
        chrome.identity.getAuthToken({ 'interactive': true }, function() {});
    } else if (text == NEW_DOC) {
        chrome.tabs.update({ url: 'https://docs.google.com/create' });
    } else if (text == NEW_SHEET) {
        chrome.tabs.update({ url: 'https://sheets.google.com/create' });
    } else if (text == NEW_SLIDE) {
        chrome.tabs.update({ url: 'https://slides.google.com/create' });
    } else if (text == NEW_DRAWING) {
        chrome.tabs.update({ url: 'https://drawings.google.com/create' });
    } else if (text == NEW_FORM) {
        chrome.tabs.update({ url: 'https://forms.google.com/create' });
    } else if (/^https:\/\/(docs|drive).google.com\//.test(text)) {
        chrome.tabs.update({ url: text });
    } else {
        chrome.tabs.update({ url: 'https://drive.google.com/#search/' + text });
    }
});


chrome.omnibox.onInputChanged.addListener(function(text, suggest) {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(function() {
    onInputChanged(text, suggest);
  }, 300);
});

/**
 * Escape entities to avoid XML parsing issues with arbitrary document titles
 *   github.com/kurrik/chrome-extensions/tree/master/omnibox-escaping
 */
function sanitizeItemTitle(title) {
    return title.replace(/"/g,"&quot;")
        .replace(/'/g,"&apos")
        .replace(/</g,"&lt;")
        .replace(/>/g,"&gt;")
        .replace(/&/g,"&amp;");
}


/**
 * Ask Google Drive API Search when user enters something in the omnibox.
 */

function onInputChanged(text, suggest) {
    var url = 'https://www.googleapis.com/drive/v2/files';
    var params = new URLSearchParams();
    params.append('maxResults', 5)
    params.append('fields', 'items(alternateLink,title)')
    params.append('q','fullText contains "' + text + '"');

    if (xhr !== null) {
        xhr.onreadystatechange = null;
        xhr.abort();
        xhr = null;
    }

    chrome.identity.getAuthToken({ 'interactive': false }, function(token) {
        if (chrome.runtime.lastError || !token) {
            suggest([{content: LOGIN_TEXT, description: LOGIN_TEXT}]);
            return;
        }
        xhr = new XMLHttpRequest();
        xhr.open('GET', url + '?' + params.toString());
        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.responseType = 'json';
        xhr.onloadend = function () {
            if (xhr.status == 200) {
                var results = [];
                xhr.response.items.forEach(function(item) {
                    folderIdStart = item.alternateLink.indexOf("folderview?id="); // If it's a folder, adapt url
                    if(folderIdStart!= -1){
                        item.alternateLink = 'https://drive.google.com/drive/folders/'+item.alternateLink.substring(folderIdStart+14, item.alternateLink.indexOf('&', folderIdStart+14));
                    }
                    results.push({
                        content: item.alternateLink,
                        description: sanitizeItemTitle(item.title)
                    });
                });
                suggest(results);
            } else if (xhr.status == 401) {
                chrome.identity.removeCachedAuthToken({ token: token }, function() {
                    onInputChanged(text, suggest);
                });
            }
        }
        xhr.send();
    });
};
