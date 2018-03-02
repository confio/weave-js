import fs from "fs";
import path from "path";
import { parseAccount, serializeAccount } from '../src/proto';

describe('Protobuf account', () => {
    let accountJSON = path.resolve(__dirname, "data", "account.json");
    let accountBin = path.resolve(__dirname, "data", "account.bin");

    // NOTE: go output uses currency_code, js currencyCode, must translate
    let jsonAccount = fs.readFileSync(accountJSON, 'utf8')
                        .replace(/currency_code/g, "currencyCode");
    let hexAccount = fs.readFileSync(accountBin, 'hex');

    it('Serialize json to protobuf', async () => {
        let obj = JSON.parse(jsonAccount);
        let buffer = await serializeAccount(obj);
        let hex = buffer.toString('hex')
        expect(hex).toEqual(hexAccount);
    });
    it('Parse protobuf to json', async () => {
        let buffer = new Buffer(hexAccount, 'hex');
        let parsed = await parseAccount(buffer);
        let obj = JSON.parse(jsonAccount);
        expect(parsed).toEqual(obj);
    });
});
