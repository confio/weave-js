import fs from "fs";
import path from "path";
import {loadModels, loadOneModel, pbToObj, objToPB} from '../src/proto';

let protoPath = path.resolve(__dirname, "fixtures", "mycoind.proto");

describe('Protobuf wallet', () => {
    // let jsonMsg = loadJSON("send_msg");
    // let hexMsg = loadPB("send_msg");

    const checkSerialize = async (fixtureName, className) => {
        let fixtures = await loadFixtures(fixtureName);
        const msgClass = await loadOneModel(protoPath, "mycoin", className);
        const obj = JSON.parse(fixtures.json);

        let encoded = objToPB(msgClass, obj);
        expect(encoded.toString('hex')).toEqual(fixtures.pbHex);

        const pbInput = new Buffer(fixtures.pbHex, 'hex');
        let parsed = pbToObj(msgClass, pbInput);
        expect(parsed).toEqual(obj);      
    }

    it('Wallet: protobuf -> json and back', async () => {
        await checkSerialize("wallet", "Set");
    });

    it('SendMsg: protobuf -> json and back', async () => {
        await checkSerialize("send_msg", "SendMsg");
    });
});

async function loadFixtures(filename) {
    let json = await loadJSON(filename);
    let pbHex = await loadPB(filename);
    return {json, pbHex};
}

async function loadJSON(filename) {
    let filepath = path.resolve(__dirname, "fixtures", filename) + ".json";
    let data = await readFile(filepath);
    // TODO: all _ in keys to camel case
    return data.replace(/currency_code/g, "currencyCode");
}

async function loadPB(filename) {
    let filepath = path.resolve(__dirname, "fixtures", filename) + ".bin";
    let data = await readFile(filepath, 'hex');
    return data;
}

// readFile transforms callback into promise to async-ify it
// https://stackoverflow.com/questions/40593875/using-filesystem-in-node-js-with-async-await
const readFile = (path, opts = 'utf8') =>
    new Promise((res, rej) => {
        fs.readFile(path, opts, (err, data) => {
            if (err) rej(err)
            else res(data)
        })
    })