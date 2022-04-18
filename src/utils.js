const { commonConfig } = require("./config");
const fs = require('fs');
const moment = require("moment");
const client = require("./rpc");

const precision = commonConfig.numberPrecision;
const safeNumber = (n, p = precision) => parseFloat((n).toFixed(p));


const logger = (message, logInConsole=true) => {
    try {
        if (logInConsole) {
            // console.log(message);
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(message);
        }
        const time = moment().format('DD-MM-YYYY hh:mm:ss');
        const content = `${time}: ${(message)?.toString() || ''} \n`
        fs.appendFileSync('./debug.log', content);
    } catch (error) {
        console.log(`Error with writing logs: ${error}`);
    }
}


const checkKycRegistered = async (address) => {
    const listAttRes = await client.call('tl_list_attestation');
    if (listAttRes.error || !listAttRes.data?.length) return false;
    const isAttisted = listAttRes.data.some(a => a['att sender'] === address && a['att receiver'] === address);
    return isAttisted
};

module.exports = {
    safeNumber,
    logger,
    checkKycRegistered,
};