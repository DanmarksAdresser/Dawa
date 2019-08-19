const {go } = require('ts-csp');
const sax = require('sax');
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const {  createUnzipperProcess } = require('./ois-import');
const Promise = require('bluebird');
const iconv = require('iconv-lite');

const escapeXml = str => {
  const charsToReplace = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;'
  };

  return str.replace(/[&<>'"]/g, ch => charsToReplace[ch]);
};
/**
 * This code is just for generating test data, sorry for the mess.
 */
const shortenOisFile = (inputDir, fileName, outputDir, desiredCount) => {
  const xmlFileName = (fileName.substring(0, fileName.length - 4) + '.XML').toUpperCase();
  const inputFilePath = path.join(inputDir, fileName);
  const outputXmlFilePath = path.join(outputDir, xmlFileName);
  const unzipperProc = createUnzipperProcess(inputFilePath, xmlFileName);
  const fileInputStream = unzipperProc.stdout;
  const decoderStream = iconv.decodeStream('latin1');
  fileInputStream.pipe(decoderStream);
  return new Promise((resolve, reject) => {
    const fileOutputStream = fs.createWriteStream(outputXmlFilePath, {encoding: 'latin1'});
    const saxStream = sax.createStream(true, {});
    let depth = 0;
    let count = 0;
    const done = () => count >= desiredCount;
    const stack = [];
    let stopped = false;
    const stop = () => {
      if(stopped) {
        return;
      }
      stopped = true;
      while(stack.length > 0) {
        const tag = stack.pop();
        fileOutputStream.write(`</${tag}>`);
      }
      unzipperProc.kill();
      fileInputStream.destroy();
      fileOutputStream.end(() => {
        const args = [ 'a',
          path.resolve(path.join(outputDir, fileName)),
          path.resolve(outputXmlFilePath)];
        go(function*() {
          yield Promise.promisify(child_process.execFile)('7za', args, {});
          yield Promise.promisify(fs.unlink)(outputXmlFilePath);
          resolve(count)
        });
      });
    };
    fileOutputStream.write(`<?xml version="1.0" encoding="ISO-8859-1"?>`);
    saxStream.on('opentag', node => {
      if(!stopped) {
        fileOutputStream.write(`<${node.name}>`);
        ++depth;
        stack.push(node.name);
      }
    });
    saxStream.on('text', text => {
      if(!stopped) {
        fileOutputStream.write(escapeXml(text));
      }
    });
    saxStream.on('closetag', tagName => {
      if(!stopped) {
        if(depth === 2) {
          ++count;
        }
        --depth;
        fileOutputStream.write(`</${tagName}>`);
        stack.pop();
        if(done()) {
          stop();
        }
      }
    });
    saxStream.on('end', () => {
      stop();
    });
    decoderStream.pipe(saxStream);
  });
};

const shortenOisFiles = (srcDir, targetDir, count) => go(function*() {
  const files = yield Promise.promisify(fs.readdir)(srcDir);
  for(let file of files) {
    if(/.*\.ZIP/i.test(file)) {
      yield shortenOisFile(srcDir, file, targetDir, count);
    }
  }
});

module.exports = {
  shortenOisFile,
  shortenOisFiles
};