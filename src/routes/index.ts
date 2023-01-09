import { Router } from "express";
import { INTERNAL_SERVER_ERROR } from "../constants/response";
import exportController from "../controllers/exportController";
import historyController from "../controllers/historyController";
import importController from "../controllers/importController";
import productController from "../controllers/productController";
import staticController from "../controllers/staticController";

const router = Router();

/* ---------------------- WAREHOUSE ---------------------- */
router.get("/warehouse/info", async (req, res) => {
  try {
    res.status(200).json({
      location: "DH Bach Khoa Ha Noi",
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ error: INTERNAL_SERVER_ERROR, msg: error.message });
  }
});

/* ---------------------- PRODUCT ---------------------- */
router.get("/product/:productId", productController.getProduct);

router.get("/product/item/:itemId", productController.getItem);

router.patch("/product/item/:itemId", productController.updateItem);

router.get(
  "/product/quantity/:productId",
  productController.getProductQuantity
);

/* ---------------------- IMPORT ---------------------- */

router.get("/import", importController.getImports);

router.post("/import", importController.createImport);

router.patch("/import/:historyId", importController.updateImport);

/* ---------------------- EXPORT ---------------------- */

router.get("/export", exportController.getExports);

router.post("/export", exportController.createExport);

router.patch("/export/:historyId", exportController.updateExport);

router.post("/export/:historyId", exportController.updatePackingStatus);

/* ---------------------- HISTORY ---------------------- */

router.get("/history/:historyId", historyController.getHistory);

/* ---------------------- STATIC ---------------------- */

router.get("/static/best-seller", staticController.getBestSellers);

router.get("/static/worst-seller", staticController.getWorstSellers);

export default router;
