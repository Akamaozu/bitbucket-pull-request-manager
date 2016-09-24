var jackrabbit = require('jackrabbit'),
    extend = require('extend');

module.exports = function( rabbitmq_url, configs ){
  
  if( !rabbitmq_url ) throw new Error( 'RABBITMQ URL NOT SUPPLIED TO HELPER' );

  if( !configs ) configs = {};

  var helpers, settings, defaults;

      defaults = {

        options: { create: { durable: true  } },

        callback: {

          create: function( err, instance, info ){

            if( !err ) console.log( instance, info );
          },

          connect: function( connection ){

            console.log( 'connected to rabbitmq server' );
          }
        }
      };
      
      settings = { connection: null };
      
      helpers = {};

  helpers.handle = function( name, handler ){

    if( !name ) throw new Error( 'NEED A QUEUE NAME TO RECEIVE MESSAGES FROM' );
    if( typeof name !== 'string' ) throw new Error( 'QUEUE NAME MUST BE A STRING' );
    
    if( !handler ) throw new Error( 'NEED A QUEUE NAME TO RECEIVE MESSAGES FROM' );
    if( typeof handler !== 'function' ) throw new Error( 'QUEUE HANDLER MUST BE A FUNCTION' );

    connect_then( handle_queue );

    function handle_queue(){

      settings.connection
        .queue({ name: name })
        .consume( handler );
    }
  }

  helpers.publish = function( name, message ){

    if( !name ) throw new Error( 'NEED A QUEUE NAME TO PUBLISH TO' );
    if( typeof name !== 'string' ) throw new Error( 'QUEUE NAME MUST BE A STRING' );

    connect_then( publish_to_queue );

    function publish_to_queue(){

      settings.connection
        .publish( message, { key: name } );
    }
  }

  helpers.create = function( name, options ){

    if( !name ) throw new Error( 'QUEUE NEEDS A NAME TO BE CREATED' );
    if( typeof name !== 'string' ) throw new Error( 'QUEUE NAME NEEDS TO BE A STRING' );

    if( !options ) options = {};

    if( options && Object.prototype.toString.call( options ) !== '[object Object]') throw new Error( 'QUEUE CREATE OPTIONS MUST BE AN OBJECT' );
    
    connect_then( create_queue );

    function create_queue(){

      var finalized_options = extend({}, defaults.options.create, options);

      finalized_options['name'] = name;
      
      settings.connection.queue( finalized_options );
    }
  }

  helpers.connect = function( callback ){

    if( !callback ) callback = defaults.callback.connect;

    var rabbitmq = jackrabbit( rabbitmq_url );

    rabbitmq.on('connected', function(){

      callback( rabbitmq.default() );
    });
  }

  helpers.disconnect = function(){

    if( !settings.connection ) return false;

    settings.connection.close();
  }

  function connect_then( callback ){

    if( !callback ) callback = defaults.callback.connect;

    if( !settings.connection ){

      helpers.connect( function( connection ){

        settings.connection = connection;

        callback();
      });
    }

    else callback();
  }

  return helpers;
}