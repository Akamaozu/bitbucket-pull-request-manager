module.exports = function( noticeboard ){
  
  require('./log')( noticeboard );
  require('./worker')( noticeboard );
  require('./rabbitmq')( noticeboard );
  require('./pull-request')( noticeboard );
}