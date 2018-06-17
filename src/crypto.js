/* jshint esversion: 6 */

import shajs from 'sha.js';

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
    const hash = shajs('sha256');
    // this is a prefix for all pubkey signatures
    let id = getIdentifier(pubkey);
    hash.update(id);
    return hash.digest('hex').slice(0, 40);  // 20 bytes
}

// getAddress accepts pubkey as a hex-formatted string or a Buffer
// returns the identifier as a Buffer
export function getIdentifier(pubkey) {
    let prefix = Buffer.from('sigs/ed25519/');
        pubkey = Buffer.from(pubkey, 'hex');
    return Buffer.concat([prefix, pubkey]);
}

// generateKeyPair creates a private/public key pair
export function generateKeyPair() {
    let keypair = ed25519.crypto_sign_keypair();
    return {
        pubkey: keypair.signPk,
        secret: keypair.signSk
    }
}

const signCodeV1 = Buffer.from([0, 0xca, 0xfe, 0]);

// signBytes takes raw message byters and append replay-protection info
// to determine the bytes we need to sign.
// returns a Buffer with the bytes to sign
//
// As specified in https://github.com/confio/weave/issues/70,
// we use the following format:
//
// version | len(chainID) | chainID      | nonce             | signBytes
// 4bytes  | uint8        | ascii string | int64 (bigendian) | serialized transaction
export function signBytes(msg, chainID, seq) {
    // split the nonce (seq) into two uint32 to be writen
    const thirtyTwo = (2**32);
    const highNonce = Math.floor(seq/thirtyTwo)
    const lowNonce = seq%thirtyTwo

    const extra = Buffer.alloc(chainID.length+8+1);

    extra.writeUInt8(chainID.length%256, 0);
    extra.write(chainID, 1);
    extra.writeUInt32BE(highNonce, chainID.length+1);
    extra.writeUInt32BE(lowNonce, chainID.length+5);

    // ensure Buffer type
    const msgBuf = Buffer.from(msg);
    const total = msgBuf.length + extra.length + 4;
    const res = Buffer.concat([signCodeV1, extra, msgBuf], total);
    return res;
}

export function sign(msg, secret) {
    return ed25519.crypto_sign_detached(msg, secret);
}

export function verify(msg, sig, pubkey) {
    return ed25519.crypto_sign_verify_detached(sig, msg, pubkey);
}
