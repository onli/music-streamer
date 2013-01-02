snack.wrap("#mediaDB").attach("change", function(event) {
    var album = event.target.value;
    if (album != "") {
        var artist = event.target.options[event.target.selectedIndex].parentNode.label;
        var options = {
            method: 'get',
            url: '/getTracks',
            data: {
                artist: artist,
                album: album
            }
        }
        var songs = [];
        snack.request(options, function(err, res) {
            if (err) {
                alert('error getting tracks: ' + err);
                return;
            }
            songs = snack.parseJSON(res);
            showPlaylist(songs);
            var current = 0;

            insertOrReplace('#player', createPlayer(0, songs));
            
        });
    }
    /**
    * songs: [{id => ..., title => ..., track => ... }}
    * */
    function showPlaylist(songs) {
        var playlist = document.createElement("ol");
        playlist.id = "playlist";
        songs.forEach(function(song, index) {
            var songEntry = document.createElement("li");
            songEntry.innerHTML = song.title;
            songEntry.id = "song" + index;
            playlist.appendChild(songEntry);
        });
        insertOrReplace('#playlist', playlist);
    }

    function showNextButton(index) {
        var next = createImageButton("next", "/next.png");

        document.querySelector("#song"+index).appendChild(next);
        
        snack.wrap(next).attach("click", function() {
            removeOldControls();
            
            //~ var event = document.createEvent("HTMLEvents");
            //~ event.initEvent("ended", true, true);
            //~ document.querySelector('#player').dispatchEvent(event);
            insertOrReplace('#player', createPlayer(index + 1, songs));
        });
    }

    function showPrevButton(index) {
        var prev = createImageButton("prev", "/prev.png");

        document.querySelector("#song"+index).appendChild(prev);

        snack.wrap(prev).attach("click", function() {
            removeOldControls();
            
            insertOrReplace('#player', createPlayer(index - 1, songs));
        });
    }

    function createImageButton(id, img) {
        var button = document.createElement("button");
        button.id = id;
        var buttonImage = document.createElement("img");
        buttonImage.setAttribute("src", img);
        buttonImage.setAttribute("width", "16");
        buttonImage.setAttribute("height", "16");
        button.appendChild(buttonImage);
        return button;
    }

    function createPlayer(index, songs) {
        oldPlayer = document.querySelector('#player');
        var player = document.createElement("audio");
        player.id = "player";
        player.setAttribute("controls", true);
        player.setAttribute("preload", true);
        source = document.createElement("source");
        source.src = "/track/" + songs[index].id;
        
        player.appendChild(source);
        
        if (document.querySelector('.active')) {
            snack.wrap('.active').removeClass("active");
        }
        snack.wrap('#song'+index).addClass("active");
            
        snack.wrap(player).attach("ended", function() {
            var newPlayer = createPlayer(index + 1, songs);
            removeOldControls();
            document.querySelector('body').replaceChild(newPlayer, player);
            newPlayer.play();
        });
        
        if (index > 0) {
            showPrevButton(index);
        }
        if (index < songs.length) {
            showNextButton(index);
        }
        transferPlayerState(player, oldPlayer);
        return player
    }

    function transferPlayerState(player, oldPlayer) {
        if (oldPlayer) {
            if (oldPlayer.paused) {
                player.pause();
            } else {
                player.play();
            }
            player.volume = oldPlayer.volume;
        }
    }

    function removeOldControls() {
        var next = document.querySelector('#next');
        var prev = document.querySelector('#prev');

        if (next) {
            next.parentNode.removeChild(next);
        }
        if (prev) {
            prev.parentNode.removeChild(prev);
        }
    }

    function insertOrReplace(selector, newElement) {
        var oldElement = document.querySelector(selector);
        if (oldElement) {
            oldElement.parentNode.replaceChild(newElement, oldElement);
        } else {
            document.querySelector('body').appendChild(newElement);
        }
    }
});
