import protobuf from "protobufjs";
import path from "path";

let _wallet = null;
let _sendMsg = null;

let protoPath = path.resolve(__dirname, "mycoind.proto");

async function walletClass() {
    if (_wallet == null) {
        _wallet = await protobuf.load(protoPath)
                                .then(root => root.lookupType("mycoin.Set"))
                                // .catch(err => console.log("Err:" + err));
    }
    return _wallet;
}

async function sendMsgClass() {
    if (_sendMsg == null) {
        _sendMsg = await protobuf.load(protoPath)
                                 .then(root => root.lookupType("mycoin.SendMsg"))
                                // .catch(err => console.log("Err:" + err));
    }
    return _sendMsg;
}

export async function parseWallet(buffer) {
    let Wallet = await walletClass();
    let decodedMessage = Wallet.decode(buffer);
    return Wallet.toObject(decodedMessage);
}

export async function serializeWallet(obj) {
    let Wallet = await walletClass();
    let err = Wallet.verify(obj);
    if (err) throw Error(err);

    let buffer = Wallet.encode(obj).finish();
    return buffer;
}

export async function parseSendMsg(buffer) {
    let SendMsg = await sendMsgClass();
    let decodedMessage = SendMsg.decode(buffer);
    return SendMsg.toObject(decodedMessage, {bytes: String});
}

export async function serializeSendMsg(obj) {
    let SendMsg = await sendMsgClass();
    let err = SendMsg.verify(obj);
    if (err) throw Error(err);

    let buffer = SendMsg.encode(obj).finish();
    return buffer;
}
