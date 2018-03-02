import sha256 from 'crypto-js/sha256';
import hexer from 'crypto-js/enc-hex';

// fallback module
let ed25519 = require('supercop.js')
try {
  // try to load native version
  ed25519 = require('ed25519-supercop')
} catch (err) {}


export function getAddress (pubkey) {
    // let bz = sha256(pubkey, { asBytes: true });
    // return bz.slice(0, 20);
    let hex = sha256(pubkey).toString(hexer);
    return hex.slice(0, 40);  // 20 bytes
}

export function generateSeedKeys() {
    let seed = ed25519.createSeed();
    let keypair = ed25519.createKeyPair(seed)
    return {
        seed: seed.toString('hex'),
        pubkey: keypair.publicKey.toString('hex'),
        secret: keypair.secretKey.toString('hex')
    }
}

export function sign(msg, pubkey, secret) {
    return ed25519.sign(msg, pubkey, secret).toString('hex');
}

export function verify(sig, msg, pubkey) {
    return ed25519.verify(sig, msg, pubkey);
}
