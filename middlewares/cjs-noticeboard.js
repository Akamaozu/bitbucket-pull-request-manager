var Noticeboard = require('cjs-noticeboard'),
    noticeboard = new Noticeboard();

module.exports = function( config ){

  if( config.watchers ) {

    if( typeof config.watchers === 'function' ){

      config.watchers( noticeboard );
    }

    else if( Object.prototype.toString.call( config.watchers ) == '[object Array]' ){

      config.watchers.forEach( function( watcher ){

        watcher( noticeboard );
      });
    }
  }

  return function( req, res, next ){
    
    req.noticeboard = noticeboard;

    next();
  }
}
