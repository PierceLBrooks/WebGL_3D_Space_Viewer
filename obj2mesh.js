var fs = require("fs");

function trim(s)
{
	return (s||'').replace(/^\s+|\s+$/g,'');
}

function Writer(fname)
{
    this.stream = fs.createWriteStream(fname);
    this.offset = 0;
}

Writer.prototype.write = function(x)
{
    this.stream.write(x);
    this.offset += x.length;
}

Writer.prototype.end = function()
{
    this.stream.end();
}

Writer.prototype.tell = function()
{
    return this.offset;
}

function main()
{
    var infile = process.argv[2];
    var objdata = fs.readFileSync(infile, {encoding:"utf8"});
    objdata = objdata.split("\n");
    var vdata = [];
    var idata = [];
    var ndata = [];
    var vertexdata = [];
    var texdata = [];
    var triangles = [];
    var mdict = {};
    vmap = {};
    var nv = 0;
    var currentmtl;
    for (var i = 0; i < objdata.length; i++)
    {
        var L = objdata[i].split(" ");
        if (L[0] === "v")
        {
            vertexdata.push([parseFloat(L[1]),
                             parseFloat(L[2]),
                             parseFloat(L[3])]);
        }
        else if(L[0]==="vn")
        {
            ndata.push([parseFloat(L[1]),
                        parseFloat(L[2]),
                        parseFloat(L[3])]);
        }
        else if (L[0] === "vt")
        {
            texdata.push([parseFloat(L[1]),
                          parseFloat(L[2])]);
        }
        else if (L[0] === "mtllib")
        {
            var ml = fs.readFileSync(trim(L[1]), {encoding:"utf8"});
            ml = ml.split("\n");
            var mname;
            for (var ii = 0; ii < ml.length; ii++)
            {
                var temp = trim(ml[ii]).split(" ");
                if (trim(temp[0]) === "newmtl")
                {
                    mname = trim(temp[1]);
                    mdict[mname] = {};
                }
                else if (trim(temp[0]) === "map_Kd")
                {
                    mdict[mname].map_Kd = trim(temp[1]);
                }
            }
        }
        else if (L[0] === "usemtl")
        {
            currentmtl = trim(L[1]);
        }
        else if (L[0] === "f")
        {
            var t = [];
            for (var ii = 1; ii < 4; ii++)
            {
                var T = L[ii].split("/");
                var vi = parseInt(T[0],10)-1;
                var ti = T[1];
                var ni = parseInt(T[2],10)-1;
                if ((ti === undefined) || (ti.length === 0))
                {
                    throw new Error("No texture coordinates");
                }
                else
                {
                    ti = parseInt(ti,10)-1;
                    t.push(vi,ti,ni);
                }
            }
            triangles.push(t);
        }
    }
    var ofp = new Writer(infile+".mesh");
    ofp.write("mesh_01\n");
    for (var i = 0; i < triangles.length; i++)
    {
        var T = triangles[i];
        for (var ii = 0; ii < 3; ii++)
        {
            var vi = T[ii*3];
            var ti = T[(ii*3)+1];
            var ni = T[(ii*3)+2];
            var key = vi+","+ti+","+ni;
            if (vmap[key] === undefined)
            {
                vmap[key] = nv;
                vdata.push(vertexdata[vi][0],
                           vertexdata[vi][1],
                           vertexdata[vi][2],
                           texdata[ti][0],
                           texdata[ti][1],
                           ndata[ni][0],
                           ndata[ni][1],
                           ndata[ni][2]);
                nv++;
            }
            idata.push(vmap[key]);
        }
    }
    ofp.write("vertices "+vdata.length+"\n");
    ofp.write("indices "+idata.length+"\n");
    if (mdict[currentmtl].map_Kd !== undefined)
    {
        ofp.write("texture_file "+mdict[currentmtl].map_Kd+"\n");
    }
    ofp.write("vertex_data");
    while ((ofp.tell()+1)%4 !== 0)
    {
        ofp.write(" ");
    }
    ofp.write("\n");
    var b = new Buffer(vdata.length*4);
    for (var i = 0; i < vdata.length; i++)
    {
        b.writeFloatLE(vdata[i],i*4);
    }
    ofp.write(b);
    ofp.write("index_data");
    while ((ofp.tell()+1)%4 !== 0)
    {
        ofp.write(" ");
    }
    ofp.write("\n");
    b = new Buffer(idata.length*2);
    for (var i = 0; i < idata.length; i++)
    {
        b.writeUInt16LE(idata[i],i*2);
    }
    ofp.write(b);
    ofp.end();
}

main();
