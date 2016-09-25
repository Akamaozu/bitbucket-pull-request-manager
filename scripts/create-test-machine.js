// load .env
  require('dotenv').config();

// check for required programs
var shell = require('shelljs'),
    has_ssh = shell.which( 'ssh' ),
    has_git = shell.which( 'git' );

if( !has_ssh ) throw new Error( 'this script requires ssh module to work' );
if( !has_git ) throw new Error( 'this script requires git module to work' );

console.log( require('fs').readdirSync('/etc') );
// console.log( require('fs').readdirSync('/etc/.ssh') );

// require('fs').writeFileSync( '/etc/.ssh/test_machine_rsa.pub', 'fake_rsa.pub' );
// require('fs').writeFileSync( '/etc/.ssh/test_machine_rsa', 'fake_rsa' );

// console.log( require('fs').readdirSync('/') );
// console.log( require('fs').readdirSync('/etc/.ssh') );