module.exports = function( noticeboard, rabbitmq ){
  
  rabbitmq.create( 'pull-requests' );
  
  noticeboard.watch( 'pull-request-created', 'queue-for-next-test-machine', function( msg ){

    var pullrequest = msg.notice;

    rabbitmq.publish( 'pull-requests', pullrequest );
  });
}