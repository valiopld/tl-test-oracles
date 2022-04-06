const tlRpc = require('tl-rpc');


const client = new tlRpc.RpcClient({
    username: "",
    password: "",
    // host: string;
    // port: number;
    // timeout: number;
});
const adminAddress = "";
const contractCode = 1;


// ----------------------- Noise Trade Generator ----------------------- //
const noiseTradeGenerator = async () => {
    const traderQuantity = 5;
    const account = 'test1Acc';
    const avgTraderSize = 1000;
    const sizePowerLaw = 10;
    const avgTradeFrequency = 5;
    const period = (60*60*4*1000)/100;

    const generateTraders = async (quantity, account) => {
        const traders = [];
        for (let i = 0; i < quantity; i++) {
            const res = await client.call('getnewaddress', account);
            if (res.error || !res.data) {
                console.log(`Error: ${res.error || 'getnewaddress undefined error'}`);
                continue;
            }
            const address = res.data;
            const avgSize = avgTraderSize*(sizePowerLaw*Math.random())*Math.random();
            const avgFrequency = Math.round(Math.random()*avgTradeFrequency*2);
            const aggression = Math.random()*10;
            const trader = { address, avgSize, avgFrequency, aggression };
            traders.push(trader);
        }
        return traders;
    };

    const startTrading = (traders) => {
        let loops = 0;
        setInterval(async () => {
            loops++;
            const tradersThisLoop = traders.filter(t => loops%t.avgFrequency);
            
            for (let i = 0; i < tradersThisLoop.length; i++) {
                const trader = tradersThisLoop[i];
                const type = Math.random() > 0.5 ? 1 : 2;
                const price = 2000*Math.random();
                const amount = 40;
                const leverage = 2;
                const params = [ trader.address, contractCode, amount, price, type, leverage ];
                const res = await client.call('tl_tradecontract', ...params);
                console.log({res});
            }
        }, period);
    };

    const traders = await generateTraders(traderQuantity, account);
    startTrading(traders);
};

// noiseTradeGenerator();
// ----------------------- End Noise Trade Generator ----------------------- //


// ----------------------- Volatility Random Walk Oracle ----------------------- //

const volatilityRandomWalkOracle = async () => {

    const getRandomArbitrary = (min, max) => Math.random() * (max - min) + min;

    const period = (60*60*4*1000)/100;
    const startingPrice = 1000;
    const range = 0.01;
    const volSpikeFrequency = 3;
    const modHalfLife = 4;
    const publishEveryNPeriods = 10;

    let rangeModifier = 1;
    let price = startingPrice;
    let loops = 0;

    setInterval(async () => {
        loops++;
        console.log(`Loops: ${loops} - Recent print: ${price}`);
        price *= Math.round(1+getRandomArbitrary(range*-1*rangeModifier,range*rangeModifier)*100)/100;
        if (loops % volSpikeFrequency) rangeModifier += Math.random();
        rangeModifier *= 1-(1/modHalfLife*2);
        if(loops % publishEveryNPeriods) {
            const params = [ adminAddress, contractCode, price, price, price ];
            const res = await client.call('tl_setoracle', ...params);
            console.log(res);
        }
    }, period);
};

// volatilityRandomWalkOracle();
// ----------------------- End Volatility Random Walk Oracle ----------------------- //