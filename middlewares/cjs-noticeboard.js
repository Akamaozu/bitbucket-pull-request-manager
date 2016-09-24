var Noticeboard = require('cjs-noticeboard'),
    noticeboard = new Noticeboard();

module.exports = function( req, res, next ){
  
  req.noticeboard = noticeboard;

  next();
}