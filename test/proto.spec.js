import fs from "fs";
import path from "path";
import { parseWallet, serializeWallet, parseSendMsg, serializeSendMsg } from '../src/proto';

describe('Protobuf wallet', () => {
    let jsonWallet = loadJSON("wallet");
    let hexWallet = loadPB("wallet");

    let jsonMsg = loadJSON("send_msg");
    let hexMsg = loadPB("send_msg");

    it('Serialize json wallet to protobuf', async () => {
        let obj = JSON.parse(jsonWallet);
        let buffer = await serializeWallet(obj);
        let hex = buffer.toString('hex')
        expect(hex).toEqual(hexWallet);
    });
    it('Parse protobuf wallet to json', async () => {
        let buffer = new Buffer(hexWallet, 'hex');
        let parsed = await parseWallet(buffer);
        let obj = JSON.parse(jsonWallet);
        expect(parsed).toEqual(obj);
    });

    it('Serialize json sendMsg to protobuf', async () => {
        let obj = JSON.parse(jsonMsg);
        let buffer = await serializeSendMsg(obj);
        let hex = buffer.toString('hex')
        expect(hex).toEqual(hexMsg);
    });
    it('Parse protobuf sendMsg to json', async () => {
        let buffer = new Buffer(hexMsg, 'hex');
        let parsed = await parseSendMsg(buffer);
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
