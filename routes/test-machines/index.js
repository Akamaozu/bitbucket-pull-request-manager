var machine_routes = module.exports = require('express').Router();

machine_routes.use('/', require('./create-new-test-machine') );