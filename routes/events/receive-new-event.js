var receive_new_event_route = module.exports = require('express').Router();

receive_new_event_route.use( require('body-parser')() );

receive_new_event_route.post('/', function( req, res ){
  
  req.noticeboard.log( 'NEW EVENT\n', req.body );

  res.sendStatus( 200 );
});