const defmulti = require('@dawadk/common/src/defmulti');

/**
 * The PostgreSQL column name
 */
const name = defmulti(column => column.type);
name.defaultMethod(({name}) => name);

/**
 * How to derive the column, if it is derived, or null.
 * A function from table name to select SQL.
 */
const derive = defmulti(column => column.type);
derive.defaultMethod( () => null);

/**
 * Whether the column value is part of the source view/table when computing differences.
 */
const fromSource = defmulti(column => column.type);
fromSource.defaultMethod((column) => derive(column) === null);

/**
 * Whether the column participates in comparison when diffing.
 */
const compare = defmulti(column => column.type);
compare.defaultMethod ((column) => derive(column) || fromSource(column));


/**
 * SQL to execute before changes are applied, e.g. for generated columns like geo_version.
 */
const preApplyChanges = defmulti(column => column.type);
preApplyChanges.defaultMethod (() => Promise.resolve());

/**
 * SQL to execute after changes are applied, e.g. to delete geometries uploaded to S3.
 */
const postApplyChanges = defmulti(column => column.type);
postApplyChanges.defaultMethod(() => Promise.resolve());

/**
 * Whether the column is part of public events. This is legacy functionality that should be removed.
 */
const isPublic = defmulti(column => column.type);
isPublic.defaultMethod (() => true);

/**
 * How to test whether to columns are distinct or not, if the standard PostgreSQL DISTINCT clause
 * is not sufficient (e.g., for geometries).
 */
const distinctClause = defmulti(column => column.type);
distinctClause.defaultMethod( (column, a,b) => `${a} IS DISTINCT FROM ${b}`);

module.exports = {
  name, derive, compare, fromSource, preApplyChanges, postApplyChanges, isPublic, distinctClause
};