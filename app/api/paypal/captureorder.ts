import { NextApiRequest, NextApiResponse } from "next";
import client from "../../utils/paypal";
import paypal from "@paypal/checkout-server-sdk";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { orderID } = req.body;

  if (!orderID) {
    return res.status(400).json({ message: "No order ID provided" });
  }

  const request = new paypal.orders.OrdersCaptureRequest(orderID);
  request.requestBody({
    payment_source: {
      token: orderID,
    },
  });

  try {
    const order = await client.execute(request);
    return res.status(200).json(order);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error capturing order" });
  }
}
