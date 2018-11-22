const Promise = require('bluebird');
const path = require('path');
const child_process = require('child_process');

const serverDir = path.dirname(require.resolve("@dawadk/server/package.json"));
const serverScript = path.join(serverDir, 'server.js');

module.exports = () => new Promise((resolve) => {
  const server_process = child_process.fork(serverScript, [
    '--pgConnectionUrl=postgres://localhost/dawatest',
    '--listenPort=3002',
    '--masterListenPort=3003',
    '--processes=1',
    '--ois.enabled=1', '--ois.unprotected=1',
    '--logConfiguration=travis-ci-server-logconfig.json'], {
    cwd: serverDir
  });
  process.on('exit', () => server_process.kill());
  server_process.on('message', msg => {
    setTimeout(() => {
      resolve(server_process);
    }, 1000);
  });
});
