const _ = require('underscore');
const { assert } = require("chai");

const allProcessors = [
  require('./building-associations'),
  ...require('./dagi-associations'),
  ...require('./dar-history'),
  ...require('./dar-current'),
  ...require('./dawa-materialized-incremental'),
  ...require('./dawa-materialized-non-incremental'),
  require('./land-parcel-associations'),
  ...require('./legacy-dawa-materialized'),
  require('./legacy-supplerende-bynavne'),
  require('./place-associations'),
  require('./hoejder'),
  require('./hoejde_importer_afventer'),
  ...require('./grbbr'),
];

const validateProcessors = (processors) => {
  for(let processor of processors) {
    assert.isString(processor.id);
    assert.isString(processor.description);
    assert(processor.execute || processor.executeIncrementally);
    assert.isArray(processor.produces);
    assert.isArray(processor.requires);
  }
};

validateProcessors(allProcessors);

const allProcessorIds = new Set(_.pluck(allProcessors, 'id'));
module.exports = {
  allProcessors,
  allProcessorIds
}