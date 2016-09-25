setup( function( error, start_worker, log ){
  
  if( error ){

    console.log( 'FAILED SETUP LOG-DUMP\n', log, ' \n' );

    throw error;
  } 

  start_worker();
});

function setup( callback ){

  if( !callback || typeof callback !== 'function' ) callback = function(){};

  var setup_task = require('cjs-task')();

  setup_task.callback( function( error ){

    if( error ) return callback( error, false, setup_task.log() );

    console.log( 'SETUP COMPLETED IN ' + ( ( Date.now() - setup_task.get('start-time') ) / 1000 ) + ' SECS' );

    callback( null, function(){

      var noticeboard = setup_task.get('noticeboard');

      return function start_worker(){

        console.log( 'STARTING WORKER' );

        noticeboard.notify( 'process-pull-request-queue', null, 'start-worker' );
      }
    }(), setup_task.log() );
  });

  setup_task.set( 'start-time', Date.now() );

  setup_task.step( 'setup mysql driver', function(){

    setup_task.log( 'setting up mysql driver' );

    var test_machines_mysql = require('./utils/mysql-helper')( process.env.MYSQL_URL, require('./config/test-machines-mysql-schema.json') );
    
    setup_task.log( 'mysql driver setup complete' );

    setup_task.set( 'mysql', test_machines_mysql );

    setup_task.next();
  });

  setup_task.step( 'sync mysql with schema', function(){

    setup_task.log( 'syncing mysql db with schema' );

    setup_task.get('mysql').sync( function( error, success, log ){

      setup_task.log( log );

      if( error ) return task.end( new Error( 'could not ensure mysql db matches schema' ) );

      setup_task.log( 'mysql db matches schema' );

      setup_task.next();
    });
  });

  setup_task.step( 'setup rabbitmq driver', function(){

    setup_task.log( 'setting up rabbitmq driver' );

    var pull_request_queue_connection = require('./utils/rabbitmq-helper')( process.env.RABBITMQ_URL );

    setup_task.log( 'rabbitmq driver setup complete' );

    setup_task.set( 'rabbitmq', pull_request_queue_connection );

    setup_task.next();
  });

  setup_task.step( 'setup noticeboard', function(){

    setup_task.log( 'setting up noticeboard' );

    var Noticeboard = require('cjs-noticeboard'),
        noticeboard = new Noticeboard({ logOps: false }),
        
        rabbitmq = setup_task.get('rabbitmq'),
        mysql = setup_task.get('mysql'),
        
        state = {};

    noticeboard.watch( 'new-pull-request', 'process-pull-request', function( msg ){

      var task = require('cjs-task')(),
          pullrequest = msg.notice;

      task.callback( function( error ){

        if( error ){

          console.log( 'FAILED WORKER LOG-DUMP\n', task.log(), ' \n' );

          throw error;
        }
      });

      task.step( 'get test machines', function(){

        task.log( 'getting test machines from mysql db' );

        mysql.query( 'select * from test_machine', function( error, results ){

          if( error ){

            task.log( 'could not get list of test machines' );
            return task.end( error );
          }

          if( results.length < 1 ){

            task.log( 'no registered test machines' );
            return task.end( new Error( 'no test machines stored in db' ) );
          }

          task.set( 'test-machines', results );
          task.next();
        });
      });

      task.start();
    });

    noticeboard.watch( 'ignore-pull-request-queue', 'worker', function(){

      if( !state.processing ) return;

      state.processing = false;

      rabbitmq.disconnect();
    });

    noticeboard.watch( 'process-pull-request-queue', 'worker', function(){

      if( state.processing ) return;

      state.processing = true;

      rabbitmq.create( 'pull-requests' );

      rabbitmq.handle( 'pull-requests', function( pullrequest, ack, nack ){

        pullrequest.success = ack;
        pullrequest.fail = nack;

        noticeboard.notify( 'new-pull-request', pullrequest, 'rabbitmq' );
      });
    });

    setup_task.log( 'noticeboard setup completed' );

    setup_task.set( 'noticeboard', noticeboard );

    setup_task.next();
  });

  setup_task.start();
}