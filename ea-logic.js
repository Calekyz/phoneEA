const SWING_STRENGTH = 30;
const LOT_SIZE = 0.05;
const REWARD_RISK_RATIO = 3.0;
const MAX_OPEN_POSITIONS = 5;
const BUY_FIB_LEVELS = [0.382, 0.618];
const SELL_FIB_LEVELS = [0.382, 0.618, 0.786];

function countOpenPositions(terminalState, symbol) {
    const positions = terminalState.positions || [];
    return positions.filter(p => p.symbol === symbol).length;
}

function getRecentSwingLevels(rates, swingStrength) {
    let recentHigh = 0;
    let recentLow = Infinity;
    for (let i = swingStrength; i < rates.length - swingStrength; i++) {
        let isHigh = true;
        let isLow = true;
        for (let j = 1; j <= swingStrength; j++) {
            if (rates[i].high <= rates[i - j].high || rates[i].high <= rates[i + j].high) isHigh = false;
            if (rates[i].low >= rates[i - j].low || rates[i].low >= rates[i + j].low) isLow = false;
        }
        if (isHigh && rates[i].high > recentHigh) recentHigh = rates[i].high;
        if (isLow && rates[i].low < recentLow) recentLow = rates[i].low;
    }
    return { recentHigh, recentLow };
}

async function runBotForClient(connection, symbol = 'EURUSD') {
    console.log(`Starting Kairon Swing Master on ${symbol}`);
    await connection.subscribeToMarketData(symbol);
    let lastBarTime = 0;

    while (true) {
        try {
            const rates = await connection.getRates(symbol, 'M5', 100);
            if (!rates || rates.length < 70) {
                await new Promise(r => setTimeout(r, 5000));
                continue;
            }

            const latestBarTime = rates[0].time;
            if (latestBarTime === lastBarTime) {
                await new Promise(r => setTimeout(r, 5000));
                continue;
            }
            lastBarTime = latestBarTime;

            const terminalState = connection.terminalState;
            const openPositions = countOpenPositions(terminalState, symbol);
            if (openPositions >= MAX_OPEN_POSITIONS) continue;

            const { recentHigh, recentLow } = getRecentSwingLevels(rates, SWING_STRENGTH);
            if (recentHigh === 0 || recentLow === Infinity) continue;

            const fibRange = recentHigh - recentLow;
            const prevClose = rates[1].close;
            const currentClose = rates[0].close;

            // Buy signals
            for (const fib of BUY_FIB_LEVELS) {
                const fibPrice = recentHigh - fibRange * fib;
                if (prevClose >= fibPrice && currentClose < fibPrice) {
                    const ask = (await connection.getSymbolPrice(symbol)).ask;
                    const slPrice = recentLow;
                    const risk = ask - slPrice;
                    const tpPrice = ask + risk * REWARD_RISK_RATIO;
                    if (slPrice > 0 && slPrice < ask && tpPrice > ask) {
                        await connection.createMarketBuyOrder(symbol, LOT_SIZE, slPrice, tpPrice, { comment: 'Kairon Buy' });
                        console.log(`Buy order placed on ${symbol}`);
                    }
                    break;
                }
            }

            // Sell signals
            for (const fib of SELL_FIB_LEVELS) {
                const fibPrice = recentHigh - fibRange * fib;
                if (prevClose <= fibPrice && currentClose > fibPrice) {
                    const bid = (await connection.getSymbolPrice(symbol)).bid;
                    const slPrice = recentHigh;
                    const risk = slPrice - bid;
                    const tpPrice = bid - risk * REWARD_RISK_RATIO;
                    if (slPrice > bid && tpPrice < bid) {
                        await connection.createMarketSellOrder(symbol, LOT_SIZE, slPrice, tpPrice, { comment: 'Kairon Sell' });
                        console.log(`Sell order placed on ${symbol}`);
                    }
                    break;
                }
            }
        } catch (err) {
            console.error('Bot loop error:', err);
        }
        await new Promise(r => setTimeout(r, 5000));
    }
}

module.exports = { runBotForClient };
