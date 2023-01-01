import { Item, RequestStatus, Type } from "@prisma/client";
import { Router } from "express";
import prisma from "../configs/db";
import { INTERNAL_SERVER_ERROR } from "../constants/response";

type IItem = Item & { guildline: string };

const router = Router();

router.get("/product/item/:itemId", async (req, res) => {
  try {
    const itemId = Number.parseInt(req.params.itemId);
    const item = await prisma.item.findUnique({
      where: { itemId },
    });
    if (!item) {
      return res.status(404).json({ error: `Item not found` });
    }
    res.json({ id: item.itemId, quantity: item.goodQuantity });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

router.get("/product/quantity/:productID", async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      where: { productID: Number.parseInt(req.params.productID) },
    });
    if (!items || items.length === 0) {
      return res.status(404).json({ error: `Product not found` });
    }
    res.json(items);
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

router.get("/import", async (req, res) => {
  try {
    const limit = Number.parseInt((req.query.limit as string) ?? 10);
    const offset = Number.parseInt((req.query.offset as string) ?? 0);
    const status = String(req.query.status) as RequestStatus;
    if (
      status.valueOf() !== "ACCEPTED" &&
      status.valueOf() !== "PENDING" &&
      status.valueOf() !== "REJECTED"
    ) {
      return res.status(400).json({ msg: "Invalid query string" });
    }

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
    res.json(result);
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

// TODO: Finish but not test
router.post("/import", async (req, res) => {
  try {
    const data = req.body as { items: IItem[] };

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
          productID: element.productID,
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
    res.json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

// TODO:
router.patch("/import/:historyId", async (req, res) => {
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
    res.json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

// Lấy danh sách các đơn xuất
// TODO: SP_2
router.get("/request/export", async (req, res) => {
  try {
    const list = await prisma.history.findMany({where: {type : "EXPORT"}});
    if (!list) {
      return res.json({error: 'No have bill'});
    }
    res.json(list);
  } catch (error: any) {
    console.log(error);
    res.json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  } 
});
// Lấy danh sách các đơn xuất
// TODO: SP_2
router.get("/request/import", async (req, res) => {
  try {
    const list = await prisma.history.findMany({where: {type : "IMPORT"}});
    if (!list) {
      return res.json({error: 'No have bill'});
    }
    res.json(list);
  } catch (error: any) {
    console.log(error);
    res.json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  } 
});

// Lấy các sản phẩm của 1 historyId
// TODO: SP_2
router.get("/request/detail/:historyId", async (req, res) => {
  try {
    const historyId = Number.parseInt(req.params.historyId);
    const list = await prisma.historyItem.findMany({where: {historyId}});
    if (!list) {
      return res.json({error: "No have item"});
    }
    res.json(list);
  } catch (error: any) {
    console.log(error);
    res.json({error: INTERNAL_SERVER_ERROR, msg: error.message});
  }
});

/*
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
          goodQuantity: 0,
          badQuantity: 0,
        },
        update: {},
      });
    }
    const result = await prisma.history.create({
      data: {
        type: "IMPORT",
        HistoryItem: {
          create: data.items.map(item=>{
            
            if (item.goodQuantity!==0) {
              
            }
          }),
        },
      },
    });
    res.json(result);
  } catch (error: any) {
    console.log(error);
    res.json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

/// TODO: SP_13
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
router.patch("request/handle", async (req, res) => {
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

*/

// TODO: SP_02
router.get("/static/best-seller", async (req, res) => {
  let sortList:any = [];
  try {
    const result = await prisma.history.findMany({
      where: {
        type: "EXPORT"
      },
    });

    result.map(async (item, index) => {
      let listItem = await prisma.historyItem.findMany({where: {historyId: item.historyId}});
      listItem.map((i) => {
        var itemId:number = i.itemId;
        sortList[itemId] ? sortList[itemId] += i.quantity : sortList[itemId] = i.quantity;
        console.log("IN: ", sortList);
      });
      
      res.json(sortList);
    });
  } catch (error: any) {
    console.log(error);
    res.json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

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
