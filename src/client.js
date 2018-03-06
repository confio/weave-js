import { RpcClient } from 'tendermint';

let DefaultURI = "http://localhost:46657";
// let DefaultURI = "ws://localhost:46657";

export class Client {
    constructor(uri) {
        uri = uri || DefaultURI;
        this.client = RpcClient(uri);
    }

    status() {
        return this.client.status();
    }

    close() {
        return this.client.close();
    }

    // query for key and return {value, height}
    // key should be a hex string or a buffer
    // TODO: allow custom path, height, proofs....
    query(key) {
        if (typeof key !== 'string') {
            key = key.toString('hex');
        }
        let q = {path: '/key', data: key};
        return this.client.abciQuery(q);
    }
}

