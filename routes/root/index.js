var root_routes = module.exports = require('express').Router();

root_routes.use('/', require('./welcome-message'));