"use strict"; 

function addPlayerFunctions() {
    var songs = [];
    var artist = "";
    
    document.querySelector('#mediaDB').addEventListener("change", function(event) {
        var album = event.target.value;
        if (album != "") {
            var artist = event.target.options[event.target.selectedIndex].parentNode.label;
            var http = new XMLHttpRequest();
            
            http.onreadystatechange = function() {
                if (http.readyState == 4 && http.status == 200) {
                    songs = JSON.parse(http.responseText);
                    showPlaylist(songs);

                    if (document.querySelector("#player")) {
                        abortLoad(document.querySelector("#player"));
                    }

                    insertOrReplace('#player', createPlayer(0, songs), '#currentMedia');
                    var cover = document.querySelector('#cover');
                    if (cover != null) {
                        cover.parentNode.removeChild(cover);
                    }
                     // remove cover of the prior album if it exists
                    showCover(songs[0].id);
                }
            }

            http.open("GET","/tracks?artist="+artist +"&album="+album, true);
            http.send();
            showDownloadButton(artist, album);
        }
    });

    function showCover(songid) {
        var cover = document.createElement("img");
        cover.addEventListener("load", function() {
            var curMedia = document.querySelector("#currentMedia");
            if (cover.complete) {
                curMedia.insertBefore(cover, curMedia.firstChild);
            }
        });
        cover.id = "cover";
        cover.src = "/cover?id="+songid;
    }

    function showDownloadButton(artist, album) {
        var button = document.createElement("button");
        var form = document.createElement("form");
        var artistInput = document.createElement("input");
        var albumInput = document.createElement("input");
        artistInput.value = artist;
        artistInput.name = "artist"
        artistInput.type = "hidden"
        
        albumInput.value = album;
        albumInput.type = "hidden"
        albumInput.name = "album";
        
        form.method = "GET";
        form.action = "/download";
        form.id = "downloadForm";
        
        button.title = "Download album";
        button.className = "icon-download";

        form.appendChild(button);
        form.appendChild(artistInput);
        form.appendChild(albumInput);

        insertOrReplace('#downloadForm', form, "#mediaDBList");
    }

    /**
    * songs: [{id => ..., title => ..., track => ... }}
    * */
    function showPlaylist(songs) {
        var playlist = document.createElement("ol");
        playlist.id = "playlist";
        songs.forEach(function(song, index) {
            var songEntry = document.createElement("li");
            var songName = document.createElement("span");
            songName.innerHTML = song.title;
            songName.className = "songName";
            songName.addEventListener("click", function() {
                removeOldControls();
                abortLoad(document.querySelector('#player'));
                var player = createPlayer(index, songs);
                insertOrReplace('#player', player, '#currentMedia');
                player.play();
            });
            songEntry.id = "song" + index;
            songEntry.appendChild(songName);
            playlist.appendChild(songEntry);
        });
        insertOrReplace('#playlist', playlist, '#currentMedia');
    }

    function showNextButton(index) {
        var next = createImageButton("next");

        document.querySelector("#song"+index).appendChild(next);
        
        next.addEventListener("click", function() {
            removeOldControls();
            var player = document.querySelector('#player');
            if ((! player.paused) || (player.played.length > 0)) {
                // simply ceating a new player leads to a buggy deactivated player
                var event = document.createEvent("HTMLEvents");
                event.initEvent("ended", true, true);
                abortLoad(player);
                player.dispatchEvent(event);
            } else {
                abortLoad(player);
                insertOrReplace('#player', createPlayer(index + 1, songs), '#currentMedia');
            }
        });
    }

    function showPrevButton(index) {
        var prev = createImageButton("prev");

        document.querySelector("#song"+index).appendChild(prev);

        prev.addEventListener("click", function() {
            removeOldControls();
            abortLoad(player);
            insertOrReplace('#player', createPlayer(index - 1, songs), '#curentMedia');
        });
    }

    // Abort the network-connection to the server.
    function abortLoad(player) {
        player.pause();
        player.src = "";
        player.load();
    }

    function createImageButton(id, img) {
        var button = document.createElement("button");
        button.id = id;
        if (id == "next") {
            button.className = "icon-fast-forward";
            button.title = "next";
        } else {
            button.className = "icon-fast-backward";
            button.title = "previous";
        }
        return button;
    }


    function createPlayer(index, songs) {
        if (index >= songs.length) {
            return
        }
        var oldPlayer = document.querySelector('#player');
        var player = document.createElement("audio");
        player.id = "player";
        player.setAttribute("controls", true);
        player.setAttribute("preload", "auto");
        var source = document.createElement("source");

        player.addEventListener('ended', function() {
            removeOldControls();
            var newPlayer = createPlayer(index+1, songs);
            newPlayer.play();
            insertOrReplace('#player', newPlayer);
        });
        
        player.appendChild(source);

        setPlaylistTo(index);

        if (localStorage.volume) {
            player.volume = localStorage.volume;
        }

        player.addEventListener("volumechange", function() {
            localStorage.volume = player.volume;
        });

        player.addEventListener("play", function() {
            showLyrics(songs[index], artist);
        });
        
        transferPlayerState(player, oldPlayer);
        source.src = "/track/" + songs[index].id +"?supportMP3="+ player.canPlayType("audio/mpeg") + "&supportOGG="+ player.canPlayType("audio/ogg");
        return player
    }

    function setPlaylistTo(index) {
        var activeTrack = document.querySelector('.active')
        if (activeTrack) {
            // remove the class with a regex
            activeTrack.className = activeTrack.className.replace( /(?:^|\s)active(?!\S)/ , '' )
        }

        document.querySelector('#song'+index).className = document.querySelector('#song'+index).className + " active";

        if (index > 0) {
            showPrevButton(index);
        }
        if (index < songs.length - 1) {
            showNextButton(index);
        }
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

    function insertOrReplace(selector, newElement, container) {
        if (typeof(container) === "undefined") {
            container = 'body';
        }
        var oldElement = document.querySelector(selector);
        if (oldElement) {
            oldElement.parentNode.replaceChild(newElement, oldElement);
        } else {
            document.querySelector(container).appendChild(newElement);
        }
    }

    function placeLyrics(text) {
        var lyrics = document.createElement("aside");
        lyrics.innerHTML = text;
        lyrics.id = "lyrics";
        insertOrReplace("#lyrics", lyrics, '#media');
    }

    function showLyrics(song, artist) {
        getCached(song.id + "-lyrics", function(res) {
            if (res == undefined) {
                var oReq = new XMLHttpRequest();
                oReq.addEventListener("loadstart", function() { placeLyrics(song.title + ": Fetching Lyrics..."); }, false);
                oReq.onreadystatechange = function() {if (this.readyState === 4) {
                    cache(song.id + "-lyrics", this.response);
                    placeLyrics(this.response);
                }};
                oReq.open("GET", "/lyrics?track="+song.title+ "&artist="+artist, true);
                oReq.send();
            } else {
                placeLyrics(res);
            }
        });
    }

    var hanging = false;
    var keepAlive = setInterval(function() {
        // occasionally, the end event is not triggered. Detect this and start the next track
        var player = document.querySelector('#player');
        if (player != null && player.ended) {
            if (hanging) {
                hanging = false;
                var event = document.createEvent("HTMLEvents");
                event.initEvent("ended", true, true);
                player.dispatchEvent(event);
            } else {
                hanging = true;
            }
        }
       
    }, 200);
}

