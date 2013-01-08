snack.wrap("#updateDB").attach("click", function() {
    document.querySelector("#indexProgress").setAttribute("value", "");
    var options = {
        method: 'post',
        url: '/updateDB',
    }
    snack.request(options, function(err, res) {
        if (err) {
            alert('error updating DB: ' + err);
            return;
        }
        document.querySelector("#indexProgress").setAttribute("value", 100);
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
            document.querySelector("#indexProgress").setAttribute("value", 0);
            }, 300);
    });
});

function adjustMediaDBHeight() {
    document.querySelector('#mediaDB').setAttribute("size", document.querySelector('#mediaDB').childNodes.length -1);
}

snack.ready(function() {
    adjustMediaDBHeight();
});
