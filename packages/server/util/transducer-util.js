class Separate {
  constructor(xf, {open, separator, close}) {
    this.open = open;
    this.separator = separator;
    this.close = close;
    this.xf = xf;
    this.initialSeen = false;
  }

  "@@transducer/init"() {
    return this.xf["@@transducer/init"]();
  }

  "@@transducer/step"(result, input) {
    if (this.initialSeen) {
      result = this.xf["@@transducer/step"](result, this.separator);
    }
    else {
      result = this.xf["@@transducer/step"](result, this.open);
    }
    this.initialSeen = true;
    return this.xf["@@transducer/step"](result, input);
  }

  "@@transducer/result"(result) {
    if(!this.initialSeen) {
      result = this.xf["@@transducer/step"](result, this.open);
    }
    result = this.xf["@@transducer/step"](result, this.close);
    return this.xf["@@transducer/result"](result);
  }
}

exports.separate = separators => xf => new Separate(xf, separators);
