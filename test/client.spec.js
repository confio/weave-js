import fs from 'fs';
import {execFile, spawn} from 'child_process';
import path from "path";
import util from 'util';

import {KeyBase, Client, pbToObj, loadModels} from '../src';

const run = util.promisify(execFile);

const protoPath = path.resolve(__dirname, "fixtures", "mycoind.proto");
const homeDir = "/tmp/test-weave-js"; 
const genesisPath = path.resolve(homeDir, "config", "genesis.json");

const sleep = ms => new Promise(res => setTimeout(res, ms));

describe('Test client against mycoind', () => {
    let user, tm, abci; // to be set in beforeAll
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
        let addr = user.address();
        
        // set new address in genesis
        let data = JSON.parse(fs.readFileSync(genesisPath));
        data.app_state.cash[0].address = addr; 
        fs.writeFileSync(genesisPath, JSON.stringify(data, null, 4));

        tm = spawn('tendermint', ['--home', homeDir,  'node', '--p2p.skip_upnp']);
        // viewProc("tendermint", tm);
        abci = spawn('mycoind', ['--home', homeDir,  'start']);
        // viewProc("mycoind", abci);

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
        expect(coin.integer).toEqual(123456789);
        expect(coin.currencyCode).toEqual('MYC');        
    })
})

// if we want to debug failing tests... uncomment these to dump it all out
function viewProc(name, child) {
    child.on('error', err => console.log(name, "error:", err))
    if (child.stdout)
        child.stdout.pipe(process.stderr);    
    if (child.stderr)
        child.stderr.pipe(process.stderr);    
}