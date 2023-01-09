import { Item, RequestStatus } from "@prisma/client";
import { Request, Response } from "express";
import prisma from "../configs/db";
import { INTERNAL_SERVER_ERROR } from "../constants/response";

async function getImports(req: Request, res: Response) {
  try {
    const limit = Number.parseInt((req.query.limit as string) ?? 10);
    const offset = Number.parseInt((req.query.offset as string) ?? 0);
    const status = String(req.query.status) as RequestStatus;
    if (
      status.valueOf() !== "ACCEPTED" &&
      status.valueOf() !== "PENDING" &&
      status.valueOf() !== "REJECTED"
    ) {
      const count = await prisma.history.count({
        where: {
          type: "IMPORT",
        },
      });

      const result = await prisma.history.findMany({
        where: { type: "IMPORT" },
        take: limit,
        skip: offset,
        orderBy: {
          historyId: "desc",
        },
      });
      return res.json({ count, data: result });
    }

    const count = await prisma.history.count({
      where: { status, type: "IMPORT" },
    });

    const result = await prisma.history.findMany({
      where: { status, type: "IMPORT" },
      take: limit,
      skip: offset,
      orderBy:
        status === "PENDING"
          ? {
              createdAt: "desc",
            }
          : {
              updatedAt: "desc",
            },
    });
    res.json({ count, data: result });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
}

async function createImport(req: Request, res: Response) {
  try {
    const data = req.body as { items: Item[] };

    if (!data.items || data.items.length === 0) {
      return res.json({ error: "Please provide at least one item" });
    }

    for (let index = 0; index < data.items.length; index++) {
      const element = data.items[index];
      await prisma.item.upsert({
        where: {
          itemId: element.itemId,
        },
        create: {
          itemId: element.itemId,
          goodQuantity: 0,
          badQuantity: 0,
          productId: element.productId,
        },
        update: {},
      });
    }

    const result = await prisma.history.create({
      data: {
        type: "IMPORT",
        HistoryItem: {
          create: data.items.map((item) => {
            if (item.goodQuantity !== 0) {
              return { quantity: item.goodQuantity, itemId: item.itemId };
            } else {
              return { quantity: item.badQuantity, itemId: item.itemId };
            }
          }),
        },
      },
    });
    res.json(result);
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
}

async function updateImport(req: Request, res: Response) {
  try {
    const historyId = Number.parseInt(req.params.historyId);
    const status = req.body.status;

    const history = await prisma.history.findUnique({
      where: { historyId },
      select: {
        HistoryItem: true,
        type: true,
        status: true,
      },
    });
    if (history) {
      if (history.status !== "PENDING") {
        return res.json({
          message: "This request has been accepted or rejected before",
        });
      }
      await prisma.history.update({
        where: { historyId },
        data: {
          status: status,
        },
      });
      if (
        (status === "ACCEPTED" && history.type === "IMPORT") ||
        (status === "REJECTED" && history.type === "EXPORT")
      ) {
        history.HistoryItem.map(async (item) => {
          await prisma.item.update({
            where: {
              itemId: item.itemId,
            },
            data: {
              goodQuantity: {
                increment: item.quantity,
              },
            },
          });
        });
      }
      return res.json({ message: "Success" });
    } else {
      return res.status(500).json({ message: "Not found" });
    }
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
}

export default { getImports, createImport, updateImport };
