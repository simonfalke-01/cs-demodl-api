import net from 'net';
import fs from 'fs';
import { EventEmitter } from 'events';

export class IPCClient extends EventEmitter {
    private socket!: net.Socket;
    private readonly socketPath: string;
    private connected: boolean = false;
    private messageQueue: string[] = [];

    constructor(socketPath: string) {
        super();
        this.socketPath = socketPath;
        this.connect();
    }

    private connect() {
        this.socket = net.createConnection(this.socketPath);

        this.socket.on('connect', () => {
            this.connected = true;
            
            if (this.messageQueue.length > 0) {
                this.messageQueue.forEach(msg => {
                    this.socket.write(msg + '\n');
                });
                this.messageQueue = [];
            }
            
            this.emit('connect', this.socketPath);
        });

        this.socket.on('data', (data) => {
            const message = data.toString();
            this.handleServerMessage(data);
        });

        this.socket.on('error', (err) => {
            this.connected = false;
            this.emit('error', err);
        });

        this.socket.on('close', () => {
            this.connected = false;
            setTimeout(() => this.connect(), 1000);
        });
    }

    private handleServerMessage(data: Buffer) {
        try {
            const messages = data.toString().split('\n').filter(Boolean);

            for (const messageStr of messages) {
                try {
                    const jsonMessage = JSON.parse(messageStr);
                    this.emit('message', jsonMessage);
                } catch (jsonError) {
                    this.emit('error', new Error(`Invalid JSON received: ${messageStr}`));
                }
            }
        } catch (error) {
            this.emit('error', error);
        }
    }

    send(message: any) {
        const jsonString = JSON.stringify(message) + '\n';
        if (this.connected) {
            this.socket.write(jsonString);
        } else {
            this.messageQueue.push(jsonString);
        }
    }

    close() {
        if (this.connected) {
            this.socket.end();
            this.connected = false;
        }
    }
}