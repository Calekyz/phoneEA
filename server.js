require('dotenv').config();
const express = require('express');
const MetaApi = require('metaapi.cloud-sdk').default;
const { runBotForClient } = require('./ea-logic');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const metaApi = new MetaApi(process.env.METAAPI_ADMIN_TOKEN);
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
        let accounts = await metaApi.metatraderAccountApi.getAccounts();
        let account = accounts.find(a => a.login === login.toString() && a.server === server);

        if (!account) {
            account = await metaApi.metatraderAccountApi.createAccount({
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
        }

        const connection = account.getStreamingConnection();
        await connection.connect();
        console.log(`Connected to MT5 account ${login}`);

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
