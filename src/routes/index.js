import { Router } from "express";
import prisma from "../configs/db.js";
import { INTERNAL_SERVER_ERROR } from "../constants/response.contant.js";
const router = Router();

router.get("/quantity/:itemId", async (req, res) => {
  try {
    const itemId = Number.parseInt(req.params.itemId);
    const item = await prisma.item.findUnique({ where: { id: itemId } });
    if (!item) {
      return res.json({ error: `Item not found` });
    }
    res.json(item);
  } catch (error) {
    console.log(error);
    res.json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

router.patch("/import", async (req, res) => {
  try {
    const data = req.body;
    if (!data.items) {
      return res.json({ error: "Please provide at least one item" });
    }
    for (let index = 0; index < data.items.length; index++) {
      const element = data.items[index];
      const item = await prisma.item.findUnique({
        where: {
          id: element.itemId,
        },
      });
      if (!item) {
        await prisma.item.create({
          data: {
            id: element.itemId,
            quantity: element.quantity,
          },
        });
      } else {
        await prisma.item.update({
          where: {
            id: element.itemId,
          },
          data: {
            quantity: item.quantity + element.quantity,
          },
        });
      }
    }
    const result = await prisma.history.create({
      data: {
        type: "IMPORT",
        items: {
          create: data.items,
        },
      },
    });
    res.json(result);
  } catch (error) {
    console.log(error);
    res.json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

router.patch("/export", async (req, res) => {
  try {
    const data = req.body;
    if (!data.items) {
      return res.json({ error: "Please provide at least one item" });
    }
    for (let index = 0; index < data.items.length; index++) {
      const element = data.items[index];
      const item = await prisma.item.findUnique({
        where: {
          id: element.itemId,
        },
      });
      if (!item) {
        return res.json({ error: "Invalid itemId" });
      } else {
        await prisma.item.update({
          where: {
            id: element.itemId,
          },
          data: {
            quantity: item.quantity - element.quantity,
          },
        });
      }
    }
    const result = await prisma.history.create({
      data: {
        type: "EXPORT",
        items: {
          create: data.items,
        },
      },
    });

    res.json(result);
  } catch (error) {
    console.log(error);
    res.json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

export default router;
