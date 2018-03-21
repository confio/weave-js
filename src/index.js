/* jshint esversion:6 */

import {KeyBase} from './keybase';
import {open} from './db';
import {Client} from './client';
import {loadJSON, pbToObj, weave} from './proto';


// buildSendTx constructs a sendMsg to move tokens from the sender to rcpt
// Tx - the app-specific Tx wrapper. We assume they use StdSignature, 
//      and support sendMsg, but are quite flexible about the rest
// sender - KeyPair (from KeyBase) to send and sign the tx
// rcpt - address to receive the message
// amount - number of tokens to send (whole amount)
// currency - ticker of the tokens to send
// chainID - chainID to send on (included in tx signature)
function buildSendTx(Tx, sender, rcpt, amount, currency, chainID) {
    rcpt = Buffer.from(rcpt, 'hex');  // may be bytes or a hex string
    let msg = weave.cash.SendMsg.create({
        src: sender.addressBytes(),
        dest: rcpt,
        amount: weave.x.Coin.create({whole: amount, ticker: currency}),
        memo: 'Test Tx'
    });
    let tx = Tx.create({
        sendMsg: msg
    });
    let bz = Tx.encode(tx).finish();

    // sign it (with chain-id)
    let {sig, seq} = sender.sign(bz, chainID);
    expect(seq).toBe(0);
    let std = weave.sigs.StdSignature.create({
        pubKey: sender.pubkey,
        signature: sig
    });
    tx.signatures = [std];

    let txbz = Tx.encode(tx).finish();
    return txbz;
}

exports.KeyBase = KeyBase;
exports.Client = Client;
exports.openDB = open;
exports.pbToObj = pbToObj;
exports.weave = weave;
exports.loadJSON = loadJSON;
exports.buildSendTx = buildSendTx;