import axios from "axios";
import { Item } from "@prisma/client";
import { exit } from "process";
import prisma from "../src/configs/db";

const client = axios.create({
  baseURL: "http://localhost:3000/api",
});

function randomIntFromInterval(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

const main = async () => {
  // await fakeImport();
  for (let index = 0; index < 5; index++) {
    await fakeExport();
  }
};

const fakeImport = async () => {
  const n = randomIntFromInterval(5, 10);
  for (let i = 0; i < n; i++) {
    const items: Item[] = [];
    const startProductId = randomIntFromInterval(0, 10);
    const maxProductId = randomIntFromInterval(5, 15);
    for (let x = startProductId; x < maxProductId; x++) {
      for (let y = 0; y < 6; y++) {
        if (Math.random() < 0.33) {
          items.push({
            itemId: x * 6 + y,
            productId: x,
            goodQuantity: randomIntFromInterval(1, 5),
            badQuantity: 0,
          });
        }
      }
    }
    try {
      const response = await client.post("/import", {
        items,
      });
      if (response.status === 200) {
        console.log(response.data);
        const body =
          Math.random() >= 0.3
            ? { status: "ACCEPTED" }
            : { status: "REJECTED" };
        const res = await client.patch(
          `/import/${response.data.historyId}`,
          body
        );
        console.log(res.data);
      }
    } catch (error) {
      console.log(error);
    }
  }
};

const fakeExport = async () => {
  const n = randomIntFromInterval(5, 10);
  for (let i = 0; i < n; i++) {
    const items: Item[] = [];
    const allItems = await prisma.item.findMany();
    const take = randomIntFromInterval(2, 4);
    for (let x = 0; x < take; x++) {
      items.push({
        ...allItems[randomIntFromInterval(0, allItems.length - 1)],
        goodQuantity: randomIntFromInterval(3, 6),
        badQuantity: 0,
      });
    }
    try {
      const response = await client.post("/export", {
        items,
      });
      console.log(response.data);
      const body =
        Math.random() >= 0.3 ? { status: "ACCEPTED" } : { status: "REJECTED" };
      const res = await client.patch(
        `/export/${response.data.historyId}`,
        body
      );
      console.log(res.data);
    } catch (error) {
      console.log("Error happened");
    }
  }
};

main();
