import { Item } from "@prisma/client";
import { Router } from "express";
import prisma from "../configs/db";
import { INTERNAL_SERVER_ERROR } from "../constants/response";

const router = Router();

// TODO: SP_13
router.get("/product/:itemId", async (req, res) => {
  try {
    const itemId = Number.parseInt(req.params.itemId);
    const item = await prisma.item.findUnique({ where: { itemId } });
    if (!item) {
      return res.json({ error: `Item not found` });
    }
    res.json(item);
  } catch (error: any) {
    console.log(error);
    res.json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

// TODO: SP_13
router.put("/request/import", async (req, res) => {
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
          quantity: 0,
        },
        update: {},
      });
    }
    const result = await prisma.history.create({
      data: {
        type: "IMPORT",
        HistoryItem: {
          create: data.items,
        },
      },
    });
    res.json(result);
  } catch (error: any) {
    console.log(error);
    res.json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

// TODO: SP_13
router.put("/request/export", async (req, res) => {
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
        return res.json({ error: "Invalid itemId" });
      } else if (item.quantity < element.quantity) {
        return res.json({
          message: `Item ${item.itemId} not enough to export`,
        });
      } else {
        await prisma.item.update({
          where: {
            itemId: item.itemId,
          },
          data: {
            quantity: {
              decrement: element.quantity,
            },
          },
        });
      }
    }
    const result = await prisma.history.create({
      data: {
        type: "EXPORT",
        HistoryItem: {
          create: data.items,
        },
      },
    });
    res.json(result);
  } catch (error: any) {
    console.log(error);
    res.json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

// TODO: SP_13
router.patch("/request/handle", async (req, res) => {
  try {
    const historyId = Number.parseInt(req.body.historyId);
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
          await prisma.item.upsert({
            where: {
              itemId: item.itemId,
            },
            create: {
              itemId: item.itemId,
              quantity: item.quantity,
            },
            update: {
              quantity: {
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
    res.json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

// TODO: SP_02
router.get("/static/best-seller", async (req, res) => {});

// TODO: SP_02
router.get("/static/worst-seller", async (req, res) => {});

// TODO: SP_13
router.get("/static/most-return", async (req, res) => {});

// DONE
router.get("/history/import", async (req, res) => {
  try {
    const result = await prisma.history.findMany({
      where: {
        type: "IMPORT",
        status: "ACCEPTED",
      },
    });
    res.json(result);
  } catch (error: any) {
    console.log(error);
    res.json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

// TODO: SP_13
router.get("/history/export", async (req, res) => {});

export default router;
