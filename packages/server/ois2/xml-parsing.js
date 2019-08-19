const defmulti = require('@dawadk/common/src/defmulti');
const { Range } = require('@dawadk/common/src/postgres/types');

const parsePrimitiveXmlAttr = defmulti((attr, xmlObject) => attr.type.name);
parsePrimitiveXmlAttr.method('GM_Point', (attr, xmlObject) => {
  const value = xmlObject[attr.name];
  if(value && value !== 'GEOMETRYCOLLECTION EMPTY') {
    return `SRID=25832;${xmlObject[attr.name]}`;
  }
  else {
    return null;
  }
});
parsePrimitiveXmlAttr.defaultMethod((attr, xmlObject) => xmlObject[attr.name]);

const parseXmlAttr = defmulti(attr => attr.type.kind);
parseXmlAttr.method('primitive', parsePrimitiveXmlAttr);
parseXmlAttr.defaultMethod((attr, xmlObject) => xmlObject[attr.name]);

const createMapFn = entity => xmlObject => {
  const result = {};
  result.rowkey = xmlObject.ois_id;
  result.registrering = new Range(xmlObject.registreringFra, xmlObject.registreringTil  ? xmlObject.registreringTil : null, '[)');
  result.virkning = new Range(xmlObject.virkningFra, xmlObject.virkningTil ? xmlObject.virkningTil : null, '[)');
  for (let attr of entity.attributes) {
    result[attr.name] = parseXmlAttr(attr, xmlObject);
  }
  result.id = xmlObject.id_lokalId;
  return result;
};

module.exports = {
  createMapFn
};