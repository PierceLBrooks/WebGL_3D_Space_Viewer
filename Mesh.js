"use strict";

var gl;
var prog;

function trim(s)
{
	return (s||'').replace(/^\s+|\s+$/g,'');
}

function Mesh(loader, url, gl)
{
    this.ni = 0;
    var that = this;
    loader.loadArrayBuffer(url,function(abuffer)
    {
        that.initialize(abuffer,loader);
    });
}

Mesh.prototype.initialize = function(ab, loader)
{
    gl.clearColor(0,0,0,1);
    var dv = new DataView(ab);
    var index = 0;
    var line = readLine();
    if (line !== "mesh_01")
    {
        throw new Error("bad header");
    }
    var nm = 0;
    var nv = 0;
    var vdata;
    var idata;
    line = readLine();
    while(line!=="")
    {
        var list = line.split(" ");
        if (list[0] == "vertices")
        {
            nv = parseInt(list[1]);
        }
        if (list[0] == "indices")
        {
            this.ni = parseInt(list[1]);
        }
        if (list[0] === "vertex_data")
        {
            vdata = new Float32Array(ab,index,nv);
            index += vdata.byteLength;
        }
        if (list[0] === "index_data")
        {
            idata = new Uint16Array(ab,index,this.ni);
            index += idata.byteLength;
        }
        if (list[0] === "texture_file")
        {
			var texture_file = trim(list[1]);
			console.log(texture_file);
            this.texture = new tdl.Texture2D(loader,texture_file);
            if (this.texture === undefined)
            {
                this.texture = new tdl.SolidTexture([255,0,255,255]);
            }
        }
        line = readLine();
    }
    this.vbuff = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,this.vbuff);
    gl.bufferData(gl.ARRAY_BUFFER,vdata,gl.STATIC_DRAW);
    this.ibuff = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.ibuff);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,idata,gl.STATIC_DRAW);
    if (this.texture === undefined)
    {
        this.texture = new tdl.SolidTexture([255,0,255,255]);
    }
    function readLine()
    {
        var s = "";
        while(index < dv.byteLength)
        {
            var c = dv.getUint8(index++);
            c = String.fromCharCode(c);
            if (c == '\n')
            {
                break;
            }
            else if (c == '\r')
            {
                ;
            }
            else
            {
                s += c;
            }
        }
        return s;
    }
}

Mesh.prototype.set_texture = function(tex)
{
    this.texture = tex;
}

Mesh.prototype.draw = function(prog)
{
    gl.bindBuffer(gl.ARRAY_BUFFER,this.vbuff);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.ibuff);
    prog.setUniform("tex",this.texture);
    prog.setVertexFormat("position",3,gl.FLOAT,"texcoord",2,gl.FLOAT,"normals",3,gl.FLOAT);
    gl.drawElements(gl.TRIANGLES,this.ni,gl.UNSIGNED_SHORT,0);
}
