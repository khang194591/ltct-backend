import cors from "cors";
import "dotenv/config";
import express from "express";
import { HOST, PORT } from "./constants/env";
import router from "./routes";
import prisma, {} from "./configs/db"

const main = async () => {
  const app = express();

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // app.use(
  //   cors({
  //     origin: "*",
  //     methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
  //   })
  // );

  app.use("/api", router);

  app.listen(PORT, HOST, () => {
    console.log(`Server is running at http://${HOST}:${PORT}`);
  });
};

main();
const SegfaultHandler = require('segfault-handler');
SegfaultHandler.registerHandler('crash.log');
