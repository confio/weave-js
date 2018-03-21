/* jshint esversion: 6 */

const repl = require("repl");
const weave = require("../lib/weave.node.js");
const leveldown = require("leveldown");

// note: this is only on master, not yet in 0.3 on npm
const stubber = require("async-repl/stubber");

function loadKeys(file) {
    return weave.openDB(leveldown(file))
        .then(db => weave.KeyBase.setup(db));
}

const getAddr = key => ({address: key.slice(5).toString('hex')});
const queryAccount = (client, acct) => client.queryParseOne(acct, "/wallets", weave.weave.cash.Set, getAddr);
const querySigs = (client, acct) => client.queryParseOne(acct, "/auth", weave.weave.sigs.UserData, getAddr);

let r = repl.start("> ");
// wraps the eval loop to provide async/await support
stubber(r);

r.context.help = () => {
    console.log(`Use KeyBase.setup() or loadKeys(file) and new Client(uri).
buildSendTx() and queryAcct() may also be quite helpful.

Go to https://github.com/confio/weave-js for more documentation.`);
    return Object.keys(r.context).slice(12);
}
r.context.KeyBase = weave.KeyBase;
r.context.Client = weave.Client;
r.context.models = weave.weave;
r.context.pbToObj = weave.pbToObj;
r.context.buildSendTx = weave.buildSendTx;
r.context.loadKeys = loadKeys;
r.context.pprint = o => console.log(JSON.stringify(o, null, 2));
r.context.queryAccount = queryAccount;
r.context.querySigs = querySigs;

// load the keys from a leveldb keystore
// TODO: better cli parsing
let args = process.argv.slice(2);
if (args.length > 0) {
    loadKeys(args[0])
        .then(keys => {r.context.keys = keys;})
        .then(() => process.stdout.write("Keys loaded\n> "));
}
