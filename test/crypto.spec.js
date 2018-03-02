import { generateSeedKeys, sign, verify, getAddress } from '../src/crypto';

describe('Crypto primitives', () => {
    it('Sign and verify', () => {
        let keys = generateSeedKeys();
        console.log(keys);

        let addr = getAddress(keys.pubkey);
        console.log("Addr:", addr);

        let msg = new Buffer('DEADBEEF12345678', 'hex');
        let sig = sign(msg, keys.pubkey, keys.secret);
        console.log("Sig:", sig);

        expect(verify(sig, msg, keys.pubkey)).toEqual(true);
    });
});
