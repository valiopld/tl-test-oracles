const { commonConfig, contractConfig } = require("./config");
const { getTradersFromFile } = require("./order-manager");
const client = require("./rpc");
const { logger, checkKycRegistered } = require("./utils");

const main = async () => {
    const traders = await getTradersFromFile();
    if (!traders?.length) return logger('Error with getting Traders from file');
    let count = 0;
    for (let i = 0; i < traders.length; i++) {
        const traderAddress = traders[i];
        const isAttisted = await checkKycRegistered(traderAddress);
        if (isAttisted) {
            logger(`${traderAddress} is already self-attisted`);
            continue;
        }
        const attestRes = await client.call('tl_attestation', traderAddress, traderAddress);
        if (attestRes.error || !attestRes.data) {
            logger(`Error tl_send: ${attestRes.error || 'undifined'}`);
            continue;
        };
        logger(`${traderAddress} was self-attested: ${attestRes.data}`);
        count++;
    }
    logger(`${count} addresses was self-attested`);
};

main();
