require 'sinatra'
require 'sinatra/browserid'
require 'json'
require 'filemagic'
require 'open3'

require './database.rb'

set :sessions, true
# session-hijacking-protection were triggered by ajax-requests
set :protection, except: :session_hijacking
# use thin as server for streaming support (used when transcoding) 
set :server, :thin

helpers do
    include Rack::Utils
    alias_method :h, :escape

    def isAdmin?
        if authorized?
            if Database.new.getOption('admin') == authorized_email
                return true
            end
        end
        return false
    end
    
    def protected!
        unless isAdmin?
            throw(:halt, [401, "Not authorized\n"])
        end
    end

    def firstUse?
        return Database.new.firstUse?
    end
    
    def emptyMediaDB?
        return Database.new.emptyMediaDB?
    end
end

get '/' do
    if ! isAdmin?
        erb :login
    else
        db = Database.new
        if db.getOption("mediaDir") == nil
            erb :setDB, :locals => {:mediaDir => nil}
        else
            if db.emptyMediaDB?
                db.updateDB
            end
            erb :index, :locals => {:mediaDB => db.getMediaDB}
        end
    end
end

get '/setDB' do
    session[:origin] = back
    erb :setDB, :locals => {:mediaDir => Database.new.getOption("mediaDir")}
end

post '/addAdmin' do
    db = Database.new
    if db.firstUse? && ! authorized_email.empty?
        db.setOption('admin', authorized_email)
        redirect to('/')
    else
        'Error adding admin: param missing or admin already set'
    end
end

post '/setOption' do
    protected!
    Database.new.setOption(params[:name], params[:value])
    origin = session[:origin]
    # when setOption wasn't called first, like with the design, origin is old, so unset it
    session.delete(:origin)
    redirect origin if origin != nil
    redirect back
end

post '/updateDB' do
    protected!
    db = Database.new
    db.updateDB
    erb :mediaDB, :locals => {:mediaDB => db.getMediaDB}
end

get '/getTracks' do
    protected!
    puts "getTracks"
    tracks = Database.new.getTracks(params[:artist], params[:album]).delete_if{|key, value| key.is_a? Integer}
    JSON(tracks)
end

get %r{/track/([0-9]+)} do |id|
    puts "requesting track #{id}"
    path = Database.new.getPath(id)
    type = FileMagic.new(FileMagic::MAGIC_MIME).file(path)
    
    if type == "application/octet-stream; charset=binary"
        # application/octetstream is the fallback, so the extension is the last hope
        type = "audio/mpeg; charset=binary" if File.extname(path) == ".mp3"
        type = "application/ogg; charset=binary" if File.extname(path) == ".ogg"
    end

    if (type != "application/ogg; charset=binary" &&
        params[:supportOGG] != "" &&
        (!(type == "audio/mpeg; charset=binary" && params[:supportMP3] != "")))
        
        puts "converting to ogg"
        content_type  "application/ogg; charset=binary"
        headers "Content-Length" => File.size(path).to_s, "Last_Modified" => DateTime.now.httpdate
        stdin, stdout, stderr  = Open3.popen3("ffmpeg", "-loglevel", "quiet",
                                                        "-i", path,
                                                        "-f", "ogg",
                                                        "-y",
                                                        "-acodec", "libvorbis",
                                                        "-aq", "5",
                                                        "-")
        stream do |out|
            begin
                loop do
                    IO.select([stdout]) 
                    data = stdout.read_nonblock(8192) 
                    out << data
                end
            rescue Errno::EAGAIN
                retry
            rescue EOFError
                puts "End of file #{path}"
                stdin.close 
                stdout.close
                stderr.close
            end
        end
        return
    else
        if ((params[:supportMP3] != "" && type != "audio/mpeg; charset=binary") &&
            (!(params[:supportOGG] != "" && type == "application/ogg; charset=binary")))
            puts "converting to mp3"
            content_type  "application/ogg; charset=binary"
            headers "Content-Length" => File.size(path).to_s, "Last_Modified" => DateTime.now.httpdate
            stdin, stdout, stderr  = Open3.popen3("ffmpeg", "-loglevel", "quiet",
                                                            "-i", path,
                                                            "-f", "mp3",
                                                            "-y",
                                                            "-ab", "160k",
                                                            "-")
            stream do |out|
                begin
                    loop do
                        IO.select([stdout])
                        data = stdout.readpartial(8192) 
                        out << data
                    end
                rescue Errno::EAGAIN
                    retry
                rescue EOFError
                    puts "End of file #{path}"
                    stdin.close 
                    stdout.close
                    stderr.close
                end
            end
            return
        end
    end

    content_type type
    puts "send file without transcoding"
    send_file path, :type => type, :last_modified => DateTime.now.httpdate
end
