const { contractConfig } = require("./config");
const client = require("./rpc");
const { safeNumber, logger } = require("./utils");

let lastPrice = 100;
const setPrice = async () => {
    const adminAddress = contractConfig.adminAddress;
    const contractCode = contractConfig.contractCode;
    
    // formula for getting random price (if price < 20 auto go to +100);
    const _price = lastPrice > 20 
        ? (Math.random() - 0.5) * (Math.random() * 20) + lastPrice
        : 100 + lastPrice;

    const price = safeNumber(_price);

    // high, low and close price are th same;
    const highPrice = price;
    const lowPrice = price;
    const closePrice = price;

    const params = [ adminAddress, contractCode, highPrice, lowPrice, closePrice ];
    const res = await client.call('tl_setoracle', ...params);
    if (res.error || !res.data) {
        lastPrice = price;
        logger(`tl_setoracle: ${res.error || 'Undefined Error'}`);
        return;
    }
    logger(`New Price - ${price}: ${res.data}`);
};

module.exports = {
    setPrice,
    lastPrice,
};