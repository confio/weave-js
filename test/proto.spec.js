import fs from "fs";
import path from "path";
import {loadModels, loadOneModel, pbToObj, objToPB} from '../src/proto';

let protoPath = path.resolve(__dirname, "fixtures", "mycoind.proto");

describe('Protobuf wallet', () => {
    // let jsonMsg = loadJSON("send_msg");
    // let hexMsg = loadPB("send_msg");

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

    it('Wallet: protobuf -> json and back', async () => {
        await checkSerialize("wallet", "Set");
    });

    it('SendMsg: protobuf -> json and back', async () => {
        await checkSerialize("send_msg", "SendMsg");
    });

    it('PublicKey: protobuf -> json and back', async () => {
        await checkSerialize("pub_key", "PublicKey", 
            flatten(['Pub', 'Ed25519'], ['ed25519'], ['Pub']));
    });

    it('PrivateKey: protobuf -> json and back', async () => {
        await checkSerialize("priv_key", "PrivateKey",
            flatten(['Priv', 'Ed25519'], ['ed25519'], ['Priv']));
    });

    it('UserData: protobuf -> json and back', async () => {
        await checkSerialize("user", "UserData", 
            flatten(['pub_key', 'Pub', 'Ed25519'], 
                    ['pubKey', 'ed25519'],
                    ['pub_key']));
    });

    const flatSend = flatten(['Sum', 'SendMsg'], ['sendMsg'], ['Sum']);
    const flatSigs = flatten(
        ['signatures', 0, 'Signature', 'Sig', 'Ed25519'], 
        ['signatures', 0, 'Signature', 'ed25519'], 
        ['signatures', 0, 'Signature', 'Sig']);

    it('UnsignedTx: protobuf -> json and back', async () => {
        await checkSerialize("unsigned_tx", "Tx", flatSend);
    });

    it('SignedTx: protobuf -> json and back', async () => {
        await checkSerialize("signed_tx", "Tx", manyFlat(flatSend, flatSigs));
    });
});

//--------------- transform json go -> js -----

function manyFlat() {
    let flats = Array.from(arguments);
    return (obj) => flats.reduce((o, f) => f(o), obj)
}

function flatten (input, output, remove) {
    return (obj) => {
        let res = Object.assign({}, obj);
        let orig = deepGet(obj, input)
        if (orig) {
            deepSet(res, output, orig);
            deepDelete(res, remove);
        }    
        return res;
    }
}

// deepGet takes and array ["p1", "p2"]
// and returns obj.p1.p2
function deepGet (obj, path, defaultValue) {
    try {
        return path.reduce((o, p) => o[p], obj)        
    } catch (err) {
        return defaultValue;
    }
}

// deepSet looks up an object like deepGet, but then
// sets the value of that property
function deepSet(obj, path, value) {
    if (path.length === 1) {
        obj[path[0]] = value;
        return obj;
    }
    let next = path[0], 
        rest = path.slice(1);
    let o = obj[next] || {};
    obj[next] = deepSet(o, rest, value);
    return obj;
}

// deepDelete looks up an object like deepGet, but then
// deletes the value of that property
function deepDelete(obj, path) {
    let prefix = path.slice()
    let last = prefix.pop();
    let o = deepGet(obj, prefix);
    if (o === undefined) {
        throw Error("path not found" + prefix);
    }
    delete o[last];
}

//------------- load fixtures ------------

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