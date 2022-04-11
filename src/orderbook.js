const { generateNewSwap } = require("./swap");
const { logger, safeNumber } = require("./utils");

const orderbook = [];


const addToOrderBook = async (action, address, amount, price) => {
    const order = { action, address, amount, price };
    const orderMatch = checkOrderMatch(order);
    if (orderMatch) {
        if (orderMatch.address === address) return;

        if (amount >= orderMatch.amount) {
            const index = orderbook.indexOf(orderMatch);
            if (index < 0) return logger('Error with Removing matched order from orderbook');
            orderbook.splice(index, 1);
            if (amount === orderMatch.amount) return;
            const newAmount = safeNumber(amount - orderMatch.amount);
            addToOrderBook(action, address, newAmount, price);
        } else {
            const newAmount = safeNumber(orderMatch.amount - amount);
            orderMatch.amount = newAmount
        }
        await generateNewSwap(order, orderMatch);
    } else {
        orderbook.push(order);
    }
};

const checkOrderMatch = (order) => {
    const sortFunc = order.action === "BUY"
        ? (a, b) => a.action - b.action
        : (a, b) => b.action - a.action;

    const filteredOrders = orderbook.filter(({ action, price }) => {
        const buySellCheck = order.action === "BUY"
            ? action === "SELL"
            : action === "BUY";

        const priceCheck = order.action === "BUY"
            ? price <= order.price
            : price >= order.price
        return  buySellCheck && priceCheck;
    }).sort(sortFunc);

    return filteredOrders.length
        ? filteredOrders[0]
        : null;
};

module.exports = { 
    addToOrderBook,
}
