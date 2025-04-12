import { createClient, RedisClientType } from "redis";

const username = process.env.REDIS_USER;
const password = process.env.REDIS_PASS;
const host = process.env.REDIS_HOST;
const port = Number(process.env.REDIS_PORT);

let redisClient: ReturnType<typeof createClient> | null | undefined= null;

export async function getRedisClient(): Promise<typeof redisClient> {

    // Return the existing client if it's already connected
    if (redisClient && redisClient.isOpen) {
        return redisClient;
    }

    try {
        const _client = createClient({
            username,
            password,
            socket: {
                host,
                port
            }
        });

        _client.on("error", (err) => {
            console.error("❌ - Redis Client Error:", err);
        });

        _client.on("connect", () => {
            console.log("✔️ - Redis Client Connected");
        });

        await _client.connect();

        redisClient = _client;
        return redisClient;

    } catch (error: any) {
        console.error("❌ - Redis Connection Error:", error.message);
        throw error;
    }
}
