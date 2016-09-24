var server = require('express')();

// load .env
  require('dotenv').config();

// load server variables
  server.locals.app_root_dir = __dirname;

// load middlewares
  server.use( require('./middlewares/cjs-noticeboard') );

// load server routes
  server.use('/', require('./routes') );

server.listen( process.env.PORT );