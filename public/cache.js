var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

function cache(id, data) {
    var request = indexedDB.open("cache", 1);
    request.onupgradeneeded = function (event) {
        event.target.result.createObjectStore("cache");
    };
    request.onsuccess = function(event) {
        event.target.result.transaction(["cache"], 'readwrite').objectStore("cache").put(data, id);
    };
}

function getCached(id, success) {
    var request = indexedDB.open("cache", 1);
    request.onupgradeneeded = function (event) {
        event.target.result.createObjectStore("cache");
    };
    request.onsuccess = function(event) {
        event.target.result.transaction(["cache"], 'readwrite').objectStore("cache").get(id).onsuccess = function (event) {
            success(event.target.result);
        };
    };
}