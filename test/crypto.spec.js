import path from "path";
import {loadFixtures} from './helpers/fixtures';
import {transforms, manyFlat, flatten} from './helpers/transform';

import { loadModels, pbToObj, objToPB} from '../src/proto';
import { initNacl, generateKeyPair, signBytes, sign, verify, getAddress } from '../src/crypto';

let protoPath = path.resolve(__dirname, "fixtures", "mycoind.proto");

describe('Crypto primitives', () => {
    // to check sig (used to generate fixtures)
    let goseq = 17;
    let gochain = "test-123";

    it('Sign and verify', async () => {
        await initNacl();
        const gotx = await loadFixtures("unsigned_tx"); 
        
        const keys = generateKeyPair();
        const msg = Buffer.from(gotx.pbHex, 'hex');
        const data = signBytes(msg, gochain, goseq);
        let sig = sign(data, keys.secret);

        expect(verify(data, sig, keys.pubkey)).toEqual(true);
    });

    it('Check golang compatibility', async () => {
        await initNacl();
        const models = await loadModels(protoPath, "mycoin", ["PrivateKey", "PublicKey", "Tx", "StdSignature"]);
    
        const gotx = await loadFixtures("unsigned_tx"); 
        const gosigned = await loadFixtures("signed_tx"); 
        const goprivkey = await loadFixtures("priv_key");
        const gopubkey = await loadFixtures("pub_key");

        
        // This loads keys as buffers
        const txSig = models.Tx.decode(gosigned.pbBuffer()).signatures[0];
        const priv = models.PrivateKey.decode(goprivkey.pbBuffer()).ed25519;
        const pub = models.PublicKey.decode(gopubkey.pbBuffer()).ed25519;
        const msg = Buffer.from(gotx.pbHex, 'hex');

        // make sure we calculate addresses the same as the signature
        const addr = getAddress(pub);
        const sigAddr = txSig.Address.toString('hex');
        expect(addr).toEqual(sigAddr);

        const data = signBytes(msg, gochain, goseq);

        const sig = Uint8Array.from(txSig.Signature.ed25519);
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
