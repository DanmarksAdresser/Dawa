const column = ({attrName, column}) => {
  return {
    type: 'column',
    attrName,
    column: column || attrName
  };
};

const timestamp = ({attrName, column}) => {
  column = column || attrName;
  return {
    type: 'timestamp',
    attrName,
    column
  };
};

const localTimestamp = ({attrName, column}) => {
  column = column || attrName;
  return {
    type: 'localTimestamp',
    attrName,
    column
  };
};

const geometry = ({attrName, column}) => {
  column = column || attrName;
  return {
    type: 'geometry',
    attrName,
    column
  };
};

const offloadedGeometry = ({attrName, column}) => {
  column = column || attrName;
  return {
    type: 'offloadedGeometry',
    attrName,
    column
  };
};

/**
 * integer in db, 4-digit string code externally
 */
const kode4 = ({attrName, column}) => {
  column = column || attrName;
  return {
    type: 'kode4',
    attrName,
    column
  };
};

const husnr = ({attrName, column}) => {
  column = column || attrName;
  return {
    type: 'husnr',
    attrName,
    column
  };
};

const stringToNumber = ({attrName, column}) => {
  column = column || attrName;
  return {
    type: 'stringToNumber',
    attrName,
    column
  };
};

const numberToString = ({attrName, column}) => {
  column = column || attrName;
  return {
    type: 'numberToString',
    attrName,
    column
  };
};

const darStatus = ({attrName, column}) => {
  column = column || attrName;
  return {
    type: 'darStatus',
    attrName,
    column
  };
};

const timestampInterval = ({attrName, column}) => {
  column = column || attrName;
  return {
    type: 'timestampInterval',
    attrName,
    column
  };
};

const legacy = ({attrName, column, formatter, selectTransform}) => {
  column = column || attrName;
  return {
    type: 'legacy',
    attrName,
    column,
    formatter: formatter || (val => val),
    selectTransform: selectTransform || (col => col)
  };
};

module.exports = {
  column,
  timestamp,
  localTimestamp,
  geometry,
  offloadedGeometry,
  kode4,
  husnr,
  stringToNumber,
  numberToString,
  darStatus,
  timestampInterval,
  legacy
};