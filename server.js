var server = require('express')();

server.get('/', function( req, res ){

  res.send('working');
});

server.listen( 5000 );