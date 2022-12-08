import "dotenv/config";
import express from "express";
import { HOST, PORT } from "./configs/env.js";
import router from "./routes/index.js";

const main = async () => {
  const app = express();

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", router);

  app.listen(PORT, HOST, () => {
    console.log(`Server is running at http://${HOST}:${PORT}`);
  });
};

main();
