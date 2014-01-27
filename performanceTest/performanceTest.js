// 

var request = require("request");
var async   = require("async");
var _       = require("underscore");
var http    = require('http');
var util    = require('util');
var fs      = require('fs');
var stream  = require('stream');

var log = fs.createWriteStream('perf.csv');
log.write("start end\n");

var warmUps = 100;

function run(n, callback){
  var t1 = Date.now();
  request.get({uri:'http://dawatest-env-igh3trup2y.elasticbeanstalk.com/adresser/0a3f50ae-da7f-32b8-e044-0003ba298018',
               method: 'GET',
              timeout: 1000},
              function(error, response, body){
                if (warmUps < 0){
                  var t2 = Date.now();
                  log.write(util.format("%d %d\n", t1, t2));
                  process.stdout.write('.');
                } else {
                  warmUps--;
                  process.stdout.write('#');
                }
                callback();
              }).start();
}

function workers(numberOfWorkers, iterations){
  var t1 = Date.now();

  http.globalAgent.maxSockets = numberOfWorkers;
  var q = async.queue(run, numberOfWorkers);

  q.drain = function(){
    console.log("\nTotal work time: %dms. Number of workers: %d. Total iterations: %d.", (Date.now() - t1), numberOfWorkers, iterations);
    log.end();
  };

  _.times(iterations+warmUps, function(n){
    q.push(n, function (err) { });
  });
}

workers(80, 80000);

