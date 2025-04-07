import { createClient } from "redis";

const username = process.env.REDIS_USER;
const password = process.env.REDIS_PASS;
const host = process.env.REDIS_HOST;
const port = Number(process.env.REDIS_PORT);

let client: ReturnType<typeof createClient> | undefined

try {
  client = createClient({
    username,
    password,
    socket: {
      host,
      port
    }
  });

  client.on("error", (err) => {
    console.log("❌ - Redis Client Error", err);
    process.exit(1);
  });

  client.on("connect", () => console.log("✔️  - Redis Client Connected"));
} catch (error:any) {
  console.log("❌ - Redis Client Error", error.message);
}

let initialized = false;

async function init(client: any) {
  if (initialized) return;
  initialized = true;
  await client.connect();
}

// if (client)
//   init(client);

export default client;
