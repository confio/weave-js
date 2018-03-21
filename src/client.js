/* jshint esversion: 6 */

import protobuf from "protobufjs";

import { RpcClient } from './tendermint';
import {weave} from "./proto";

let ResultSet = weave.app.ResultSet;

function parseResultSet(data) {
    if (typeof data === 'string') {
        data = new Buffer(data, 'base64');
    }
    return ResultSet.decode(data).results;
}

// let DefaultURI = "http://localhost:46657";
let DefaultURI = "ws://localhost:46657";

const sleep = ms => new Promise(res => setTimeout(res, ms));

const defaultKeyMap = (key) => ({_key: key})

const perr = o => Error(JSON.stringify(o, null, 2))

export class Client {
    constructor(uri) {
        uri = uri || DefaultURI;
        this.client = RpcClient(uri);
        this.closed = false;
        // need to handle error somehow, only care if it is not us closing it...
        this.client.on('error', err => {
            if (!this.closed) console.log("connection:", err);
        });
        // load the ResultSet protobuf
    }

    close() {
        this.closed = true;
        return this.client.close();
    }

    status() {
        return this.client.status();
    }

    chainID() {
        return this.client.status()
            .then(status => status.node_info.network);
    }

    height() {
        return this.client.status()
            .then(status => status.latest_block_height);
    }

    async sendTx(tx) {
        if (typeof tx !== 'string') {
            tx = tx.toString('base64');
        }
        let resp = await this.client.broadcastTxCommit({tx});
        if (resp.check_tx.code) {
            throw perr(resp.check_tx);
        }
        if (resp.deliver_tx.code) {
            throw perr(resp.deliver_tx);
        }
        return {hash: resp.hash, height: resp.height};
    }

    // search constructs a /tx_search query with bucket=<hex key>
    // as set by KeyTagger in weave
    search(bucket, key) {
        if (typeof key !== 'string') {
            key = key.toString('hex');
        }
        key = key.toUpperCase();
        const query = bucket + "='" + key + "'";
        return this.client.txSearch({query});
    }

    // waitForBlock will return when block h is reached
    async waitForBlock(goal) {
        let height = await this.height();
        while (height < goal) {
            await sleep(1000);
            height = await this.height();
        }
        return height;
    }

    // queryRaw returns the direct response as a promise
    queryRaw(data, path) {
        path = path || "/";  // default path literal key
        if (typeof data !== 'string') {
            data = data.toString('hex');
        }
        return this.client.abciQuery({path, data});
    }

    // query returns an array of {key, value} models (raw bytes)
    //  or throws an error on invalid code
    async query(data, path) {
        let q = await this.queryRaw(data, path);
        q = q.response;
        if (q.code) {
            throw Error("Query (" + q.code + "): " + q.log)
        }

        // TODO: return
        let height = parseInt(q.height, 10)

        // no response, empty array, done
        if (!q.key) {
            return {height, results: []};
        }

        // now parse them both and join....
        let keys = parseResultSet(q.key);
        let values = parseResultSet(q.value);
        if (keys.length !== values.length) {
            throw Error("Got " + keys.length + " keys but " + values.length + " values");
        }

        let results = keys.map((key, i) => ({key, value: values[i]}));
        return {height, results};
    }

    // queryParse takes a protobuf `model` to decode the raw bytes,
    // and an optional keyMap function that creates an object with one element
    // from the key. If no keyMap given, then key is returned unmodified under _key
    async queryParse(data, path, model, keyMap) {
        keyMap = keyMap || defaultKeyMap;
        const parse = (val) => model.toObject(model.decode(val), {longs: Number})

        let {height, results} = await this.query(data, path);
        let parsed = results.map((res) => {
            let k = keyMap(res.key);
            let v = parse(res.value);
            return Object.assign(k, v)
        });
        return {height, parsed};
    }

    // queryParseOne calls query parse and returns the first element of
    // the parsed set, or null if no set.
    async queryParseOne(data, path, model, keyMap) {
        let {height, parsed} = await this.queryParse(data, path, model, keyMap);
        if (parsed.length === 0) {
            return {h, parsed: null};
        }
        return {height, parsed: parsed[0]};
    }
}

