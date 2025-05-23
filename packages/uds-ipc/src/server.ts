import net from 'net';
import fs from 'fs';
import { EventEmitter } from 'events';

export class IPCServer extends EventEmitter {
    private server!: net.Server;
    private clients: Set<net.Socket> = new Set();
    private readonly socketPath: string;

    constructor(socketPath: string) {
       super();
       this.socketPath = socketPath;
       this.cleanup();
       this.createServer();
    }

    private cleanup() {
        if (fs.existsSync(this.socketPath)) {
            fs.unlinkSync(this.socketPath);
        }
    }

    private createServer() {
        this.server = net.createServer((client) => {
            this.clients.add(client);
            client.on('data', (data) => {
                const message = data.toString();
                this.handleClientMessage(client, data);
            });

            client.on('error', (err) => {
                this.emit('error', err);
                this.clients.delete(client);
            });

            client.on('close', () => {
                this.clients.delete(client);
            });
        });

        this.server.listen(this.socketPath, () => {
            this.emit('listening', this.socketPath);
        });
    }

    private handleClientMessage(socket: net.Socket, data: Buffer) {
        try {
            const messages = data.toString().split('\n').filter(Boolean);

            for (const messageStr of messages) {
                try {
                    const jsonMessage = JSON.parse(messageStr);
                    this.emit('message', jsonMessage);
                } catch (jsonError) {
                    console.error('Error parsing JSON:', jsonError);
                }
            }
        } catch (error) {
            console.error('Error handling client message:', error);
        }
    }

    broadcast(message: any) {
        const jsonString = JSON.stringify(message) + '\n';
        const data = Buffer.from(jsonString);

        this.clients.forEach((client) => {
            try {
                client.write(data);
            } catch (error) {
                this.emit('error', error);
            }
        });
    }
}