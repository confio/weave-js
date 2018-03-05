/*
transform has a number of helper functions to transform json from
go protobuf format to js protobuf format
*/

const flatPubKey = flatten(['Pub', 'Ed25519'], ['ed25519'], ['Pub']);
const flatPrivKey = flatten(['Priv', 'Ed25519'], ['ed25519'], ['Priv']);
const flatUser = flatten(
    ['pub_key', 'Pub', 'Ed25519'], 
    ['pubKey', 'ed25519'],
    ['pub_key']);

const flatSend = flatten(['Sum', 'SendMsg'], ['sendMsg'], ['Sum']);
const flatSig = (idx) => flatten(
    ['signatures', idx, 'Signature', 'Sig', 'Ed25519'], 
    ['signatures', idx, 'Signature', 'ed25519'], 
    ['signatures', idx, 'Signature', 'Sig']);
const flatTx = manyFlat(flatSend, flatSig(0), flatSig(1), flatSig(2));

export let transforms = {
    flatPrivKey, flatPubKey, flatUser, flatSend, flatTx
};

export function manyFlat() {
    let flats = Array.from(arguments);
    return (obj) => flats.reduce((o, f) => f(o), obj)
}

export function flatten (input, output, remove) {
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
