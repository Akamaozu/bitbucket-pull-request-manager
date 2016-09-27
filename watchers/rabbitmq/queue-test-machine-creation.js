var jwt = require( '../../utils/jwt-helper' )( process.env.TEST_MACHINE_CREATION_SECRET );

module.exports = function( noticeboard, rabbitmq ){
  
  rabbitmq.create( 'create-test-machine' );
  
  noticeboard.watch( 'create-new-test-machine', 'queue-for-creation', function( msg ){

    var machine = msg.notice,
        create_machine_token = jwt.sign( machine );

    rabbitmq.publish( 'create-test-machine', create_machine_token );
  });
}