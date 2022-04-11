const { commonConfig } = require("./config");
const client = require("./rpc");
const fs = require('fs');

const generateTraders = (n) => {
    return new Promise(async (res, rej) => {
        const traders = [];
        for (let i = 0; i < n; i++) {
            const res = await client.call('getnewaddress', 'test-oracles-account');
            if (res.error || !res.data) {
                logger(`Error: ${res.error || 'getnewaddress undefined error'}`);
                continue;
            }
            traders.push(res.data);
        }
        const fileData = (traders).toString().replaceAll(',','\r\n') + '\r\n';
        fs.appendFileSync('./traders.csv', fileData);
        res(true);
    });
};

const main = async () => {
    const n = commonConfig.numberTraders;
    await generateTraders(n);
};

main();

