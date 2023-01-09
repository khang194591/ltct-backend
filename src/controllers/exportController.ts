import { Item, PackingStatus, RequestStatus } from "@prisma/client";
import { Request, Response } from "express";
import prisma from "../configs/db";
import { INTERNAL_SERVER_ERROR } from "../constants/response";

async function getExports(req: Request, res: Response) {
  try {
    const limit = Number.parseInt((req.query.limit as string) ?? 10);
    const offset = Number.parseInt((req.query.offset as string) ?? 0);
    const status = String(req.query.status) as RequestStatus;
    const packingStatus = String(req.query.packingStatus) as PackingStatus;

    if (packingStatus === "DONE" || packingStatus === "PENDING") {
      const count = await prisma.history.count({
        where: {
          type: "IMPORT",
          packingStatus,
        },
      });
      const result = await prisma.history.findMany({
        where: {
          type: "EXPORT",
          packingStatus,
        },
        take: limit,
        skip: offset,
        orderBy: {
          historyId: "desc",
        },
      });
      return res.json({ count, data: result });
    }
    if (
      status.valueOf() !== "ACCEPTED" &&
      status.valueOf() !== "PENDING" &&
      status.valueOf() !== "REJECTED"
    ) {
      const count = await prisma.history.count({
        where: { type: "EXPORT" },
      });
      const result = await prisma.history.findMany({
        where: { type: "EXPORT" },
        take: limit,
        skip: offset,
        orderBy: {
          historyId: "desc",
        },
      });
      return res.json({ count, data: result });
    }
    const count = await prisma.history.count({
      where: { type: "EXPORT", status },
    });
    const result = await prisma.history.findMany({
      where: { type: "EXPORT", status },
      skip: offset,
      take: limit,
      orderBy: {
        historyId: "desc",
      },
    });
    res.json({ count, data: result });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
}

async function createExport(req: Request, res: Response) {
  try {
    const data = req.body as { items: Item[] };

    if (!data.items || data.items.length === 0) {
      return res.json({ error: "Please provide at least one item" });
    }
    for (let index = 0; index < data.items.length; index++) {
      const element = data.items[index];
      const item = await prisma.item.findUnique({
        where: {
          itemId: element.itemId,
        },
      });
      if (!item) {
        return res.status(400).json({ error: "Invalid itemId" });
      } else if (
        item.goodQuantity < element.goodQuantity ||
        item.badQuantity < element.badQuantity
      ) {
        return res.status(400).json({
          message: `Item ${item.itemId} not enough to export`,
        });
      } else {
        await prisma.item.update({
          where: {
            itemId: item.itemId,
          },
          data: {
            goodQuantity: {
              decrement: element.goodQuantity,
            },
            badQuantity: {
              decrement: element.badQuantity,
            },
          },
        });
      }
    }

    const result = await prisma.history.create({
      data: {
        type: "EXPORT",
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

async function updateExport(req: Request, res: Response) {
  try {
    const historyId = Number.parseInt(req.params.historyId);
    const status = String(req.body.status) as RequestStatus;

    const history = await prisma.history.findUnique({
      where: { historyId: historyId },
      select: {
        HistoryItem: true,
        type: true,
        status: true,
        packingStatus: true,
      },
    });
    if (!history) {
      return res.json({ error: "History not exits!" });
    }

    if (history.status !== "PENDING") {
      return res.json({
        message: "This request has been accepted or rejected before",
      });
    }
    // Update status of ill
    await prisma.history.update({
      where: { historyId: historyId },
      data: {
        status: status,
        packingStatus: status === "ACCEPTED" ? "PENDING" : null,
      },
    });
    // Update quantity in store
    if (
      (status === "REJECTED" && history.type === "EXPORT") ||
      (status === "ACCEPTED" && history.type === "IMPORT")
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
    return res.json({ message: "SUCCESS" });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
}

async function updatePackingStatus(req: Request, res: Response) {
  try {
    const historyId = Number.parseInt(req.params.historyId);
    const history = await prisma.history.update({
      where: { historyId: historyId },
      data: {
        packingStatus: "DONE",
      },
    });

    return res.json(history);
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
}

export default { getExports, createExport, updateExport, updatePackingStatus };
