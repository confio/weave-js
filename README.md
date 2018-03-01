# Weave Javascript Client

Demo on using js to connect to mycoind:

```
PREFIX='636173683a' # "cash:"
ADDR=`cat ~/.mycoind/config/genesis.json | jq .app_state.cash[0].address`
# concat together for query...
# eg. 636173683a89b6684f231a0cad02afc17db3abfa03dbde9bfe

node

let Tendermint = require('tendermint')
const NODE_URI = 'ws://localhost:46657'
let client = Tendermint(NODE_URI)

let show = (err, res) => { console.log(res)}
client.status(show)
let q = {path: '/key', data: '636173683a89b6684f231a0cad02afc17db3abfa03dbde9bfe'}
client.abciQuery(q, show)
```
