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

    // make app ssh dir
    shell.mkdir( '-p', process.env.HOME + '/.ssh' );

    // save ssh private key 
    fs.writeFileSync( process.env.HOME + '/.ssh/test_machine_rsa', machine.ssh_priv_key );
    shell.chmod( 400, process.env.HOME + '/.ssh/test_machine_rsa' );

    // add private key to ssh config
    fs.writeFileSync( process.env.HOME + '/.ssh/config', "Host *" + require('os').EOL + "IdentityFile ~/.ssh/test_machine_rsa" );

    // create fake repo dir
    shell.mkdir( '-p', process.env.HOME + '/test-repo' );

    // create fake repo and add remotes
    shell.exec( 'git init && git remote add test-machine ' + machine.git + ' && git remote add bitbucket ' + process.env.BITBUCKET_REPO, { cwd: process.env.HOME + '/test-repo' });

    // see if remotes were added
    shell.exec( 'git remote -v', { cwd: process.env.HOME + '/test-repo' });

    // test ssh connection to remotes
    shell.exec( process.env.HOME + '/.ssh/test_machine_rsa" git ls-remote bitbucket', { cwd: process.env.HOME + '/test-repo' });

    nack();
    process.exit();
  });
});