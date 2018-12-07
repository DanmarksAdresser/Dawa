const _ = require('underscore');
const moment = require('moment');
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
      const reverseRows = rows.slice().reverse();
      const now = moment();
      const currentRow = reverseRows.find(({ændringstidspunkt}) => moment(ændringstidspunkt).isBefore(now));
      const currentValue = currentRow ? _.pick(currentRow, ...fieldNames) : null;
      const futureValue = moment(rows[rows.length -1].ændringstidspunkt).isAfter(now) ? _.pick(rows[rows.length - 1], ...fieldNames): null;
      const createdTime = rows[0].ændringstidspunkt;
      return {
        oprettettidspunkt: createdTime,
        initielværdi: initialValue,
        historik: changeDescriptions,
        aktuelværdi: currentValue,
        fremtidigværdi: futureValue
      };
    }
  }
};