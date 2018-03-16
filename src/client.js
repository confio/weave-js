import { RpcClient } from 'tendermint';
import protobuf from "protobufjs";
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

    sendTx(tx) {
        if (typeof tx !== 'string') {
            tx = tx.toString('base64');
        }
        return this.client.broadcastTxCommit({tx})
    }

    // waitForBlock will return when block h is reached
    async waitForBlock(goal) {
        let h = await this.height();
        while (h < goal) {
            await sleep(1000);
            h = await this.height();
        }
        return h;
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
        let h = parseInt(q.height, 10)

        // no response, empty array, done
        if (!q.key) {
            return {h, results: []};
        }

        // now parse them both and join....
        let keys = parseResultSet(q.key);
        let values = parseResultSet(q.value);
        if (keys.length !== values.length) {
            throw Error("Got " + keys.length + " keys but " + values.length + " values");
        }

        let results = keys.map((key, i) => ({key, value: values[i]}));
        return {h, results};
    }

    // queryParse takes a protobuf `model` to decode the raw bytes,
    // and an optional keyMap function that creates an object with one element
    // from the key. If no keyMap given, then key is returned unmodified under _key
    async queryParse(data, path, model, keyMap) {
        keyMap = keyMap || defaultKeyMap;
        const parse = (val) => model.toObject(model.decode(val), {longs: Number})

        let {h, results} = await this.query(data, path);
        let parsed = results.map((res) => {
            let k = keyMap(res.key);
            let v = parse(res.value);
            return Object.assign(k, v)
        });
        return {h, parsed};
    }

    // queryParseOne calls query parse and returns the first element of
    // the parsed set, or null if no set.
    async queryParseOne(data, path, model, keyMap) {
        let {h, parsed} = await this.queryParse(data, path, model, keyMap);
        if (parsed.length == 0) {
            return {h, parsed: null};
        }
        return {h, parsed: parsed[0]};
    }
}

