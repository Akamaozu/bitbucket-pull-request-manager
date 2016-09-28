module.exports = function( noticeboard, heroku ){
  
  noticeboard.watch( 'test-machine-creation-request-queued', 'start-test-machine-creator', function( msg ){

    heroku.post('/apps/' + process.env.HEROKU_APP_SLUG + '/dynos', {

      body: {

        command: 'node workers/create-test-machine',
        size: 'free',
        type: 'worker'
      }
    })
      .then( function(){

        console.log( arguments );
      });
  })
}