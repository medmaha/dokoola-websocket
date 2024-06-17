import redis from "redis";

const USERNAME = process.env.REDIS_USER;
const PASSWORD = process.env.REDIS_PASS;
const HOST = process.env.REDIS_HOST;
const PORT = process.env.REDIS_PORT;

const client = redis.createClient({
  url: `redis://${USERNAME}:${PASSWORD}@${HOST}:${PORT}`,
});

client.on("error", (err) => {
  console.log("❌ - Redis Client Error", err);
  process.exit(1);
});

client.on("connect", () => console.log("✔️  - Redis Client Connected"));

let initialized = false;

async function init(client: any) {
  if (initialized) return;
  initialized = true;
  await client.connect();
}

init(client);

export default client;
