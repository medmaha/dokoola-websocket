import { createClient } from "redis";

const password = process.env.REDIS_PASS;
const username = process.env.REDIS_USER || '';
const host = process.env.REDIS_HOST || 'localhost';
const port = Number(process.env.REDIS_PORT) || 6379;

let redisClient: ReturnType<typeof createClient> | null = null;
let isConnecting = false;
let connectionPromise: Promise<typeof redisClient> | null = null;


export async function getRedisClient(): Promise<typeof redisClient> {
    // Return the existing client if it's already connected
    if (redisClient?.isOpen) {
        return redisClient;
    }

    // If we're already in the process of connecting, return the existing promise
    if (isConnecting && connectionPromise) {
        return connectionPromise;
    }

    isConnecting = true;
    
    try {
        const _client = createClient({
            password: password,
            username: username || undefined,
            socket: {
                host,
                port,
                reconnectStrategy: (retries) => {
                    if (retries > 5) {
                        console.error('❌ - Redis max reconnection attempts reached');
                        return new Error('Max reconnection attempts reached');
                    }
                    // Reconnect after 1 second
                    return 1000;
                }
            }
        });

        _client.on("error", (err) => {
            console.error("❌ - Redis Client Error:", err);
        });

        _client.on("connect", () => {
            console.log("✔️ - Redis Client Connected");
        });

        _client.on("reconnecting", () => {
            console.log("🔁 - Redis Client Reconnecting...");
        });

        await _client.connect();
        redisClient = _client;
        return redisClient;
    } catch (error: any) {
        isConnecting = false;
        connectionPromise = null;
        console.error("❌ - Redis Connection Error:", error.message);
        throw error;
    } finally {
        isConnecting = false;
    }
}

// Graceful shutdown handler
process.on('SIGINT', async () => {
    if (redisClient) {
        await redisClient.quit();
        console.log('Redis client disconnected');
    }
    process.exit(0);
});
