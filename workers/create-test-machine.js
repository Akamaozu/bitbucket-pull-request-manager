var rabbitmq = require('../utils/rabbitmq-helper')( process.env.RABBITMQ_URL ),
    creation_jwt = require('../utils/jwt-helper')( process.env.TEST_MACHINE_CREATION_SECRET );

rabbitmq.create( 'create-test-machine' );
rabbitmq.handle( 'create-test-machine', function( token, ack, nack ){
  
  console.log( 'test machine creation request received' );

  console.log( 'verifying request validity' );
  creation_jwt.verify( token, function( error, content ){

    if( error ){

      console.log( '[ERROR] validation failed', error );

      ack();
      return setTimeout( process.exit, 100 );
    }

    console.log( 'request is valid' );

    var machine = content,
        fs = require('fs'),
        shell = require('shelljs'),
        EOL = require('os').EOL;

    // make required directories
    console.log( 'creating required directories' );
    shell.mkdir( '-p', [ process.env.HOME + '/.ssh', process.env.HOME + '/test-repo' ] );
    
    // save ssh private key 
    console.log( 'storing ssh identity file' );
    fs.writeFileSync( process.env.HOME + '/.ssh/test_machine_rsa', machine.ssh_priv_key );
    shell.chmod( 400, process.env.HOME + '/.ssh/test_machine_rsa' );

    // add private key to ssh config
    console.log( 'creating ssh config file' );
    fs.writeFileSync( process.env.HOME + '/.ssh/config', "Host *" + EOL + "IdentityFile ~/.ssh/test_machine_rsa" + EOL + 'StrictHostKeyChecking no' );

    // create fake repo and add remotes
    console.log( 'creating git repository' );
    shell.exec( 'git init && git remote add test-machine ' + machine.git + ' && git remote add bitbucket ' + process.env.BITBUCKET_REPO, { cwd: process.env.HOME + '/test-repo' });

    // test ssh connection to remotes
    console.log( 'testing access to bitbucket' );
    shell.exec( 'git ls-remote bitbucket', { cwd: process.env.HOME + '/test-repo' }, function( error, output ){

      if( error ){

        console.log( '[ERROR] machine creation failed: could not connect to bitbucket repository', error );
        ack();
        return setTimeout( process.exit, 100 );
      }

      console.log( 'testing access to test machine' );
      shell.exec( 'git ls-remote test-machine', { cwd: process.env.HOME + '/test-repo' }, function( error, output ){

        if( error ){

          console.log( '[ERROR] machine creation failed: could not connect to test machine repository', error );
          ack();
          return setTimeout( process.exit, 100 );
        }

        console.log( 'valid machine config. saving machine' );

        var machine_name = machine.name;
        delete machine.name;

        machine.known_hosts = fs.readFileSync( process.env.HOME + '/.ssh/known_hosts' ).toString();

        var mysql = require('../utils/mysql-helper')( process.env.MYSQL_URL, require( '../config/test-machines-mysql-schema.json' ) ),
            credentials_jwt = require('../utils/jwt-helper')( process.env.TEST_MACHINE_CONFIG_SECRET ),
            machine_credentials_token = credentials_jwt.sign( machine );

        mysql.query( 
          'INSERT INTO test_machine ( name, config ) ' +
          'VALUES ( ' + mysql.escape( machine_name ) + ', "' + machine_credentials_token + '" )',

          function( error, result ){

            if( error ){

              console.log( '[ERROR] could not save machine config', error );
              nack();
              return setTimeout( process.exit, 100 );
            }

            console.log( 'TEST MACHINE "' + machine_name + '" SUCCESSFULLY CREATED' );
            ack();
            return setTimeout( process.exit, 100 );
          }
        );
      });
    });
  });
});