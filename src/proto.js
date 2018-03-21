import protobuf from "protobufjs";
import path from "path";
import weaveJson from "./weave.json";

export function loadJSON(json) {
    let root = protobuf.Root.fromJSON(json);
    let out = {};
    for (let [ns, space] of Object.entries(root.nested)) {
        let sub = {};
        for (let [ts, type] of Object.entries(space.nested)) {
            sub[ts] = type
        }
        out[ns] = sub;
    }
    return out;
}

// this contains all model info of weave
export let weave = loadJSON(weaveJson);

// loadModels imports a file with the given packageName
// and accepts a list of strings (messages)
//
// returns an object with a protobufjs.Message class for each message listed
export function loadModels(filepath, packageName, messages) {
    return protobuf.load(filepath).then(root => {
        let res = {};
        for (let msg of messages) {
            let name = packageName + "." + msg;
            res[msg] = root.lookupType(name);
        }
        return res;
    });
}

export async function loadOneModel(filepath, packageName, msg) {
    // use loadModels to make sure it is better covered in test cases...
    let models = await loadModels(filepath, packageName, [msg]);
    return models[msg];
}

// reads in a buffer or hex encoded string and parses it as a protobuf object
export function pbToObj(msgClass, buffer, opts) {
    if (opts === undefined) {
        opts = {bytes: String, longs: Number};
    }
    if (typeof buffer === 'string') {
        buffer = Buffer.from(buffer, 'hex');
    }
    let decodedMessage = msgClass.decode(buffer);
    return msgClass.toObject(decodedMessage, opts);
}

export function objToPB(msgClass, obj) {
    let err = msgClass.verify(obj);
    if (err) throw Error(err);

    let buffer = msgClass.encode(obj).finish();
    return buffer;
}
