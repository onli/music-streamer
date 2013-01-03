require 'sinatra'
require 'sinatra/browserid'
require 'json'
# libmagic-dev
require 'filemagic'

require './database.rb'

set :sessions, true
# prevent allegedly session-hijacking from the ajax-requests
set :protection, except: :session_hijacking

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
end

get '/' do
    if ! isAdmin?
        erb :login
    else
        db = Database.new
        # isAdmin
        if db.getOption("mediaDir") == nil
            erb :setDB
        else
            if db.emptyMediaDB?
                db.updateDB
            end
            erb :index, :locals => {:mediaDB => db.getMediaDB}
        end
    end
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

get '/getTracks' do
    protected!
    puts "getTracks"
    tracks = Database.new.getTracks(params[:artist], params[:album]).each{ |x| x.delete_if{|key, value| key.is_a? Integer} }
    JSON(tracks)
end

get %r{/track/([0-9]+)} do |id|
    path = Database.new.getPath(id)
    type = FileMagic.new(FileMagic::MAGIC_MIME).file(path)
    content_type type
    send_file path, :type => type 
    
end
