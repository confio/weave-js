import { RpcClient } from 'tendermint';

// let DefaultURI = "http://localhost:46657";
let DefaultURI = "ws://localhost:46657";

export class Client {
    constructor(uri) {
        uri = uri || DefaultURI;
        this.client = RpcClient(uri);
        this.closed = false;
        // need to handle error somehow, only care if it is not us closing it...
        this.client.on('error', err => {
            if (!this.closed) console.log("connection:", err);
        });
    }

    status() {
        return this.client.status();
    }

    close() {
        this.closed = true;
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

    broadcastTxCommit(tx) {
        if (typeof tx !== 'string') {
            tx = tx.toString('base64');
        }
        return this.client.broadcastTxCommit({tx})
    }
}

