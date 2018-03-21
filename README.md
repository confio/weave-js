# Weave Javascript Client

## Installation

Setting it up:

```shell
npm install -g yarn
yarn install
```

If you want to build the libraries, stored under `./lib`:

```shell
yarn build
```

## Demo

First you need to check out [weave](https://github.com/confio/weave) and
build the `mycoind` example (`make deps && make install`).

### Setting up the js cli

In one terminal window (change /tmp/demo.db for wherever you want to store keys):

`yarn cli /tmp/demo.db`:

```js
keys.add("demo");
keys.add("rcpt");
keys.list();
await keys.save();
```

Quit and restart the process, and make sure keys are still there...

`yarn cli /tmp/demo.db`:

```js
keys.list()
```

Store the provided address as `ADDRESS`.

### Setting up the blockchain

Once you have compiled everything, start a blockchain. More explaination
on the [weave README](https://github.com/confio/weave/blob/master/README.md).
But you can just run these in another shell (making sure $ADDRESS is set
properly).

```bash
rm -rf ~/.mycoind
tendermint init --home ~/.mycoind
mycoind init CASH $ADDRESS
# verify it set up proper
grep address ~/.mycoind/config/genesis.json

tendermint node --home ~/.mycoind > /tmp/tendermint.log &
mycoind start
```

### Running queries on the blockchain

`yarn cli /tmp/demo.db`:

```js
// this connects to ws://localhost:46657 unless you provide a url
let client = new Client()
let demo = keys.get("demo");

let acct = await queryAccount(client, demo.address());
pprint(acct);
```

### Sending Cash

Now it's time to make a transaction on the blockchain. Here goes nothing!

`yarn cli /tmp/demo.db`:

```js
let client = new Client()
let demo = keys.get("demo");
let rcpt = keys.get("rcpt");
let chainID = await client.chainID();

// send some money
let tx = buildSendTx(models.app.Tx, demo, rcpt.address(), 5000, 'CASH', chainID);
let resp = await client.sendTx(tx);
pprint(resp);

let acctRcpt = await queryAccount(client, rcpt.address());
pprint(acctRcpt);
let acctSend = await queryAccount(client, demo.address());
pprint(acctSend);

// sequence auto-increments, to send a second time
tx = buildSendTx(models.app.Tx, demo, rcpt.address(), 1500, 'CASH', chainID);
await client.sendTx(tx);
acctRcpt = await queryAccount(client, rcpt.address());
pprint(acctRcpt);

// this save rcpt and updates demo's sequence for next send
await keys.save();  
// to quit cleanly, you need to shut down the websocket first
await client.close();
^d
```