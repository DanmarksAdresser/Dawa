const defmulti = require('@dawadk/common/src/defmulti');
const {kode4String, d: timestampFormatter, numberToString, stringToNumber} = require('../../util');
const {formatHusnr} = require('../../husnrUtil');
const {formatDarStatus } = require('../../../apiSpecification/commonMappers');
const s3Url = require('../../../apiSpecification/s3-url');

const format = defmulti((binding) => binding.type);

format.method('column', ({attrName}, src, dst) => dst[attrName] = src[attrName]);

format.method('timestamp', ({attrName}, src, dst) => dst[attrName] = timestampFormatter(src[attrName]));

format.method('localTimestamp', ({attrName}, src, dst) => dst[attrName] = timestampFormatter(src[attrName]));

format.method('geometry', ({attrName}, src, dst) => dst[attrName]= src[attrName] ? JSON.parse(src[attrName]) : null);

format.method('offloadedGeometry', ({attrName}, src, dst) => {
    if(src[attrName]) {
      dst[attrName] = JSON.parse(src[attrName]);
    }
    else if(src[`${attrName}_ref`]) {
      dst[attrName] = {
        $refid: src[`${attrName}_ref`],
        $url: s3Url(src[`${attrName}_ref`])
      };
    }
    else {
      dst[attrName] = null;
    }
  });

format.method('kode4', ({attrName}, src, dst) => {
  dst[attrName] = kode4String(src[attrName]);
});

format.method('husnr', ({attrName}, src, dst) => {
  dst[attrName] = formatHusnr(src[attrName]);
});

format.method('darStatus', ({attrName}, src, dst ) => {
  dst[attrName] = formatDarStatus(src[attrName])
});

format.method('numberToString', ({attrName}, src, dst ) => {
  dst[attrName] = numberToString(src[attrName])
});

format.method('stringToNumber', ({attrName}, src, dst ) => {
  dst[attrName] = stringToNumber(src[attrName])
});

format.method('timestampInterval', ({attrName}, src, dst) => {
  dst[`${attrName}start`] = src[`${attrName}start`];
  dst[`${attrName}slut`] = src[`${attrName}slut`];
});

format.method('legacy', ({attrName, formatter}, src, dst) =>
  dst[attrName] = formatter(src[attrName]));

module.exports = format;