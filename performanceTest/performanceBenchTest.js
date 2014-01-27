
benchrest = require('bench-rest');
var flow = {
  before: [],      // operations to do before anything
  beforeMain: [],  // operations to do before each iteration
  main: [  // the main flow for each iteration, #{INDEX} is unique iteration counter token
    { get: 'http://dawatest-env-igh3trup2y.elasticbeanstalk.com/adresser/0a3f50ae-da7f-32b8-e044-0003ba298018' }
  ],
  afterMain: [],   // operations to do after each iteration
  after: []        // operations to do after everything is done
};

var runOptions = {
  limit: 50,         // concurrent connections
  iterations: 10000,  // number of iterations to perform
  prealloc: 100,      // only preallocate up to 100 before starting
  progress: true
};

var lastPercent = -1;
benchrest(flow, runOptions)
  .on('error', function (err, ctxName) { console.error('\nFailed in %s with err: ', ctxName, err); })
  .on('progress', function (stats, percent, concurrent, ips) {
    if (percent != lastPercent){
      lastPercent = percent;
      process.stdout.write("\n"+percent+"% ");
    }
    process.stdout.write(".");
  })
  .on('end', function (stats, errorCount) {
    console.log('\nerror count: ', errorCount);
    console.log('stats', stats);
  });
