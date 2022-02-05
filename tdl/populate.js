//jh wrote: Convenience module to load some modules directly into
//the tdl package

"use strict";

(function(){
    
    var done={}
    
    function f(module,modulename,pfx){
        if( pfx === undefined )
            pfx="";
            
        if( module === undefined ){
            console.log(modulename+" is not in tdl");
        }
        var modulecontents = Object.keys(module);
        for( var r=0;r<modulecontents.length;++r){
            var f = modulecontents[r];      //f=funcname
            if( f[f.length-1] == "_" )
                continue;       //internal name; don't copy
            var ff=pfx+f;
            if( tdl[ff] !== undefined ){
                //already seen this one
                done[ff] += " "+modulename
                console.log("Saw "+ff+": "+done[ff]);
            }
            else{
                tdl[ff]=module[f];
                done[ff]=modulename
            }
        }
    }
    
    f(tdl.loader,"loader");
    f(tdl.math,"math");
    f(tdl.programs,"programs");
    f(tdl.textures,"textures");
    f(tdl.webgl,"webgl");
    f(tdl.framebuffers,"framebuffers");
    //f(tdl.vec,"vec");
    //f(tdl.math.matrix4,"math.matrix4");
    f(tdl.quaternions,"quaternions","quat");

})();
