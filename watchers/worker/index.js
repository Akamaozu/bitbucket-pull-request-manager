var Heroku = require('heroku-client'),
    heroku = new Heroku({ token: process.env.HEROKU_API_TOKEN });

module.exports = function( noticeboard ){
  
  require('./start-test-machine-creator')( noticeboard, heroku );
}