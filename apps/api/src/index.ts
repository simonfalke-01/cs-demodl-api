import { Elysia, t } from 'elysia'
import { swagger } from '@elysiajs/swagger'
import { IPCServer } from '@repo/uds-ipc/server'

// Response schemas
const SuccessResponseSchema = t.Object({
    success: t.Literal(true),
    message: t.String(),
    data: t.Object({
        sharecode: t.String(),
        demo_url: t.String()
    })
});

const ErrorResponseSchema = t.Object({
    success: t.Literal(false),
    message: t.String(),
    data: t.Object({
        sharecode: t.String()
    })
});

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
    .use(swagger({
        documentation: {
            info: {
                title: 'CS2 Demo URL Retriver API',
                version: '1.0.0',
                description: 'A system for retrieving CS2 Demo URLs with game share codes using the CS2 Game Coordinator.',
            },
            tags: [
                { name: 'Demo', description: 'CS2 demo operations' }
            ]
        }
    }))
    .get('/api/:shareCode', async ({ params: { shareCode } }) => {
        if (demoURLs[shareCode]) {
            return { 
                success: true,
                message: "Demo URL has been retrieved.",
                data: {
                    sharecode: shareCode,
                    demo_url: demoURLs[shareCode]
                }
            };
        }
        
        ipc.broadcast({
            shareCode: shareCode
        });
        
        return new Promise((resolve, reject) => {
            const timeout = 500;
            
            const timer = setTimeout(() => {
                if (pendingRequests[shareCode]) {
                    delete pendingRequests[shareCode];
                    resolve({ 
                        success: false,
                        message: "ShareCode does not exist or has expired.",
                        data: {
                            sharecode: shareCode
                        }
                    });
                }
            }, timeout);
            
            pendingRequests[shareCode] = {
                resolve: (demoURL) => {
                    resolve({ 
                        success: true,
                        message: "Demo URL has been retrieved.",
                        data: {
                            sharecode: shareCode,
                            demo_url: demoURL
                        }
                    });
                },
                reject,
                timer
            };
        });
    }, {
        detail: {
            tags: ['Demo'],
            summary: 'Get CS2 demo download URL',
            description: 'Retrieves the demo download URL for a given CS2 share code. Returns immediately if cached, otherwise queries the CS2 Game Coordinator.',
            parameters: [
                {
                    name: 'shareCode',
                    in: 'path',
                    description: 'CS2 match share code (e.g., CSGO-LkCOc-UwdN3-dkQBV-F9Sxz-KeS8N)',
                    required: true,
                    schema: {
                        type: 'string',
                        pattern: '^CSGO-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}-[A-Za-z0-9]{5}-[A-Za-z0-9]{8}[A-Za-z0-9]*$',
                        example: 'CSGO-LkCOc-UwdN3-dkQBV-F9Sxz-KeS8N'
                    }
                }
            ],
            responses: {
                '200': {
                    description: 'Success - Demo URL retrieved or ShareCode invalid/expired',
                    content: {
                        'application/json': {
                            schema: {
                                oneOf: [
                                    {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean', enum: [true] },
                                            message: { type: 'string', example: 'Demo URL has been retrieved.' },
                                            data: {
                                                type: 'object',
                                                properties: {
                                                    sharecode: { type: 'string', example: 'CSGO-LkCOc-UwdN3-dkQBV-F9Sxz-KeS8N' },
                                                    demo_url: { type: 'string', example: 'http://replay403.valve.net/730/003746913113794936940_1899413587.dem.bz2' }
                                                }
                                            }
                                        }
                                    },
                                    {
                                        type: 'object',
                                        properties: {
                                            success: { type: 'boolean', enum: [false] },
                                            message: { type: 'string', example: 'ShareCode does not exist or has expired.' },
                                            data: {
                                                type: 'object',
                                                properties: {
                                                    sharecode: { type: 'string', example: 'CSGO-LkCOc-UwdN3-dkQBV-F9Sxz-KeS8N' }
                                                }
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        }
    })
    .listen({
        hostname: '0.0.0.0',
        port: 3000
    })
    
console.log(
    `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
)