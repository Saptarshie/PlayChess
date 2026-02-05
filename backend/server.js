import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import bodyParser from "body-parser";
import router from "./routers/route.js";
import cors from "cors";

const PORT = process.env.PORT || 5000;

const app = express();
// app.set("view engine", "ejs");
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  }),
);
app.use(bodyParser.json({ extended: true }));
app.use("/", router);
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });

  socket.on("message", (msg) => {
    console.log("message: " + msg);
  });
});

server.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
});
