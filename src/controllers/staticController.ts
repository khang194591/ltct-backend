/**
 * Static mean Thống kê, sai chính tả ;_;
 */
import dayjs from "dayjs";
import { Request, Response } from "express";
import prisma from "../configs/db";
import { INTERNAL_SERVER_ERROR } from "../constants/response";

async function getBestSellers(req: Request, res: Response) {
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

    res.json(
      response
        .sort((a, b) => a.sum - b.sum)
        .slice(Math.max(response.length - 10, 0))
    );
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
}

async function getWorstSellers(req: Request, res: Response) {
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

    res.json(
      response
        .sort((a, b) => b.sum - a.sum)
        .slice(Math.max(response.length - 10, 0))
    );
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
}

export default { getBestSellers, getWorstSellers };
