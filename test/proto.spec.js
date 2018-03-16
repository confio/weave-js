import path from "path";
import {loadFixtures} from './helpers/fixtures';
import {transforms, manyFlat, flatten} from './helpers/transform';

import {weave, pbToObj, objToPB} from '../src/proto';

let protoPath = path.resolve(__dirname, "fixtures", "mycoind.proto");

const checkSerialize = async (fixtureName, msgClass, transform) => {
    let fixtures = await loadFixtures(fixtureName);
    let obj = JSON.parse(fixtures.json);
    if (transform) {
        obj = transform(obj);
    }

    let parsed = pbToObj(msgClass, fixtures.pbBuffer());
    expect(parsed).toEqual(obj);

    let encoded = objToPB(msgClass, obj);
    expect(encoded.toString('hex')).toEqual(fixtures.pbHex);
}

describe('Protobuf wallet', () => {
    it('Wallet: protobuf -> json and back', async () => {
        await checkSerialize("wallet", weave.cash.Set);
    });

    it('SendMsg: protobuf -> json and back', async () => {
        await checkSerialize("send_msg", weave.cash.SendMsg);
    });

    it('PublicKey: protobuf -> json and back', async () => {
        await checkSerialize("pub_key", weave.crypto.PublicKey, transforms.flatPubKey);
    });

    it('PrivateKey: protobuf -> json and back', async () => {
        await checkSerialize("priv_key", weave.crypto.PrivateKey, transforms.flatPrivKey);
    });

    it('UserData: protobuf -> json and back', async () => {
        await checkSerialize("user", weave.sigs.UserData, transforms.flatUser);
    });

    it('UnsignedTx: protobuf -> json and back', async () => {
        await checkSerialize("unsigned_tx", weave.app.Tx, transforms.flatSend);
    });

    it('SignedTx: protobuf -> json and back', async () => {
        await checkSerialize("signed_tx", weave.app.Tx, transforms.flatTx);
    });
});

