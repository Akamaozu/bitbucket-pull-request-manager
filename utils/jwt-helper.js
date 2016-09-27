module.exports = function( secret, configs ){
  
  var helpers, settings, log, configs,
    jwt;

    jwt = require('jsonwebtoken');
    configs = configs || {};
    log = configs.log ? configs.log : console.log;

    helpers = {};

    settings = {

      verify: function(error, verified){

        if(error || verified === null){

          log('couldn\'t verify jwt: \n', err); 
        }
      }
    }

  helpers.sign = function(payload){

    return jwt.sign( payload, secret );
  }

  helpers.verify = function(token, callback){

    var callback = callback || settings.verify;

    jwt.verify( token, secret, function( err, payload ){

      if( err ) callback( err, null );

      else if( typeof payload === 'undefined' ) callback( new Error( 'no token payload given' ), null );

      else callback( null, payload );
    })
  }

  return helpers;
}