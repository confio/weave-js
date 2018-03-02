import { parseAccount, serializeAccount } from '../src/proto';

// NOTE: go output uses currency_code, js currencyCode, must translate
let jsonAccount = `{"coins":[{"integer":50000,"currencyCode":"ETH"},{"integer":150,"fractional":567000,"currencyCode":"BTC"}]}`;
let hexAccount = "0a0908d086031a034554480a0c08960110d8cd221a03425443"

describe('Protobuf account', () => {
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
