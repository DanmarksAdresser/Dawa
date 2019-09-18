const defmulti = require('@dawadk/common/src/defmulti');
const { Range } = require('@dawadk/common/src/postgres/types');

const parseXmlAttr = defmulti((attr, xmlObject) => attr.type);
parseXmlAttr.method('point2d', (attr, xmlObject) => {
  const value = xmlObject[attr.name];
  if(value && value !== 'GEOMETRYCOLLECTION EMPTY') {
    return `SRID=25832;${xmlObject[attr.name]}`;
  }
  else {
    return null;
  }
});
parseXmlAttr.defaultMethod((attr, xmlObject) => xmlObject[attr.name]);

const createMapFn = entity => xmlObject => {
  const result = {};
  result.rowkey = xmlObject.ois_id;
  result.registrering = new Range(xmlObject.registreringFra, xmlObject.registreringTil  ? xmlObject.registreringTil : null, '[)');
  result.virkning = new Range(xmlObject.virkningFra, xmlObject.virkningTil ? xmlObject.virkningTil : null, '[)');
  for (let attr of entity.attributes) {
    result[attr.binding.column] = parseXmlAttr(attr, xmlObject);
  }
  result.id = xmlObject.id_lokalId;
  return result;
};

module.exports = {
  createMapFn
};