"use server";

import { BASE_PRICE, PRODUCT_PRICES } from "@/config/products";
import { db } from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import paypal  from "@paypal/checkout-server-sdk";
import client from "../../utils/paypal";
import { Order } from "@prisma/client";
import { NextResponse } from "next/server";


export const createCheckoutSession = async ({
  configId,
}: {
  configId: string,
}) => {
  const configuration = await db.configuration.findUnique({
    where: {
      id: configId,
    },
  });
  console.log(configuration);
  if (!configuration) {
    throw new Error("No se encontró la configuración");
  }

  const { getUser } = getKindeServerSession();
  const user = await getUser();
  console.log(user);
  if (!user) {
    throw new Error("Necesitas iniciar sesión para continuar");
  }

  const { acabado, material } = configuration;

  let price = BASE_PRICE;
  if (acabado === "texturizado") {
    price += PRODUCT_PRICES.acabado.texturizado;
  }
  if (material === "policarbonato") {
    price += PRODUCT_PRICES.material.policarbonato;
  }
  console.log(price);
  let order: Order | undefined = undefined;
  console.log(order)
  const existingOrder = await db.order.findFirst({
    where: {
      userId: user.id,
      configurationId: configuration.id,
    },
  });

  if (existingOrder) {
    order = existingOrder;
  } else {
    order = await db.order.create({
      data: {
        amount: price / 100,
        userId: user.id,
        configurationId: configuration.id,
      },
    });
  }

  const formattedPrice = (price / 100).toFixed(2);

  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: formattedPrice,
          breakdown: {
            item_total: {
              currency_code: "USD",
              value: formattedPrice,
            },
            discount: {
              currency_code: "USD",
              value: "0.00",
            },
            handling: {
              currency_code: "USD",
              value: "0.00",
            },
            insurance: {
              currency_code: "USD",
              value: "0.00",
            },
            shipping_discount: {
              currency_code: "USD",
              value: "0.00",
            },
            shipping: {
              currency_code: "USD",
              value: "0.00",
            },
            tax_total: {
              currency_code: "USD",
              value: "0.00",
            },
          },
        },
        items: [
          {
            name: "Producto personalizado",
            unit_amount: {
              currency_code: "USD",
              value: formattedPrice,
            },
            quantity: "1",
            category: "PHYSICAL_GOODS",
          },
        ],
      },
    ],
  });

  const response = await client.execute(request);
  console.log(response);
  return NextResponse.json({
    id: response.result.id,
  });
};
