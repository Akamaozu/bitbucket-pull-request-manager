var routes = module.exports = require('express').Router();

routes.use('/', require('./root') );
routes.use('/event', require('./events') );
routes.use('/test-machine', require('./test-machines') );