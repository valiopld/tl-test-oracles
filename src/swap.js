const { contractConfig } = require("./config");
const client = require("./rpc");
const { logger, safeNumber } = require("./utils");

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
    logger(`Multisig Channel Address: ${msData.address}`);

    //util extraxtUTXOInfo() (used for extracting utxo info from commit TXs)
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
    const ctcResFirst = await client.call("tl_commit_tochannel", ...firstCommitOptions);
    if (ctcResFirst.error || !ctcResFirst.data) throw(`tl_commit_tochannel error: ${ctcResFirst.error}`);
    const firstCommit = ctcResFirst.data;
    const firstCommitUTXORes = await extraxtUTXOInfo(firstCommit);
    if (firstCommitUTXORes.error || !firstCommitUTXORes.data) throw (`extraxtUTXOInfo-first: ${firstCommitUTXORes.error}`);
    const firstCommitUTXO = firstCommitUTXORes.data;

    // second commit 
    const secondCommitOptions = [
        oldOrder.address,
        msData.address,
        contractConfig.propId,
        (amount).toString(),
    ];
    const ctcResSecond = await client.call("tl_commit_tochannel", ...secondCommitOptions);
    if (ctcResSecond.error || !ctcResSecond.data) throw(`tl_commit_tochannel error: ${ctcResSecond.error}`);
    const secondCommit = ctcResSecond.data;
    const secondCommitUTXORes = await extraxtUTXOInfo(secondCommit);
    if (secondCommitUTXORes.error || !secondCommitUTXORes.data) throw (`extraxtUTXOInfo-second: ${secondCommitUTXORes.error}`);
    const secondCommitUTXO = secondCommitUTXORes.data;


    // get bestblock
    const bbhRes = await client.call('getbestblockhash');
    if (bbhRes.error || !bbhRes.data) throw(`getbestblockhash: ${bbhRes.error}`);
    const bbRes = await client.call('getblock', bbhRes.data);
    if (bbRes.error || !bbRes.data?.height) throw(`getblock: ${bbRes.error}`);
    const height = bbRes.data.height + 100;
    
    // creating the payload
    const cpcitOptions = [
        contractConfig.contractId,
        (2).toString(),
        height,
        (price).toString(),
        oldOrder.action === "BUY" ? 1 : 2,
        (1).toString(),
    ];
    const cpcitRes = await client.call('tl_createpayload_contract_instant_trade', ...cpcitOptions);
    if (cpcitRes.error || !cpcitRes.data) throw(`tl_createpayload_contract_instant_trade: ${cpcitRes.error}`);
    const payload = cpcitRes.data;
    //build transaction

    //add one more UTXO for from secondOrder's address for fees (0.000036 ltc)
    const minTxFee = 0.000036;
    const luRes = await client.call('listunspent', 0, 999999999, [newOrder.address]);
    if (luRes.error || !luRes.data) throw(`listunspent: ${luRes.error}`);
    if (!luRes.data.length) throw(`${oldOrder.address} not enaught balance for for fees`);
    const sortedArray = [...luRes.data].sort((a, b) => a.amount - b.amount);
    const utxoForFees = sortedArray.find(u => u.amount >= minTxFee);
    if (!utxoForFees) throw(`${oldOrder.address}: Not found utxos for fees (>0.000035).UTXOs: ${sortedArray.length}`);

    // counting the change
    const change = utxoForFees.amount > minTxFee ? safeNumber(utxoForFees.amount - minTxFee, 10) : 0;

    //adding all utxos in VINs
    const _inputsForCreateRawTx = [firstCommitUTXO, secondCommitUTXO, utxoForFees].map(i => ({ txid: i.txid, vout: i.vout }));
    const crtRes = await client.call('createrawtransaction', _inputsForCreateRawTx, {});
    if (crtRes.error || !crtRes.data) throw(`createrawtransaction: ${crtRes.error}`);

    //add first vOUT
    const crtxrResFirst = await client.call('tl_createrawtx_reference', crtRes.data, oldOrder.address);
    if (crtxrResFirst.error || !crtxrResFirst.data) throw(`tl_createrawtx_reference-first: ${crtxrResFirst.error}`);

    //add second vOUT
    const crtxrResSecond = await client.call('tl_createrawtx_reference', crtxrResFirst.data, newOrder.address, change);
    if (crtxrResSecond.error || !crtxrResSecond.data) throw(`tl_createrawtx_reference-second: ${crtxrResSecond.error}`);

    //add payload
    const crtxoRes = await client.call('tl_createrawtx_opreturn', crtxrResSecond.data, payload);
    if (crtxoRes.error || !crtxoRes.data) throw(`tl_createrawtx_opreturn: ${crtxoRes.error}`);

    //singing the transaction
    const signRes = await client.call('signrawtransaction', crtxoRes.data);
    if (signRes.error || !signRes.data?.hex) throw(`signrawtransaction: ${signRes.error}`);
    if (!signRes.data.complete) throw(`signrawtransaction: not completed`);

    //sending the transaction
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