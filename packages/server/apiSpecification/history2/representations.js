const _ = require('underscore');

const specMap = require('./spec');
module.exports = {
  json: {
    fields: [],
    mapper: (baseUrl, params) => row => {
      const rows = row.queryResult;
      for(let {fieldName, derive} of specMap[params.entitet].derivedFields) {
        for(let row of rows) {
          row[fieldName] = derive(row);
        }
      }
      let fieldNames = _.without(Object.keys(rows[0]), 'ændringstidspunkt');
      if(params.attributter) {
        fieldNames = params.attributter.split(',');
      }
      let changeDescriptions = [];
      for (let i = 1; i < rows.length; ++i) {
        const oldRow = rows[i - 1];
        const newRow = rows[i];
        const change = fieldNames.reduce((acc, fieldName) => {
          if (JSON.stringify(oldRow[fieldName]) !== JSON.stringify(newRow[fieldName])) {
            acc.push({
              attribut: fieldName,
              gammelværdi: oldRow[fieldName],
              nyværdi: newRow[fieldName]
            });
          }
          return acc;
        }, []);
        changeDescriptions.push({
          ændringstidspunkt: newRow.ændringstidspunkt,
          ændringer: change
        });
      }
      changeDescriptions = changeDescriptions.filter(change=> change.ændringer.length > 0);
      const initialValue = _.pick(rows[0], ...fieldNames);
      delete initialValue.ændringstidspunkt;
      const actualValue = _.pick(rows[rows.length - 1], ...fieldNames);
      delete actualValue.ændringstidspunkt;
      const createdTime = rows[0].ændringstidspunkt;
      return {
        oprettettidspunkt: createdTime,
        initielværdi: initialValue,
        historik: changeDescriptions,
        aktuelværdi: actualValue
      };
    }
  }
};