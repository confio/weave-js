import path from "path";
import {loadFixtures} from './helpers/fixtures';
import {transforms, manyFlat, flatten} from './helpers/transform';

import {loadModels, loadOneModel, pbToObj, objToPB} from '../src/proto';

let protoPath = path.resolve(__dirname, "fixtures", "mycoind.proto");

const checkSerialize = async (fixtureName, className, transform) => {
    let fixtures = await loadFixtures(fixtureName);
    const msgClass = await loadOneModel(protoPath, "mycoin", className);
    let obj = JSON.parse(fixtures.json);
    if (transform) {
        obj = transform(obj);
    } 

    const pbInput = new Buffer(fixtures.pbHex, 'hex');
    let parsed = pbToObj(msgClass, pbInput);
    expect(parsed).toEqual(obj);

    let encoded = objToPB(msgClass, obj);
    expect(encoded.toString('hex')).toEqual(fixtures.pbHex);
}


describe('Protobuf wallet', () => {
    it('Wallet: protobuf -> json and back', async () => {
        await checkSerialize("wallet", "Set");
    });

    it('SendMsg: protobuf -> json and back', async () => {
        await checkSerialize("send_msg", "SendMsg");
    });

    it('PublicKey: protobuf -> json and back', async () => {
        await checkSerialize("pub_key", "PublicKey", transforms.flatPubKey);
    });

    it('PrivateKey: protobuf -> json and back', async () => {
        await checkSerialize("priv_key", "PrivateKey", transforms.flatPrivKey);
    });

    it('UserData: protobuf -> json and back', async () => {
        await checkSerialize("user", "UserData", transforms.flatUser);
    });

    it('UnsignedTx: protobuf -> json and back', async () => {
        await checkSerialize("unsigned_tx", "Tx", transforms.flatSend);
    });

    it('SignedTx: protobuf -> json and back', async () => {
        await checkSerialize("signed_tx", "Tx", transforms.flatTx);
    });
});

