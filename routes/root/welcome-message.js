var welcome_msg_route = module.exports = require('express').Router();

welcome_msg_route.get('/', function( req, res ){
  
  res.send( 'if you are reading this, it\'s too late to be worried' );
});