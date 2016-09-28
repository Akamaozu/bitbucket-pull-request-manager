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
    // - specify identity file
    // - disable strict host key checking
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
        nack();
        return process.exit();
      }

      console.log( 'testing access to test machine' );
      shell.exec( 'git ls-remote test-machine', { cwd: process.env.HOME + '/test-repo' }, function( error, output ){

        if( error ){

          console.log( '[ERROR] machine creation failed: could not connect to test machine repository', error );
          nack();
          return process.exit();
        }

        console.log( fs.readFileSync( process.env.HOME + '/.ssh/known_hosts' ) );
        nack();
        process.exit();
      });
    });
  });
});