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
 * @fileoverview This file contains objects to manage textures.
 */

tdl.provide('tdl.textures');

tdl.require('tdl.webgl');

/**
 * A module for textures.
 * @namespace
 */
tdl.textures = tdl.textures || { }

tdl.textures.addLoadingImage_ = function(img) {
  tdl.textures.init_(gl);
  gl.tdl.textures.loadingImages.push(img);
};

tdl.textures.removeLoadingImage_ = function(img) {
  gl.tdl.textures.loadingImages.splice(gl.tdl.textures.loadingImages.indexOf(img), 1);
};


tdl.textures.init_ = function(gl) {
            
    if( tdl.textures.bindings === undefined ){
        //bindings maps texture units (integer, 0...max_units-1) to a tdl Texture object
        //Texture unit i is currently bound to tdl texture object bindings[i]
        tdl.textures.bindings=[]
    
        //reverse of bindings: Given a tdl texture object uniqueid, rbindings[t] will be 
        //a list of all the texture units it is bound to
        tdl.textures.rbindings=new Object(null);
    }

        
    if (!gl.tdl.textures) {
        gl.tdl.textures = { };
        gl.tdl.textures.loadingImages = [];
        tdl.webgl.registerContextLostHandler(
            gl.canvas, tdl.textures.handleContextLost_, true);
    }
    if (!gl.tdl.textures.maxTextureSize) {
        gl.tdl.textures.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
        gl.tdl.textures.maxCubeMapSize = gl.getParameter(
            gl.MAX_CUBE_MAP_TEXTURE_SIZE);
    }
    if (!gl.tdl.textures.db) {
        gl.tdl.textures.db = { };
    }
};

tdl.textures.handleContextLost_ = function() {
  if (gl.tdl && gl.tdl.textures) {
    delete gl.tdl.textures.db;
    tdl.textures.bindings = [];
    tdl.textures.rbindings=new Object(null);
    
    var imgs = gl.tdl.textures.loadingImages;
    for (var ii = 0; ii < imgs.length; ++ii) {
      imgs[ii].onload = undefined;
    }
    gl.tdl.textures.loadingImages = [];
  }
};

tdl.textures.TextureX = function(target) {
  tdl.textures.init_(gl);
  this.target = target;
  this.texture = gl.createTexture();
  this.params = { };
  this.attached_texture_units=[];
  this.name="?texture?";
};

tdl.textures.TextureX.prototype.dispose = function(){
    if(this.texture)
        gl.deleteTexture(this.texture);
}

tdl.textures.TextureX.prototype.setParameter = function(pname, value) {
  this.params[pname] = value;
  gl.bindTexture(this.target, this.texture);
  gl.texParameteri(this.target, pname, value);
};

tdl.textures.TextureX.prototype.recoverFromLostContext = function() {
  this.texture = gl.createTexture();
  gl.bindTexture(this.target, this.texture);
  for (var pname in this.params) {
    gl.texParameteri(this.target, pname, this.params[pname]);
  }
};

tdl.textures.TextureX.prototype.bindToUnit = function(unit){
    //console.log("Put",this.name,"on",unit);
    
    if( tdl.framebuffers.active_fbo && tdl.framebuffers.active_fbo.texture === this )
        throw new Error("Attempt to use texture as input while attached to FBO");
        
    gl.activeTexture(gl.TEXTURE0+unit);
    gl.bindTexture(this.target,this.texture);
    
    if( tdl.textures.bindings[unit] !== undefined ){
        var oldt = tdl.textures.bindings[unit];
        for(var i=0;i<oldt.attached_texture_units.length;++i){
            if( oldt.attached_texture_units[i] === unit ){
                oldt.attached_texture_units.splice(i,1);
                i--;
            }
        }
        //console.log("Took",oldt.name,"off unit",unit);
    }
    tdl.textures.bindings[unit]=this;
    
    //this must be last so we do the right thing if we are binding
    //the same texture to the same unit twice
    this.attached_texture_units.push(unit);
}

tdl.textures.TextureX.prototype.unbind = function(){
    for(var i=0;i<this.attached_texture_units.length;++i){
        gl.activeTexture(gl.TEXTURE0+i);
        gl.bindTexture(this.target,null);
    }
    this.attached_texture_units = [];
}
        
    
tdl.textures.TextureX.prototype.isBound = function(){
    return (this.attached_texture_units.length > 0 );
}

tdl.textures.TextureX.prototype.getBoundUnits = function(){
    return this.attached_texture_units;
}
        
/**
 * A solid color texture.
 * @constructor
 * @param {!tdl.math.vector4} color. Values are integers from 0-255.
 */
 //FIXME: Make this take 0...1 values
tdl.textures.SolidTexture = function(color) {

  tdl.textures.TextureX.call(this, gl.TEXTURE_2D);
  this.color = color.slice(0, 4);
  this.name="SolidTexture("+this.color+")";
  this.uploadTexture();
};

tdl.base.inherit(tdl.textures.SolidTexture, tdl.textures.TextureX);

tdl.textures.SolidTexture.prototype.uploadTexture = function() {
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    var pixel = new Uint8Array(this.color);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);

    this.width=1;
    this.height=1;
    this.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    this.setParameter(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.setParameter(gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    this.setParameter(gl.TEXTURE_MAG_FILTER, gl.NEAREST);

};

tdl.textures.SolidTexture.prototype.recoverFromLostContext = function() {
  tdl.textures.TextureX.recoverFromLostContext.call(this);
  this.uploadTexture();
};

//tdl.textures.SolidTexture.prototype.bindToUnit = function(unit) {
//  gl.activeTexture(gl.TEXTURE0 + unit);
//  gl.bindTexture(gl.TEXTURE_2D, this.texture);
//};

/**
    * A color from an array of values texture. Note: If you want
 * a texture that does not have UNSIGNED_BYTE as its internal type,
 * you must pass in the appropriate TypedArray (any Javascript
 * Array will be converted to Uint8Array).
 * @constructor
 * @param data: Object with fields: {
 *      !{
 *          width: number
 *          height: number: pixels:
 *          !Array.<number>} pixels: Values are integers from 0-255 (if unsigned byte)
 *                                  or arbitrary floats.
 *          format: Optional format (gl.ALPHA, RGB, RGBA, LUMINANCE, LUMINANCE_ALPHA)
 *          type: Optional type (gl.UNSIGNED_BYTE, gl.FLOAT [if extension enabled])
 */
tdl.textures.ColorTexture = function(data, opt_format, opt_type) {
    if( opt_format !== undefined )
        data.format = opt_format;
    if( opt_type !== undefined )
        data.type = opt_type;
    tdl.textures.TextureX.call(this,gl.TEXTURE_2D);
    this.setData(data);
}

tdl.base.inherit(tdl.textures.ColorTexture, tdl.textures.TextureX);

tdl.textures.ColorTexture.prototype.setData = function(data){
    
    this.format = (data.format===undefined) ? gl.RGBA : data.format;
    this.type   = (data.type===undefined) ? gl.UNSIGNED_BYTE : data.type;
    
    if( !data.width )
        throw new Error("ColorTexture: No width");
    if( !data.height ) 
        throw new Error("ColorTexture: No height");
    if( !data.pixels )
        throw new Error("ColorTexture: No pixels");
    
    var pixels;
    
    if (data.pixels instanceof Array) {
        if( this.type != gl.UNSIGNED_BYTE )
            throw(new Error("Cannot use array with non-UNSIGNED_BYTE datatype"));
        pixels = new Uint8Array(data.pixels);
    }
    else
        pixels = data.pixels;
        
    var channels;
    if( this.format === gl.ALPHA  || this.format === gl.LUMINANCE )
        channels=1;
    else if( this.format === gl.LUMINANCE_ALPHA )
        channels=2;
    else if( this.format === gl.RGB )
        channels=3;
    else if( this.format === gl.RGBA)
        channels=4;
    else
        throw new Error("Bad format for ColorTexture");
        
    //compute expected length and throw error if not met
    var exl = data.width * data.height * channels;
    if( exl !== data.pixels.length )
        throw new Error("Bad pixel size: Expected "+exl+" entries; got "+data.pixels.length);
        
    this.width = data.width;
    this.height = data.height;
    this.channels = channels;
    this.pixels   = pixels;
    
    //make sure we've asked for the extension
    if( this.type === gl.FLOAT ){
        var ww = gl.getExtension("OES_texture_float");
        if(!ww)
            throw new Error("This system does not support float textures");
            
        //older browsers don't advertise this nor require that we get it,
        //but newer ones do
        gl.getExtension("OES_texture_float_linear");
    }
    
    this.uploadTexture();
};

//tdl.base.inherit(tdl.textures.ColorTexture, tdl.textures.TextureX);

tdl.textures.ColorTexture.prototype.uploadTexture = function() {
    if( this.width === undefined || this.height === undefined )
        throw new Error("Bad width or height");
    if( this.width <= 0 || this.height <= 0 )
        throw new Error("Width and height must be positive");
    if( this.pixels === undefined )
        throw new Error("Pixels must be supplied");
        
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, this.format, this.width, this.height,
        0, this.format, this.type, this.pixels);
    //debugging...
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    
    
    //set them here so the parameter setting gets saved correctly
    this.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    this.setParameter(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.setParameter(gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    this.setParameter(gl.TEXTURE_MAG_FILTER, gl.NEAREST);
};

tdl.textures.ColorTexture.prototype.recoverFromLostContext = function() {
  tdl.textures.TextureX.recoverFromLostContext.call(this);
  this.uploadTexture();
};

//tdl.textures.ColorTexture.prototype.bindToUnit = function(unit) {
//  gl.activeTexture(gl.TEXTURE0 + unit);
//  gl.bindTexture(gl.TEXTURE_2D, this.texture);
//};


/**
 * @constructor
 * @param loader The Loader object 
 * @param {{string|!Element}} src An HTML <img> element, an HTML <canvas> element, or the 
 *              URL of an image to load into the texture.
 * @param {function} opt_flipY True if the y coordinate should be flipped or false if not.
 *          Defaults to true.
 * @param {callback} Will be called when the texture is loaded and ready
 */
tdl.textures.Texture2D = function(loader,src, opt_flipY, callback) {
  "use strict";
  //

  tdl.textures.TextureX.call(this, gl.TEXTURE_2D);
  this.name="Texture2D("+src+")";
  
  if( opt_flipY === undefined )
    opt_flipY=true;
    
  this.flipY = opt_flipY;
  var that = this;
  var img;
  
  if( src === undefined ){
      console.trace();
      throw new Error("Creating texture with src='undefined' (Did you forget the loader argument?)");
  }
  

  
  // Handle dataURLs?
  if (typeof src !== 'string') {
    img = src;              //canvas or existing image object
    this.loaded = true;
    this.img=img;
    this.uploadTexture();
  } else {
      if( loader !== null && loader !== undefined && loader.type_ !== "Loader" ){
          throw new Error("First argument to Texture2D must be a loader");
      }      
      //put dummy texture in
      this.loaded=false;
      this.uploadTexture();
      
      if( loader.loadImage === undefined ){
          throw new Error("First argument to texture constructor must be a Loader");
      }
      
      //remote URL or blob
      loader.loadImage(src,
        function(img){
          that.img=img;
          that.updateTexture();
          if( callback )
            callback(that,img);
        }
      );
      
  }
  
};

tdl.base.inherit(tdl.textures.Texture2D, tdl.textures.TextureX);

tdl.textures.isPowerOf2 = function(value) {
  return (value & (value - 1)) == 0;
};

tdl.textures.Texture2D.prototype.uploadTexture = function() {
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (this.loaded) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flipY);
        this.setTexture(this.img);
    } else {
        var pixel = new Uint8Array([255, 255, 255, 255]);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, 
            gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        this.width=1;
        this.height=1;
    }
};

tdl.textures.Texture2D.prototype.setTexture = function(element) {
  // TODO(gman): use texSubImage2D if the size is the same.
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    if( element === undefined )
        throw new Error("Cannot setTexture to undefined");
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, element);
    if (tdl.textures.isPowerOf2(element.width) &&
        tdl.textures.isPowerOf2(element.height)) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);
    } else {
        this.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        this.setParameter(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.setParameter(gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    this.width = element.width;
    this.height = element.height;
  
    //override defaults with whatever the user gave us, even
    //if it's not valid (ex: mipmap for non power-of-two texture)
    for(var p in this.params){
      gl.texParameteri(gl.TEXTURE_2D,p,this.params[p]);
    }
};

tdl.textures.Texture2D.prototype.updateTexture = function() {
  this.loaded = true;
  this.uploadTexture();
};

tdl.textures.Texture2D.prototype.recoverFromLostContext = function() {
  tdl.textures.TextureX.recoverFromLostContext.call(this);
  this.uploadTexture();
};

//tdl.textures.Texture2D.prototype.bindToUnit = function(unit) {
//  gl.activeTexture(gl.TEXTURE0 + unit);
//  gl.bindTexture(gl.TEXTURE_2D, this.texture);
//};

/**
 * Create a texture to be managed externally.
 * @constructor
 * @param {string} type GL enum for texture type.
 */
tdl.textures.ExternalTexture = function(type) {
  tdl.textures.TextureX.call(this, type);
  this.type = type;
};

tdl.base.inherit(tdl.textures.ExternalTexture, tdl.textures.TextureX);

tdl.textures.ExternalTexture.prototype.recoverFromLostContext = function() {
};

tdl.textures.ExternalTexture.prototype.bindToUnit = function(unit) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(this.type, this.texture);
}

/**
 * Create a 2D texture to be managed externally.
 * @constructor
 */
tdl.textures.ExternalTexture2D = function() {
  tdl.textures.ExternalTexture.call(this, gl.TEXTURE_2D);
};

tdl.base.inherit(tdl.textures.ExternalTexture2D, tdl.textures.ExternalTexture);

/**
 * Create and load a CubeMap.
 * @constructor
 * @param loader The loader object to use (ignored if
 *      no image urls are specified).
 * @param opts: A dictionary with exactly one of these items:
 *      urls: A list of strings giving images to load
 *          for each side of the cubemap. Images 
 *          must be in the order positive_x, negative_x positive_y,
 *          negative_y, positive_z, negative_z 
 *      size: A size (for empty cubemaps)  In that case,
 *          we allocate textures but don't upload data.
 *          This is useful for cube framebuffer objects.
 */
tdl.textures.CubeMap = function(loader,opts) {
    
    this.debug="CubeMap"+Object.keys(opts);
    
    if( opts === undefined ){
        throw new Error("Must pass options to CubeMap constructor");
    }
    
    var urls=opts.urls;
    var imgsize = opts.size;
    
    if( urls && imgsize )
        throw new Error("Cannot specify both size and urls");
    if( !urls && !imgsize )
        throw new Error("Must specify urls or size");
        
    tdl.textures.init_(gl);
    var that=this;
    tdl.textures.TextureX.call(this, gl.TEXTURE_CUBE_MAP);
    // TODO(gman): make this global.
    if (!tdl.textures.CubeMap.faceTargets) {
        tdl.textures.CubeMap.faceTargets = [
            gl.TEXTURE_CUBE_MAP_POSITIVE_X,
            gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
            gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
            gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
            gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
            gl.TEXTURE_CUBE_MAP_NEGATIVE_Z];
        tdl.textures.CubeMap.offsets = [
            [2, 1],
            [0, 1],
            [1, 0],
            [1, 2],
            [1, 1],
            [3, 1]];
    }
    var faceTargets = tdl.textures.CubeMap.faceTargets;
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture);
    this.setParameter(gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    this.setParameter(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    this.setParameter(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    //holds the raw image data for each side of the cubemap
    //plus dimensions
    this.facedata = [];

    function makeCallback(idx){
        return function(img){
            //console.log("Got faces[",idx,"]");
            that.facedata[idx]=img;
            for(var i=0;i<6;++i){
                if( that.facedata[i] === undefined )
                    return;
            }
            that.uploadTextures();
        }
    }
  
    if( urls === undefined ){
        //initialize all 6 sides to null
        this.texsize=imgsize;
        for(var i=0;i<6;++i){
            gl.texImage2D(tdl.textures.CubeMap.faceTargets[i],
                0, gl.RGBA, imgsize,imgsize, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }
        this.size = imgsize;
    }
    else {
        this.numUrls = urls.length;
        if( this.numUrls !== 6 ){
            throw new Error("Must give 6 images for cubemap constructor");
        }
        for (var ff = 0; ff < urls.length; ++ff) {
            loader.loadImage(urls[ff], makeCallback(ff));
        }
    }
};

tdl.base.inherit(tdl.textures.CubeMap, tdl.textures.TextureX);

/**
 * Check if all faces are loaded.
 * @return {boolean} true if all faces are loaded.
tdl.textures.CubeMap.prototype.loaded = function() {
  for (var ff = 0; ff < this.faces.length; ++ff) {
    if (!this.faces[ff].loaded) {
      return false;
    }
  }
  return true;
};*/

/*
tdl.textures.clampToMaxSize = function(element, maxSize) {
  if (element.width <= maxSize && element.height <= maxSize) {
    return element;
  }
  var maxDimension = Math.max(element.width, element.height);
  var newWidth = Math.floor(element.width * maxSize / maxDimension);
  var newHeight = Math.floor(element.height * maxSize / maxDimension);

  var canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  var ctx = canvas.getContext("2d");
  ctx.drawImage(
      element,
      0, 0, element.width, element.height,
      0, 0, newWidth, newHeight);
  return canvas;
};
*/
/**
 * Uploads the images to the texture.
 */
tdl.textures.CubeMap.prototype.uploadTextures = function() {
    var faceTargets = tdl.textures.CubeMap.faceTargets;
    
    for (var faceIndex = 0; faceIndex < 6; ++faceIndex) {
        var target = faceTargets[faceIndex];
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(
              target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
              this.facedata[faceIndex]);
              //tdl.textures.clampToMaxSize(
              //    face.img, gl.tdl.textures.maxCubeMapSize));
    }
    var genMips = false;
    var faceImg = this.facedata[0];
    this.width=faceImg.width;
    this.height=faceImg.height;
    if (this.facedata.length === 6) {
        genMips = tdl.textures.isPowerOf2(faceImg.width) &&
                tdl.textures.isPowerOf2(faceImg.height);
    }
    if (genMips) {
        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        this.setParameter(gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } 
    else {
        this.setParameter(gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
};

/**
 * Recover from lost context.
 */
tdl.textures.CubeMap.prototype.recoverFromLostContext = function() {
  tdl.textures.TextureX.recoverFromLostContext.call(this);
  this.uploadTextures();
};

/** Return an arraybuffer with the raw pixel data for the corresponding face
 * @param face 0-5: The face (+x,-x,+y,-y,+z,-z)
*/
tdl.textures.CubeMap.prototype.getPixdata = function(side){
    if(tdl.textures.CubeMap.iprog === undefined ){
        vs=[
"attribute vec2 a_position;",
"uniform float side;",
"varying vec3 v_texcoord;",
"varying vec2 debug;",
"void main(){",
"vec4 t;",
"t.xy = a_position;",
"t.zw=vec2(-1.0,1.0);",
"debug=a_position;",
"if( side == 0.0 ) v_texcoord=t.wxy;",
"if( side == 1.0 ) v_texcoord=t.zxy;",
"if( side == 2.0 ) v_texcoord=t.xwy;",
"if( side == 3.0 ) v_texcoord=t.xzy;",
"if( side == 4.0 ) v_texcoord=t.xyw;",
"if( side == 5.0 ) v_texcoord=t.xyz;",
"gl_Position=vec4(a_position.xy,0.0,1.0);",
"}"
        ];
        fs=[
"precision mediump float;",
"varying vec3 v_texcoord;",
"uniform samplerCube tex;",
"varying vec2 debug;",
"void main(){",
"vec3 V = v_texcoord;",
"gl_FragColor = textureCube(tex,V);",
//"gl_FragColor=vec4(0.5,0.5,0.5,1.0);",
//"gl_FragColor.rgb = v_texcoord.rgb;",
//"gl_FragColor.rg=debug.xy; gl_FragColor.zw=vec2(0.0,1.0);",
//"if( gl_FragCoord.y > 500.0 ) gl_FragColor=vec4(1.0,0,0,1.0); else gl_FragColor=vec4(0,1.0,0,1.0);",
"}"
        ];
        var p = new tdl.Program(null,vs.join("\n"),fs.join("\n"),{params_are_source:true});
        tdl.textures.CubeMap.iprog = p;
        tdl.textures.CubeMap.dummycube = new tdl.textures.CubeMap(null,{size:1});
        var vdata=new Float32Array([-1,1, -1,-1, 1,1, 1,-1 ]);
        var vbuff = gl.createBuffer()
        gl.bindBuffer(gl.ARRAY_BUFFER,vbuff);
        gl.bufferData(gl.ARRAY_BUFFER,vdata,gl.STATIC_DRAW);
        tdl.textures.CubeMap.vbuff = vbuff;
    }
    
    if(!this.snapshotfbo ){
        this.snapshotfbo = new tdl.Framebuffer( this.size,this.size);
    }
    
    this.snapshotfbo.bind();
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    var iprog = tdl.textures.CubeMap.iprog;
    iprog.use();
    iprog.setUniform("tex",this);
    gl.bindBuffer(gl.ARRAY_BUFFER,tdl.textures.CubeMap.vbuff);
    iprog.setVertexFormat("a_position",2,gl.FLOAT);
    iprog.setUniform("side",side);
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    iprog.setUniform("tex",tdl.textures.CubeMap.dummycube);
    var pixdata = new Uint8Array(this.size*this.size*4);
    gl.readPixels(0,0,this.size,this.size,gl.RGBA,gl.UNSIGNED_BYTE,pixdata);
    this.snapshotfbo.unbind();
    return pixdata;
}

//note that this canvas will be upside down
//since gl and canvas store image data with opposite y directions
tdl.textures.CubeMap.prototype.getCanvas = function(side)
{
    var pix = this.getPixdata(side);
    
    var cvs = document.createElement("canvas");
    cvs.width=this.size;
    cvs.height=this.size;
    var ctx = cvs.getContext("2d");
    var id = ctx.createImageData(this.size,this.size);
    
    for(var i=0;i<pix.length;++i){
        id.data[i]=pix[i];
        if( i%4 === 3 )
            id.data[i]=255;
    }
    ctx.putImageData(id,0,0);
    return cvs;
}

/**
 * Update a just downloaded loaded texture.
 * @param {number} faceIndex index of face.
 
tdl.textures.CubeMap.prototype.updateTexture = function(faceIndex) {
  // mark the face as loaded
  var face = this.faces[faceIndex];
  face.loaded = true;
  if( face.img === undefined ) 
    throw new Error("Internal error?");
  // If all 6 faces are loaded then upload to GPU.
  var loaded = this.loaded();
  if (loaded) {
    this.uploadTextures();
  }
};
*/

/**
 * Binds the CubeMap to a texture unit
 * @param {number} unit The texture unit.
 */
//tdl.textures.CubeMap.prototype.bindToUnit = function(unit) {
//  gl.activeTexture(gl.TEXTURE0 + unit);
//  gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture);
//};



