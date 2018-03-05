import fs from "fs";
import path from "path";
import {loadModels, pbToObj, objToPB} from '../src/proto';

let protoPath = path.resolve(__dirname, "fixtures", "mycoind.proto");

describe('Protobuf wallet', () => {
    let jsonWallet = loadJSON("wallet");
    let hexWallet = loadPB("wallet");

    let jsonMsg = loadJSON("send_msg");
    let hexMsg = loadPB("send_msg");

    it('Serialize json wallet to protobuf', async () => {
        const mycoin = await loadModels(protoPath, "mycoin", ["Set"]);
        const obj = JSON.parse(jsonWallet);

        let buffer = objToPB(mycoin.Set, obj);
        const hex = buffer.toString('hex')
        expect(hex).toEqual(hexWallet);
    });
    it('Parse protobuf wallet to json', async () => {
        const mycoin = await loadModels(protoPath, "mycoin", ["Set"]);
        const buffer = new Buffer(hexWallet, 'hex');

        let parsed = pbToObj(mycoin.Set, buffer);
        const obj = JSON.parse(jsonWallet);
        expect(parsed).toEqual(obj);
    });

    it('Serialize json sendMsg to protobuf', async () => {
        const mycoin = await loadModels(protoPath, "mycoin", ["SendMsg"]);
        const obj = JSON.parse(jsonMsg);

        let buffer = objToPB(mycoin.SendMsg, obj);
        const hex = buffer.toString('hex')
        expect(hex).toEqual(hexMsg);
    });
    it('Parse protobuf sendMsg to json', async () => {
        const mycoin = await loadModels(protoPath, "mycoin", ["SendMsg"]);
        const buffer = new Buffer(hexMsg, 'hex');

        let parsed = pbToObj(mycoin.SendMsg, buffer);
        let obj = JSON.parse(jsonMsg);
        expect(parsed).toEqual(obj);
    });

});

function loadJSON(filename) {
    let filepath = path.resolve(__dirname, "fixtures", filename) + ".json";
    let data = fs.readFileSync(filepath, 'utf8')
                 .replace(/currency_code/g, "currencyCode");
    return data;
}

function loadPB(filename) {
    let filepath = path.resolve(__dirname, "fixtures", filename) + ".bin";
    let data = fs.readFileSync(filepath, 'hex');
    return data;
}
