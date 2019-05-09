const Promise = require('bluebird');
const { go } = require('ts-csp');
const tmp = require('tmp');
const fs = require('fs');
const S3rver = require('s3rver');
const s3Util = require('../src/s3-util');
const configHolder = require('@dawadk/common/src/config/holder');

const startS3rver = () => go(function*() {
  const config = configHolder.getConfig();
  let s3Directory = config.get('test.s3rver.directory');
  if(!s3Directory) {
    s3Directory = yield Promise.promisify(tmp.dir, {context: tmp})();
  }
  else {
    if(!fs.existsSync(s3Directory)) {
      fs.mkdirSync(s3Directory, {recursive: true});
    }
  }
  const s3InstanceOpts = new S3rver({
    port: config.get('test.s3rver.port'),
    hostname: config.get('test.s3rver.hostname'),
    silent: config.get('test.s3rver.silent'),
    directory: s3Directory
  });

  const instance = yield new Promise((resolve, reject) => {
    const instance = s3InstanceOpts.run((err) => {
      if(err) {
        reject(err);
      }
      resolve(instance);
    });
  });

  const s3 = s3Util.createS3();
  try {
    yield Promise.promisify(s3.createBucket, { context: s3})({
      Bucket: config.get('test.s3rver.bucket')
    });
  }
  catch(e) {
    // ignore error, probably the bucket already exists.
  }
  return instance;
});

const withS3rver = (fn) => go(function*() {
  const instance = yield startS3rver();
  yield fn();
  yield Promise.promisify(instance.close, {context: instance})();
});

module.exports = {
  startS3rver,
  withS3rver
};
