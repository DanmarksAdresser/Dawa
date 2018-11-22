const commonSchemaDefinitions = require('../commonSchemaDefinitions');

exports.schemaFromField = (field, nullable) => {
  const schemaType = (type, nullable)  =>
    nullable ? ['null', type] : type;

  if(field.oisType === 'uniqueidentifier') {
    return commonSchemaDefinitions[`${nullable ? 'Nullable' : ''}UUID`];
  }
  else if(field.oisType === 'decimal') {
    return {
      type: schemaType('number', nullable)
    }
  }
  else if(field.oisType === 'char') {
    const length = field.oisLength;
    return {
      type: schemaType('string', nullable),
      minLength: length,
      maxLength: length
    }
  }
  else if (field.oisType === 'varchar') {
    const length = field.oisLength;
    return {
      type: schemaType('string', nullable),
      maxLength: length
    }
  }
  else if(['tinyint', 'smallint', 'int', 'bigint'].includes(field.oisType)) {
    return commonSchemaDefinitions[`${nullable ? 'Nullable' : ''}Integer`];
  }
  else {
    throw new Error('Could not decide schema from OIS type: ' + field.oisType);
  }
};
