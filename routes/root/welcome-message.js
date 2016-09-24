var welcome_msg_route = module.exports = require('express').Router();

welcome_msg_route.get('/', function( req, res ){

  req.noticeboard.log( Date() + ' - HTTP GET ' + req.baseUrl + '/' );
  
  res.send( 'if you are reading this, it\'s too late to be worried' );
});