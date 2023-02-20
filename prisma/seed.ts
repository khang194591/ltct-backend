import axios from "axios";
import { Item } from "@prisma/client";
import { exit } from "process";
import prisma from "../src/configs/db";
import dayjs from "dayjs";

const client = axios.create({
  baseURL: "http://localhost:3000/api",
});

function randomIntFromInterval(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

const main = async () => {
  for (let index = 0; index < 5; index++) {
    // await fakeImport();
    // await fakeExport();
  }
  test();
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
        // const body =
        //   Math.random() >= 0.3
        //     ? { status: "ACCEPTED" }
        //     : { status: "REJECTED" };
        // const res = await client.patch(
        //   `/import/${response.data.historyId}`,
        //   body
        // );
        // console.log(res.data);
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
      // const body =
      //   Math.random() >= 0.3 ? { status: "ACCEPTED" } : { status: "REJECTED" };
      // const res = await client.patch(
      //   `/export/${response.data.historyId}`,
      //   body
      // );
      // console.log(res.data);
    } catch (error) {
      console.log("Error happened");
    }
  }
};

const test = async () => {
  try {
    const exportItems = await prisma.historyItem.groupBy({
      by: ["itemId"],
      where: {
        history: {
          status: "ACCEPTED",
          type: "EXPORT",
          updatedAt: {
            gte: dayjs().subtract(1, "month").toDate(),
          },
        },
      },
      _sum: {
        quantity: true,
      },
    });
    console.log(exportItems);

    const temp = await prisma.item.findMany({
      where: {
        itemId: {
          in: exportItems.map((item) => item.itemId),
        },
      },
    });

    const tempObj: any = temp.reduce(
      (obj, cur) => ({ ...obj, [cur.itemId]: cur }),
      {}
    );

    const aa = exportItems.map((item) => {
      return {
        itemId: item.itemId,
        productId: tempObj[item.itemId].productId,
        sum: item._sum.quantity,
      };
    });

    const toCollection = function (obj: any) {
      return Object.keys(obj)
        .sort(function (x, y) {
          return +x - +y;
        })
        .map(function (k) {
          return obj[k];
        });
    };

    const aaa = aa.reduce(function (item: any, x) {
      var id = item[x.productId];
      if (id) {
        id.sum += x.sum;
      } else {
        item[x.productId] = x;
        // delete x.productId;
      }
      return item;
    }, {});
    const response = toCollection(aaa);

    console.log(
      response
        .sort((a, b) => a.sum - b.sum)
        .slice(Math.max(response.length - 10, 0))
    );
  } catch (error: any) {
    console.log(error);
  }
}

main();
