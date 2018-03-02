import crypto from 'crypto';

import {sign as ed25519} from 'tweetnacl';

// getAddress accepts a hex formatted pubkey
export function getAddress (pubkey) {
    const hash = crypto.createHash('sha256');
    hash.update(pubkey, 'hex');
    let hex = hash.digest('hex');
    return hex.slice(0, 40);  // 20 bytes
}

export function generateSeedKeys() {
    // let seed = ed25519.createSeed();
    // let keypair = ed25519.createKeyPair(seed)
    let keypair = ed25519.keyPair();
    return {
        pubkey: keypair.publicKey,
        secret: keypair.secretKey
    }
}

export function publicKey(secretKey) {
    let keypair = ed25519.keyPair.fromSecretKey(secretKey);
    return keypair.publicKey;
}

// signBytes creates a replay protected sign bytes, which we use
export function signBytes(msg, chainID, seq) {
    const extra = Buffer.alloc(chainID.length + 8);
    extra.write(chainID);
    // TODO: handle 64 bytes...
    extra.writeUInt32BE(0, chainID.length);
    extra.writeUInt32BE(seq, chainID.length+4);

    const total = msg.length + extra.length;
    const res = Buffer.concat([msg, extra], total);
    return res;
}

export function sign(msg, secret) {
    return ed25519.detached(msg, secret);
}

export function verify(msg, sig, pubkey) {
    return ed25519.detached.verify(msg, sig, pubkey);
}
