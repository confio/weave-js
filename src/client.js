import { RpcClient } from 'tendermint';

// let DefaultURI = "http://localhost:46657";
let DefaultURI = "ws://localhost:46657";

const sleep = ms => new Promise(res => setTimeout(res, ms));

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

    chainID() {
        return this.client.status()
            .then(status => status.node_info.network);
    }

    height() {
        return this.client.status()
            .then(status => status.latest_block_height);
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
        let q = {path: '/', data: key};
        return this.client.abciQuery(q);
    }

    sendTx(tx) {
        if (typeof tx !== 'string') {
            tx = tx.toString('base64');
        }
        return this.client.broadcastTxCommit({tx})
    }
}

