var create_machines_route = module.exports = require('express').Router();

// required variables
    var required_machine_properties = [ 'name', 'git', 'active_branch', 'ssh_pub_key', 'ssh_priv_key' ];

// parse form posts
  create_machines_route.use( '/', require('body-parser')() );

// create routes
  
  // POST /
  // create new machine
    create_machines_route.post('/', function( req, res ){

      var each = require( req.app.locals.app_root_dir + '/utils/each' ),
          response = { success: false };

      each( required_machine_properties, function( prop ){

        if( req.body.hasOwnProperty( prop ) ) return;

        response.message = 'missing required property: "' + prop + '"';

        res.status( 400 ).json( response );

        return false;
      });

      req.noticeboard.notify( 'create-new-test-machine', {
        
        name: req.body.name,
        git: req.body.git,
        active_branch: req.body.active_branch,
        ssh_pub_key: req.body.ssh_pub_key,
        ssh_priv_key: req.body.ssh_priv_key

      }, 'POST ' + req.baseUrl + '/' );

      response.success = true;
      response.message = 'machine will be ready for testing shortly';

      res.json( response );
    });