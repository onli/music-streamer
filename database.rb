require 'sqlite3'
require 'find'
require 'taglib'

class Database

    def initialize 
        @db = SQLite3::Database.new "streamer.db"
        begin
            @db.execute "CREATE TABLE IF NOT EXISTS media (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            artist TEXT,
                            album TEXT,
                            title TEXT,
                            track INT,
                            path TEXT UNIQUE
                            );"
            @db.execute "CREATE TABLE IF NOT EXISTS options (
                            name TEXT PRIMARY KEY,
                            value TEXT
                            );"

            @db.results_as_hash = true
        rescue => error
            puts "error creating tables: #{error}"
        end
    end
    
    def firstUse?
        begin
            mail = @db.execute("SELECT value FROM options WHERE name = 'admin';")
        rescue => error
            puts error
        end
        return mail.empty?
    end
    
    def updateDB
        mediaDir = Dir.new(self.getOption("mediaDir"))
        Find.find("#{mediaDir.path}/") do |entry|
            # TODO: Try to improve performance by not getting tags of already known files
            puts entry
            TagLib::FileRef.open(entry) do |fileref|
                begin
                    tag = fileref.tag
                    self.addToDB(tag.artist, tag.album, tag.title, tag.track, entry)
                rescue
                end
            end
        end
    end
    
    def addToDB(artist, album, title, track, path) 
        begin
            @db.execute("INSERT INTO media(artist, album, title, track, path)
                         VALUES (?, ?, ?, ?, ?)", artist, album, title, track, path)
        rescue => error
            puts "error inserting track: #{error}"
        end
    end
    
    def getMediaDB
        begin
            result = Hash.new
            @db.execute("SELECT DISTINCT artist, album FROM media ORDER BY artist ASC") do |row|
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
            return @db.execute("SELECT id, title, track FROM media WHERE artist = ? AND album = ?", artist, album)
        rescue => error
            puts "error getting tracks: #{error}"
        end
    end

    def getPath(id)
        begin
            return @db.execute("SELECT path FROM media WHERE id = ?", id)[0]['path']
        rescue => error
            puts "error getting tracks: #{error}"
        end
    end
    
    def getOption(name)
        begin
            return @db.execute("SELECT value FROM options WHERE name = ? LIMIT 1;", name)[0]['value']
        rescue => error
            puts "error getting option: #{error}"
        end
    end

    def setOption(name, value)
        begin
            @db.execute("INSERT OR IGNORE INTO options(name, value) VALUES(?, ?)", name, value)
            @db.execute("UPDATE options SET value = ? WHERE name = ?", value, name)
        rescue => error
            puts error
        end
    end
    

end

    
