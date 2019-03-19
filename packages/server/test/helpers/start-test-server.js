const Promise = require('bluebird');
const path = require('path');
const child_process = require('child_process');

const serverDir = path.dirname(require.resolve("@dawadk/server/package.json"));
const serverScript = path.join(serverDir, 'server.js');
const configFiles = [
  require.resolve('../../server/default-test-config.json5')
];
module.exports = () => new Promise((resolve) => {
  const server_process = child_process.fork(serverScript, [
    '--config_files',
    configFiles.join(',')
  ], {
    cwd: serverDir
  });
  process.on('exit', () => server_process.kill());
  server_process.on('message', msg => {
    setTimeout(() => {
      resolve(server_process);
    }, 2000);
  });
});
