"use strict";
snack.ready(function() {
    
    snack.wrap("#updateDB").attach("click", function() {
        document.querySelector("#indexProgress").removeAttribute("value");
        document.querySelector('#updateDB').setAttribute("disabled", "");
        var options = {
            method: 'post',
            url: '/updateDB',
            async: true
        }
        snack.request(options, function(err, res) {
            if (err) {
                alert('error updating DB: ' + err);
                return;
            }
            var options = {
                method: 'get',
                url: '/updateDone',
                async: true
            }
            
            var checkUpdateEnd = setInterval(function() {
                    snack.request(options, function(err, updateDone)  {
                        console.log("updateDone: " +updateDone); 
                        if (updateDone == "true") {
                            clearInterval(checkUpdateEnd);
                            var options = {
                                method: 'get',
                                url: '/mediaDB',
                                async: true
                            }
                            snack.request(options, function(err, res)  {
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
                                mediaDB.innerHTML = res;
                                mediaDB.querySelector('#mediaDB').style.opacity = 0;
                                oldMediaDB.parentNode.replaceChild(mediaDB, oldMediaDB);
                                adjustMediaDBHeight();
                                addPlayerFunctions();
                                setTimeout(function() {
                                    document.querySelector('#mediaDB').style.opacity = 1;
                                    document.querySelector("#indexProgress").setAttribute("value", "0");
                                    }, 300);
                            });
                        }
                    });
                }, 5000);
            
        });

        var options = {
            method: 'get',
            url: '/updateTotal',
            async: true
        }

        snack.request(options, function(err, updateTotal) {
            if (err) {
                alert('error getting items to update: ' + err);
                return;
            }
            document.querySelector("#indexProgress").setAttribute("max", updateTotal);

            function updateProgress() {
                  var optionsProgress = {
                        method: 'get',
                        url: '/updateProgress',
                        async: true
                    }
                    snack.request(optionsProgress, function(err, updateProgress) {
                        if (err) {
                            alert('error getting update progress: ' + err);
                            return;
                        }
                        if (parseInt(updateProgress) >= parseInt(updateTotal)) {
                            if (updateProgressInterval != null) {
                                clearInterval(updateProgressInterval);
                            }
                        } else {
                            document.querySelector("#indexProgress").setAttribute("value", updateProgress);
                        }
                        
                    });
            }
            updateProgress();
            var updateProgressInterval = setInterval(updateProgress, 3000);
        });
    });

    function adjustMediaDBHeight() {
        document.querySelector('#mediaDB').setAttribute("size", document.querySelector('#mediaDB').childNodes.length -1);
    }

    var searchTerm = "";
    var searchTermReset = null;
    snack.wrap("body").attach("keypress", function(evt) {
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

    snack.wrap("body").attach("keydown", function(evt) {
        if (evt.keyIdentifier == "U+0008") {
            searchTerm = searchTerm.slice(0,-1);
            search();
            showSearch();
            resetSearchTimeout();
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

    snack.wrap("#mediaDB").attach("scroll", function() {
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
});
