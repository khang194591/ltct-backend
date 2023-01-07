import axios from "axios";

const productsServer = axios.create({
  baseURL: "https://p01-product-api-production.up.railway.app/api",
});

export { productsServer };
