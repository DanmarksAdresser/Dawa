const {go} = require('ts-csp');
const specMap = require('./spec');
const config = require('@dawadk/common/src/config/holder').getConfig();
const dbapi = require('../../dbapi');
const parameters = require('./parameters');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
const sqlSelect  = require('../replikering/bindings/sql-select');
const replikeringBindings = require('../replikering/dbBindings');

const { getAllProvidedAttributes, createRowFormatter } = require('../replikering/bindings/util');

const baseQuery = specs => {
  const sqlParts = {
    select: [],
    from: [],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
  const addToSelect = (spec) => {
    const excludedAttrs = ['rowkey', 'virkningstart', 'virkningslut', ...(spec.excluded || [])];
    const binding = replikeringBindings[spec.entity];
    const alias = spec.alias;
    const selects = binding.attributes
      .map(attrBinding => sqlSelect(attrBinding, alias))
      .reduce((acc, select) => acc.concat(select), [])
      .filter(([select, as]) => !excludedAttrs.includes(as))
      .map(([select, as]) => [select, `${alias}_${as}`])
      .map(([select, as]) => `${select} AS ${as}`);
    sqlParts.select = sqlParts.select.concat(selects);
  };
  const addJoin = spec => {
    const binding = replikeringBindings[spec.entity];
    const onClause = spec.join.map(([c1, c2]) => `${c1} = ${c2}`).join(' AND ');
    sqlParts.from.push(`LEFT JOIN ${binding.table} ${spec.alias} ON (${onClause})`);
    sqlParts.select.push(addToSelect(spec));
  };
  const baseBinding = replikeringBindings[specs[0].entity];
  sqlParts.from.push(`${baseBinding.table} as ${specs[0].alias}`)
  sqlParts.select.push(addToSelect(specs[0]));
  for (let spec of specs.slice(1)) {
    addJoin(spec);
  }
  const virkningClause = specs.map(spec => `coalesce(${spec.alias}.virkning, '(,)'::tstzrange)`).join('*');
  const whereClause = `NOT isEmpty(${virkningClause})`;
  sqlParts.select.push(`lower(${virkningClause}) as ændringstidspunkt`);
  sqlParts.whereClauses.push(whereClause);
  sqlParts.orderClauses.push(`lower(${virkningClause})`);
  return sqlParts;
};

module.exports = {
  allSelectableFields: [],
  processQuery: function (client, fieldNames, params) {
    return client.withReservedSlot(() => go(function* () {
      const baseEntity = params.entitet;
      const entities = specMap[baseEntity].entities;
      const columns = {
        id: {
          column: `${entities[0].alias}.id`
        }
      };
      const query = baseQuery(entities);
      sqlParameterImpl.simplePropertyFilter(parameters.id, columns)(query, params);
      const {sql, params: sqlParams} = dbapi.createQuery(query);
      const queryResult = yield client.queryRows(sql, sqlParams);
      if(queryResult.length === 0) {
        return queryResult;
      }
      for (let entitySpec of entities) {
        const excludedColumns = ['rowkey', 'virkningstart', 'virkningslut', ...(entitySpec.excluded || [])];
        const binding = replikeringBindings[entitySpec.entity];
        const alias = entitySpec.alias;
        const attributesToFormat =
          getAllProvidedAttributes(binding.attributes)
            .filter(attrName => !excludedColumns.includes(attrName));
        queryResult.forEach(row => {
          const unaliasedRowFormatter = createRowFormatter(binding);
          const unaliasedRow = attributesToFormat
            .reduce((acc, attrName) => {
              acc[attrName] = row[`${alias}_${attrName}`];
              return acc;
            }, {});
          const formattedRow = unaliasedRowFormatter(unaliasedRow);
          for(let attrName of attributesToFormat) {
            row[`${alias}_${attrName}`] = formattedRow[attrName];
          }
        });
      }
      return [{queryResult}];
    }), config.get('autocomplete.query_slot_timeout'));
  }
};
