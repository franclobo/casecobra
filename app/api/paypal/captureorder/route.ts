import { NextRequest, NextResponse } from "next/server";
import client from "../../../utils/paypal";
import paypal from "@paypal/checkout-server-sdk";

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { message: "No order ID provided" },
        { status: 400 }
      );
    }

    const requestPaypal = new paypal.orders.OrdersGetRequest(orderId);

    try {
      const requestOrder = await client.execute(requestPaypal);
      return NextResponse.json(requestOrder, { status: 200 });
    } catch (error) {
      console.error(error);
      return NextResponse.json(
        { message: "Error capturing order" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Invalid request payload" },
      { status: 400 }
    );
  }
}
