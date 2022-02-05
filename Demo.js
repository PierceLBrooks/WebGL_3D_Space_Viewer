"use strict";

var distance;
var orientation;
var mouseHeld = 0;
var mouseX = null;
var mouseY = null;
var gl;
var prog;
var mesh;
var stars;
var camera;
var starProg;
var eyePos;
var motion = 0.05;
var lastFrame = Date.now();

function mouseToggle() {
    mouseHeld = 1 - mouseHeld;
    if (mouseHeld === 0) {
        mouseX = null;
        mouseY = null;
    }
}

function mouseMove(moveX, moveY) {
    if (mouseHeld > 0) {
        orientation = [moveX, moveY];
    }
}

function draw() {
    var currentFrame = Date.now();
    var deltaTime = currentFrame - lastFrame;
    lastFrame = currentFrame;
    if (mouseHeld > 0) {
        var latitude = orientation[0];
        var longitude = orientation[1];
        camera.strafe(latitude * motion, longitude * motion, 0);
        camera.initialize({
            eye: tdl.mul(tdl.normalize(camera.eye), distance),
            coi: [0, 0, 0, 1]
        });
    }
    //gl.clear(gl.COLOR_BUFFER_BIT);
    gl.depthFunc(gl.LEQUAL);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    starProg.use();
    gl.disable(gl.DEPTH_TEST);
    camera.draw(starProg);
    stars.draw(starProg);
    gl.enable(gl.DEPTH_TEST);
    prog.use();
    prog.setUniform("light.pos", camera.eye);
    prog.setUniform("light.col", [1, 1, 1, 1]);
    camera.draw(prog);
    prog.setUniform("worldMatrix", tdl.translation([0, 0, 0]));
    mesh.draw(prog);
    tdl.requestAnimationFrame(draw);
}

function initialize() {
    draw();
}

function update(e) {
    if (e.keyCode === 65) {
        camera.strafe(-motion, 0, 0);
    }
    if (e.keyCode === 68) {
        camera.strafe(motion, 0, 0);
    }
    if (e.keyCode === 69) {
        camera.strafe(0, motion, 0);
    }
    if (e.keyCode === 83) {
        camera.strafe(0, 0, -motion);
    }
    if (e.keyCode === 81) {
        camera.strafe(0, -motion, 0);
    }
    if (e.keyCode === 87) {
        camera.strafe(0, 0, motion);
    }
    if (e.keyCode === 90) {
        camera.turn(motion);
    }
    if (e.keyCode === 88) {
        camera.turn(-motion);
    }
    if (e.keyCode === 70) {
        camera.tilt(motion);
    }
    if (e.keyCode === 67) {
        camera.tilt(-motion);
    }
}

function main() {
    orientation = [0, 0];
    camera = new Camera({
            fov: 70,
            hither: 0.1,
            yon: 1000,
            coi: [0, 0, 0, 1],
            eye: [2, 2, 2, 1],
            up: [0, 1, 0, 0]
        });
    var canvas = document.getElementById("canvas");
    gl = tdl.setupWebGL(canvas, {
            "alpha": false,
            "stencil": false,
            preserveDrawingBuffer: true
        });
    var loader = new tdl.Loader(initialize);
    prog = new tdl.Program(loader, "vs.txt", "fs.txt");
    starProg = new tdl.Program(loader, "star_vs.txt", "star_fs.txt");
    stars = new Starfield();
    mesh = new Mesh(loader, "cube.obj.mesh", gl);
    loader.finish();
    distance = tdl.length(camera.eye);
    var body = document.getElementsByTagName("body")[0];
    body.addEventListener("keydown", update);
    (function (target) {
        target.onmousemove = (function (e) {
            var dot,
            eventDoc,
            doc,
            body,
            pageX,
            pageY;

            e = e || window.event; // IE-ism

            // If pageX/Y aren't available and clientX/Y are,
            // calculate pageX/Y - logic taken from jQuery.
            // (This is to support old IE)
            if (e.pageX == null && e.clientX != null) {
                eventDoc = (e.target && e.target.ownerDocument) || document;
                doc = eventDoc.documentElement;
                body = eventDoc.body;

                e.pageX = e.clientX +
                    (doc && doc.scrollLeft || body && body.scrollLeft || 0) -
                    (doc && doc.clientLeft || body && body.clientLeft || 0);
                e.pageY = e.clientY +
                    (doc && doc.scrollTop || body && body.scrollTop || 0) -
                    (doc && doc.clientTop || body && body.clientTop || 0);
            }

            // Use e.pageX / e.pageY here
            if (mouseX != null && mouseY != null) {
                mouseMove(e.pageX - mouseX, e.pageY - mouseY);
            }
            mouseX = e.pageX;
            mouseY = e.pageY;
        });
    })(document.body);
    (function (target) {
        target.onmousedown = (function () {
            mouseToggle();
        });
        target.onmouseup = (function () {
            mouseToggle();
        });
    })(document.body);
}
