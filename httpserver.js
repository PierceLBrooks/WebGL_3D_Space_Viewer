"use strict";

var http = require('http');
var url = require('url');
var fs = require('fs');


var contenttypes = {
    '.jpeg' : 'image/jpeg',
    '.jpg' : 'image/jpeg',
    '.png': 'image/png',
    '.gif' : 'image/gif',
    '.js' : 'application/javascript',
    '.css' : 'text/css',
    '.htm' : 'text/html',
    '.html' : 'text/html' 
}

function handler(req,resp){
    var pu = url.parse(req.url);
    var p = process.cwd() + pu.pathname;
    console.log(pu.pathname);
    try{
        var s = fs.statSync(p);
    }
    catch(e){
        console.log(e.toString());
        resp.writeHead(404,{'Content-type':'text/html'});
        resp.end("<HTML>Not found</HTML>");
        return;
    }  
    
    if( s.isDirectory() ){
        var pfx = pu.pathname;
        if( pfx.length === 0 )
            pfx='/';
        if( pfx[0] !== '/' )
            pfx[0] = '/';
        if( pfx[pfx.length-1] != '/' )
            pfx += '/';
            
        var L = fs.readdirSync(p);
        resp.writeHead(200,{"Content-type":"text/html"});
        resp.write("<!DOCTYPE html>\n");
        resp.write("<html>\n");
        resp.write("<head><meta charset='utf-8'></head>");
        resp.write("<body><ul>");
        for(var i=0;i<L.length;++i){
            resp.write("<li><a href='"+pfx+L[i]+"'>"+L[i]+"</a></li>\n");
        }
        resp.end("</ul></body></html>");
    }
    else{
        var rs = fs.createReadStream(p);
        var i = p.lastIndexOf(".");
        var suffix;
        if( i === -1 )
            suffix='';
        else
            suffix = p.substr(i);
        
        var contenttype;
        if( contenttypes[suffix] === undefined )
            contenttype='application/octet-stream';
        else
            contenttype=contenttypes[suffix];   
        
        resp.writeHead(200,{'Content-type':contenttype});
        rs.pipe(resp);
    }
}

var server = http.createServer(handler);
server.listen(8081,'127.0.0.1');
console.log("Listening on port 8081");