music-streamer
==============
Listen to music from your own server in your browser using HTML 5.

![ScreenShot](https://lh4.googleusercontent.com/-6oLB6J11b1s/UQGjZ14XO3I/AAAAAAAACZE/ygJFqRvdISk/s640/music-streamer-search.jpg))

Requires: 
 * General:
  * ruby
  * libmagic-dev
  * libtag1-dev
  * ffmpeg
 * gems:
  * sinatra
  * sinatra-browserid (the one in the repo is currently defunct, see http://40hourworkweek.blogspot.de/2012/06/i-have-been-playing-with-mozillas.html for a solution)
  * sqlite3
  * ruby-filemagic
  * puma (or another rack-compatible server with streaming support)
  * taglib-ruby
  * sanitize
  * nokogiri
