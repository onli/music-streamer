"use strict";

document.querySelector("#updateDB").addEventListener("click", function() {
    document.querySelector("#indexProgress").removeAttribute("value");
    document.querySelector('#updateDB').setAttribute("disabled", "");

    var http = new XMLHttpRequest();
    var updateProgressInterval = "";
        
    http.onreadystatechange = function() {
        if (http.readyState == 4 && http.status == 200) {
            
            var httpUpdateDone = new XMLHttpRequest();
            httpUpdateDone.onreadystatechange = function() {
                if (httpUpdateDone.readyState == 4 && httpUpdateDone.status == 200) {
                    if (httpUpdateDone.responseText == "true") {
                        clearInterval(checkUpdateEnd);
                        clearInterval(updateProgressInterval);
                        
                        var mediaDBHttp = new XMLHttpRequest();
                        mediaDBHttp.onreadystatechange = function() {
                            if (mediaDBHttp.readyState == 4 && mediaDBHttp.status == 200) {
                                document.querySelector("#indexProgress").setAttribute("max", 100);
                                document.querySelector("#indexProgress").setAttribute("value", "100");
                                document.querySelector("#updateDB").removeAttribute("disabled");
                                
                                var oldMediaDB = document.querySelector('#mediaDB')
                                if (navigator.userAgent.match(/.*Firefox.*/)) {
                                    // detect firefox here, because in firefox you cant create an empty element and chrome can't add the form as inner/outerhtml without errors
                                    var mediaDB = document.createElement("section");
                                } else {
                                    var mediaDB = document.createElement();
                                }
                                mediaDB.innerHTML = mediaDBHttp.responseText;
                                mediaDB.querySelector('#mediaDB').style.opacity = 0;
                                oldMediaDB.parentNode.replaceChild(mediaDB, oldMediaDB);
                                adjustMediaDBHeight();
                                addPlayerFunctions();
                                setTimeout(function() {
                                    document.querySelector('#mediaDB').style.opacity = 1;
                                    document.querySelector("#indexProgress").setAttribute("value", "0");
                                    }, 300);
                            }
                        }
                        
                        mediaDBHttp.open("GET", "/mediaDB", true);
                        mediaDBHttp.send();
                    }
                }

            }

            var checkUpdateEnd = setInterval(function() {
                httpUpdateDone.open("GET", "/updateDone", true);
                httpUpdateDone.send();
            }, 5000);
        }
    }

    http.open("POST","/updateDB", true);
    http.send();

    var updateTotalHttp = new XMLHttpRequest();

    updateTotalHttp.onreadystatechange = function() {
        if (updateTotalHttp.readyState == 4 && updateTotalHttp.status == 200) {
            document.querySelector("#indexProgress").setAttribute("max", updateTotalHttp.responseText);
            
            updateProgressInterval = setInterval(function() {
                var optionsProgressHttp = new XMLHttpRequest();

                optionsProgressHttp.onreadystatechange = function() {
                    if (optionsProgressHttp.readyState == 4 && optionsProgressHttp.status == 200) {
                        if (parseInt(optionsProgressHttp.responseText) >= parseInt(updateTotalHttp.responseText)) {
                            if (updateProgressInterval != null) {
                                clearInterval(updateProgressInterval);
                            }
                        } else {
                            document.querySelector("#indexProgress").setAttribute("value", optionsProgressHttp.responseText);
                        }
                    }
                }
                optionsProgressHttp.open("GET", "/updateProgress", true);
                optionsProgressHttp.send();

            }, 3000);
        }
    }
    
    updateTotalHttp.open("GET", "/updateTotal", true);
    updateTotalHttp.send();

});

function adjustMediaDBHeight() {
    document.querySelector('#mediaDB').setAttribute("size", document.querySelector('#mediaDB').childNodes.length -1);
}

var searchTerm = "";
var searchTermReset = null;
document.querySelector("body").addEventListener("keypress", function(evt) {
    var charTyped = String.fromCharCode(evt.keyCode)
    searchTerm += charTyped;
    resetSearchTimeout();

    search();
    showSearch()
});

function resetSearchTimeout() {
    clearTimeout(searchTermReset);
    searchTermReset = setTimeout(function() {
        searchBox.style.display = "none";
        var optgroupNodeList = hiddenSelect.querySelectorAll("optgroup");

    }, 3000);
}

function search() {
    var all = document.querySelector('#mediaDB').querySelectorAll("optgroup");
    for (var i = 0; i < all.length; ++i) {
        hideOptgroup(all[i])
    }

    if (searchTerm == "") {
        var resultsNodeList = document.querySelectorAll("optgroup");
    } else {
        var resultsNodeList = hiddenSelect.querySelectorAll("optgroup[data-searchlabel~=\""+searchTerm.toLowerCase()+"\"],optgroup[data-searchlabel=\""+searchTerm.toLowerCase()+"\"]");
    }
    var results = [];
    for (var i = 0; i < resultsNodeList.length; ++i) {
        results[i] = resultsNodeList[i];
    }
    results.sort(function(a, b) {
        return (a.label < b.label) ? -1 : (a.label > b.label) ? 1 : 0;
    })
    for (var i = 0; i < results.length; ++i) {
        showOptgroup(results[i]);
    }
}

document.querySelector("body").addEventListener("keydown", function(evt) {
    if (evt.keyIdentifier == "U+0008") {
        if (searchTerm.length > 0) {
            searchTerm = searchTerm.slice(0,-1);
            search();
            showSearch();
            resetSearchTimeout();
        }
    }
});

var hiddenSelect = document.createElement("select");
hiddenSelect.style.display = "none";
document.body.appendChild(hiddenSelect);

function hideOptgroup(optgroup) {
    optgroup.parentNode.removeChild(optgroup);
    hiddenSelect.appendChild(optgroup);
}

function showOptgroup(optgroup) {
    hiddenSelect.removeChild(optgroup);
    document.querySelector('#mediaDB').appendChild(optgroup);
    restoreScroll();
}

var searchBox = document.createElement("span");
searchBox.id = "searchBox";
document.body.appendChild(searchBox);
function showSearch() {
    searchBox.style.display = "block";
    searchBox.innerHTML = searchTerm + "_";
}


document.querySelector("#mediaDB").addEventListener("scroll", function() {
    localStorage.scrollPosition = this.scrollTop;
});

function restoreScroll() {
    document.querySelector('#mediaDB').scrollTop = localStorage.scrollPosition;
}
adjustMediaDBHeight();
restoreScroll();


if (document.querySelector('#mediaDB').getAttribute("size") == 0) {
    var event = document.createEvent("HTMLEvents");
    event.initEvent("click", true, true);
    document.querySelector('#updateDB').dispatchEvent(event);
}

addPlayerFunctions();

