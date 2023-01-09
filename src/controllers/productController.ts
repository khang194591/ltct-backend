import { Request, Response } from "express";
import prisma from "../configs/db";
import { INTERNAL_SERVER_ERROR } from "../constants/response";
import { productsServer } from "../services/axios";

async function getProduct(req: Request, res: Response) {
  try {
    const productId = Number.parseInt(req.params.productId);
    const { data } = await (
      await productsServer.get(`/products/${productId}`)
    ).data;

    if (data === null) {
      return res.status(404).json({ message: "Product not found" });
    }

    const listItem = await prisma.item.findMany({
      where: { productId: productId },
      select: {
        itemId: true,
        goodQuantity: true,
      },
    });

    if (!listItem) {
      return res.status(404).json({ error: `Product not found` });
    }

    let quantity = 0;

    listItem.map((item) => {
      quantity += item.goodQuantity;
    });
    const tempObj: any = listItem.reduce(
      (obj, cur) => ({ ...obj, [cur.itemId]: cur }),
      {}
    );
    // console.log(tempObj);
    if (data.sub_products.length !== 0) {
      data.sub_products = data.sub_products.map((item: any) => {
        // console.log(item);
        return {
          ...item,
          quantity: tempObj[item.id]?.goodQuantity,
        };
      });
    }
    res.json({
      ...data,
      quantity,
      // listItem,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
}

async function getItem(req: Request, res: Response) {
  try {
    const itemId = Number.parseInt(req.params.itemId);
    const item = await prisma.item.findUnique({
      where: { itemId },
    });
    if (!item) {
      return res.status(404).json({ error: `Item not found` });
    }
    res.json({
      id: item.itemId,
      quantity: item.goodQuantity,
      productId: item.productId,
      badQuantity: item.badQuantity,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
}

async function updateItem(req: Request, res: Response) {
  try {
    const itemId = Number.parseInt(req.params.itemId);
    const quantity = Number.parseInt(req.body.quantity);

    const item = await prisma.item.findUnique({
      where: { itemId },
    });
    if (!item) {
      return res.status(404).json({ error: `Item not found` });
    }
    if (item.goodQuantity < quantity) {
      return res.status(400).json({ error: `Not enough` });
    }
    const result = await prisma.item.update({
      where: {
        itemId,
      },
      data: {
        goodQuantity: {
          decrement: quantity,
        },
        badQuantity: {
          increment: quantity,
        },
      },
    });
    res.json({
      id: result.itemId,
      quantity: result.goodQuantity,
      productId: result.productId,
      badQuantity: result.badQuantity,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
}

async function getProductQuantity(req: Request, res: Response) {
  try {
    const productId = Number.parseInt(req?.params.productId);
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
}

export default { getProduct, getItem, updateItem, getProductQuantity };
