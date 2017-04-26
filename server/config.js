"use strict";
let options = null;

const getOption = (key) => {
  if(options === null) {
    throw new Error('Options not set');
  }
  if(!options.hasOwnProperty(key)) {
    throw new Error('Unknown option ' + key);
  }
  return options[key];
};

const setOptions = (_options) =>  {
  options = _options;
};

module.exports = {
  getOption,
  setOptions
};
