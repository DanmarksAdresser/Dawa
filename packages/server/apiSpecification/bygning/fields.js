const fieldsUtil = require('../common/fieldsUtil');
const sqlModel = require('./sqlModel');

module.exports = [
  {
    name: 'ændret',
    selectable: true
  },
  {
    name: 'geom_json'
  },
  {
    name: 'bbox_xmin'
  },
  {
    name: 'bbox_ymin'
  },
  {
    name: 'bbox_xmax'
  },
  {
    name: 'bbox_ymax'
  },
  {
    name: 'visueltcenter_x'
  },
  {
    name: 'visueltcenter_y'
  },
  {
    name: 'id'
  }, {
    name: 'bbrbygning_id'
  }, {
    name: 'bygningstype',
  }, {
    name: 'metode3d'
  }, {
    name: 'målested'
  },
  {
    name: 'synlig'
  },
  {
    name: 'overlap'
  },
  {
    name: 'adgangsadresser',
    multi: true
  },
  {
    name: 'kommuner',
    multi: true
  }
];

fieldsUtil.applySelectability(module.exports, sqlModel);
fieldsUtil.normalize(module.exports);
