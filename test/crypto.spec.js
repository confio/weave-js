import { generateSeedKeys, publicKey, signBytes, sign, verify, getAddress } from '../src/crypto';

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
    it('Sign and verify', () => {
        const keys = generateSeedKeys();
        const pub = publicKey(keys.secret);
        expect(pub).toEqual(keys.pubkey);

        // let addr = getAddress(keys.pubkey);

        const msg = Buffer.from(gotx, 'hex');
        const data = signBytes(msg, gochain, goseq);
        let sig = sign(data, keys.secret);

        expect(verify(data, sig, keys.pubkey)).toEqual(true);
    });

    it('Check golang compatibility', () => {
        // make sure we calculate addresses the same
        const addr = getAddress(gopubkey);
        expect(addr).toEqual(goaddr);

        const privBuf = Buffer.from(goprivkey, 'hex');
        const pubBuf = Buffer.from(gopubkey, 'hex');
        const pub = publicKey(privBuf);
        const calcBuf = Buffer.from(pub);
        expect(calcBuf).toEqual(pubBuf);

        const msg = Buffer.from(gotx, 'hex');
        const data = signBytes(msg, gochain, goseq);
        // const sigBuf = Buffer.from(gosig, 'hex');
        // expect(verify(msg, sigBuf, pubBuf)).toEqual(true);

        let sig = sign(data, privBuf);
        expect(verify(data, sig, pubBuf)).toEqual(true);
        // expect(sig).toEqual(gosig);

        console.log(Buffer.from(sig).toString('hex'));
        console.log("");
        console.log(gosig);
    });

});
