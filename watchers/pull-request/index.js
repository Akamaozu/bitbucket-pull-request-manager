module.exports = function( noticeboard ){
  
  require('./parse-pull-request-event')( noticeboard );
  require('./queue-new-pull-requests')( noticeboard );
}