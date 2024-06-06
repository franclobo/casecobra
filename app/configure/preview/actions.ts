"use server";

import { BASE_PRICE, PRODUCT_PRICES } from "@/config/products";
import { db } from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { Order } from "@prisma/client";

export const createCheckoutSession = async ({
  configId,
}: {
  configId: string;
}) => {
  try {
    const configuration = await db.configuration.findUnique({
      where: {
        id: configId,
      },
    });

    if (!configuration) {
      return { error: "Configuration not found" };
    }

    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user) {
      return { error: "User not found" };
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
      return { order: order };
    } else {
      order = await db.order.create({
        data: {
          amount: price / 100,
          userId: user.id,
          configurationId: configuration.id,
        },
      });
    }
  } catch (error) {
    console.error(error);
    return { error: "Error creating order" };
  }
};
