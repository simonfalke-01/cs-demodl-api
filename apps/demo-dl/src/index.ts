import SteamUser from 'steam-user';
import GlobalOffensive from 'globaloffensive';
// @ts-ignore
import { ShareCode } from 'globaloffensive-sharecode';
import { IPCClient } from '@repo/uds-ipc/client';
import util from 'util';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

let matchIDs: Record<string, any> = {};

// Check for required environment variables
if (!process.env.STEAM_USERNAME || !process.env.STEAM_PASSWORD) {
    console.error('Error: STEAM_USERNAME and STEAM_PASSWORD environment variables must be set');
    process.exit(1);
}

let user = new SteamUser();

user.logOn({
    accountName: process.env.STEAM_USERNAME,
    password: process.env.STEAM_PASSWORD
});

let csgo = new GlobalOffensive(user);

user.on('loggedOn', () => {
  console.log('Steam logged in. Launching CS:GO...');
  user.gamesPlayed([730]);
});

user.on('error', (err) => {
    console.error('Error logging in:', err);
});

csgo.on('connectedToGC', () => {
    console.log('Connected to CS:GO GC');
});

// Create IPC client with message queuing capability
const ipc = new IPCClient('/tmp/cs-demo.sock');

ipc.on('connect', (socketPath) => {
    console.log(`Connected to IPC server at ${socketPath}.`);
});

ipc.on('message', (message) => {
    if (message.shareCode) {
        const shareCode = new ShareCode(message.shareCode);
        const data = shareCode.decode();
        matchIDs[data.matchId] = message.shareCode;

        csgo.requestGame(message.shareCode);
    }
});

ipc.on('error', (err: Error) => {
    console.error('IPC error:', err);
});

// Get CS:GO demo URL and send it when available
csgo.on('matchList', (matches, _) => {
    // log full matches
    // console.log(util.inspect(matches, {showHidden: false, depth: null, colors: true}))
    const demoURL = matches?.[0]?.['roundstatsall']?.at?.(-1)?.['map'];
    const matchID = matches?.[0]?.['matchid'];
    const shareCode = matchIDs[matchID];

    if (demoURL) {
        ipc.send({
            shareCode: shareCode,
            demoURL: demoURL
        });
    }
});