import fs from 'fs';
import {execFile, spawn} from 'child_process';
import path from "path";
import util from 'util';
import {WritableStreamBuffer} from 'stream-buffers';

import {KeyBase, Client, pbToObj, weave} from '../src';

const run = util.promisify(execFile);

const protoPath = path.resolve(__dirname, "fixtures", "mycoind.proto");
const homeDir = "/tmp/test-weave-js";
const genesisPath = path.resolve(homeDir, "config", "genesis.json");

const sleep = ms => new Promise(res => setTimeout(res, ms));

describe('Test client against mycoind', () => {
    let tm, abci; // to be set in beforeAll
    let abciLog, tmLog;
    let chainID;
    let user, user2;
    let client;

    // set up server
    beforeAll(async () => {
        await run('rm', ['-rf', homeDir])
            .then(() => run('tendermint', ['--home', homeDir, 'init']))
            .then(() => run('mycoind', ['--home', homeDir, 'init']))
            .catch(err => {console.log(err.stderr); expect(err).toBeUndefined()});

        // create a new key to use
        let keybase = await KeyBase.setup();
        user = keybase.add('demo');
        user2 = keybase.add('new_guy');
        let addr = user.address();

        // set new address in genesis
        let data = JSON.parse(fs.readFileSync(genesisPath));
        data.app_state.cash[0].address = addr;
        chainID = data.chain_id;
        fs.writeFileSync(genesisPath, JSON.stringify(data, null, 4));

        tm = spawn('tendermint', ['--home', homeDir,  'node', '--p2p.skip_upnp']);
        tmLog = viewProc("tendermint", tm);
        abci = spawn('mycoind', ['--home', homeDir,  'start']);
        abciLog = viewProc("mycoind", abci);

        // Give them time to make a few blocks....
        await sleep(3500);
        client = new Client();
    }, 10000) // 10 second timeout

    // shutdown server
    afterAll(async () => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = original_timeout;
        client.close();
        await sleep(100);
        tm.kill();
        abci.kill();
        // console.log(abciLog.getContentsAsString('utf8'));
        console.log(tmLog.getContentsAsString('utf8'));
    })

    it('Check status works', async () => {
        // make sure status returns something...
        let status = await client.status();
        expect(status).toBeDefined();
        expect(status.node_info).toBeDefined();
    })

    it('Check waiting works', async () => {
        // ensure we make it to block 4
        let h = await client.waitForBlock(4);
        expect(h).toBe(4);
        h = await client.height()
        expect(h).toBe(4);

        // now see that waiting immediately ends if old
        h = await client.waitForBlock(1);
        expect(h).toBe(4);
    }, 6000);

    it('Check chainID works', async () => {
        let chainID = await client.chainID()
        expect(chainID).toBeDefined();
        expect(chainID.slice(0, 10)).toEqual('test-chain');
    });

    it('Check query state', async () => {
        let Set = weave.cash.Set;

        let addr = user.address();
        // let a = client.query(addr, "/foo");
        // console.log(a);
        await client.query(addr, "/foo").catch(err => expect(err).toBeTruthy());
        await client.query(addr).catch(err => expect(err).toBeUndefined());

        let {h, results: empty} = await client.query(addr);
        // verify there is a meaninful height also returned
        expect(h).toBeGreaterThan(3);
        expect(empty.length).toBe(0);

        // straight-forward binary query
        let {results: match} = await client.query(addr, "/wallets");
        expect(match.length).toBe(1);
        const prefix = new Buffer("cash:").toString('hex');
        expect(match[0].key.toString('hex')).toEqual(prefix+addr);

        // const parse = (val) => Set.toObject(models.Set.decode(val), {longs: Number})
        // let obj = parse(match[0].value);
        // console.log(obj);


        const getAddr = (key) => ({address: key.slice(5).toString('hex')});
        expect(getAddr(match[0].key).address).toEqual(addr);

        let {parsed} = await client.queryParseOne(addr, "/wallets", Set, getAddr);
        expect(parsed).not.toBeNull();
        expect(parsed.address).toEqual(addr);
        expect(parsed.coins.length).toEqual(1);
        let coin = parsed.coins[0];
        expect(coin.whole).toEqual(123456789);
        expect(coin.ticker).toEqual('MYC');
    })

    it('Send a tx', async () => {
        const amount = 50000;
        let Set = weave.cash.Set;
        let txresp;

        // post it to server
        let tx = buildSendTx(user, user2, amount, 'MYC', chainID);
        try {
            txresp = await client.sendTx(tx)
        } catch (err) {
            // report what we got and fail
            console.log(err);
            expect(err).toBeNull();
        }

        // wait for one block
        // console.log(JSON.stringify(txresp, null, 2))
        await client.waitForBlock(txresp.height+1)

        // query states
        const getAddr = (key) => ({address: key.slice(5).toString('hex')});
        let {parsed: sender} = await client.queryParseOne(user.address(), "/wallets", Set, getAddr);
        let {parsed: rcpt} = await client.queryParseOne(user2.address(), "/wallets", Set, getAddr);
        expect(sender).toBeTruthy();
        expect(rcpt).toBeTruthy();

        expect(sender.address).toEqual(user.address());
        expect(sender.coins.length).toEqual(1);
        expect(sender.coins[0].whole).toEqual(123456789-amount);

        expect(rcpt.address).toEqual(user2.address());
        expect(rcpt.coins.length).toEqual(1);
        expect(rcpt.coins[0].whole).toEqual(amount);

        // query for the tx
        const txRes = await client.search("cash", user.address())
            .catch(err => console.log(JSON.stringify(err)))
        console.log(txRes)

        // const txRes2 = await client.search("cash", user2.address())
        //         .catch(err => console.log(JSON.stringify(err)))
        // console.log(txRes2)
    })
})

// buildSendTx needs to be abstracted and added to the library
function buildSendTx(sender, rcpt, amount, currency, chainID) {
        // build a transaction
        let msg = weave.cash.SendMsg.create({
            src: sender.addressBytes(),
            dest: rcpt.addressBytes(),
            amount: weave.x.Coin.create({whole: amount, ticker: currency}),
            memo: 'Test Tx'
        });
        let tx = weave.app.Tx.create({
            sendMsg: msg
        })
        let bz = weave.app.Tx.encode(tx).finish();

        // sign it (with chain-id)
        let {sig, seq} = sender.sign(bz, chainID);
        expect(seq).toBe(0);
        let std = weave.sigs.StdSignature.create({
            pubKey: sender.pubkey,
            signature: sig
        });
        tx.signatures = [std];

        let txbz = weave.app.Tx.encode(tx).finish();
        return txbz;
}

// this returns a buffer with all text, so we can print out in afterAll for debugging
function viewProc(name, child) {
    child.on('error', err => console.log(name, "error:", err));
    let sink = new WritableStreamBuffer();
    if (child.stdout)
        child.stdout.pipe(sink);
    if (child.stderr)
        child.stderr.pipe(sink);
    return sink;
}
