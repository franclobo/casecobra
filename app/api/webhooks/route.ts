import { db } from "@/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import paypal from "@paypal/checkout-server-sdk";
import client from "../../utils/paypal";
import axios from "axios";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const transmissionId = headers().get("paypal-transmission-id");
    const transmissionTime = headers().get("paypal-transmission-time");
    const certUrl = headers().get("paypal-cert-url");
    const transmissionSig = headers().get("paypal-transmission-sig");
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    if (
      !transmissionId ||
      !transmissionTime ||
      !certUrl ||
      !transmissionSig ||
      !webhookId
    ) {
      return new Response(
        "Invalid signature headers or missing webhook configuration",
        { status: 400 }
      );
    }

    // Fetch PayPal's public certificate
    const response = await axios.get(certUrl);
    const cert = response.data;

    // Create the expected signature
    const expectedSignature = crypto
      .createVerify("sha256")
      .update(
        transmissionId + "|" + transmissionTime + "|" + webhookId + "|" + body
      )
      .verify(cert, transmissionSig, "base64");

    if (!expectedSignature) {
      return new Response("Invalid webhook signature", { status: 400 });
    }

    const webhookEvent = JSON.parse(body);

    if (webhookEvent.event_type === "PAYMENT.SALE.COMPLETED") {
      const orderID = webhookEvent.resource.id;
      const payerEmail = webhookEvent.resource.payer.email_address;
      const purchaseUnits = webhookEvent.resource.purchase_units[0];

      if (!payerEmail) {
        throw new Error("Missing user email");
      }

      const { userId, orderId } = purchaseUnits.custom_id || {
        userId: null,
        orderId: null,
      };

      if (!userId || !orderId) {
        throw new Error("Invalid request metadata");
      }

      const shippingAddress = purchaseUnits.shipping.address;
      const billingAddress = purchaseUnits.billing_address;

      const updatedOrder = await db.order.update({
        where: {
          id: orderId,
        },
        data: {
          isPaid: true,
          shippingAddress: {
            create: {
              name: purchaseUnits.shipping.name.full_name,
              city: shippingAddress.admin_area_2,
              country: shippingAddress.country_code,
              postalCode: shippingAddress.postal_code,
              street: shippingAddress.address_line_1,
              state: shippingAddress.admin_area_1,
            },
          },
          billingAddress: {
            create: {
              name:
                webhookEvent.resource.payer.name.given_name +
                " " +
                webhookEvent.resource.payer.name.surname,
              city: billingAddress.admin_area_2,
              country: billingAddress.country_code,
              postalCode: billingAddress.postal_code,
              street: billingAddress.address_line_1,
              state: billingAddress.admin_area_1,
            },
          },
        },
      });

      return NextResponse.json({ result: updatedOrder, ok: true });
    }

    return NextResponse.json({ result: webhookEvent, ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Algo salió mal", ok: false },
      { status: 500 }
    );
  }
}
