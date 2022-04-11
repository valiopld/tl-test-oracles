const rpcConnect = {
    username: 'val',
    password: 'val'
};

const commonConfig = {
    numberPrecision: 4, // how many digits after demical point,
    checkBlockInterval: 1000,
    addOrderInterval: 10000,
    numberTraders: 5,
    ltcForEach: 0.02,
    tokensForEach: 0.2,
};


const contractConfig = {
    adminAddress: 'QQfjT1ypFme1oT5axzouHU7ubBE7nvrD8d',
    contractCode: 'test-oracle-4',
    contractId: 6,
    propId: 4,
};

module.exports = {
    rpcConnect,
    commonConfig,
    contractConfig,
}
