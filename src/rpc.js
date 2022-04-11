const tlRpc = require('tl-rpc');
const { rpcConnect } = require('./config');


const client = new tlRpc.RpcClient({
    username: rpcConnect.username,
    password: rpcConnect.password,
    // host: string;
    // port: number;
    // timeout: number;
});

module.exports = client;