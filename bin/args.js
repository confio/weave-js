module.exports = {
    getArgs: function (func) {
      // First match everything inside the function argument parens.
      let code = func.toString();
      let args;

      if (code.startsWith('function')) {  // normal function
        args = code.match(/function\s.*?\(([^)]*)\)/)[1];
      } else {  // arrow function
        args = code.match(/\(?([^)=]*)\)?\s*=\>/)[1];
      }

      // Split the arguments string into an array comma delimited.
      return args.split(',').map(function(arg) {
        // Ensure no inline comments are parsed and trim the whitespace.
        return arg.replace(/\/\*.*\*\//, '').trim();
      }).filter(function(arg) {
        // Ensure no undefined values are added.
        return arg.trim();
      });
    },

    deepGet: function (obj, name, defaultValue) {
        let path = name.split(".");
        try {
            return path.reduce((o, p) => o[p], obj)
        } catch (err) {
            return defaultValue;
        }
    }
}
