var server = require('express')(),
    Noticeboard = require('cjs-noticeboard');

// load .env
  require('dotenv').config();

// load server variables
  server.locals.app_root_dir = __dirname;
  server.locals.noticeboard = new Noticeboard({ logOps: false });

// load server routes
  server.use('/', require('./routes') );

server.listen( process.env.PORT );