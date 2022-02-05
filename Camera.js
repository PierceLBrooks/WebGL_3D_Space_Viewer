var width = 720;
var height = 720;
var L;
var R;
var T
var B;
var ah
var av;
var h;
var y;

function Camera(options)
{
    this.initialize(options);
}

Camera.prototype.computeProjMatrix = function()
{
    y = this.yon;
    av = (this.fov*(Math.PI/180))/2;
    ah = this.aspectRatio*av;
    L = -this.hither*Math.tan(ah);
    R = this.hither*Math.tan(ah);
    T = this.hither*Math.tan(av);
    B = -this.hither*Math.tan(av);
    this.projMatrix = [(2*this.hither)/(R-L),0,0,0,
                       0,(2*this.hither)/(T-B),0,0,
                       1+((2*L)/(R-L)),1+((2*B)/(T-B)),y/(this.hither-y),-1,
                       0,0,(this.hither*y)/(this.hither-y),0];
}

Camera.prototype.computeViewMatrix = function()
{
    this.antiLook = tdl.normalize(tdl.sub(this.eye,this.coi));
    this.right = tdl.normalize(tdl.cross(this.up,this.antiLook));
    this.right = [this.right[0],this.right[1],this.right[2],0];
    this.up = tdl.normalize(tdl.cross(this.antiLook,this.right));
    this.up = [this.up[0],this.up[1],this.up[2],0];
    var matrix1 = [1,0,0,0,
                   0,1,0,0,
                   0,0,1,0,
                   -this.eye[0],-this.eye[1],-this.eye[2],1];
    var matrix2 = [this.right[0],this.up[0],this.antiLook[0],0,
                   this.right[1],this.up[1],this.antiLook[1],0,
                   this.right[2],this.up[2],this.antiLook[2],0,
                   0,0,0,1];
    this.viewMatrix = tdl.mul(matrix1,matrix2);
}

Camera.prototype.initialize = function(options)
{
	this.fov = (options.fov != undefined)?options.fov:70.0;
    this.aspectRatio = width/height;
    this.eye = (options.eye != undefined)?options.eye:[0,0,0,1];
    this.coi = (options.coi != undefined)?options.coi:[0,0,0,1];
    this.hither = (options.hither != undefined)?options.hither:0.1;
    this.up = (options.up != undefined)?options.up:[0,1,0,0];
    this.yon = (options.yon != undefined)?options.yon:1000;
    this.computeProjMatrix();
    this.computeViewMatrix();
}

Camera.prototype.set = function(eye, right, up, antiLook)
{
    this.eye = eye;
    this.right = right;
    this.up = up;
    this.antiLook = antiLook;
    this.eye = tdl.add(this.eye,tdl.mul(this.up,1.75));
    this.eye = tdl.add(this.eye,tdl.mul(this.antiLook,0.2));
    this.coi = tdl.add(this.eye,this.antiLook);
    this.computeViewMatrix();
}

Camera.prototype.strafe = function(h, v, d)
{
    var matrix = tdl.translation(tdl.add(tdl.add(tdl.mul(h,this.right),tdl.mul(v,this.up)),tdl.mul(-d,this.antiLook)));
    this.eye = tdl.mul(this.eye,matrix);
    this.coi = tdl.mul(this.coi,matrix);
    this.computeViewMatrix();
}

Camera.prototype.turn = function(amount)
{
    this.coi = tdl.mul(this.coi,tdl.mul(tdl.translation(tdl.mul(-1,this.eye)),tdl.axisRotation(this.up,amount),tdl.translation(this.eye)));
    this.computeViewMatrix();
}

Camera.prototype.tilt = function(amount)
{
    var matrix = tdl.mul(tdl.translation(tdl.mul(-1,this.eye)),tdl.axisRotation(this.right,amount),tdl.translation(this.eye));
    this.coi = tdl.mul(this.coi,matrix);
    this.up = tdl.mul(this.up,matrix);
    this.computeViewMatrix();
}

Camera.prototype.draw = function(prog)
{
    prog.setUniform("projMatrix",this.projMatrix);
    prog.setUniform("viewMatrix",this.viewMatrix);
    prog.setUniform("eyePos",this.eye);
}
