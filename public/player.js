"use strict"; 
snack.ready(function() {
    addPlayerFunctions();
});

function addPlayerFunctions() {
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

                insertOrReplace('#player', createPlayer(0, songs, true), '#currentMedia');
                
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
                var songName = document.createElement("span");
                songName.innerHTML = song.title;
                songName.className = "songName";
                snack.wrap(songName).attach("click", function() {
                    removeOldControls();
                    abortLoad(document.querySelector('#player'));
                    var player = createPlayer(index, songs, true);
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
            var next = createImageButton("next", "/next.png");

            document.querySelector("#song"+index).appendChild(next);
            
            snack.wrap(next).attach("click", function() {
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
                    insertOrReplace('#player', createPlayer(index + 1, songs, true), '#currentMedia');
                }
            });
        }

        function showPrevButton(index) {
            var prev = createImageButton("prev", "/prev.png");

            document.querySelector("#song"+index).appendChild(prev);

            snack.wrap(prev).attach("click", function() {
                removeOldControls();
                abortLoad(player);
                insertOrReplace('#player', createPlayer(index - 1, songs, true), '#curentMedia');
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
            var buttonImage = document.createElement("img");
            buttonImage.setAttribute("src", img);
            buttonImage.setAttribute("width", "16");
            buttonImage.setAttribute("height", "16");
            button.appendChild(buttonImage);
            return button;
        }

        
        function createPlayer(index, songs, active) {
            if (index >= songs.length) {
                return
            }
            var oldPlayer = document.querySelector('#player');
            var player = document.createElement("audio");
            player.id = "player";
            player.setAttribute("controls", true);
            player.setAttribute("preload", true);
            var source = document.createElement("source");
            source.src = "/track/" + songs[index].id +"?supportMP3="+ player.canPlayType("audio/mpeg") + "&supportOGG="+ player.canPlayType("audio/ogg") ;
            
            player.appendChild(source);

            if (active) {
                setPlaylistTo(index);
            }
            var newPlayer = "";
            snack.wrap(player).attach("ended", function() {
                transferPlayerState(newPlayer, player, active);
                newPlayer.play();
                removeOldControls();
                setPlaylistTo(index+1);
                insertOrReplace('#player', newPlayer);
            });

            if (localStorage.volume) {
                player.volume = localStorage.volume;
            }

            snack.wrap(player).attach("volumechange", function() {
                localStorage.volume = player.volume;
            });

            if (index < (songs.length -1)) {
                snack.wrap(player).attach("play", function() {
                    showLyrics(songs[index].title, artist);
                    if (! newPlayer) {
                        newPlayer = createPlayer(index + 1, songs, false);
                        newPlayer.pause;
                    }
                })
            }
            
            transferPlayerState(player, oldPlayer, active);
            return player
        }

        function setPlaylistTo(index) {
            if (document.querySelector('.active')) {
                snack.wrap('.active').removeClass("active");
            }
            snack.wrap('#song'+index).addClass("active");

            if (index > 0) {
                showPrevButton(index);
            }
            if (index < songs.length - 1) {
                showNextButton(index);
            }
        }

        function transferPlayerState(player, oldPlayer, active) {
            if (oldPlayer) {
                if (active) {
                    if (oldPlayer.paused) {
                        player.pause();
                    } else {
                        player.play();
                    }
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

        function showLyrics(track, artist) {
            alert("show lyrics");
            var options = {
                method: 'get',
                url: '/lyrics',
                data: {
                    track: track,
                    artist: artist
                }
            }

            snack.request(options, function(err, res) {
                alert(res);
                var lyrics = document.createElement("aside");
                lyrics.innerHTML = res;
                lyrics.id = "lyrics";
                insertOrReplace("#lyrics", lyrics, '#currentMedia');
            });
        }
    });
}
