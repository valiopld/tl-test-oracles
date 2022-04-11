const { contractConfig } = require("./config");
const client = require("./rpc");
const { logger } = require("./utils");

const generateNewSwap = async (newOrder, oldOrder) => {
    try {
        const amount = newOrder.amount >= oldOrder.amount
        ? oldOrder.amount
        : newOrder.amount;
    
    const price = oldOrder.price;
    logger(`Trade start: price: ${price} Amount: ${amount}`);

    // generate multisig

    const addresses = [newOrder.address, oldOrder.address];

    const amaRes = await client.call("addmultisigaddress", 2, addresses);
    if (amaRes.error || !amaRes.data) throw(`addmultisigaddress error: ${amaRes.error}`);
    const msData = amaRes.data;

    // validate the multisig
    const validateMS = await client.call("validateaddress", msData.address);
    if (validateMS.error || !validateMS.data?.scriptPubKey) throw(`validateaddress error: ${validateMS.error}`);
    msData.scriptPubKey = validateMS.data.scriptPubKey;


    const extraxtUTXOInfo = async (txid) => {
        const gtRes = await client.call("gettransaction", txid);
        if (gtRes.error || !gtRes.data?.hex)  return { error: `gettransaction: ${gtRes.error}`};
        const drtRes = await client.call("decoderawtransaction", gtRes.data.hex);
        if (drtRes.error || !drtRes.data?.vout) return { error: `decoderawtransaction: ${drtRes.error}`};
        const vout = drtRes.data.vout.find((o) => o.scriptPubKey?.addresses?.[0] === msData.address);
        if (!vout) return { error: 'Undefined Error' };
        const utxoData = {
            amount: vout.value,
            vout: vout.n,
            txid: txid,
        };
        return { data: utxoData };
    }
    // first commit
    const firstCommitOptions = [
        newOrder.address,
        msData.address,
        contractConfig.propId,
        (amount).toString(),
    ];
    // const ctcResFirst = await client.call("tl_commit_tochannel", ...firstCommitOptions);
    // if (ctcResFirst.error || !ctcResFirst.data) throw(`tl_commit_tochannel error: ${ctcResFirst.error}`);
    // const firstCommit = ctcResFirst.data;
    // const firstCommitUTXORes = await extraxtUTXOInfo(firstCommit);
    // if (firstCommitUTXORes.error || !firstCommitUTXORes.data) throw (`extraxtUTXOInfo-first: ${firstCommitUTXORes.error}`);
    // const firstCommitUTXO = firstCommitUTXORes.data;

    // second commit 
    const secondCommitOptions = [
        oldOrder.address,
        msData.address,
        contractConfig.propId,
        (amount).toString(),
    ];
    // const ctcResSecond = await client.call("tl_commit_tochannel", ...secondCommitOptions);
    // if (ctcResSecond.error || !ctcResSecond.data) throw(`tl_commit_tochannel error: ${ctcResSecond.error}`);
    // const secondCommit = ctcResSecond.data;
    // const secondCommitUTXORes = await extraxtUTXOInfo(secondCommit);
    // if (secondCommitUTXORes.error || !secondCommitUTXORes.data) throw (`extraxtUTXOInfo-second: ${secondCommitUTXORes.error}`);
    // const secondCommitUTXO = secondCommitUTXORes.data;

    const firstCommitUTXO = {
        amount: 0.000036,
        vout: 1,
        txid: '64ed52bfb7d4e05e0dd2974f236c4b75b56395f1ef51148a8575f6b006e6b032'
      };

    const secondCommitUTXO = {
    amount: 0.000036,
    vout: 2,
    txid: 'a24799e15f343ae5980486f7c5ebda778c27338c7e1207a630c206a768e18302'
    };


    // get bestblock
    const bbhRes = await client.call('getbestblockhash');
    if (bbhRes.error || !bbhRes.data) throw(`getbestblockhash: ${bbhRes.error}`);
    const bbRes = await client.call('getblock', bbhRes.data);
    if (bbRes.error || !bbRes.data?.height) throw(`getblock: ${bbRes.error}`);
    const height = bbRes.data.height + 100;
    
    // creating the payload
    const cpcitOptions = [
        contractConfig.contractId,
        (amount).toString(),
        height,
        (100).toString(),
        1,
        (2).toString(),
    ];
    const cpcitRes = await client.call('tl_createpayload_contract_instant_trade', ...cpcitOptions);
    if (cpcitRes.error || !cpcitRes.data) throw(`tl_createpayload_contract_instant_trade: ${cpcitRes.error}`);
    const payload = cpcitRes.data;

    //build transaction

    const _inputsForCreateRawTx = [firstCommitUTXO, secondCommitUTXO].map(i => ({ txid: i.txid, vout: i.vout }));
    const crtRes = await client.call('createrawtransaction', _inputsForCreateRawTx, {});
    if (crtRes.error || !crtRes.data) throw(`createrawtransaction: ${crtRes.error}`);

    const crtxrResFirst = await client.call('tl_createrawtx_reference', crtRes.data, oldOrder.address);
    if (crtxrResFirst.error || !crtxrResFirst.data) throw(`tl_createrawtx_reference-first: ${crtxrResFirst.error}`);

    const crtxrResSecond = await client.call('tl_createrawtx_reference', crtxrResFirst.data, newOrder.address);
    if (crtxrResSecond.error || !crtxrResSecond.data) throw(`tl_createrawtx_reference-second: ${crtxrResSecond.error}`);

    const crtxoRes = await client.call('tl_createrawtx_opreturn', crtxrResSecond.data, payload);
    if (crtxoRes.error || !crtxoRes.data) throw(`tl_createrawtx_opreturn: ${crtxoRes.error}`);

    const signRes = await client.call('signrawtransaction', crtxoRes.data);
    if (signRes.error || !signRes.data?.hex) throw(`signrawtransaction: ${signRes.error}`);
    if (!signRes.data.complete) throw(`signrawtransaction: not completed`);

    const sendRes = await client.call('sendrawtransaction', signRes.data.hex);
    if (sendRes.error || !sendRes.data) throw(`sendrawtransaction: ${sendRes.error}`);
    const finalRes = sendRes.data;
    logger(`Trade finish: ${finalRes}, amount: ${amount}, price: ${price}`);
    } catch(error) {
        logger(error);
    }

};

module.exports = {
    generateNewSwap,
}