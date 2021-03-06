const rpcConnect = {
    username: 'val', // rpc username
    password: 'val', // rpc password
};

const commonConfig = {
    numberPrecision: 4, // how many digits after demical point (about numbers),
    checkBlockInterval: 1000, // how often is checked for new block (ms)
    addOrderInterval: 3000, // how often is placed new random Order (ms)
    numberTraders: 5, // how many traders to generaete when "npm run generate-traders"
    ltcForEach: 0.02, // when funding with "npm run fund-ltc", the ltc come from contractConfig.adminAddress
    tokensForEach: 0.2, // when funding with "npm run fund-tokens", the ltc come from contractConfig.adminAddress
};


const contractConfig = {
    adminAddress: 'QSG2suaAhJrqUpdLtcoczw8Bkg9hZn24qk', // admoin address for the contract,
    contractCode: 'test-oracle-9', // contract name
    contractId: 9, // contract id
    propId: 4, // collateral id
};

module.exports = {
    rpcConnect,
    commonConfig,
    contractConfig,
}
