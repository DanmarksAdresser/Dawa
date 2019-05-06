const defmulti = require('@dawadk/common/src/defmulti');

const toColumn = defmulti(binding => binding.type);

toColumn.defaultMethod(({column}) => {
  if(column) {
    return {column};
  }
  else {
    throw new Error('Can only convert bindings of type column');
  }
});

module.exports = toColumn;