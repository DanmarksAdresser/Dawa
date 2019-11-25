const defmulti = require('@dawadk/common/src/defmulti');
const {kode4String, d: timestampFormatter, numberToString, stringToNumber} = require('../../util');
const {formatHusnr} = require('../../husnrUtil');
const {formatDarStatus } = require('../../../apiSpecification/commonMappers');
const s3Url = require('../../../apiSpecification/s3-url');

const format = defmulti((binding) => binding.type);

format.method('column', ({attrName, column}, src, dst) => dst[attrName] = src[column]);

format.method('timestamp', ({attrName, column}, src, dst) => dst[attrName] = timestampFormatter(src[column]));

format.method('localTimestamp', ({attrName, column}, src, dst) => dst[attrName] = timestampFormatter(src[column]));

format.method('geometry', ({attrName, column}, src, dst) => dst[attrName]= src[column] ? JSON.parse(src[column]) : null);

format.method('offloadedGeometry', ({attrName, column}, src, dst) => {
  if (src[`${column}_ref`]) {
    dst[attrName] = {
      $refid: src[`${column}_ref`],
      $url: s3Url(src[`${column}_ref`])
    };
  } else if (src[column]) {
    dst[attrName] = JSON.parse(src[column]);
  } else {
    dst[attrName] = null;
  }
});

format.method('kode4', ({attrName, column}, src, dst) => {
  dst[attrName] = kode4String(src[column]);
});

format.method('husnr', ({attrName, column}, src, dst) => {
  dst[attrName] = formatHusnr(src[column]);
});

format.method('darStatus', ({attrName, column}, src, dst ) => {
  dst[attrName] = formatDarStatus(src[column])
});

format.method('numberToString', ({attrName, column}, src, dst ) => {
  dst[attrName] = numberToString(src[column])
});

format.method('stringToNumber', ({attrName, column}, src, dst ) => {
  dst[attrName] = stringToNumber(src[column])
});

format.method('timestampInterval', ({attrName, column}, src, dst) => {
  dst[`${attrName}start`] = src[`${column}start`];
  dst[`${attrName}slut`] = src[`${column}slut`];
});

format.method('legacy', ({attrName, formatter, column}, src, dst) => {
  dst[attrName] = formatter(src[column]);
});

module.exports = format;