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

function timeRequest(conf, callback){
  var t1 = Date.now();
  request(conf,
          function(error, response, body){
            if (error) console.log(error);
            if (response.statusCode != 200) console.log("Unexpected status: "+response.statusCode);
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

function workers(numberOfWorkers, iterations, conf){
  var t1 = Date.now();
  http.globalAgent.maxSockets = numberOfWorkers;
  var q = async.queue(timeRequest, numberOfWorkers);

  q.drain = function(){
    console.log("\nTotal work time: %dms. Number of workers: %d. Total iterations: %d.", (Date.now() - t1), numberOfWorkers, iterations);
    log.end();
  };

  _.times(iterations+warmUps, function(_){
    q.push(conf, function (err) { });
  });
}

var httpHost = 'http://dawatest-env-igh3trup2y.elasticbeanstalk.com'
var get = {uri: httpHost+'/adresser/0a3f50ae-da7f-32b8-e044-0003ba298018',
           method: 'GET',
           timeout: 1000};

var put = {url: httpHost+'/api/postnummerhaendelse/oprettelse',
           method: 'PUT',
           json: {
             Loebenummer: '1',
             tidspunkt: '2012-02-11T04:05:28+01:00',
             postnummer: {
               version: '2012-02-11T04:05:28+01:00',
               nr: '8260',
               navn: 'Viby J'}}};

workers(10, 10, get);
