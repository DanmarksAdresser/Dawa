"use strict";

module.exports = function (a, b, insertCost, updateCost, deleteCost) {

  var matrix = [];

  // increment along the first column of each row
  var i;
  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i*deleteCost];
  }

  // increment each column in the first row
  var j;
  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j*insertCost;
  }

  // Fill in the rest of the matrix
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + updateCost, // substitution
          Math.min(matrix[i][j - 1] + insertCost, // insertion
            matrix[i - 1][j] + deleteCost)); // deletion
      }
    }
  }

  i = b.length;
  j = a.length;

  var ops = [];

  while(i > 0 || j > 0) {
    if(i > 0 && j > 0 && b[i-1] === a[j-1]) {
      ops.push({op: 'K',letter: a[j-1]});
      i--;
      j--;
    }
    else if(i > 0 && j > 0 && matrix[i][j] - matrix[i-1][j-1] === updateCost) {
      ops.push({op: 'U', letter: a[j-1]});
      i--;
      j--;
    }
    else if (j > 0 && matrix[i][j] - matrix[i][j-1] === insertCost) {
      ops.push({op: 'I', letter: a[j-1]});
      j--;
    }
    else {
      ops.push({op: 'D', letter: b[i-1]});
      i--;
    }
  }
  return {
    distance: matrix[b.length][a.length],
    ops: ops.reverse()
  };
};
