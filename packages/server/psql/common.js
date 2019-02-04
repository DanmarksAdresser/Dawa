"use strict";

var fs = require('fs');

function exitOnErr(err){
  if (err){
    /*eslint no-console: 0 */
    console.dir(err);
    process.exit(1);
  }
}

exports.exitOnErr = exitOnErr;

exports.execSQL = function(sql, client, echo, done){
  return client.queryp(sql, []).nodeify(done);
};

function psqlScript(client, scriptDir, scriptfile){
  return function(cb){
    return exports.psqlScriptQ(client, scriptDir, scriptfile).nodeify(cb);
  };
}

exports.psqlScriptQ = function(client, scriptDir, scriptfile) {
  var script = fs.readFileSync(scriptDir + '/' + scriptfile, {
    encoding: 'utf8'
  });
  return client.queryp(script, []);
};

exports.psqlScript = psqlScript;
