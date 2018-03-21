const repl = require("repl");
const weave = require("../lib/weave.node.js");
const leveldown = require("leveldown");

function resolvePromise(eval) {
    return function replEvalPromise(cmd, ctx, filename, cb) {
        eval(cmd, ctx, filename, result => {
            if (result instanceof Promise) {
                return result
                    .then(response => cb(null, response))
            }
            return cb(null, result);
        });
    }
}

function loadKeys(file) {
    return weave.openDB(leveldown(file))
        .then(db => weave.KeyBase.setup(db));
}

// let r = repl.start({prompt: "> ", eval: replEvalPromise});
let r = repl.start("> ");
// r.eval = resolvePromise(r.eval);
// console.log(r.eval);

r.context.help = "Use KeyBase.setup() or loadKeys(file) and new Client(uri)";
r.context.KeyBase = weave.KeyBase;
r.context.Client = weave.Client;
r.context.models = weave.weave;
r.context.pbToObj = weave.pbToObj;
r.context.loadKeys = loadKeys;

