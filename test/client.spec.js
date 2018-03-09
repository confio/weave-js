import fs from 'fs';
import {execFile, spawn} from 'child_process';
import path from "path";
import util from 'util';
import {WritableStreamBuffer} from 'stream-buffers';

import {KeyBase, Client, pbToObj, loadModels} from '../src';

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
        let keybase = await KeyBase.setup(protoPath, "mycoin");
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
    })

    // shutdown server
    afterAll(async () => {
        client.close();
        await sleep(100);
        tm.kill();
        abci.kill();
        // console.log(abciLog.getContentsAsString('utf8'));
    })

    it('Check status works', async () => {
        // TODO: handle errors better
        let status = {};
        try {
            status = await client.status()
        } catch (err) {
            // report what we got and fail
            console.log(err);
            expect(err).toBeNull();
        }
        let height = status.latest_block_height
        expect(height).toBeGreaterThan(1);
    });

    it('Check query state', async () => {
        let models = await loadModels(protoPath, "mycoin", ["Set"]);

        let empty, match;
        const prefix = new Buffer("cash:").toString('hex');
        try {
            empty = await client.query(user.address());
            match = await client.query(prefix + user.address());
        } catch (err) {
            // report what we got and fail
            console.log(err);
            expect(err).toBeNull();
        }

        expect(empty.response).toBeDefined();
        // why is json height a string???
        expect(parseInt(empty.response.height, 10)).toBeGreaterThan(1);
        expect(empty.response.value).toBeUndefined();

        expect(match.response).toBeDefined();
        expect(parseInt(match.response.height, 10)).toBeGreaterThan(1);
        expect(match.response.value).toBeDefined();

        let value = new Buffer(match.response.value, 'base64');
        let parsed = pbToObj(models.Set, value);
        expect(parsed.coins.length).toEqual(1);
        let coin = parsed.coins[0];
        expect(coin.whole).toEqual(123456789);
        expect(coin.ticker).toEqual('MYC');
    })

    it('Send a tx', async () => {
        const models = await loadModels(protoPath, "mycoin",
            ["Set", "SendMsg", "Coin", "StdSignature", "Tx"]);
        const amount = 50000;
        let sender, rcpt, txresp;

        // post it to server
        let tx = buildTx(models, user, user2, amount, 'MYC', chainID, 0);
        try {
            txresp = await client.sendTx(tx)
        } catch (err) {
            // report what we got and fail
            console.log(err);
            expect(err).toBeNull();
        }

        // wait for one block
        await sleep(1500);

        // query states
        const prefix = new Buffer("cash:").toString('hex');
        try {
            sender = await client.query(prefix + user.address());
            rcpt = await client.query(prefix + user2.address());
        } catch (err) {
            // report what we got and fail
            expect(err).toBeNull();
        }
        expect(sender.response).toBeDefined();
        expect(sender.response.value).toBeDefined();
        expect(rcpt.response).toBeDefined();
        expect(rcpt.response.value).toBeDefined();

        let sValue = new Buffer(sender.response.value, 'base64');
        let sParsed = pbToObj(models.Set, sValue);
        expect(sParsed.coins.length).toEqual(1);
        let sCoin = sParsed.coins[0];
        expect(sCoin.whole).toEqual(123456789-amount);

        let rValue = new Buffer(rcpt.response.value, 'base64');
        let rParsed = pbToObj(models.Set, rValue);
        expect(sParsed.coins.length).toEqual(1);
        let rCoin = rParsed.coins[0];
        expect(rCoin.whole).toEqual(amount);
    })
})

// buildTx needs to be abstracted and added to the library
function buildTx(models, sender, rcpt, amount, currency, chainID, seq) {
        // build a transaction
        let msg = models.SendMsg.create({
            src: sender.addressBytes(),
            dest: rcpt.addressBytes(),
            amount: models.Coin.create({whole: amount, ticker: currency}),
            memo: 'Test Tx'
        });
        let tx = models.Tx.create({
            sendMsg: msg
        })
        let bz = models.Tx.encode(tx).finish();

        // sign it (with chain-id)
        let sig = sender.sign(bz, chainID, seq);
        let std = models.StdSignature.create({
            pubKey: sender.pubkey,
            signature: sig
        });
        tx.signatures = [std];

        let txbz = models.Tx.encode(tx).finish();
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
