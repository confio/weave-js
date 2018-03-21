import { weave , pbToObj, objToPB} from './proto';
import { initNacl, generateKeyPair, signBytes, sign, verify, getAddress } from './crypto';

let Signature = weave.crypto.Signature;
let PublicKey = weave.crypto.PublicKey;
let PrivateKey = weave.crypto.PrivateKey;

// KeyPair contains PrivateKey, PublicKey protobuf Messages
// right now only supports ed25519, but should be more generally compatible
class KeyPair {
    constructor(algo, pubkey, secret) {
        this.algo = algo;
        this.pubkey = pubkey;
        this.secret = secret;
        this.sequence = 0;
    }

    pubBytes() {
        return this.pubkey[this.algo];
    }

    secBytes() {
        return this.secret[this.algo];
    }

    address() {
        return getAddress(this.pubBytes());
    }

    addressBytes() {
        return new Buffer(this.address(), 'hex');
    }

    // sign returns the signature as well as the sequence number
    // it signed with
    sign(msg, chainID) {
        let seq = this.sequence
        this.sequence++;
        let bz = signBytes(msg, chainID, seq);
        let sig = sign(bz, this.secBytes());
        let wrap = Signature.create();
        wrap[this.algo] = sig;
        return {sig: wrap, seq};
    }

    verify(msg, sig, chainID, seq) {
        let bz = signBytes(msg, chainID, seq);
        return verify(bz, sig[this.algo], this.pubBytes());
    }

    stringify() {
        let value = {pub: this.pubkey, sec: this.secret, seq: this.sequence};
        return JSON.stringify(value);
    }
}

export class KeyBase {
    constructor(){
        this.keys = {};
        this.db = null;
    }

    // setup will init all modules
    // protoPath is the name of the .proto file and packageName used inside of it
    // db must be levelup compliant
    static setup(db) {
        return initNacl().then(() => new KeyBase().load(db));
    }

    makePair(algo, pubkey, secret) {
        let pub = PublicKey.create();
        pub[algo] = Buffer.from(pubkey);
        let priv = PrivateKey.create();
        priv[algo] = Buffer.from(secret);
        return new KeyPair(algo, pub, priv);
    }

    list() {
        // if only there were a nicer mapper on objects....
        return Object.entries(this.keys)
            .map( ([k, v]) => ({[k]: v.address()}))
            .reduce((acc, o) => Object.assign(acc, o), {})
    }

    // TODO: support multiple algorithms, not just ed25519
    add(name) {
        if (this.keys[name]) {
            throw Error("Cannot overwrite key " + name);
        }
        let kp = generateKeyPair();
        let res = this.makePair("ed25519", kp.pubkey, kp.secret)
        this.keys[name] = res;
        return res;
    }

    // TODO: support multiple algorithms, not just ed25519
    // call with properly formatted protobuf Messages as pubkey and secret
    set(name, pubkey, secret, sequence) {
        if (this.keys[name]) {
            throw Error("Cannot overwrite key " + name);
        }
        sequence = sequence || 0;
        // if they are raw bytes...
        // let res = this.makePair("ed25519", pubkey, secret);
        // if they are already protobuf objects
        let res = new KeyPair("ed25519", pubkey, secret);
        res.sequence = sequence;
        this.keys[name] = res;
        return res;
    }

    get(name) {
        return this.keys[name];
    }

    get length() {
        return Object.keys(this.keys).length;
    }

    // db should be local storage??? node-localstorage
    // returns a promise that is resolved when all data writen
    // TODO: this only adds keys, doesn't remove
    save(db) {
        if (db) {
            this.db = db;
        }
        if (!this.db) {
            throw Error("must set db in save or previous load");
        }
        let batch = this.db.batch();
        for (let name of Object.keys(this.keys)) {
            let pair = this.get(name);
            batch.put(name, pair.stringify());
        }
        return batch.write();
    }

    // db must be a levelup db or falsy
    // returns a promise that resolves to the filled keybase
    load(db) {
        // short-circuit, nothing to do
        if (!db) {
            return new Promise((res, rej) => res(this));
        }
        this.db = db;
        return new Promise((res, rej) => {
            this.db.createReadStream()
                .on('data', data => {
                    let name = data.key.toString()
                    let {pub, sec, seq} = this.parse(data.value);
                    this.set(name, pub, sec, seq);
                })
                .on('error', err => rej(err))
                .on('close', () => res(this))
                .on('end', () => res(this))
        });
    }

    // parse takes a json serialized KeyPair and reconstructs is
    parse(pair) {
        let {pub, sec, seq} = JSON.parse(pair);
        pub = PublicKey.fromObject(pub);
        sec = PrivateKey.fromObject(sec);
        return {pub, sec, seq};
    }
}
