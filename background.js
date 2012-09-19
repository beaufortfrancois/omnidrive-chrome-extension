/**
 * OAuth stuff are easy thanks to smus.com/oauth2-chrome-extensions 
 */

var google = new OAuth2('google', {
    client_id: '652497263904.apps.googleusercontent.com',
    client_secret: 'ldieNQaIOqmNnyat6PZR4cBe',
    api_scope: 'https://www.googleapis.com/auth/drive.readonly'
});


/**
 * Oauth webflow starts when user starts to search in OmniDrive 
 */

chrome.omnibox.onInputStarted.addListener(function () {
    google.authorize();
});


/**
 * We keep track of the request object in order to cancel it easily
 */

var currentRequest = null;


/**
 * If user hits <Enter> key, open a tab to Google Drive Web Search if 
 * text starts with http or directly to the Google Drive item if user 
 * selected it   
 */

chrome.omnibox.onInputEntered.addListener(function (text) {
    chrome.tabs.getSelected(null, function (tab) {
        if (/^https:\/\/docs.google.com\//.test(text)) {
            url = text
        } else {
            url = "https://drive.google.com/#search/" + text
        }
        chrome.tabs.update(tab.id, {
            url: url
        });
    });
});


/**
 * Ask Google Drive API Search when user enters something in the omnibox
 */

chrome.omnibox.onInputChanged.addListener(function (text, suggest) {
    if (currentRequest != null) {
        currentRequest.onreadystatechange = null;
        currentRequest.abort();
        currentRequest = null;
    }

    if (text == '') return;

    currentRequest = search(text, function (response) {
        var results = [];

        response = JSON.parse(response);
        response.items.forEach(function (item) {
            results.push({
                content: item.alternateLink,
                description: item.title + " <url>" + item.alternateLink + "</url> "
            });
            suggest(results);
        })
    });
});


function search(query, callback) {
    var url = "https://www.googleapis.com/drive/v2/files?maxResults=5&fields=items(alternateLink%2Ctitle)&q=fullText+contains+'" + query + "'";

    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.setRequestHeader('Authorization', 'OAuth ' + google.getAccessToken())
    xhr.onload = function () { callback(xhr.response); }
    xhr.send();
    return xhr;
}

