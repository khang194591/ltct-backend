import { Item, PackingStatus, RequestStatus, Type } from "@prisma/client";
import dayjs from "dayjs";
import { Router } from "express";
import prisma from "../configs/db";
import { INTERNAL_SERVER_ERROR } from "../constants/response";

type IItem = Item & { guildline: string };

const router = Router();

/* ---------------------- PRODUCT ---------------------- */

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

router.get("/product/quantity/:productId", async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      where: { productId: Number.parseInt(req.params.productId) },
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

/* ---------------------- IMPORT ---------------------- */

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
    res.json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

// TODO: Finish but not test
router.patch("/import/:historyId", async (req, res) => {
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
    res.json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

// Lấy danh sách các đơn xuất
// TODO: SP_2
router.get("/export", async (req, res) => {
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

    const list = await prisma.history.findMany({
      where: {type: "EXPORT"},
      skip: offset,
      take: limit 
    });
    res.json(list);
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

// TODO: Finish but not test
router.post("/export", async (req, res) => {
  try {
    const data = req.body as { items: IItem[] };

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
      } else if (
        item.goodQuantity < element.goodQuantity ||
        item.badQuantity < element.badQuantity
      ) {
        return res.json({
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
      include: {
        HistoryItem: true
      }
    });
    // Update quantity in store
    exportHistory.HistoryItem.map(async (item) => {
      await prisma.item.update({
        where: {
          itemId: item.itemId,
        },
        data: {
          goodQuantity: {
            decrement: item.quantity
          },
        },
      });
    });

    if (!exportHistory) {
      return res.json({error: 'No have bill'});
    }
    res.json(exportHistory);
  } catch (error: any) {
    console.log(error);
    res.json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  } 
}) 

// Lấy thông tin 1 đơn xuất kho
// TODO: SP_2
router.get("/export/:historyId", async (req, res) => {
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

// Cập nhật thông tin 1 đơn xuất 
// TODO: SP_2
router.patch("/export/:historyId", async (req, res) => {
  try {
    const historyId = Number.parseInt(req.params.historyId);
    const status = String(req.body.status) as RequestStatus;

    const history = await prisma.history.findUnique({
      where: {historyId: historyId},
      select: {
        HistoryItem: true,
        type: true,
        status: true,
        packingStatus: true,
      }
    })
    if (!history) {
      return res.json({error: "History not exits!"});
    }

    if (history.status !== "PENDING") {
      return res.json({
        message: "This request has been accepted or rejected before",
      });
    }
    // Update status of ill
    await prisma.history.update({
      where: {historyId: historyId},
      data: {
        status: status,
      }
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
              increment: item.quantity
            },
          },
        });
      });
    }

    return res.json({message: "SUCCESS"});
  } catch (error: any) {
    console.log(error);
    res.json({error: INTERNAL_SERVER_ERROR, msg: error.message});
  }
});

// Update trạng thái đóng gói 
// TODO: SP_02
router.patch("/export/:historyId", async (req, res) => {
  try {
    const historyId = Number.parseInt(req.body.historyId);
    const packingStatus = String(req.body.status) as PackingStatus;
    const history = await prisma.history.update({
      where: {historyId: historyId},
      data: {
        packingStatus: packingStatus
      }
    })

    return res.json(history);
  } catch (error: any) {
    console.log(error);
    res.json({error: INTERNAL_SERVER_ERROR, msg: error.message});
  }
});

/* ---------------------- HISTORY ---------------------- */

router.get("/history/:historyId", async (req, res) => {
  try {
    const result = await prisma.history.findUnique({
      where: {
        historyId: Number.parseInt(req.params.historyId),
      },
      select: {
        historyId: true,
        createdAt: true,
        packingStatus: true,
        status: true,
        type: true,
        updatedAt: true,
        HistoryItem: true,
      },
    });
    res.json(result);
  } catch (error: any) {
    console.log(error);
    res.json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

/* ---------------------- STATIC ---------------------- */

// TODO: Finish but not test
router.get("/static/best-seller", async (req, res) => {
  try {
    const result = await prisma.historyItem.groupBy({
      by: ["itemId"],
      where: {
        history: {
          status: "ACCEPTED",
          type: "EXPORT",
          createdAt: {
            gte: dayjs().subtract(1, "month").toDate(),
          },
        },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
    });

    const temp = await prisma.item.findMany({
      where: {
        itemId: {
          in: result.map((item) => item.itemId),
        },
      },
    });

    const tempObj: any = temp.reduce(
      (obj, cur) => ({ ...obj, [cur.itemId]: cur }),
      {}
    );

    const aa = result.map((item) => {
      return {
        itemId: item.itemId,
        productID: tempObj[item.itemId].productID,
        sum: item._sum.quantity,
      };
    });

    res.json(aa);
  } catch (error: any) {
    console.log(error);
    res.json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

// TODO: Finish but not test
router.get("/static/worst-seller", async (req, res) => {
  try {
    const result = await prisma.historyItem.groupBy({
      by: ["itemId"],
      where: {
        history: {
          status: "ACCEPTED",
          type: "EXPORT",
          createdAt: {
            gte: dayjs().subtract(1, "month").toDate(),
          },
        },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: "asc",
        },
      },
    });

    const temp = await prisma.item.findMany({
      where: {
        itemId: {
          in: result.map((item) => item.itemId),
        },
      },
    });

    const tempObj: any = temp.reduce(
      (obj, cur) => ({ ...obj, [cur.itemId]: cur }),
      {}
    );

    const aa = result.map((item) => {
      return {
        itemId: item.itemId,
        productID: tempObj[item.itemId].productID,
        sum: item._sum.quantity,
      };
    });

    res.json(aa);
  } catch (error: any) {
    console.log(error);
    res.json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

// TODO: SP_13
router.get("/static/most-return", async (req, res) => {
  try {
    const result = await prisma.historyItem.groupBy({
      by: ["itemId"],
      where: {
        history: {
          status: "ACCEPTED",
          type: "RETURN",
          createdAt: {
            gte: dayjs().subtract(1, "month").toDate(),
          },
        },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
    });

    const temp = await prisma.item.findMany({
      where: {
        itemId: {
          in: result.map((item) => item.itemId),
        },
      },
    });

    const tempObj: any = temp.reduce(
      (obj, cur) => ({ ...obj, [cur.itemId]: cur }),
      {}
    );

    const aa = result.map((item) => {
      return {
        itemId: item.itemId,
        productID: tempObj[item.itemId].productID,
        sum: item._sum.quantity,
      };
    });

    res.json(aa);
  } catch (error: any) {
    console.log(error);
    res.json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

export default router;
