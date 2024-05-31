"use server";

import { BASE_PRICE, PRODUCT_PRICES } from "@/config/products";
import { db } from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { Order } from "@prisma/client";
import paypal from "@paypal/checkout-server-sdk";
import { NextResponse } from "next/server";

export const createCheckoutSession = async ({
  configId,
}: {
  configId: string;
}) => {
  const configuration = await db.configuration.findUnique({
    where: {
      id: configId,
    },
  });

  if (!configuration) {
    throw new Error("No se encontró la configuración");
  }

  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user) {
    throw new Error("Necesitas iniciar sesión para continuar");
  }

  const dbUser = await db.user.findUnique({
    where: {
      id: user.id,
    },
  });

  if (!dbUser) {
    throw new Error("El usuario no existe en la base de datos");
  }

  const { acabado, material } = configuration;

  let price = BASE_PRICE;
  if (acabado === "texturizado") {
    price += PRODUCT_PRICES.acabado.texturizado;
  }
  if (material === "policarbonato") {
    price += PRODUCT_PRICES.material.policarbonato;
  }

  let order: Order | undefined = undefined;

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

  const clientID = process.env.PAYPAL_CLIENT_ID || "";
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || "";

  const environment = new paypal.core.SandboxEnvironment(
    clientID,
    clientSecret
  );
  const client = new paypal.core.PayPalHttpClient(environment);

  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: "USD",
          value: (price / 100).toFixed(2),
          breakdown: {
            item_total: {
              currency_code: "USD",
              value: (price / 100).toFixed(2),
            },
            insurance: {
              currency_code: "USD",
              value: "0.00",
            },
            discount: {
              currency_code: "USD",
              value: "0.00",
            },
            shipping: {
              currency_code: "USD",
              value: "0.00",
            },
            handling: {
              currency_code: "USD",
              value: "0.00",
            },
            tax_total: {
              currency_code: "USD",
              value: "0.00",
            },
            shipping_discount: {
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
              value: (price / 100).toFixed(2),
            },
            quantity: "1",
            category: "PHYSICAL_GOODS",
          },
        ],
      },
    ],
  });

  const response = await client.execute(request);

  const approvalUrl = response.result.links.find(
    (link: any) => link.rel === "approve"
  );

  if (!approvalUrl) {
    throw new Error("No se pudo crear la sesión de pago");
  }

  return { url: approvalUrl.href };
};
