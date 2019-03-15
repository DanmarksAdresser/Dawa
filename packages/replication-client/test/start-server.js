const setupTestServer = require('@dawadk/server/test/helpers/start-test-server');

// the run() function is exposed by mocha, due to the --delay parameter in mocha.opts.
// we use it to delay executing tests until server is up.
let serverProcess;
before(() => setupTestServer().then(_serverProcess => serverProcess = _serverProcess));

after(() => serverProcess.kill());