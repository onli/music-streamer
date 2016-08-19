require 'sqlite3'
require 'find'
require 'taglib'

class Database

    def initialize
        begin
            @@db    # create a singleton - if this class-variable is uninitialized, this will fail and can then be initialized
        rescue
            @@db = SQLite3::Database.new "streamer.db"
            begin
                @@db.execute "CREATE TABLE IF NOT EXISTS media (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                artist TEXT NOT NULL,
                                album TEXT NOT NULL,
                                title TEXT NOT NULL,
                                track INT,
                                path TEXT UNIQUE
                                );"
                @@db.execute "CREATE TABLE IF NOT EXISTS options (
                                name TEXT PRIMARY KEY,
                                value TEXT
                                );"

                @@db.results_as_hash = true
            rescue => error
                puts "error creating tables: #{error}"
            end
        end
    end
    
    def firstUse?
        begin
            mail = @@db.execute("SELECT value FROM options WHERE name = 'admin';")
        rescue => error
            puts error
        end
        return mail.empty?
    end

    def emptyMediaDB?
        begin
            id = @@db.execute("SELECT id FROM media LIMIT 1;")
        rescue => error
            puts error
        end
        return id.empty?
    end
    
    def updateDB
        mediaDir = Dir.new(self.getOption("mediaDir"))

        @@newSongsMutex = Mutex.new
        @@newSongsThread = Thread.new() do
            Thread.current[:progress] = 0
            Find.find("#{mediaDir.path}/") do |entry|
                @@newSongsMutex.synchronize do
                    Thread.current[:progress] += 1
                end
                TagLib::FileRef.open(entry) do |fileref|
                    unless fileref.null?
                        begin
                            tag = fileref.tag
                            self.addToDB(tag.artist, tag.album, tag.title, tag.track, entry)
                        rescue => error
                            warn "error adding file: #{error}"
                        end
                    end
                end
            end
        end

        @@checkDeletedMutex = Mutex.new
        @@checkDeletedThread = Thread.new() do
            Thread.current[:progress] = 0
            begin
                @@db.execute("SELECT id, path FROM media").each do |row|
                    @@checkDeletedMutex.synchronize do
                        Thread.current[:progress] += 1
                    end
                    if ! File.exists?(row["path"])
                        self.deleteTrack(row["id"])
                    end
                end
            rescue => error
                warn "Error searching deleted songs: #{error}"
            end
        end
        
        begin
            return Find.find("#{mediaDir.path}/").count()  + @@db.execute("SELECT COUNT(id) FROM media")[0]["COUNT(id)"]
        rescue => error
            warn "Error calculating total entries: #{error}"
            return 0
        end
    end

    def updateDone
        return ((! @@newSongsThread.alive?) && (! @@checkDeletedThread.alive?))
    end

    def updateProgress
        @@newSongsMutex.synchronize do
            @@checkDeletedMutex.synchronize do
                return @@checkDeletedThread[:progress] + @@newSongsThread[:progress]
            end
        end
    end 
    
    def addToDB(artist, album, title, track, path) 
        begin
            @@db.execute("INSERT INTO media(artist, album, title, track, path)
                         VALUES (?, ?, ?, ?, ?)", artist, album, title, track, path)
        rescue => error
            #puts "error inserting track: #{error}"
        end
    end
    
    def getMediaDB
        begin
            result = Hash.new
            @@db.execute("SELECT DISTINCT artist, album FROM media ORDER BY artist ASC") do |row|
                if result.has_key?(row['artist'])
                    result[row['artist']].push(row['album'])
                else
                    result[row['artist']] = [row['album']]
                end
            end
            return result
        rescue => error
            puts "error getting media db: #{error}"
        end
    end

    def getTracks(artist, album)
        begin
            puts "getTracks in DB"
            puts artist
            puts album
            return @@db.execute("SELECT id, title, track FROM media WHERE artist = ? AND album = ?", artist, album)
        rescue => error
            puts "error getting tracks: #{error}"
        end
    end

    def getPath(id)
        begin
            return @@db.execute("SELECT path FROM media WHERE id = ?", id)[0]['path']
        rescue => error
            puts "error getting tracks: #{error}"
        end
    end

    def deleteTrack(id)
        begin
            return @@db.execute("DELETE FROM media WHERE id = ?", id)
        rescue => error
            puts "error deleting track: #{error}"
        end
    end
    
    def getOption(name)
        begin
            return @@db.execute("SELECT value FROM options WHERE name = ? LIMIT 1;", name)[0]['value']
        rescue => error
            puts "error getting option: #{error}"
        end
    end

    def setOption(name, value)
        begin
            @@db.execute("INSERT OR IGNORE INTO options(name, value) VALUES(?, ?)", name, value)
            @@db.execute("UPDATE options SET value = ? WHERE name = ?", value, name)
        rescue => error
            puts error
        end
    end

end

    
