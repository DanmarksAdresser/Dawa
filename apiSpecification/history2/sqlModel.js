const {go} = require('ts-csp');
const _ = require('underscore');
const specMap = require('./spec');
const config = require('../../server/config');
const dbapi = require('../../dbapi');
const parameters = require('./parameters');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');

const replikeringDatamodels = require('../replikering/datamodel');
const replikeringBindings = require('../replikering/dbBindings');
const baseQuery = specs => {
  const sqlParts = {
    select: [],
    from: [],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
  const addToSelect = (spec) => {
    const excludedColumns = ['rowkey', 'virkningstart', 'virkningslut', ...(spec.excluded || [])];
    const model = replikeringDatamodels[spec.entity];
    const binding = replikeringBindings[spec.entity];
    const alias = spec.alias;
    return _.pluck(model.attributes, 'name')
      .filter(attName => !excludedColumns.includes(attName))
      .map(attName => {
        const bindingAttr = binding.attributes[attName];
        const columnName = `${alias}.${binding.attributes[attName].column}`;
        const transformed = bindingAttr.selectTransform(columnName);
        return `${transformed} AS ${alias}_${attName}`;
      }).join(', ');
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
      const entity = params.entitet;
      const specs = specMap[entity];
      const columns = {
        id: {
          column: `${specs[0].alias}.id`
        }
      };
      const query = baseQuery(specs);
      sqlParameterImpl.simplePropertyFilter(parameters.id, columns)(query, params);
      const {sql, params: sqlParams} = dbapi.createQuery(query);
      const queryResult = yield client.queryRows(sql, sqlParams);
      for (let spec of specs) {
        const excludedColumns = ['rowkey', 'virkningstart', 'virkningslut', ...(spec.excluded || [])];
        const model = replikeringDatamodels[spec.entity];
        const binding = replikeringBindings[spec.entity];
        const alias = spec.alias;
        _.pluck(model.attributes, 'name')
          .filter(attName => !excludedColumns.includes(attName))
          .forEach(attName => {
            const bindingAttr = binding.attributes[attName];
            if (bindingAttr.formatter) {
              for (let row of queryResult) {
                row[`${alias}_${attName}`] = bindingAttr.formatter(row[`${alias}_${attName}`]);
              }
            }
            const columnName = `${alias}.${binding.attributes[attName].column}`;
            const transformed = bindingAttr.selectTransform(columnName);
            return `${transformed} AS ${alias}_${attName}`;
          });
      }
      return [{queryResult}];
    }), config.getOption('autocomplete.querySlotTimeout'));
  }
};
