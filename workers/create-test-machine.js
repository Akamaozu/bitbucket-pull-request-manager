var rabbitmq = require('../utils/rabbitmq-helper')( process.env.RABBITMQ_URL ),
    jwt = require('../utils/jwt-helper')( process.env.TEST_MACHINE_CREATION_SECRET );

rabbitmq.create( 'create-test-machine' );

rabbitmq.handle( 'create-test-machine', function( token, ack, nack ){
  
  jwt.verify( token, function( error, content ){

    if( error ){

      nack();
      return process.exit();
    }

    var machine = content,
        fs = require('fs'),
        shell = require('shelljs');

    fs.writeFileSync( '/app/test_machine_rsa', machine.ssh_priv_key );
    shell.chmod( 400, '/app/test_machine_rsa' );


    console.log( fs.readdirSync( '/etc/ssh' ) );
    console.log( fs.readFileSync( '/etc/ssh/ssh_config' ).toString() );

    nack();
    process.exit();
  });
});