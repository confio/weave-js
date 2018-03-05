import crypto from 'crypto';

// import {sign as ed25519} from 'tweetnacl';
import nacl_factory from 'js-nacl';

let ed25519 = null;

// init must be called and the promise resolved before any other functions are called
export function initNacl(opts) {
    return new Promise((res, rej) => {
        let setup = nacl => { ed25519 = nacl; res(nacl) }
        nacl_factory.instantiate(setup, opts)
    });
}

// getAddress accepts pubkey as a hex-formatted string or a Buffer
// returns the address as a hex string
export function getAddress (pubkey) {
    const hash = crypto.createHash('sha256');
    hash.update(pubkey, 'hex');
    let hex = hash.digest('hex');
    return hex.slice(0, 40);  // 20 bytes
}

// generateKeyPair creates a private/public key pair
export function generateKeyPair() {
    let keypair = ed25519.crypto_sign_keypair();
    return {
        pubkey: keypair.signPk,
        secret: keypair.signSk
    }
}

// signBytes takes raw message byters and append replay-protection info
// to determine the bytes we need to sign.
// returns a Buffer with the bytes to sign
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
    return ed25519.crypto_sign_detached(msg, secret);
}

export function verify(msg, sig, pubkey) {
    return ed25519.crypto_sign_verify_detached(sig, msg, pubkey);
}
