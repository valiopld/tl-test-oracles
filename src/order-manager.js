const { commonConfig, contractConfig } = require("./config");
const { addToOrderBook } = require("./orderbook");
const client = require("./rpc");
const { lastPrice } = require("./set-price");
const { safeNumber, logger } = require("./utils");
const fs = require('fs');

const traders = [];

const getBalanceForAddres = async (address) => {
    const luParams = [0, 999999999, [address]];
    const luRes = await client.call('listunspent', ...luParams);
    if (luRes.error || !luRes.data?.length) return 0;
    const balance = luRes.data
        .map(u => u.amount)
        .reduce((a, b) => a + b, 0);
    return balance;
};

const getTokensBalanceForAddress = async (address) => {
    const getBalanceRes = await client.call('tl_getallbalancesforaddress', address);
    if (getBalanceRes.error || !getBalanceRes.data) return 0;
    const _balance = getBalanceRes.data?.find(b => b.propertyid = contractConfig.propId)?.balance;
    const balance = _balance ? parseFloat(_balance) : 0;
    return balance;
};

const getRandomAmountFromAddress = async (address) => {
    const balance = await getTokensBalanceForAddress(address);
    const randomAmount = safeNumber(Math.random() * 0.2 * balance);
    return randomAmount;
};

const generateRandomOrders = async () => {
    const action = Math.random() > 0.5 ? 'BUY' : 'SELL';
    const address = traders[Math.floor(Math.random()*traders.length)];;
    const amount = await getRandomAmountFromAddress(address);
    if (!amount) return;
    const price = safeNumber(lastPrice + ((Math.random() - 0.5) * 10));
    addToOrderBook(action, address, amount, price);
};

const getTradersFromFile = async () => {
    try {
        const file = fs.readFileSync('./traders.csv', { encoding: 'utf8'});
        const arr = file?.split('\r\n').filter(e => e);
        if (!file || !arr?.length) throw('Traders csv file is empty or not found. Please generate traders first!');
        arr.forEach(a => traders.push(a));
        logger(`${arr.length} traders was imported!`);
        return traders;
    } catch (error) {
        logger(error);
        return false;
    }
};

module.exports = {
    traders,
    generateRandomOrders,
    getTradersFromFile,
}