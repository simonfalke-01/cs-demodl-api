import { Elysia } from 'elysia'
import { IPCServer } from '@repo/uds-ipc/server'

// Store for tracking pending requests
type PendingRequest = {
    resolve: (demoURL: string) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
};

let pendingRequests: Record<string, PendingRequest> = {};
let demoURLs: Record<string, string> = {};

const ipc = new IPCServer('/tmp/cs-demo.sock');

ipc.on('listening', (socketPath: string) => {
    console.log(`IPC server is listening on ${socketPath}`);
});

ipc.on('message', (message) => {
    console.log('Received:', message);
    if (message.shareCode && message.demoURL) {
        demoURLs[message.shareCode] = message.demoURL;
        
        if (pendingRequests[message.shareCode]) {
            const { resolve, timer } = pendingRequests[message.shareCode];
            clearTimeout(timer);
            resolve(message.demoURL);
            delete pendingRequests[message.shareCode];
        }
    }
});

ipc.on('error', (err: Error) => {
    console.error('IPC error:', err);
});

const app = new Elysia()
    .get('/api/:shareCode', async ({ params: { shareCode } }) => {
        if (demoURLs[shareCode]) {
            return { 
                shareCode: shareCode,
                demoURL: demoURLs[shareCode]
            };
        }
        
        ipc.broadcast({
            shareCode: shareCode
        });
        
        return new Promise((resolve, reject) => {
            const timeout = 10000;
            
            const timer = setTimeout(() => {
                if (pendingRequests[shareCode]) {
                    delete pendingRequests[shareCode];
                    resolve({ 
                        error: "Timeout waiting for demo URL",
                        shareCode: shareCode
                    });
                }
            }, timeout);
            
            pendingRequests[shareCode] = {
                resolve: (demoURL) => {
                    resolve({ 
                        shareCode: shareCode,
                        demoURL: demoURL
                    });
                },
                reject,
                timer
            };
        });
    })
    .listen({
        hostname: '0.0.0.0',
        port: 3000
    })
    
console.log(
    `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
)