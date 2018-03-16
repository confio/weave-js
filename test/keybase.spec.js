import path from "path";
import {loadFixtures} from './helpers/fixtures';
import memdown from 'memdown';

import {KeyBase, openDB} from '../src';

let protoPath = path.resolve(__dirname, "fixtures", "mycoind.proto");

describe('Keybase crypto helpers', () => {
    // TODO: set from external keys (only pubkey)
    // TODO: save/load

    it('Basic add', async () => {
        // TODO: with db later
        let keybase = await KeyBase.setup();
        expect(keybase.length).toBe(0);

        let one = keybase.add('john');
        expect(keybase.length).toBe(1);
        expect(one).not.toBeNull();
        expect(keybase.get('john')).not.toBeUndefined();
        expect(one.address().length).toBe(40);

        // to check sig (used to generate fixtures)
        const chain = "some-test-id";
        let msg = new Buffer("hello world, this is important");
        expect(one.sequence).toBe(0)
        one.sequence = 33;
        let {sig, seq} = one.sign(msg, chain, seq);
        expect(seq).toBe(33);
        expect(one.sequence).toBe(34);
        expect(one.verify(msg, sig, chain, seq)).toBe(true);
        expect(one.verify(msg, sig, chain, seq+1)).toBe(false);

        // add one more
        let two = keybase.add('merry');
        expect(keybase.length).toBe(2);
        expect(two).not.toBeUndefined();
        expect(two.verify(msg, sig, chain, seq)).toBe(false);

        expect(() => keybase.add('john')).toThrowError();
    });

    it('Check KeyPair ser/deser', async () => {
        let keybase = await KeyBase.setup();
        let orig = keybase.add('orig');
        orig.sequence = 22;

        let ser = orig.stringify();
        let {pub, sec, seq} = keybase.parse(ser);
        expect(pub).toEqual(orig.pubkey);
        expect(sec).toEqual(orig.secret);
        expect(seq).toEqual(orig.sequence);
    });

    it('Check persistence', async() => {
        // use leveldown('path') in cli, leveljs() in browser
        let store = memdown();
        let up = await openDB(store);
        let keybase = await KeyBase.setup(up);

        expect(keybase.length).toBe(0);
        let addr = keybase.add('demo').address();
        expect(keybase.length).toBe(1);
        await keybase.save(); // TODO: promisify

        // await up.close();
        // let up = await db.openDB(store);

        // open a second copy for keybase
        let k2 = await KeyBase.setup(up);
        expect(k2.length).toBe(1);
        let demo = k2.get('demo');
        expect(demo).not.toBeUndefined();
        expect(demo.address()).toBe(addr);
    })

    // it('Check golang compatibility', async () => {
    //     await initNacl();
    //     const models = await loadModels(protoPath, "mycoin", ["PrivateKey", "PublicKey", "Tx", "StdSignature"]);

    //     const gotx = await loadFixtures("unsigned_tx");
    //     const gosigned = await loadFixtures("signed_tx");
    //     const goprivkey = await loadFixtures("priv_key");
    //     const gopubkey = await loadFixtures("pub_key");

    //     // This loads keys as buffers
    //     const txSig = models.Tx.decode(gosigned.pbBuffer()).signatures[0];
    //     const priv = models.PrivateKey.decode(goprivkey.pbBuffer()).ed25519;
    //     const pub = models.PublicKey.decode(gopubkey.pbBuffer()).ed25519;
    //     const msg = Buffer.from(gotx.pbHex, 'hex');

    //     // make sure we calculate addresses the same as the signature
    //     const addr = getAddress(pub);
    //     const sigAddr = txSig.Address.toString('hex');
    //     expect(addr).toEqual(sigAddr);

    //     const data = signBytes(msg, gochain, goseq);

    //     const sig = Uint8Array.from(txSig.Signature.ed25519);
    //     expect(verify(data, sig, pub)).toEqual(true);

    //     let mySig = sign(data, priv);
    //     expect(verify(data, mySig, pub)).toEqual(true);
    //     expect(mySig).toEqual(sig);
    // });

});
