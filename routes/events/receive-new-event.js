var receive_new_event_route = module.exports = require('express').Router();

receive_new_event_route.post('/', function( req, res ){
  
  console.log('event received');

  res.sendStatus( 200 );
});