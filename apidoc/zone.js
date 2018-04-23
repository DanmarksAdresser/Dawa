const {
  dagiReplikeringTilknytningDoc,
  getTemaModel
} = require('./dagiCommon');

const temaModel = getTemaModel('zone');
module.exports = dagiReplikeringTilknytningDoc(temaModel);
