"use strict";
//modified by jh at ssu 2013, 2014

/*
 * Copyright 2009, Google Inc.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


/**
 * @fileoverview This file contains a loader class for helping to load
 *     muliple assets in an asynchronous manner.
 */

tdl.provide('tdl.loader');

/**
 * A Module with a loader class for helping to load muliple assets in an
 * asynchronous manner.
 * @namespace
 */
tdl.loader = tdl.loader || {};

tdl.loader.verbose=false;
tdl.loader.uniqueid=0;

/**
 * A simple Loader class to call some callback when everything has loaded.
 * @constructor
 * @param {!function(): void} onFinished Function to call when final item has
 *        loaded.
 */
tdl.loader.Loader = function(onFinished,parent)  {
  
    this.type_="Loader";  //so Textures, etc. can verify their first parameter is indeed a Loader.
  
    //for debugging only
    this.parent=parent;
    if(tdl.loader.uniqueid===undefined)
        tdl.loader.uniqueid=0;
    this.uniqueid=tdl.loader.uniqueid++;
  
    //sentinel: Used for finish() function.
    //Should be unique object shared with no one else
    this.loadSentinel={toString:function(){return "sentinel"}};
    
    //things this loader needs to load. May be strings
    //(url's) or sub-loader objects.
    this.to_load=[this.loadSentinel];
  
    //callback.
    this.onFinished_ = onFinished;

};

tdl.loader.Loader.prototype.toString = function(){
    var L=[];
    var p = this;
    while(p){
        L.push(p.uniqueid);
        p=p.parent;
    }
    L=L.reverse();
    return "Loader"+L.join("-");
}

/**
 * Loads a text file.
 * @param {string} url URL of scene to load.
 * @param {!function(string, *): void} callback Function to call when
 *     the file is loaded. It will be passed the contents of the file as a
 *     string.
 */
tdl.loader.Loader.prototype.loadTextFile = function(url, callback) {
    var that=this;
    var req = new XMLHttpRequest();
    this.to_load.push(url);
    req.open("GET",url+"?_="+((new Date()).getTime()));
    req.onreadystatechange = function(){
        if(req.readyState === 4 ){
            if(req.status === 200 ){
                if(callback)
                    callback(req.responseText);
                that.loadCompleted(url);
            }
            else
                throw new Error("Cannot load url "+url);
        }
    }
    req.send(null);
}

tdl.loader.Loader.prototype.loadArrayBuffer = function(url,callback){
    var req = new XMLHttpRequest();
    var that=this;
    this.to_load.push(url);
    req.open("GET",url+"?_="+((new Date()).getTime()));
    req.onreadystatechange = function(){
        if(req.readyState === 4 ){
            if(req.status === 200 ){
                if( callback)
                    callback(req.response);
                that.loadCompleted(url);
            }
            else
                throw new Error("Cannot load url "+url);
        }
    }
    req.responseType="arraybuffer";
    req.send(null);
}

tdl.loader.Loader.prototype.loadImage = function(url,callback){
    var img = new Image();
    this.to_load.push(url);
    var that=this;
    img.addEventListener("load",function(){
        if(callback)
            callback(img);
        that.loadCompleted(url);
    });
    img.src=url+"?_="+((new Date()).getTime());
}

tdl.loader.Loader.prototype.load = function(url,callback,type){
    var req = new XMLHttpRequest();
    this.to_load.push(url);
    req.open("GET",url+"?_="+((new Date()).getTime()));
    req.onreadystatechange = function(){
        if( req.readyState === 4 ){
            if( req.status === 200 ){
                var dat;
                if( type === "text" )
                    dat = req.responseText;
                else if( type === "arraybuffer" )
                    dat = req.response;
                else{
                    console.log("UNEXPECTED:",url,type);
                    throw new Error("Unexpected type: "+type);
                }
                    
                if(callback)
                    callback(dat);
                    
                that.loadCompleted(url);
            }
            else{
                throw new Error("Unable to load file",url);
            }
        }
    }
    
    if( type === "arraybuffer" )
        req.responseType = "arraybuffer";
    else if( type === "text" ){
        //nop
    }
    else{
        throw new Error("Bad type: "+type);
    }
    
    req.send(null);
}
    
/**
 * Creates a loader that is tracked by this loader so that when the new loader
 * is finished it will be reported to this loader.
 * @param {!function(): void} onFinished Function to be called when everything
 *      loaded with this loader has finished.
 * @return {!tdl.loader.Loader} The new Loader.
 */
tdl.loader.Loader.prototype.createSubloader = function(onFinished) {
    var that = this;
    var L;
    L = new tdl.Loader(function(){
        if(onFinished)
            onFinished();
        that.loadCompleted(L)
    },this);
    this.to_load.push(L);
    return L;
};

/**
 * Counts down the internal count and if it gets to zero calls the callback.
 * @private
 */
tdl.loader.Loader.prototype.loadCompleted = function(thing){
    var flag=false;

    //console.log("Completed "+thing);
    
    for(var i=0;i<this.to_load.length;++i){
        if( this.to_load[i] === thing ){
            var so = this.to_load.splice(i,1);
            flag=true;
            break;
        }
    }
    
    //console.log(this.uniqueid+": to_load:",this.to_load.length,"things left:"
    //    +this.to_load);
    
    if( !flag )
        console.error("Internal loader error: Lost item "+thing);
    
    if( this.to_load.length === 0 )
        this.onFinished_();
        
};

/**
 * Finishes the loading process.
 * Actually this just calls countDown_ to account for the count starting at 1.
 */
tdl.loader.Loader.prototype.finish = function() {
    this.loadCompleted(this.loadSentinel);
};


