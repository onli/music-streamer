snack.wrap("#updateDB").attach("click", function() {
    document.querySelector("#indexProgress").removeAttribute("value");
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
    });
});
