const { commonConfig, contractConfig } = require("./config");
const { getTradersFromFile } = require("./order-manager");
const client = require("./rpc");
const { logger, checkKycRegistered } = require("./utils");

const main = async () => {
    const traders = await getTradersFromFile();
    if (!traders?.length) return logger('Error with getting Traders from file');

    const tokensForEach = commonConfig.tokensForEach;
    const propId = contractConfig.propId;
    const adminAddress = contractConfig.adminAddress;
    let count = 0;
    for (let i = 0; i < traders.length; i++) {
        const traderAddress = traders[i];
        const isAttisted = await checkKycRegistered(traderAddress);
        if (!isAttisted) {
            logger(`Error ${traderAddress} is not self-attisted`);
            continue;
        }
        const sendParams = [adminAddress, traderAddress, propId, (tokensForEach).toString()];
        const sendRes = await client.call('tl_send', ...sendParams);
        if (sendRes.error || !sendRes.data) {
            logger(`Error tl_send: ${sendRes.error || 'undifined'}`);
            continue;
        };
        count++;
        logger(`${traderAddress} was funded with ${tokensForEach} tokens ID: ${propId}: ${sendRes.data}`);
    }
    logger(`${count} addresses was funded with ${tokensForEach} tokens ID: ${propId}`);
};

main();
