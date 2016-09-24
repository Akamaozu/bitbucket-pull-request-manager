var server = require('express')(),
    Noticeboard = require('cjs-noticeboard');

// load .env
  require('dotenv').config();

// load server variables
  server.locals.app_root_dir = __dirname;
  server.locals.noticeboard = new Noticeboard({ logOps: false });

server.get('/', function( req, res ){

  res.send('working');
});

server.listen( process.env.PORT );