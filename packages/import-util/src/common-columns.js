const { go } = require('ts-csp');
const {name, derive, isPublic, preApplyChanges, postApplyChanges, fromSource, compare, distinctClause} = require('@dawadk/import-util/src/table-diff-protocol');
const {offloadGeometryColumnToS3} = require('./s3-offload');
const {columnsEqualClause} = require('@dawadk/common/src/postgres/sql-util');
const { computeVisualCenters } = require('./visual-center');

const geomDistinctClause = (a, b) => `${a} IS DISTINCT FROM ${b} AND (${a} IS NULL OR ${b} IS NULL OR NOT ST_Equals(${a}, ${b}))`;

const geomColumn = ({name}) => ({
  type: 'geom',
  name: name || 'geom'
});

distinctClause.method('geom', (column, a, b) => geomDistinctClause(a, b));


const ændretColumn = () => ({
  type: 'ændret'
});

name.method('ændret', () => 'ændret');
fromSource.method('ændret', () => false);
compare.method('ændret', () => false);
preApplyChanges.method('ændret', (column, client, txid, tableModel) =>
  client.query(`UPDATE ${tableModel.table}_changes SET ændret = NOW() 
    WHERE operation = 'insert' OR operation = 'update' and txid = ${txid}`));


const geoÆndretColumn = ({geomColumnName}) => ({
  type: 'geoÆndret',
  geomColumnName: geomColumnName || 'geom'
});

name.method('geoÆndret', () => 'geo_ændret');
fromSource.method('geoÆndret', () => false);
compare.method('geoÆndret', () => false);
preApplyChanges.method('geoÆndret', ({geomColumnName}, client, txid, tableModel) =>
  go(function*() {
    yield client.query(`UPDATE ${tableModel.table}_changes SET geo_ændret = NOW() WHERE operation = 'insert'and txid = ${txid}`);
    yield  client.query(`UPDATE ${tableModel.table}_changes new SET geo_ændret = old.geo_ændret
    FROM ${tableModel.table} old WHERE ${columnsEqualClause('old', 'new', tableModel.primaryKey)}
                                 AND operation = 'update' and txid = ${txid}`);
    yield  client.query(`UPDATE ${tableModel.table}_changes new SET geo_ændret = NOW()
    FROM ${tableModel.table} old WHERE ${columnsEqualClause('old', 'new', tableModel.primaryKey)} AND 
                                     NOT ST_Equals(old.${geomColumnName}, new.${geomColumnName}) 
                                 AND operation = 'update' and txid = ${txid}`);
  }));

const geoVersionColumn = ({geomColumnName}) => ({
  type: 'geoVersion',
  geomColumnName: geomColumnName || 'geom'
});

name.method('geoVersion', () => 'geo_version');
fromSource.method('geoVersion', () => false);
preApplyChanges.method('geoVersion', ({geomColumnName}, client, txid, tableModel) =>
  go(function*() {
    yield client.query(`UPDATE ${tableModel.table}_changes SET geo_version = 1 WHERE operation = 'insert'and txid = ${txid}`);
    yield  client.query(`UPDATE ${tableModel.table}_changes new SET geo_version = old.geo_version
    FROM ${tableModel.table} old WHERE ${columnsEqualClause('old', 'new', tableModel.primaryKey)} 
                                 AND operation = 'update' and txid = ${txid}`);
    yield  client.query(`UPDATE ${tableModel.table}_changes new SET geo_version = old.geo_version + 1
    FROM ${tableModel.table} old WHERE ${columnsEqualClause('old', 'new', tableModel.primaryKey)} AND 
                                      NOT ST_Equals(old.${geomColumnName}, new.${geomColumnName})
                                 AND operation = 'update' and txid = ${txid}`);
  }));

const bboxColumn = ({geomColumnName}) => ({
  type: 'bbox',
  geomColumnName: geomColumnName || 'geom'
});
name.method('bbox', () => 'bbox');
derive.method('bbox', (bboxColumn) => table =>
  `CASE WHEN st_geometrytype(st_envelope(${table}.${bboxColumn.geomColumnName})) = 'ST_Polygon' THEN st_envelope(${table}.${bboxColumn.geomColumnName}) ELSE null END`);
fromSource.method('bbox', () => false);

const offloadedGeomColumn = ({name}) => ({
  type: 'offloadedGeom',
  name: name || 'geom'
});

distinctClause.method('offloadedGeom', (column, a, b) => geomDistinctClause(a, b));
postApplyChanges.method('offloadedGeom', ({name}, client, txid, tableModel) =>
  client.query(`UPDATE ${tableModel.table}_changes  
                  SET geom = NULL 
                  WHERE txid = $1 AND geom_blobref IS NOT NULL`, [txid]));


const offloadedGeomBlobrefColumn = ({geomColumnName}) => ({
  type: 'offloadedGeomBlobref',
  geomColumnName: geomColumnName || 'geom'
});

preApplyChanges.method('offloadedGeomBlobref',
  ({geomColumnName}, client, txid, tableModel) =>  {
    const blobrefColumnName = `${geomColumnName}_blobref`;
    return offloadGeometryColumnToS3(client, txid, tableModel, geomColumnName, blobrefColumnName);
  }
);

fromSource.method('offloadedGeomBlobref', () => false);
name.method('offloadedGeomBlobref', ({geomColumnName}) => `${geomColumnName}_blobref`);

const visueltCenterFromSource =() => ({
  type: 'visueltCenterFromSource'
});

name.method('visueltCenterFromSource', () => 'visueltcenter');
distinctClause.method('visueltCenterFromSource', (column, a, b) => geomDistinctClause(a, b));

const visueltCenterComputed = ({geomColumnName}) => ({
  type: 'visueltCenterComputed',
  geomColumnName
});

name.method('visueltCenterComputed', () => 'visueltCenter');
fromSource.method('visueltCenterComputed', () => false);
compare.method('visueltCenterComputed', () => false);
preApplyChanges.method('visueltCenterComputed',
  (column, client, txid, tableModel) => computeVisualCenters(client, txid, tableModel));



const visueltCenterDerived = ({geomColumnName}) => ({
  type: 'visueltCenterDerived',
  geomColumnName: geomColumnName || 'geom'
});

name.method('visueltCenterDerived', () => 'visueltcenter');
compare.method('visueltCenterDerived', () => false);
derive.method('visueltCenterDerived', ({geomColumnName}) => table => `ST_ClosestPoint(${table}.${geomColumnName}, ST_Centroid(${table}.${geomColumnName}))`)


const tsvColumn = ({deriveFn}) => ({
  type: 'tsv',
  deriveFn
});

name.method('tsv', () => 'tsv');
derive.method('tsv', ({deriveFn}) => deriveFn);
isPublic.method('tsv', () => false);

const preservedColumn = ({name}) => ({
  type: 'preserved',
  name
});

fromSource.method('preserved', () => false);
isPublic.method('preserved', () => true);
preApplyChanges.method('preserved', ({name}, client, txid, tableModel) =>
  client.query(`UPDATE ${tableModel.table}_changes new SET ${name} = old.${name}
    FROM ${tableModel.table} old WHERE ${columnsEqualClause('old', 'new', tableModel.primaryKey)}
                                 AND operation IN ('update', 'delete')`));

const geomColumns = ({
                       geomColumnName,
                       offloaded
                     }) => {
  geomColumnName = geomColumnName || 'geom';
  offloaded = offloaded || false;
  const columns = [
    ændretColumn(),
    geoÆndretColumn({geomColumnName}),
    geoVersionColumn({geomColumnName}),
    bboxColumn({geomColumnName})
  ];
  if(offloaded) {
    columns.push(offloadedGeomColumn({name: geomColumnName}));
    columns.push(offloadedGeomBlobrefColumn({geomColumnName}));
  }
  else {
    columns.push(geomColumn({name: geomColumnName}));
  }
  return columns;
};

module.exports = {
  geomColumn,
  ændretColumn,
  geoÆndretColumn,
  geoVersionColumn,
  bboxColumn,
  visueltCenterFromSource,
  visueltCenterComputed,
  visueltCenterDerived,
  tsvColumn,
  geomColumns,
  preservedColumn,
  offloadedGeomColumn,
  offloadedGeomBlobrefColumn
}