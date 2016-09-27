var rabbitmq = require('../../utils/rabbitmq-helper')( process.env.RABBITMQ_URL );

module.exports = function( noticeboard ){
  
  require('./queue-pull-request-deployment')( noticeboard, rabbitmq );
  require('./queue-test-machine-creation')( noticeboard, rabbitmq );
}