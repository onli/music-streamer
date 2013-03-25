var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
var db = null;


function cache(id, data) {
    var request = indexedDB.open("cache", 1);
    request.onupgradeneeded = function (event) {
        var db = event.target.result;
        db.createObjectStore("cache");
    };
    request.onsuccess = function(event) {
        var db = event.target.result;
        var transaction = db.transaction(["cache"], 'readwrite');
        transaction.objectStore("cache").put(data, id);
    };
}

function getCached(id, success) {
    var request = indexedDB.open("cache", 1);
    request.onsuccess = function(event) {
        var db = event.target.result;
        var transaction = db.transaction(["cache"], 'readwrite');
        transaction.objectStore("cache").get(id).onsuccess = function (event) {
            success(event.target.result);
        };
    };
}