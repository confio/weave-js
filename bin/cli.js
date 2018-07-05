/* jshint esversion: 6 */

const repl = require("repl");
const weave = require("../lib/weave.node.js");
const leveldown = require("leveldown");
const {defFn, defObj, deepGet, describe} = require('./args');

// note: this is only on master, not yet in 0.3 on npm
const stubber = require("async-repl/stubber");

function loadKeys(file) {
    return weave.openDB(leveldown(file))
        .then(db => weave.KeyBase.setup(db));
}

const getAddr = key => ({address: key.slice(5).toString('hex')});
const queryAccount = (client, acct) => client.queryParseOne(acct, "/wallets", weave.weave.cash.Set, getAddr);
const querySigs = (client, acct) => client.queryParseOne(acct, "/auth", weave.weave.sigs.UserData, getAddr);
const buildSendTx = (sender, rcpt, amount, currency, chainID) => weave.buildSendTx(weave.weave.app.Tx, sender, rcpt, amount, currency, chainID);
const buildFractionalSendTx = (sender, rcpt, whole, fractional, currency, chainID) => weave.buildFractionalSendTx(weave.weave.app.Tx, sender, rcpt, whole, fractional, currency, chainID);
const searchTx = (client, addr) => client.searchParse("cash", addr, weave.weave.app.Tx);
const searchMyTx = (client, addr) => client.searchParse("sigs", addr, weave.weave.app.Tx);

let r = repl.start({prompt: "> ", useColors: true, ignoreUndefined: true})
    // if we have a client object with default name, shutdown websocket on exit
    .on('exit', () => {
        let cl = r.context.client;
        if (cl && cl.close) {
            cl.close();
            console.log("disconnected...");
        }
    });
// wraps the eval loop to provide async/await support
stubber(r);

r.defineCommand('help', function(name) {
    if (!name) {
        console.log(`\nPass filename or use "let keys = loadKeys(file)"
Construct client with "let client = new Client(uri)"
Go to https://github.com/confio/weave-js for more documentation.
Or try ".help <function>"

Available resources:`);
        let res = Object.keys(this.context).slice(12).sort()
            .forEach(k => {
                let v = this.context[k];
                if (typeof v === 'function') {
                    defFn(v).print("  ");
                } else {
                    console.log("  " + k + ": " + (typeof v));
                }
            });
    } else {
        // parse out dot notation (so we can ".help keys.add")
        let fn = deepGet(this.context, name);
        if (fn) {
            describe(fn);
        } else {
            console.log("Unknown");
        }
    }
    console.log("");
    this.displayPrompt();
});

// here are useful context objects
r.context.KeyBase = weave.KeyBase;
r.context.Client = weave.Client;
r.context.models = weave.weave;
r.context.pbToObj = weave.pbToObj;
r.context.buildSendTx = buildSendTx;
r.context.buildFractionalSendTx = buildFractionalSendTx;
r.context.loadKeys = loadKeys;
r.context.pprint = o => console.log(JSON.stringify(o, null, 2));
r.context.queryAccount = queryAccount;
r.context.querySigs = querySigs;
r.context.searchTx = searchTx;
r.context.searchMyTx = searchMyTx;

// load the keys from a leveldb keystore
// TODO: better cli parsing
let args = process.argv.slice(2);
if (args.length > 0) {
    let file = args[0];
    loadKeys(file)
        .then(keys => {r.context.keys = keys;})
        .then(() => {
            console.log("Keys loaded from " + file);
            r.displayPrompt();
        });
}
