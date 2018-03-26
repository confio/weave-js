// defFn will display the definition of a function
const defFn = function (fn) {
  // First match everything inside the function argument parens.
  let code = fn.toString();
  let args;

  if (code.match(/^(async)?\s*function/)) {  // normal function
    args = code.match(/function\s.*?\(([^)]*)\)/)[1];
  } else {  // arrow function
    args = code.match(/^(async)?\s*\(?([^)=]*)\)?\s*=\>/)[2];
  }

  // Split the arguments string into an array comma delimited.
  let split = args.split(',').map(function(arg) {
    // Ensure no inline comments are parsed and trim the whitespace.
    return arg.replace(/\/\*.*\*\//, '').trim();
  }).filter(arg => arg.trim());

  // we can add help comments with lines in the function like
  // doc: XXX
  let comments = code.split('\n')
      .filter(l => l.match(/\/\/ doc:/))
      .map(l => '  ' + l.split('doc:')[1].trim());

  return {
    name: fn.name || 'anon',
    args: split,
    comments: comments,
    print: function(prefix = "") {
        console.log(prefix + this.name + "(" + this.args.join(", ") + ")");
        this.comments.forEach(x => console.log(prefix + x));
    }
  }
}


// defObj will display the definition of an object
const defObj = function (obj) {
    // get all values in this object, and the prototype
    // (for close methods, not inherited ones)
    let vals = Object.getOwnPropertyNames(obj);
    let p = Object.getPrototypeOf(obj);
    vals = vals.concat(Object.getOwnPropertyNames(p));

    // return a function definition for each method
    let methods = vals
        .filter(x => typeof obj[x] === 'function')
        .map(x => defFn(obj[x]));

    // everything that is not a method
    let props = vals
        .filter(x => typeof obj[x] !== 'function')
        .map(name => ({name, type: (typeof obj[name])}));

    return {
        methods,
        props,
        print: function() {
            console.log("Properties:")
            this.props.forEach(({name, type}) => console.log("  " + name + ": " + type));
            console.log("Methods:")
            this.methods.forEach(x => x.print("  "));
        }
    }
}

const describe = function (x) {
    if (typeof x == 'function') {
        defFn(x).print();
    } else if (typeof x == 'object') {
        defObj(x).print();
    } else {
        console.log(x)
    }
}

const deepGet = function (obj, name, defaultValue) {
    let path = name.split(".");
    try {
        return path.reduce((o, p) => o[p], obj)
    } catch (err) {
        return defaultValue;
    }
}

module.exports = {
    defFn,
    defObj,
    deepGet,
    describe
}
