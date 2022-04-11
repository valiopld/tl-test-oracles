const { commonConfig } = require("./config");
const { getTradersFromFile } = require("./order-manager");
const client = require("./rpc");
const { logger } = require("./utils");

const main = async () => {
    const traders = await getTradersFromFile();
    if (!traders?.length) return logger('Error with getting Traders from file');
    const ltcForEach = commonConfig.ltcForEach;
    const traderBalanceArray = traders.reduce((a, v) => ({ ...a, [v]: ltcForEach}), {});
    const smParams = ['tl-wallet', traderBalanceArray];
    const smRes = await client.call('sendmany', ...smParams);
    if (smRes.error || !smRes.data) {
        logger(`Error sendmany: ${smRes.error || 'undifined'}`);
        return false
    };
    logger(`${traders.length} addresses was funded with ${ltcForEach} ltc: ${smRes.data}`);
};

main();