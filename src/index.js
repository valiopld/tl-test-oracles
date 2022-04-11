const { commonConfig  } = require('./config');
const { generateRandomOrders, getTradersFromFile } = require('./order-manager');
const client = require('./rpc');
const { setPrice } = require('./set-price');
const { logger } = require('./utils');

class Manager {
    lastBlock = 0;
    constructor() {
        logger(`------------------------------------------`);
        logger(`New Manager Initialized`);
        this.handleNewBlocks();
        this.startGeneratingOrders();
    }

    async startGeneratingOrders() {
        const traders = await getTradersFromFile();
        if (!traders.length) return logger('Error with getting Traders from file');

        setInterval(async () => {
            await generateRandomOrders();
        }, commonConfig.addOrderInterval);
    }

    handleNewBlocks() {
        setInterval(async () => {
            // getting block hight from tl_getinfo - may be replaced with getbestblockhash
            const res = await client.call('tl_getinfo');
            if (res.error || !res.data) {
                logger(`tl_getinfo: ${res.error || 'Undefined Error'}`);
                return;
            }
            const block = res.data.block;
            if (block > this.lastBlock) {
                this.lastBlock = block;
                this.onNewBlock();
            }
        }, commonConfig.checkBlockInterval);
    }

    onNewBlock() {
        logger(`New block: ${this.lastBlock}`);
        setPrice();
    }

    waitOneBlock() {
        logger(`Waiting 1 block. Please do not terminate the script.`);
        let initBlock = this.lastBlock;
        return new Promise((res, rej) => {
            const int = setInterval(() => {
                const lastBlock = this.lastBlock;
                if (!initBlock) initBlock = lastBlock;
                if (lastBlock && initBlock && lastBlock > initBlock) {
                    clearInterval(int);
                    logger(`Continue...`);
                    res(true);
                }
            }, commonConfig.checkBlockInterval);
        })
    }
}

new Manager();