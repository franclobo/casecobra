"use server";

import { db } from "@/db";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import axios from "axios";

export const getPaymentStatus = async ({ orderId }: { orderId: string }) => {
const { getUser } = getKindeServerSession();
const user = await getUser();
console.log(user);

if (!user) {
  throw new Error("You need to be logged in");
}

  const order = await db.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: {
      billingAddress: true,
      configuration: true,
      shippingAddress: true,
      user: true,
    },
  });

  if (!order) throw new Error("This order does not exist.");
  console.log(order);

  if (order.isPaid) {
    return order;
  } else {
    return false;
  }
};

export const invokeWebhookAndGetPaymentStatus = async ({
  orderId,
}: {
  orderId: string;
}) => {
  const body = {
    url: `${process.env.NEXT_PUBLIC_VERCEL_URL}/api/webhooks`,
    event_types: [
      {
        name: "CHECKOUT.ORDER.APPROVED",
      },
      {
        name: "CHECKOUT.ORDER.COMPLETED",
      },
      {
        name: "PAYMENT.CAPTURE.COMPLETED",
      },
      {
        name: "PAYMENT.SALE.COMPLETED",
      },
    ],
  };
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.PAYPAL_ACCESS_TOKEN}`,
  };
  await axios.post("/api/webhooks", body, { headers });
  console.log("Webhook registered: ", body);

  const paymentStatus = await getPaymentStatus({ orderId });

  return paymentStatus;
};
