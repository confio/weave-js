import { initNacl, generateKeyPair, signBytes, sign, verify, getAddress } from '../src/crypto';

// unsigned_tx.bin
let gotx = "0a440a14eddea5bddec757e27b7e70fb9468cb678589e2431214539ac8bc8eeb506cd42e66e8b5508f222b08f45a1a0808fa011a03455448220c54657374207061796d656e74";

// privkey.bin (w/o field headers)
let goprivkey = "9f610af057013d5b406fd17842dfdadc22aa7504fa9f9d1f249a83ff8cd7ec3881df5cb5a0784b3ba0f41786ccca09910617d0eef7818e2c7f6a0d8ea5e2da7e";

// pubkey.bin (w/o field headers)
let gopubkey = "81df5cb5a0784b3ba0f41786ccca09910617d0eef7818e2c7f6a0d8ea5e2da7e";

// extracted from signed_tx.bin
let goaddr = "eddea5bddec757e27b7e70fb9468cb678589e243"
let gosig = "40073fa53ff4c6f8e572c56bd3edf9dcd46537a81eb618507e57a8d9b86f7ee493fbc87e179733ff30f8bc83a51b6faafafb06730c57efc6ba19d2132abbaa08"

// to check sig
let goseq = 17;
let gochain = "test-123";

describe('Crypto primitives', () => {
    it('Sign and verify', async () => {
        await initNacl();

        const keys = generateKeyPair();
        const msg = Buffer.from(gotx, 'hex');
        const data = signBytes(msg, gochain, goseq);
        let sig = sign(data, keys.secret);

        expect(verify(data, sig, keys.pubkey)).toEqual(true);
    });

    it('Check golang compatibility', async () => {
        await initNacl();

        // make sure we calculate addresses the same
        const addr = getAddress(gopubkey);
        expect(addr).toEqual(goaddr);

        // Make them Uint8Array....
        const priv = Buffer.from(goprivkey, 'hex');
        const pub = Buffer.from(gopubkey, 'hex');
        const msg = Buffer.from(gotx, 'hex');
        const data = signBytes(msg, gochain, goseq);

        const sig = Uint8Array.from(Buffer.from(gosig, 'hex'));
        expect(verify(data, sig, pub)).toEqual(true);

        let mySig = sign(data, priv);
        expect(verify(data, mySig, pub)).toEqual(true);
        expect(mySig).toEqual(sig);
    });

    /*
    What's up with these signing differences????

    https://github.com/dchest/tweetnacl-js/blob/master/nacl.js#L762-L765
    https://github.com/golang/crypto/blob/master/ed25519/ed25519.go#L108-L110

    */
});
