import redis from "redis";

const redisClient = redis.createClient({
  host: "localhost",
  port: 6379,
});

redisClient.on("connect", () => {
  console.log("Redis client connected");
});

redisClient.on("error", (err) => {
  console.log("Redis client error", err);
});
await redisClient.connect();

export default redisClient;
