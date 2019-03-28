const split2 = require('split2');
const fs = require('fs');
const q = require('q');

function readNdjson(filePath, filterFn) {
  return q.async(function*() {
    let result = [];
    const inputStream = fs.createReadStream(filePath, {encoding: 'utf8'});
    const stream = inputStream.pipe(split2());
    stream.on('data', line => {
      const json = JSON.parse(line);
      if (filterFn(json)) {
        result.push(json);
      }
    });
    yield q.Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    return result;
  })();
}

function writeNdjson(filePath, arr) {
  return q.Promise((resolve, reject) => {
    const outputStream = fs.createWriteStream(filePath, {encoding: 'utf8'});
    for (let item of arr) {
      outputStream.write(JSON.stringify(item) + '\n');
    }
    outputStream.end();
    outputStream.on('finish', resolve);
  });
}

module.exports = {
  readNdjson,
  writeNdjson
};