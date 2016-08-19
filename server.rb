require 'sinatra'
require 'sinatra/browserid'
require 'json'
require 'filemagic'
require 'open3'
require 'http'
require 'uri'
require 'open-uri'
require 'zip'
require 'xmlsimple'

require './database.rb'

set :sessions, true
# session-hijacking-protection were triggered by ajax-requests
set :protection, except: :session_hijacking
# use server with streaming support (used when transcoding) 
set :server, :puma

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

    def isGuest?
        if authorized?
            begin
                if Database.new.getOption('guest').split(";").include? authorized_email
                    return true
                end
            rescue => error
                warn error
            end
        end
        return false
    end
    
    def protected!
        unless isAdmin?
            throw(:halt, [401, "Not authorized\n"])
        end
    end

    def semiProtected!
        unless isAdmin? || isGuest?
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
    if ! (isAdmin? || isGuest?)
        erb :login
    else
        db = Database.new
        if db.getOption("mediaDir") == nil
            erb :setDB, :locals => {:mediaDir => nil}
        else
            erb :index, :locals => {:mediaDB => db.getMediaDB}
        end
    end
end

get '/setDB' do
    session[:origin] = back
    erb :setDB, :locals => {:mediaDir => Database.new.getOption("mediaDir")}
end

get '/settings' do
    protected!
    session[:origin] = back
    guests = Database.new.getOption("guest")
    guests = guests.split(";") if guests != nil
    erb :settings, :locals => {:guests => guests}
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

get '/logout' do
    logout!
    return "Logged out"
end

post '/setOption' do
    protected!
    if params[:name].is_a?(String)
        Database.new.setOption(params[:name], params[:value])
    else
        # we came from the settings, so input is more complex
        params[:name].each do |name, values|
            valueString = ""
            values.each do |key, value|
                valueString+=value + ";"
            end
            Database.new.setOption(name, valueString.chomp(";"))
        end
    end
    origin = session[:origin]
    # when setOption wasn't called first, like with the design, origin is old, so unset it
    session.delete(:origin)
    redirect origin if origin != nil
    redirect back
end

get '/guestInput' do
    protected!
    erb :guestInput, :locals => {:index => params[:index], :mail => ""}
end

# return the total amount of files to betreated
post '/updateDB' do
    protected!
    return Database.new.updateDB.to_s
end

get '/updateProgress' do
    Database.new.updateProgress.to_s
end

get '/updateDone' do
    Database.new.updateDone.to_s
end

get '/mediaDB' do
    semiProtected!
    erb :mediaDB, :locals => {:mediaDB => Database.new.getMediaDB}
end

get '/tracks' do
    semiProtected!
    tracks = Database.new.getTracks(params[:artist], params[:album]).delete_if{|key, value| key.is_a? Integer}
    JSON(tracks)
end

get '/lyrics' do
    i=0
    begin
        apiSearch = XmlSimple.xml_in(HTTP.get(URI.encode("http://api.chartlyrics.com/apiv1.asmx/SearchLyric?artist=#{params[:artist]}&song=#{params[:track]}")).to_s)
    rescue  HTTP::ConnectionError, IOError => ioe
        sleep 10    # give the api more time
        i++
        until i == 2
            retry
        end
        return "no lyrics found, API down"
    end
    begin
        lyricId = apiSearch["SearchLyricResult"][0]["LyricId"][0]
        checksum = apiSearch["SearchLyricResult"][0]["LyricChecksum"][0]
    rescue NoMethodError => nme
        return "no lyrics found"
    end
    i=0
    sleep 5     # the api enforces timeouts
    begin
        lyrics = XmlSimple.xml_in(HTTP.get("http://api.chartlyrics.com/apiv1.asmx/GetLyric?lyricId=#{lyricId}&lyricCheckSum=#{checksum}").to_s)
        return lyrics["Lyric"][0]
    rescue  HTTP::ConnectionError, IOError => ioe
        sleep 15
        i++
        until i == 3
            retry
        end
        return "no lyrics found, API down"
    end
    return "no lyrics found"
    
end

get '/download' do
    semiProtected!
    tracks = Database.new.getTracks(params[:artist], params[:album]).delete_if{|key, value| key.is_a? Integer}
    filename = (params[:artist] + "_" + params[:album] + ".zip").gsub("/", "_")
    t = Tempfile.new(['temp_zip', '.zip'])
    Zip::ZipOutputStream.open(t.path) do |z|
        tracks.each do |track|
            name = track["title"]
            name += ".mp3" unless name.end_with?(".mp3")
            z.put_next_entry(name)
            z.print(open(Database.new.getPath(track["id"])) {|f| f.read })
        end
    end

    send_file t.path, :type => 'application/zip',
                      :disposition => 'attachment',
                      :filename => filename,
                      :stream => false
    
end

# returns a cover, expects a id of one of the songs of the current album
get '/cover' do
    semiProtected!
    path = Database.new.getPath(params[:id])
    path = File.dirname(path)
    images = Dir[path + "/*.jpg"]
    if (images.size > 1)
        ["folder.jpg", "front.jpg", "large.jpg"].each do |preferredImage|
            index = images.index { |i| i.downcase.include? preferredImage}
            if (index)
                send_file images[index]
            end
        end
    end
    if images.size > 0
        send_file images[0]
    end
end

get %r{/track/([0-9]+)} do |id|
    semiProtected!
    path = Database.new.getPath(id)
    type = FileMagic.new(FileMagic::MAGIC_MIME).file(path)
    
    if type.include?("application/octet-stream")
        # application/octetstream is the fallback, so the extension is the last hope
        type = "audio/mpeg; charset=binary" if File.extname(path) == ".mp3"
        type = "audio/ogg; charset=binary" if File.extname(path) == ".ogg"
    end
    
    type = "audio/ogg; charset=binary" if type.include?("application/ogg")     # ff thinks this is a video otherwise and fails
    
    content_type type
    response['Cache-Control'] = "public, max-age=31536000"   # NOTE: chrome doesn't cache the audio regardless
    send_file path, :type => type, :last_modified => DateTime.now.httpdate
end
