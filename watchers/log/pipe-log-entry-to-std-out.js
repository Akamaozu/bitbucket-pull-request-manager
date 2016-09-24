module.exports = function( noticeboard ){
  
  noticeboard.watch('log-entry', 'pipe-to-std-out', function( msg ){

    var log_entry = msg.notice;

    console.log.apply( console, log_entry );
  });
}