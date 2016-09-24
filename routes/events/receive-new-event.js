var receive_new_event_route = module.exports = require('express').Router();

receive_new_event_route.use( require('body-parser')() );

receive_new_event_route.post('/', function( req, res ){

  // determine event type

    // pull request
      if( req.body.pullrequest ){

        var pullrequest = req.body.pullrequest;

        req.noticeboard.notify( 'pull-request-event', 

          {
            id: pullrequest.id,
            state: pullrequest.state,
            source: pullrequest.source,
            destination: pullrequest.destination,
            author: pullrequest.author
          }, 

        'http post ' + req.baseUrl + '/' );
      }

    // unknown
      else {

        req.noticeboard.log( 'NEW EVENT\n', req.body );
      }  

  res.sendStatus( 200 );
});