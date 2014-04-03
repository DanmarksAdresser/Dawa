"use strict";

var dbapi2 = require('./dbapi2');

/******************************************************************************/
/*** Configuration ************************************************************/
/******************************************************************************/

// var connString = "postgres://ahj@localhost/dawa2";
var connString = process.env.pgConnectionUrl;
module.exports = dbapi2({
  dbUrl: connString
});