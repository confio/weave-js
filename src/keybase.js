import { loadModels, pbToObj, objToPB} from './proto';
import { initNacl, generateKeyPair, signBytes, sign, verify, getAddress } from './crypto';

// KeyPair contains PrivateKey, PublicKey protobuf Messages
// right now only supports ed25519, but should be more generally compatible
class KeyPair {
    constructor(algo, pubkey, secret, Signature) {
        this.algo = algo;
        this.pubkey = pubkey;
        this.secret = secret;
        this.Signature = Signature;
    }

    sign(msg, chainID, seq) {
        let bz = signBytes(msg, chainID, seq);
        let sig = sign(bz, this.secret[this.algo]);
        // TODO: wrap this in a protobuf message!
        let wrap = this.Signature.create();
        wrap[this.algo] = sig;
        return wrap;
    }

    verify(msg, sig, chainID, seq) {
        let bz = signBytes(msg, chainID, seq);
        return verify(bz, sig[this.algo], this.pubkey[this.algo]);
    }
}

export class KeyBase {
    constructor(models){
        this.PrivateKey = models.PrivateKey;
        this.PublicKey = models.PublicKey;
        this.Signature = models.Signature;
        this.keys = {};
        this.db = null;
    }

    // setup will init all modules
    static setup(protoPath, packageName, db) {
        return initNacl().then(() =>
            loadModels(protoPath, packageName, ['PrivateKey', 'PublicKey', 'Signature'])
        ).then(models => new KeyBase(models))
         .then(kb => kb.load(db));
    }

    makePair(algo, pubkey, secret) {
        let pub = this.PublicKey.create();
        pub[algo] = pubkey;
        let priv = this.PrivateKey.create();
        priv[algo] = secret
        return new KeyPair(algo, pub, priv, this.Signature);
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
    set(name, pubkey, secret) {
        if (this.keys[name]) {
            throw Error("Cannot overwrite key " + name);
        }
        // if they are raw bytes...
        // let res = this.makePair("ed25519", pubkey, secret);
        // if they are already protobuf objects
        let res = new KeyPair("ed25519", pubkey, secret, this.Signature);
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
    save(db) {
        if (db) {
            this.db = db;
        }
        if (!this.db) {
            throw Error("must set db in save or previous load");
        }
        // TODO: save async promise style
        return this;
    }

    load(db) {
        // short-circuit, nothing to do
        if (!db) {
            return this;
        }
        this.db = db;
        // TODO: load
        return this;
    }
}