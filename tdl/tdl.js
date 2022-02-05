//jh wrote: Convenience wrapper for tdl

"use strict";
(function(){

    //get our location
    var sl = document.getElementsByTagName("script");
    var i,basepath;
    var re = /(.*\/tdl\/)tdl.js$/i;
    for(i=0;i<sl.length;++i){
        var m = re.exec(sl[i].src);
        if( m ){
            basepath=m[1];
            break;
        }
    }
    document.write('<script type="text/javascript" src="'+basepath+'base.js"></script>' +
        '<script type="text/javascript" src="'+basepath+'loadall.js"></script>'+
        '<script type="text/javascript" src="'+basepath+'populate.js"></script>'
//        '<script type="text/javascript" src="'+basepath+'jq/jquery-1.9.0.js"></script>'+
//        '<link rel="stylesheet" href="'+basepath+'jq/jquery-ui/css/smoothness/jquery-ui-1.10.0.custom.min.css">'+
//        '<script type="text/javascript" src="'+basepath+'jq/jquery-ui/js/jquery-ui-1.10.0.custom.min.js"></script>'
        );
        
    return;
    
})();
