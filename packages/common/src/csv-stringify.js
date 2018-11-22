"use strict";

const get = require('lodash.get');

/**
 * Adapted from https://github.com/wdavidw/node-csv-stringify.
 * Original author: David Worms
 *
 * This is a CSV transducer. It transforms JavaScript objects to CSV lines.
 * Check out https://github.com/cognitect-labs/transducers-js .
 */

/*
 Software License Agreement (BSD License)
 ========================================

 Copyright (c) 2011, SARL Adaltas.

 All rights reserved.

 Redistribution and use of this software in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

 -   Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

 -   Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

 -   Neither the name of SARL Adaltas nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission of the SARL Adaltas.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

class Stringifier {
  constructor(xf, opts) {
    this.xf = xf;
    var base, base1, base10, base11, base12, base13, base2, base3, base4, base5, base6, base7, base8, base9, k, options, v;
    if (opts == null) {
      opts = {};
    }
    options = {};
    for (k in opts) {
      v = opts[k];
      options[k] = v;
    }
    this.options = options;
    if ((base = this.options).delimiter == null) {
      base.delimiter = ',';
    }
    if ((base1 = this.options).quote == null) {
      base1.quote = '"';
    }
    if ((base2 = this.options).quoted == null) {
      base2.quoted = false;
    }
    if ((base3 = this.options).quotedEmpty == null) {
      base3.quotedEmpty = void 0;
    }
    if ((base4 = this.options).quotedString == null) {
      base4.quotedString = false;
    }
    if ((base5 = this.options).eof == null) {
      base5.eof = true;
    }
    if ((base6 = this.options).escape == null) {
      base6.escape = '"';
    }
    if ((base7 = this.options).columns == null) {
      base7.columns = null;
    }
    if ((base8 = this.options).header == null) {
      base8.header = false;
    }
    if ((base9 = this.options).formatters == null) {
      base9.formatters = {};
    }
    if ((base10 = this.options.formatters).date == null) {
      base10.date = function(value) {
        return '' + value.getTime();
      };
    }
    if ((base11 = this.options.formatters).bool == null) {
      base11.bool = function(value) {
        if (value) {
          return '1';
        } else {
          return '';
        }
      };
    }
    if ((base12 = this.options.formatters).object == null) {
      base12.object = function(value) {
        return JSON.stringify(value);
      };
    }
    if ((base13 = this.options).rowDelimiter == null) {
      base13.rowDelimiter = '\n';
    }
    this.countWriten = 0;
    switch (this.options.rowDelimiter) {
      case 'auto':
        this.options.rowDelimiter = null;
        break;
      case 'unix':
        this.options.rowDelimiter = "\n";
        break;
      case 'mac':
        this.options.rowDelimiter = "\r";
        break;
      case 'windows':
        this.options.rowDelimiter = "\r\n";
        break;
      case 'unicode':
        this.options.rowDelimiter = "\u2028";
    }
  }

  headers(result) {
    var k, label, labels;
    if (!this.options.header) {
      return;
    }
    if (!this.options.columns) {
      return;
    }
    labels = this.options.columns;
    if (typeof labels === 'object') {
      labels = (function() {
        var results;
        results = [];
        for (k in labels) {
          label = labels[k];
          results.push(label);
        }
        return results;
      })();
    }
    if (this.options.eof) {
      labels = this.stringify(labels) + this.options.rowDelimiter;
    } else {
      labels = this.stringify(labels);
    }
    return this.xf["@@transducer/step"](result, labels);
  }

  "@@transducer/result"(result) {
    if (this.countWriten === 0) {
      result = this.headers(result);
    }
    return this.xf["@@transducer/result"](result);
  }

  "@@transducer/step"(result, chunk) {
    var base, preserve;
    if (chunk == null) {
      return;
    }
    preserve = typeof chunk !== 'object';
    if (!preserve) {
      if (this.countWriten === 0 && !Array.isArray(chunk)) {
        if ((base = this.options).columns == null) {
          base.columns = Object.keys(chunk);
        }
      }
      if (this.options.eof) {
        chunk = this.stringify(chunk) + this.options.rowDelimiter;
      } else {
        chunk = this.stringify(chunk);
        if (this.options.header || this.countWriten) {
          chunk = this.options.rowDelimiter + chunk;
        }
      }
    }
    if (typeof chunk === 'number') {
      chunk = "" + chunk;
    }
    if (this.countWriten === 0) {
      result = this.headers(result);
    }
    if (!preserve) {
      this.countWriten++;
    }
    return this.xf["@@transducer/step"](result, chunk);
  }

  stringify(line) {
    var _line, column, columns, containsEscape, containsLinebreak, containsQuote, containsdelimiter, delimiter, escape, field, i, j, l, newLine, quote, ref, ref1, regexp, shouldQuote, value;
    if (typeof line !== 'object') {
      return line;
    }
    columns = this.options.columns;
    if (typeof columns === 'object' && columns !== null && !Array.isArray(columns)) {
      columns = Object.keys(columns);
    }
    delimiter = this.options.delimiter;
    quote = this.options.quote;
    escape = this.options.escape;
    if (!Array.isArray(line)) {
      _line = [];
      if (columns) {
        for (i = j = 0, ref = columns.length; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
          column = columns[i];
          value = get(line, column);
          _line[i] = typeof value === 'undefined' || value === null ? '' : value;
        }
      } else {
        for (column in line) {
          _line.push(line[column]);
        }
      }
      line = _line;
      _line = null;
    } else if (columns) {
      line.splice(columns.length);
    }
    if (Array.isArray(line)) {
      newLine = '';
      for (i = l = 0, ref1 = line.length; 0 <= ref1 ? l < ref1 : l > ref1; i = 0 <= ref1 ? ++l : --l) {
        field = line[i];
        /* eslint no-empty: 0 */
        if (typeof field === 'string') {

        } else if (typeof field === 'number') {
          field = '' + field;
        } else if (typeof field === 'boolean') {
          field = this.options.formatters.bool(field);
        } else if (field instanceof Date) {
          field = this.options.formatters.date(field);
        } else if (typeof field === 'object' && field !== null) {
          field = this.options.formatters.object(field);
        }
        if (field) {
          containsdelimiter = field.indexOf(delimiter) >= 0;
          containsQuote = field.indexOf(quote) >= 0;
          containsEscape = field.indexOf(escape) >= 0 && (escape !== quote);
          containsLinebreak = field.indexOf('\r') >= 0 || field.indexOf('\n') >= 0;
          shouldQuote = containsQuote || containsdelimiter || containsLinebreak || this.options.quoted || (this.options.quotedString && typeof line[i] === 'string');
          if (shouldQuote && containsEscape) {
            regexp = escape === '\\' ? new RegExp(escape + escape, 'g') : new RegExp(escape, 'g');
            field = field.replace(regexp, escape + escape);
          }
          if (containsQuote) {
            regexp = new RegExp(quote, 'g');
            field = field.replace(regexp, escape + quote);
          }
          if (shouldQuote) {
            field = quote + field + quote;
          }
          newLine += field;
        } else if (this.options.quotedEmpty || ((this.options.quotedEmpty == null) && line[i] === '' && this.options.quotedString)) {
          newLine += quote + quote;
        }
        if (i !== line.length - 1) {
          newLine += delimiter;
        }
      }
      line = newLine;
    }
    return line;
  }
}

const  csvStringify = options => xf => {
  return new Stringifier(xf, options);
}

module.exports = {
  csvStringify
};
