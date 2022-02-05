var starNum;

function Starfield()
{
    starNum = Math.random()*1000;
    var temp = [];
    for (var i = 0; i < starNum; i++)
    {
        temp.push((Math.random()*2)-1);
        temp.push((Math.random()*2)-1);
        temp.push((Math.random()*2)-1);
        temp.push(Math.random()*2);
    }
    var tempData = new Float32Array(temp);
    this.buff = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,this.buff);
    gl.bufferData(gl.ARRAY_BUFFER,tempData,gl.STATIC_DRAW);
}

Starfield.prototype.draw = function(prog)
{
    gl.bindBuffer(gl.ARRAY_BUFFER,this.buff);
    prog.setVertexFormat("position",4,gl.FLOAT);
    gl.drawArrays(gl.POINTS,0,starNum);
}
