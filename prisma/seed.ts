// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();

// async function main() {
//   const history1 = await prisma.history.create({
//     data: {
//       historyId: 1,
//       packingStatus: "PENDING",
//       type: "IMPORT",
//       HistoryItem: {
//         createMany: {
//           data: [
//             {
//               historyItemId: 1,
//               quantity: 10,
//               itemId: 1,
//             },
//             {
//               historyItemId: 2,
//               quantity: 20,
//               itemId: 2,
//             },
//           ],
//         },
//       },
//     },
//   });

//   const item_id_1 = await prisma.item.create({
//     data: {
//       itemId: 1,
//       productId: 2,
//       goodQuantity: 10,
//       badQuantity: 0,
//     },
//   });
// }

// main()
//   .then(async () => {
//     await prisma.$disconnect();
//   })
//   .catch(async (e) => {
//     console.error(e);
//     await prisma.$disconnect();
//     process.exit(1);
//   });
