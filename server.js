// server.js
require('dotenv').config();
const express = require('express');
const MetaApi = require('metaapi.cloud-sdk');
const { runBotForClient } = require('./ea-logic');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const api = new MetaApi(process.env.METAAPI_ADMIN_TOKEN);
const activeBots = new Map();

app.post('/api/start-bot', async (req, res) => {
    const { login, password, server, symbol = 'EURUSD' } = req.body;

    if (!login || !password || !server) {
        return res.status(400).json({ error: 'Missing MT5 credentials' });
    }

    const accountId = `${login}@${server}`;

    if (activeBots.has(accountId)) {
        return res.json({ message: 'Bot already running for this account' });
    }

    try {
        // Get existing accounts using the current method
        const accounts = await api.metatraderAccountApi.getAccountsWithInfiniteScrollPagination();
        let account = accounts.find(a => a.login === login.toString() && a.server === server);

        if (!account) {
            // Create a new account if it doesn't exist
            account = await api.metatraderAccountApi.createAccount({
                name: `Client ${login}`,
                type: 'cloud',
                login: login.toString(),
                password: password,
                server: server,
                platform: 'mt5',
                magic: 123456,
                application: 'KaironSwingMaster'
            });
            console.log(`Created new MetaApi account: ${account.id}`);
        } else {
            console.log(`Found existing MetaApi account: ${account.id}`);
        }

        // Ensure the account is deployed and connected
        if (!account.connectionStatus || account.connectionStatus !== 'connected') {
            await account.deploy();
            await account.waitConnected();
            console.log(`Account ${login} deployed and connected`);
        }

        const connection = account.getStreamingConnection();
        await connection.connect();
        await connection.waitSynchronized();
        console.log(`Connected to MT5 account ${login}`);

        // Start the bot in the background
        const botPromise = runBotForClient(connection, symbol);
        activeBots.set(accountId, botPromise);

        res.json({ success: true, message: 'Bot started successfully' });

        botPromise.catch(err => {
            console.error(`Bot crashed for ${login}:`, err);
            activeBots.delete(accountId);
        });
    } catch (err) {
        console.error('Error starting bot:', err);
        res.status(500).json({ error: err.message });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`Kairon platform running on port ${port}`);
});
