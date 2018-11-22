"use strict";

function parseInteger(str) {
  return parseInt(str, 10);
}

module.exports = {
  zone: {
    name: 'theme_pdk_zonekort_v',
    wfsName: 'theme_pdk_zonekort_v',
    geometry: 'geometri',
    fields: {
      zone: {
        name: 'zone',
        parseFn: parseInteger
      }
    },
    filterFn: function () {
      return true;
    }
  }
};
