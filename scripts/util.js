const sh = require('shelljs');
const exec =  cmd => {
  const result = sh.exec(cmd);
  if(result.code !== 0) {
    throw new Error(`Command ${cmd} failed with exit code ${result.code}`);
  }
  return result.stdout;
};

module.exports = {
  exec
};