// load .env
  require('dotenv').config();

// check for required programs
var shell = require('shelljs'),
    has_ssh = shell.which( 'ssh' ),
    has_git = shell.which( 'git' );

if( !has_ssh ) throw new Error( 'this script requires ssh module to work' );
if( !has_git ) throw new Error( 'this script requires git module to work' );

// get test machine info
var prompt = require('prompt'),
    machine = {

      name: {
        pattern: /^[a-zA-Z\-]+$/,
        message: 'Only letters or dashes permitted',
        required: true
      },

      git: {
        message: 'Test Machine\'s Git URL',
        required: true
      },

      git_active_branch: {
        message: 'Test Machine\'s Checked-Out Branch',
        required: true
      },

      ssh_public_key: {
        message: 'Test Machine\'s pubkey. Must be on Bitbucket as well',
        hidden: true,
        required: true
      },

      ssh_private_key: {
        message: 'Test Machine\'s private key. Guard this jealously',
        hidden: true,
        required: true
      }
    };

prompt.start();

prompt.get({ properties: machine }, function( error, machine_props ){

  if( error ) throw error;

  shell.mkdir( '-p' , '~/.ssh');

  require('fs').writeFileSync( '~/.ssh/test_machine_rsa.pub', machine_props.ssh_public_key );
  require('fs').writeFileSync( '~/.ssh/test_machine_rsa', machine_props.ssh_private_key );

  var bitbucket_ssh = require('ssh-connect-prompt')( process.env.BITBUCKET_REPO );

  bitbucket_ssh.on('ready', function(){

    console.log( 'everything is going according to plan' );
  });
});


