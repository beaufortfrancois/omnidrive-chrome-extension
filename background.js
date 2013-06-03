/**
 * We keep track of the request object in order to cancel it easily
 */

var xhr = null;


/**
 * If user hits <Enter> key, open a tab to Google Drive Web Search if 
 * text starts with http or directly to the Google Drive item if user 
 * selected it   
 */

chrome.omnibox.onInputEntered.addListener(function (text) {
    if (/^https:\/\/docs.google.com\//.test(text)) {
        chrome.tabs.update({ url: text });
    } else {
        chrome.tabs.update({ url: 'https://drive.google.com/#search/' + text });
    }
});


/**
 * Ask Google Drive API Search when user enters something in the omnibox
 */

chrome.omnibox.onInputChanged.addListener(function (text, suggest) {
    search(text, function (response) {
        var results = [];
        JSON.parse(response).items.forEach(function (item) {
            results.push({
                content: item.alternateLink,
                description: item.title
            });
        });
        suggest(results);
    });
});


function search(query, callback) {
    var url = 'https://www.googleapis.com/drive/v2/files?maxResults=5&fields=items(alternateLink%2Ctitle)&q=fullText+contains+"' + query + '"';

    chrome.identity.getAuthToken({ 'interactive': true }, function(token) {
        if (xhr !== null) {
            xhr.onreadystatechange = null;
            xhr.abort();
            xhr = null;
        }
        xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr.onload = function () { callback(xhr.response); }
        xhr.send(null);
    });
}
