import { Request, Response } from "express";
import prisma from "../configs/db";
import { INTERNAL_SERVER_ERROR } from "../constants/response";

async function getHistory(req: Request, res: Response) {
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
        HistoryItem: {
          include: {
            item: {
              select: {
                productId: true,
              },
            },
          },
        },
      },
    });
    res.json(result);
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
}

export default { getHistory };
