const repl = require("repl");
const weave = require("../lib/weave.node.js");
const leveldown = require("leveldown");

// note: this is only on master, not yet in 0.3 on npm
const stubber = require("async-repl/stubber");

function loadKeys(file) {
    return weave.openDB(leveldown(file))
        .then(db => weave.KeyBase.setup(db));
}

let r = repl.start("> ");
// wraps the eval loop to provide async/await support
stubber(r);

r.context.help = "Use KeyBase.setup() or loadKeys(file) and new Client(uri)";
r.context.KeyBase = weave.KeyBase;
r.context.Client = weave.Client;
r.context.models = weave.weave;
r.context.pbToObj = weave.pbToObj;
r.context.loadKeys = loadKeys;
r.context.pprint = o => console.log(JSON.stringify(o, null, 2));

// load the keys from a leveldb keystore
// TODO: better cli parsing
let args = process.argv.slice(2);
if (args.length > 0) {
    loadKeys(args[0])
        .then(keys => {r.context.keys = keys})
        .then(() => process.stdout.write("Keys loaded\n> "));
}
