/*
This code is adapted from https://github.com/ironSource/node-pg-metadata, and
is subject to the following copyright:

The MIT License (MIT)

Copyright (c) 2014 ironSource

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const {go} = require('ts-csp');

const informationSchemaFields = module.exports.informationSchemaFields = [
  'column_name',
  'udt_name',
  'data_type',
  'character_maximum_length',
  'table_name',
  'table_schema',
  'table_catalog',
  'is_nullable',
  'numeric_precision',
  'numeric_scale',
  'numeric_precision_radix',
  'datetime_precision',
  'interval_type',
  'interval_precision'
];

const datetimePrecisionTypes = [
  'timestamp',
  'timestamptz',
  'date',
  'time',
  'timetz'
];

const createMetadataObject = (resultSet) => {
  const metadata = {};

  for (let row of resultSet) {
    const key = row.column_name;
    let table = row.table_name;
    let schema = row.table_schema;

    let database = metadata[row.table_catalog];

    if (!database) {
      metadata[row.table_catalog] = database = {};
    }

    schema = database[row.table_schema];

    if (!schema) {
      database[row.table_schema] = schema = {};
    }

    table = schema[row.table_name];

    if (!table) {
      schema[row.table_name] = table = {};
    }

    const s = table[key] = {
      type: row.udt_name,
      required: !!row.is_nullable
    };

    if (s.type.indexOf('char') >= 0 || s.type.indexOf('text') >= 0) {
      s.length = row.character_maximum_length;
    } else if (row.numeric_precision_radix != null) {
      s.precision = row.numeric_precision;
      s.scale = row.numeric_scale;
      s.precision_radix = row.numeric_precision_radix;
    } else if (datetimePrecisionTypes.indexOf(s.type) >= 0) {
      s.precision = row.datetime_precision;
    } else if (s.type === 'interval') {
      s.precision = row.interval_precision;
      s.interval_type = row.interval_type;
    }
  }
  return metadata;
};


const createQuery = (opts) => {
  opts = opts || {};

  let sql = 'SELECT ' + informationSchemaFields.join(',') + ' FROM information_schema.columns';

  const whereClause = [];
  const params = [];

  if (opts.table) {
    whereClause.push(`table_name=$${params.length + 1}`);
    params.push(opts.table);
  }

  if (opts.schema) {
    whereClause.push(`table_schema=$${params.length + 1}`);
    params.push(opts.schema);
  }

  if (opts.database) {
    whereClause.push(`table_catalog=$${params.length + 1}`);
    params.push(opts.database)
  }

  if (whereClause.length > 0) {
    sql += ' WHERE ' + whereClause.join(' AND ');
  }

  return {sql, params};
};

const pgMetadata = (client) => go(function* () {
  const database = (yield client.queryRows('select current_database() as database'))[0].database;
  const {sql, params} = createQuery({database});
  const result = yield  client.query(sql, params);
  return createMetadataObject(result.rows)[database];
});

module.exports = {
  pgMetadata,
  createQuery,
  createMetadataObject
};