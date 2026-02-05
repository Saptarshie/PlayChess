import express from "express";
import redisClient from "../models/redis-client.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.send("Hello World!");
});

router.post("/add", (req, res) => {
  const { a, b } = req.body;
  res.send(a + b);
});

router.post("/get", async (req, res) => {
  console.log("get requested... " + redisClient);
  console.log(req.body);
  const { key } = req.body;
  try {
    const value = await redisClient.get(key);
    console.log("redis value:", value);
    if (value === null) {
      return res.status(404).json({ error: "key not found" });
    }
    return res.json({ value });
  } catch (err) {
    console.error("redis get error:", err);
    return res.status(500).json({ error: err.message || "internal error" });
  }
});

router.post("/set", async (req, res) => {
  console.log("set requested... " + redisClient);
  console.log(req.body);
  const { key, value } = req.body;
  try {
    await redisClient.set(key, value);
    console.log("redis set success");
    return res.json({ success: true });
  } catch (err) {
    console.error("redis set error:", err);
    return res.status(500).json({ error: err.message || "internal error" });
  }
});

export default router;
