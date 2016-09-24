var rabbitmq = require('../../utils/rabbitmq-helper')( process.env.RABBITMQ_URL );

rabbitmq.create( 'pull-requests' );

module.exports = function( noticeboard ){
  
  noticeboard.watch( 'pull-request-created', 'queue-for-next-test-machine', function( msg ){

    var pullrequest = msg.notice;

    rabbitmq.publish( 'pull-request', pullrequest );
  });
}