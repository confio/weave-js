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

const getAddr = (key) => ({address: key.slice(5).toString('hex')});
let acct = await client.queryParseOne(demo.address(), "/wallets", models.cash.Set, getAddr);
pprint(acct);

// to quit cleanly, you need to shut down the websocket first
await client.close();
^d
```

**TODO: add sending cash**
