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
//"use strict";

/**
 * @fileoverview This file contains objects to manage
 *               framebuffers.
 */

tdl.provide('tdl.framebuffers');

tdl.require('tdl.textures');

/**
 * A module for framebuffers.
 * @namespace
 */
tdl.framebuffers = tdl.framebuffers || {};

/*
tdl.framebuffers.createFramebuffer = function(width, height, opt_depth) {
  return new tdl.framebuffers.Framebuffer(width, height, opt_depth);
};

tdl.framebuffers.createCubeFramebuffer = function(size, opt_depth) {
  return new tdl.framebuffers.CubeFramebuffer(size, opt_depth);
};
*/

tdl.framebuffers.BackBuffer = function(canvas) {
    this.depth = true;
    this.buffer = null;
};

tdl.framebuffers.BackBuffer.prototype.bind = function() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
};

if (Object.prototype.__defineSetter__) {
    tdl.framebuffers.BackBuffer.prototype.__defineGetter__(
        'width',
        function () {
          return gl.drawingBufferWidth || gl.canvas.width;
        }
    );

    tdl.framebuffers.BackBuffer.prototype.__defineGetter__(
        'height',
        function () {
          return gl.drawingBufferHeight || gl.canvas.height;
        }
    );
}

// Use this where you need to pass in a framebuffer, but you really
// mean the backbuffer, so that binding it works as expected.
tdl.framebuffers.getBackBuffer = function(canvas) {
    return new tdl.framebuffers.BackBuffer(canvas)
};

/**
 * @param width The width of the FBO
 * @param height The height of the FBO
 * @param opts An optional dictionary with these items:
 *          format: A list of [format,type] pairs.
 *                  The length of this list must be one if
 *                  your browser does not have the draw_buffers extension
 *                  Default: [gl.RGBA, gl.UNSIGNED_BYTE]
 *          depth: True if the FBO should have a depth buffer; false if not. 
 *                  Default: true
 *          depthastexture: True if a depth texture should be used for
 *                  the depth buffer; false if not. Default: false
 *          name: For debugging: A string. Default: ""
 */
tdl.framebuffers.Framebuffer = function(width, height, opts) {
    
    if( tdl.framebuffers.allframebuffers === undefined ){
        tdl.framebuffers.allframebuffers = [];
        tdl.framebuffers.uniquefbid=0;
    }
        
    if( opts === undefined )
        opts={};
    if( opts === true || opts === false)
        throw new Error("opts must be a dictionary");
    if( !width || !height ){
        throw new Error("Bad Framebuffer size: "+width+" "+height);
    }
 
    if( opts.formats && !opts.format ){
        console.warn("Framebuffer wants option 'format', not 'formats'")
    }

    if( !opts.internaluseonly )
        tdl.framebuffers.allframebuffers.push(this);

    this.formats = (opts.format===undefined ) ? [ [gl.RGBA,gl.UNSIGNED_BYTE] ] : opts.format;
    for(var i=0;i<this.formats.length;++i){
        if( this.formats[i].length !== 2 )
            throw new Error("Format must be list of pairs");
    }
    this.depth =  (opts.depth === undefined ) ? true : opts.depth;
    this.depthastexture = (opts.depthtexture === undefined) ? false: opts.depthtexture;
    this.name = (opts.name === undefined) ? "" : opts.name;
    this.width = width;
    this.height = height;
    this.recoverFromLostContext();
};

tdl.framebuffers.Framebuffer.prototype.dispose = function(){
    for(var i=0;i<this.textures.length;++i)
        this.textures[i].dispose();
    if(this.framebuffer)
        gl.deleteFramebuffer(this.framebuffer);
    if(this.depthtexture)
        gl.deleteTexture(this.depthtexture);
    if( this.depthbuffer )
        gl.deleteRenderbuffer(this.depthbuffer);
}

tdl.framebuffers.Framebuffer.prototype.bind = function() {
    for(var i=0;i<this.textures.length;++i){
        if( this.textures[i].isBound() ){
            var u = this.textures[i].getBoundUnits();
            console.trace();
            throw new Error("Tried to bind FBO but texture is active on units: "+u.join(","));
            //for(var i=0;i<u.length;++i){
            //    tdl.framebuffers.dummytex.bindToUnit(u[i]);
        }
    }
    if( tdl.framebuffers.active_fbo === this ){
        console.warn("Warning: Binding the same FBO twice");
    }
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
    gl.viewport(0, 0, this.width, this.height);
    tdl.framebuffers.active_fbo = this;
};

tdl.framebuffers.Framebuffer.unbind = function() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(
        0, 0,
        gl.drawingBufferWidth || gl.canvas.width,
        gl.drawingBufferHeight || gl.canvas.height);
    tdl.framebuffers.active_fbo=undefined;
};

//allow an FBO to work like a texture
tdl.framebuffers.Framebuffer.prototype.bindToUnit = function(unit,texnum){
    if( tdl.framebuffers.active_fbo === this ){
        throw new Error("FBO can't be attached to a texture unit while it's the active render target");
        //tdl.framebuffers.dummytex2.bindToUnit(unit);
    }
    else{
        if( texnum === undefined )
            texnum=0;
        this.textures[texnum].bindToUnit(unit);
    }
}
        

tdl.framebuffers.Framebuffer.prototype.unbind = function() {
  tdl.framebuffers.Framebuffer.unbind();
};

tdl.framebuffers.Framebuffer.prototype.recoverFromLostContext = function() {
    if( !tdl.framebuffers.dummytex )
        tdl.framebuffers.dummytex = new tdl.textures.SolidTexture([255,0,255,255]);
    if( !tdl.framebuffers.dummytex2 )
        tdl.framebuffers.dummytex2 = new tdl.textures.SolidTexture([255,0,255,255]);

    //make colorbuffer(s)
    if( this.formats.length > 1 ){
        exts=["WEBGL_draw_buffers"];
        var x;
        for(var i=0;i<exts.length && !x; ++i ){
            x=gl.getExtension(exts[i]);
        }
        if(!x){
            console.log(this.formats);
            throw new Error("Framebuffer requested multiple attachments, but this system doesn't support it");
        }
    }

    for(var i=0;i<this.formats.length;++i){
           
        if(this.formats[i][1] === gl.FLOAT ){
            if(!gl.getExtension("OES_texture_float") )
                throw new Error("Requesting float fbo, but this system does no support float textures");
                
            //the upcoming standards will require this for rendering to float FBO's.
            //older browsers don't need it yet, so we don't check if it fails.
            gl.getExtension("WEBGL_color_buffer_float");
            //likewise, newer browsers will start requiring this one
            //if we want to do linear filtering on float textures.
            gl.getExtension("OES_texture_float_linear");
        }
    }

    this.textures=[];
    for(var i=0;i<this.formats.length;++i){
        var format = this.formats[i][0];
        var type = this.formats[i][1];
        var tex = new tdl.textures.SolidTexture( [0,0,0,0] );
        tex.debug="fbo texture";
        this.textures.push(tex);
        this.initializeTexture(tex,format,type);
    }
    //shortcut
    this.texture = this.textures[0];
    
    var dtex;
    var db = null;
    if (this.depth) {
        if( this.depthastexture){
            exts=["WEBGL_depth_texture","WEBKIT_WEBGL_depth_texture",
                    "MOZ_WEBGL_depth_texture"];
            var x;
            for(var i=0;i<exts.length && !x; ++i){
                x = gl.getExtension(exts[i]);
            }
            if(!x)
                throw new Error("Framebuffer requested depth texture, but your system can't support it");
            
            dtex = new tdl.textures.SolidTexture([0,0,0,0]);
            dtex.debug = "fbo depth texture";
            
            this.initializeTexture(dtex,1,gl.DEPTH_STENCIL);
            this.depthtexture=dtex;
        }
        else{
            db = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, db);
            gl.renderbufferStorage(
                gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
            gl.bindRenderbuffer(gl.RENDERBUFFER, null);
            this.depthbuffer=db;
        }
    }

    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    
    for(var i=0;i<this.formats.length;++i){
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0 + i,
            gl.TEXTURE_2D,
            this.textures[i].texture,
            0);
    }
    
    if (this.depth) {
        if( this.wantdepthtexture){
            gl.framebufferTexture2D(
                gl.FRAMEBUFFER,
                gl.DEPTH_STENCIL_ATTACHMENT,
                gl.TEXTURE_2D,
                dtex.texture,
                0);
        }
        else{
            gl.framebufferRenderbuffer(
                gl.FRAMEBUFFER,
                gl.DEPTH_ATTACHMENT,
                gl.RENDERBUFFER,
                db);    
        }
    }
    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status != gl.FRAMEBUFFER_COMPLETE && !gl.isContextLost()) {
        throw(new Error("Framebuffer setup error: " +
          tdl.webgl.glEnumToString(status) ));
    }
    this.framebuffer = fb;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

tdl.framebuffers.Framebuffer.prototype.initializeData = function(data,targetnumber){
    if(targetnumber === undefined )
        targetnumber=0;

//FIXME: Add error checking for currently bound for writing and for 
//unexpected data length
    gl.bindTexture(gl.TEXTURE_2D, this.textures[targetnumber].texture);
    gl.texImage2D(gl.TEXTURE_2D,
                0,                 // level
                this.formats[targetnumber][0],              // internalFormat
                this.width,        // width
                this.height,       // height
                0,                 // border
                this.formats[targetnumber][0],            // format: rgba, luminance, etc
                this.formats[targetnumber][1],             // type: unsigned_byte, float, etc.
                data);             // data
}

/** Internal function */
tdl.framebuffers.Framebuffer.prototype.initializeTexture = function(tex,format,type){
    
    gl.bindTexture(gl.TEXTURE_2D, tex.texture);
    
    tex.setParameter(gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    tex.setParameter(gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    tex.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    tex.setParameter(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    gl.texImage2D(gl.TEXTURE_2D,
                0,                 // level
                format,              // internalFormat
                this.width,        // width
                this.height,       // height
                0,                 // border
                format,            // format: rgba, luminance, etc
                type,             // type: unsigned_byte, float, etc.
                null );             // data
    tex.width = this.width;
    tex.height = this.height;
};

tdl.framebuffers.CubeFramebuffer = function(size, opts) {
    if(opts===undefined)
        opts={};
    this.size = size;
    this.depth = (opts.depth === undefined) ? true : opts.depth ;
    this.recoverFromLostContext();
};

tdl.framebuffers.CubeFramebuffer.prototype.bind = function(face) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[face]);
  gl.viewport(0, 0, this.size, this.size);
};

tdl.framebuffers.CubeFramebuffer.unbind = function() {
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(
      0, 0,
      gl.drawingBufferWidth || gl.canvas.width,
      gl.drawingBufferHeight || gl.canvas.height);
};

tdl.framebuffers.CubeFramebuffer.prototype.unbind = function() {
  tdl.framebuffers.CubeFramebuffer.unbind();
};

tdl.framebuffers.CubeFramebuffer.prototype.recoverFromLostContext = function() {
  var tex = new tdl.textures.CubeMap(null,{size:this.size});
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex.texture);
  tex.setParameter(gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  tex.setParameter(gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  tex.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  tex.setParameter(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  for (var ff = 0; ff < 6; ++ff) {
    gl.texImage2D(tdl.textures.CubeMap.faceTargets[ff],
                  0,                 // level
                  gl.RGBA,           // internalFormat
                  this.size,         // width
                  this.size,         // height
                  0,                 // border
                  gl.RGBA,           // format
                  gl.UNSIGNED_BYTE,  // type
                  null);             // data
    tex.width = this.size;
    tex.height = this.size;
  }
  if (this.depth) {
    var db = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, db);
    gl.renderbufferStorage(
        gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.size, this.size);
  }
  this.framebuffers = [];
  for (var ff = 0; ff < 6; ++ff) {
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        tdl.textures.CubeMap.faceTargets[ff],
        tex.texture,
        0);
    if (this.depth) {
      gl.framebufferRenderbuffer(
          gl.FRAMEBUFFER,
          gl.DEPTH_ATTACHMENT,
          gl.RENDERBUFFER,
          db);
    }
    var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status != gl.FRAMEBUFFER_COMPLETE) {
      throw(new Error("Framebuffer not complete: " + WebGLDebugUtils.glEnumToString(status)));
    }
    this.framebuffers.push(fb);
  }
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  this.texture = tex;
};

tdl.framebuffers.Float32Framebuffer = function(width, height, opts) {
    if(!opts)
        opts={};
    opts.format=[ [gl.RGBA,gl.FLOAT] ];
    return new tdl.framebuffers.Framebuffer(width,height,opts);
}
/*
tdl.base.inherit(tdl.framebuffers.Float32Framebuffer, tdl.framebuffers.Framebuffer);

tdl.framebuffers.Float32Framebuffer.prototype.setData = function(data){
    this.initializeTexture(this.texture,false,data);
}

tdl.framebuffers.Float32Framebuffer.prototype.initializeTexture = function(tex,isdepth,initialdata) {
    if( isdepth )
        throw new Error("Internal error: isdepth must be false for Float32 textures");
    
    var fmt;
    if( this.channels === 1 )
        fmt = gl.LUMINANCE;
    else if( this.channels === 2 )
        fmt = gl.LUMINANCE_ALPHA;
    else if( this.channels === 3 )
        fmt = gl.RGB;
    else if( this.channels === 4 )
        fmt = gl.RGBA;
    else
        throw new Error("Bad value for channels: "+this.channels);
    
        
    if( initialdata === undefined || initialdata===null ){
        initialdata = null;
    }
    else{
        if( initialdata.length !== this.channels * this.width * this.height )
            throw new Error("Bad initial data: Expected "+(this.channels*this.width*this.height)+" but got "+initialdata.length);
    }
    
    gl.bindTexture(gl.TEXTURE_2D, tex.texture);
    tex.setParameter(gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    tex.setParameter(gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    tex.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    tex.setParameter(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,
                0,                 // level
                fmt,               // internalFormat
                this.width,        // width
                this.height,       // height
                0,                 // border
                fmt,               // format
                gl.FLOAT,          // type
                initialdata);             // data
    tex.width = this.width;
    tex.height = this.height;
};


tdl.framebuffers.debugAll = function(){
    var x = 0;
    var y = 0;
    for(var i=0;i<tdl.framebuffers.allframebuffers.length;++i){
        var p = [x,y];
        tdl.framebuffers.allframebuffers[i].debug(p);
        x += 25;
        y += 25;
    }
}

tdl.framebuffers.getAllState = function(){
    //FIXME: Do this
    return {};
}
tdl.framebuffers.restoreAllState = function(q){
    //FIXME
}

tdl.framebuffers.Framebuffer.prototype.debug = function(position){
    
    var subwin = $("<div>").appendTo("body");
    subwin.id = "fb___"+(tdl.framebuffers.uniquefbid++);
    
    //$("#"+subwin.id).dialog({width:300,height:300,title:this.width+"x"+this.height+" FBO"});
    
    var cvs = document.createElement("canvas");
    cvs.width = this.width;
    cvs.height = this.height;

    //subwin.appendChild(cvs);
    
    var ctx = cvs.getContext("2d");
    ctx.imageSmoothingEnabled=false;    //seems to be a no-op
    
    var pixdata=[];        //the pixel data, as float (regardless of
                            //actual FBO type). r,g,b,a,r,g,b,a,r,g,b,a,...
                            //If FBO is RGBA8, these are in range 0...1
                            //If FBO is Float32, these are the raw values.
    
    //FIXME: do this                        
    //var saved_tex = tdl.textures.getAllState();
    var saved_fb = tdl.framebuffers.getAllState();
    var depthtestenabled = gl.getParameter(gl.DEPTH_TEST);
    var stencilenabled = gl.getParameter(gl.STENCIL_TEST);
    var cprog = gl.tdl.currentProgram;
    var blendenabled = gl.getParameter(gl.BLEND);
    var ditherenabled = gl.getParameter(gl.DITHER);
    
    var ab; //buffer with data for onscreen display. 0...255: Uint8array
    
    function unpack(ipartarray,fpartarray,idx){
        var r=ipartarray[idx];
        var g=ipartarray[idx+1];
        var b=ipartarray[idx+2];
        var a=ipartarray[idx+3];
        var r2=fpartarray[idx];
        var g2=fpartarray[idx+1];
        var b2=fpartarray[idx+2];
        
        if( r === undefined )
            debugger;
            
        var q;
        if( r===0.0&&g===0.0&&b===0.0&&a===0.0)
            return 0.0;
            
        var ip=r*65536 + g*256 + b;
        var fp=r2/256.0+g2/65536.0+b2/16777216.0;
        q = ip+fp;
        if( a <= 128 )
            q=-q;
        
        return q;
    }
    
    if( this instanceof tdl.framebuffers.Float32Framebuffer ){
        //float32 fbo requires some extra work...
        var ab = new Uint8Array(this.width*this.height*4);
        if( !tdl.framebuffers.float32debugprog ){
            
            var tmpl=[
                "attribute vec4 position;",
                "varying vec2 texcoord;",
                "void main(){",
                "   gl_Position=vec4(position.xy,0,1);",
                "   texcoord=position.zw;",
                "}"];
            var vs_txt = tmpl.join("\n");
            tmpl=[
                "precision highp float;",
                "uniform sampler2D tex;",
                "uniform float channel;",
                "uniform float fractpartorintpart;",
                "varying vec2 texcoord;",
                "void main(){",
                "   vec4 c = texture2D(tex,texcoord);",
                "   float q;",
                "   if( channel == 0.0 ) q=c.r;",
                "   else if( channel == 1.0) q=c.g;",
                "   else if( channel == 2.0) q=c.b;",
                "   else q=c.a;",
                "   if( q == 0.0 )",
                "       gl_FragColor = vec4(0,0,0,0);",
                "   else{",
                "       if( q>0.0 )  gl_FragColor.a=0.75;",
                "       else gl_FragColor.a = 0.5;",
                "       q=abs(q);",
                "       if( q > 16777215.0 ) {",
                "           gl_FragColor.rgb = vec3(1.0,1.0,1.0);",
                "           return;",
                "       }",
                "       if(fractpartorintpart == 1.0 ){",
                "           q=fract(q);",
                "           q *= 256.0;",
                "           gl_FragColor.r = floor(q);",
                "           q=fract(q);",
                "           q *= 256.0;",
                "           gl_FragColor.g = floor(q);",
                "           q=fract(q);",
                "           q *= 256.0;",
                "           gl_FragColor.b = floor(q);",
                "           gl_FragColor.rgb *= 1.0/255.0;",
                "       }",
                "       else{",
                "           q = floor(q);",
                "           gl_FragColor.r = floor(256.0*fract(q/16777216.0)); ",
                "           gl_FragColor.g = floor(256.0*fract(q/65536.0));",
                "           gl_FragColor.b = floor(256.0*fract(q/256.0));",
                "           gl_FragColor.rgb *= 1.0/255.0;",
                "       }",
                "   }",
                "}"
                ];
            var fs_txt = tmpl.join("\n");
            
            tdl.framebuffers.float32debugprog=new tdl.programs.Program(
                null,
                vs_txt, fs_txt, { params_are_source:true });
            tdl.framebuffers.usq = new tdl.unitsquare.unitsquare();
        }
        
        this.texture.unbind();
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.STENCIL_TEST);
        gl.disable(gl.BLEND);
        gl.disable(gl.DITHER);
        
        var tmpfbo = new tdl.framebuffers.Framebuffer(this.width,this.height,{internaluseonly:true});
        tmpfbo.bind();
        var p = tdl.framebuffers.float32debugprog;
        var usq = tdl.framebuffers.usq;
        p.use();
        p.setUniform("tex",this.texture);
        var abs=[];
        for(var c=0;c<4;++c){
            p.setUniform("channel",c);
            for(var ipfp=0;ipfp<=1;ipfp++){
                gl.clear(gl.COLOR_BUFFER_BIT);
                p.setUniform("fractpartorintpart",ipfp);
                usq.draw(p);
                var ar = new Uint8Array(this.width*this.height*4);
                gl.readPixels(0,0,this.width,this.height,gl.RGBA,gl.UNSIGNED_BYTE,ar);
                abs.push(ar);
            }
        }
        tmpfbo.unbind();
        tmpfbo.dispose();
        
        //conversion to usable data
        //FIXME: Only works with RGBA fbo32's, not luminance or other
        ab = new Uint8Array(this.width*this.height*4);
        var j=0;
        for(var i=0;i<abs[0].length;i+=4){
            var r = unpack(abs[0],abs[1],i);
            var g = unpack(abs[2],abs[3],i);
            var b = unpack(abs[4],abs[5],i);
            var a = unpack(abs[6],abs[7],i);
            pixdata.push(r)
            pixdata.push(g);
            pixdata.push(b);
            pixdata.push(a);
            r*=255;
            g*=255;
            b*=255;
            a*=255;
            r=Math.floor(r);
            g=Math.floor(g);
            b=Math.floor(b);
            a=Math.floor(a);
            r=Math.max(0,Math.min(r,255));
            g=Math.max(0,Math.min(g,255));
            b=Math.max(0,Math.min(b,255));
            a=Math.max(0,Math.min(a,255));
            ab[j++]=r;
            ab[j++]=g;
            ab[j++]=b;
            ab[j++]=a;
        }
    }
    else{
        this.texture.unbind();
        this.bind();
        //rgba8 fbo
        ab = new Uint8Array(this.width*this.height*4);
        gl.readPixels(0,0,this.width,this.height,gl.RGBA,gl.UNSIGNED_BYTE,ab);
        for(var i=0;i<ab.length;++i)
            pixdata.push(ab[i]/255.0);
    }
    
    //dumb... we can't send the raw data to the canvas...
    var id = ctx.createImageData(this.width,this.height);
    for(var i=0;i<id.data.length;++i){
        id.data[i]=ab[i];
    }
    ctx.putImageData(id,0,0);
    

    if( ditherenabled )
        gl.enable(gl.DITHER);
    if( blendenabled)
        gl.enable(gl.BLEND);
    if( stencilenabled )
        gl.enable( gl.STENCIL_TEST);
    if(depthtestenabled)
        gl.enable(gl.DEPTH_TEST);
    tdl.framebuffers.restoreAllState(saved_fb);
    
    //FIXME: Do this
    //tdl.textures.restoreAllState(saved_tex);
    
    
    var swatch = document.createElement("div");
    swatch.style.width="16px";
    swatch.style.height="16px";
    swatch.style.border="1px solid black";
    swatch.style.display="inline-block";
    
    var redcell = document.createElement("span");
    var greencell = document.createElement("span");
    var bluecell = document.createElement("span");
    var alphacell = document.createElement("span");
    var xycell=document.createElement("span");
    
    
    var that=this;
    
    var buttondown=false;
    
    
    var zoomfactor = 1;
    
    var cvs2 = document.createElement("canvas");
    cvs2.width = this.width;
    cvs2.height= this.height;
    cvs2.style.border = "1px dotted black";
    
    var ctx2 = cvs2.getContext("2d");
    ctx2.imageSmoothingEnabled=false;
    ctx2.putImageData(id,0,0);
    
    cvs2.addEventListener("mousedown",function(ev){
        buttondown=true;
        updateswatch(ev);
    });
    
    function updateswatch(ev){
        var re = cvs2.getBoundingClientRect();
        var x = Math.floor(0.5+ev.clientX-re.left);//cvs.offsetLeft+window.pageXOffset;
        var y = Math.floor(0.5+ev.clientY-re.top); //cvs.offsetTop+window.pageYOffset;

        //convert to the real underlying object's coordinates
        x /= zoomfactor;
        y /= zoomfactor;
        x=Math.floor(x);
        y=Math.floor(y);
        if( x < 0 || x >= that.width || y < 0 || y >= that.height )
            return;
        var idx = y*that.width*4+x*4;
        var r = pixdata[idx++];
        var g = pixdata[idx++];
        var b = pixdata[idx++];
        var a = pixdata[idx++];
        var r1 = (r).toFixed(4);
        var g1 = (g).toFixed(4);
        var b1 = (b).toFixed(4);
        var a1 = (a).toFixed(4);
        r=Math.floor(r*255);
        g=Math.floor(g*255);
        b=Math.floor(b*255);
        a=Math.floor(a*255);
        if( r>255) r=255;
        if( g>255) g=255;
        if( b>255) b=255;
        if( a>255) a=255;
        if( r<0) r=0;
        if( g<0) g=0;
        if( b<0) b=0;
        if( a<0) a=0;
        swatch.style.background = "rgb("+r+","+g+","+b+")";
        redcell.innerHTML=r1;
        greencell.innerHTML=g1;
        bluecell.innerHTML=b1;
        alphacell.innerHTML=a1;
        xycell.innerHTML=x+","+y;
    };
    cvs2.addEventListener("mouseup",function(ev){
        buttondown=false;
    });
    cvs2.addEventListener("mousemove",function(ev){
        //if( !buttondown )
        //    return;
        updateswatch(ev);
    });

    
    function updatecanvas2(){
        if( zoomfactor < 1 ){
            ctx2.setTransform(zoomfactor,0,0,zoomfactor,0,0);
            ctx2.drawImage(cvs,0,0);
        }
        else{
            //need to get crisp edges.
            //zoomfactor must be integer...
            //ideas from http://phrogz.net/tmp/canvas_image_zoom.html
            var i=0;
            var xx,yy;
            yy=0;
            for(var y=0;y<cvs.height;++y,yy+=zoomfactor){
                xx=0;
                for(var x=0;x<cvs.width;++x,xx+=zoomfactor){
                    ctx2.fillStyle="rgb("+ab[i++]+","+ab[i++]+","+ab[i++]+")";
                    ++i;
                    ctx2.fillRect(xx,yy,zoomfactor,zoomfactor);
                }
            }
        }
    }
    
    function zoomIn(){
        if( zoomfactor >= 256 )
            return;
            
        if( zoomfactor >= 1)
            zoomfactor += 2;
        else
            zoomfactor *= 2;
        cvs2.width = that.width*zoomfactor;
        cvs2.height = that.height*zoomfactor;
        updatecanvas2();
    }
    function zoomOut(){
        if( zoomfactor <= 1/256 )
            return;
        if( zoomfactor > 1 )
            zoomfactor -= 2;
        else
            zoomfactor /= 2;
            
        cvs2.width = that.width*zoomfactor;
        cvs2.height = that.height*zoomfactor;
        updatecanvas2();
    }
    

    var hh = this.height+50;
    if( hh < 200 )
        hh=200;
    subwin.dialog({
        width: "30em", 
        height: 256, title: this.width+"x"+this.height+" FBO "+this.name,
        position:position});

    
    //container for everything
    var outerdiv = document.createElement("div");
    outerdiv.style.textAlign="center";
    
    var b1=document.createElement("button");
    b1.addEventListener("click",zoomIn);
    b1.innerHTML="+";
    
    var b2=document.createElement("button");
    b2.addEventListener("click",zoomOut);
    b2.innerHTML="-";
    
    //info div
    var divvy = document.createElement("div");
    divvy.style.position="fixed";
    divvy.appendChild(swatch);
    divvy.appendChild(document.createTextNode("R:"));
    divvy.appendChild(redcell);
    divvy.appendChild(document.createTextNode(" G:"));
    divvy.appendChild(greencell);
    divvy.appendChild(document.createTextNode(" B:"));
    divvy.appendChild(bluecell);
    divvy.appendChild(document.createTextNode(" A:"));
    divvy.appendChild(alphacell);
    divvy.appendChild(document.createTextNode(" "));
    divvy.appendChild(xycell);
    
    outerdiv.appendChild(divvy);
    
    //the button div
    var divvy3 = document.createElement("div");
    divvy3.style.position="fixed";
    divvy3.style.paddingTop="2em";
    divvy3.appendChild(b1);
    divvy3.appendChild(b2);
    outerdiv.appendChild(divvy3);
    
    //canvas div
    var divvy2 = document.createElement("div");
    divvy2.style.paddingTop="4em";
    divvy2.style.textAlign="center";
    divvy2.appendChild(cvs2);
    
    outerdiv.appendChild(divvy2);
    
    subwin.append(outerdiv);
    //subwin.append(cvs2);
    //subwin.append(tbl);
    
    
}
*/
