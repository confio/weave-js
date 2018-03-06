import fs from 'fs';
import {execFile, spawn} from 'child_process';
import path from "path";
import util from 'util';

import {KeyBase, Client} from '../src';

const run = util.promisify(execFile);

const protoPath = path.resolve(__dirname, "fixtures", "mycoind.proto");
const homeDir = "/tmp/test-weave-js"; 
const genesisPath = path.resolve(homeDir, "config", "genesis.json");

const sleep = ms => new Promise(res => setTimeout(res, ms));

describe('Test client against mycoind', () => {
    let user, tm, abci; // to be set in beforeAll

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
    })

    // shutdown server
    afterAll(async () => {
        tm.kill();
        abci.kill();
    })
    
    it('Check status works', async () => {
        let client = new Client();
        // TODO: handle errors better
        try {
            let status = await client.status({})
            let height = status.result.latest_block_height
            expect(height).toBeGreaterThan(1);    
        } catch (err) {
            // report what we got and fail
            expect(err).toBeNull();
        }
        client.close();
    });
})

// if we want to debug failing tests... uncomment these to dump it all out
function viewProc(name, child) {
    child.on('error', err => console.log(name, "error:", err))
    if (child.stdout)
        child.stdout.pipe(process.stderr);    
    if (child.stderr)
        child.stderr.pipe(process.stderr);    
}