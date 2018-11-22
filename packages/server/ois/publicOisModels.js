const _ = require('underscore');
const fullOisModels = require('./oisModels');

module.exports = _.mapObject(fullOisModels, model => {
  const newModel = Object.assign({}, model);
  newModel.fields = model.fields.filter(field => field.public);
  return newModel;
});
