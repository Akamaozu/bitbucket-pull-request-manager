var receive_new_event_route = module.exports = require('express').Router();

receive_new_event_route.use( require('body-parser')() );

receive_new_event_route.post('/', function( req, res ){

  // determine event type

    // pull request
      if( req.body.pullrequest ){

        var pullrequest = req.body.pullrequest;

        req.noticeboard.log( 
          'NEW PULL REQUEST\n',
          'author:\n',
          pullrequest.author,
          'state: ' + pullrequest.state.toLowerCase() + '\n',
          'src:\n',
          pullrequest.source,
          'dest:\n',
          pullrequest.destination,
        );
      }

    // unknown
      else{

        req.noticeboard.log( 'NEW EVENT\n', req.body );
      }  

  res.sendStatus( 200 );
});