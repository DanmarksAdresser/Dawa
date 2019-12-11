const defmulti = require('@dawadk/common/src/defmulti');
const { Range } = require('@dawadk/common/src/postgres/types');
const logger = require('@dawadk/common/src/logger').forCategory('oisImport');
const parseXmlAttr = defmulti((attr, xmlObject) => attr.type);
parseXmlAttr.method('point2d', (attr, xmlObject) => {
  const value = xmlObject[attr.name];
  if(value && value !== 'GEOMETRYCOLLECTION EMPTY') {
    return `SRID=25832;${xmlObject[attr.oisName || attr.name]}`;
  }
  else {
    return null;
  }
});
parseXmlAttr.defaultMethod((attr, xmlObject) => {
  const value = xmlObject[attr.oisName || attr.name];
  if(value === '00000000-0000-0000-0000-000000000000') {
    return null;
  }
  return value;
});

const createMapFn = entity => xmlObject => {
  if(xmlObject.LOEBENUMMER) {
    return null;
  }
  const result = {};
  result.rowkey = xmlObject.ois_id;
  result.registrering = new Range(xmlObject.registreringFra, xmlObject.registreringTil  ? xmlObject.registreringTil : null, '[)');
  result.virkning = new Range(xmlObject.virkningFra, xmlObject.virkningTil ? xmlObject.virkningTil : null, '[)');
  if(!result.registrering.upperInfinite) {
    if(Date.parse(result.registrering.lower) >= Date.parse(result.registrering.upper)) {
      logger.error('Ugyldigt registreringsinterval', {
        registreringfra: result.registrering.lower,
        registreringtil: result.registrering.upper,
        rowkey: result.rowkey,
        id: xmlObject.id_lokalId
      });
      return null;
    }
  }
  if(!result.virkning.upperInfinite) {
    if(Date.parse(result.virkning.lower) >= Date.parse(result.virkning.upper)) {
      logger.error('Ugyldigt virkningsinterval', {
        virkningfra: result.virkning.lower,
        virningtil: result.virkning.upper,
        rowkey: result.rowkey
      });
      return null;
    }
  }
  for (let attr of entity.attributes) {
    result[attr.binding.column] = parseXmlAttr(attr, xmlObject);
  }
  result.id = xmlObject.id_lokalId;
  return result;
};

module.exports = {
  createMapFn
};
