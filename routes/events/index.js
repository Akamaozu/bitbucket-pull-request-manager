var event_routes = module.exports = require('express').Router();

event_routes.use('/', require('./receive-new-event') );