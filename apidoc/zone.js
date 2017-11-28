const {
  dagiReplikeringTilknytningDoc,
  getTemaDef
} = require('./dagiCommon');

const temaDef = getTemaDef('zone');
module.exports = dagiReplikeringTilknytningDoc(temaDef);
