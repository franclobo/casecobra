import { db } from "@/db";
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import crypto from "crypto";

async function verifyPayPalWebhookSignature(
  body: string,
  transmissionId: string,
  transmissionTime: string,
  transmissionSig: string,
  certUrl: string
): Promise<boolean> {
  // Fetch PayPal's public certificate
  const response = await axios.get(certUrl);
  const cert = response.data;

  // Create the expected signature
  const expectedSignature = crypto
    .createVerify("sha256")
    .update(transmissionId + "|" + transmissionTime + "|" + body)
    .verify(cert, transmissionSig, "base64");

  return expectedSignature;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const headers = req.headers;

    const transmissionId = headers.get("transmissionId");
    const transmissionTime = headers.get("transmissionTime");
    const certUrl = headers.get("certUrl");
    const transmissionSig = headers.get("transmissionSig");

    console.log("Received headers:", {
      transmissionId,
      transmissionTime,
      certUrl,
      transmissionSig,
    });

    if (!transmissionId || !transmissionTime || !certUrl || !transmissionSig) {
      console.error("Invalid signature headers");
      return new Response("Invalid signature headers", { status: 400 });
    }

    // Verificar la firma del webhook de PayPal
    const signatureVerified = await verifyPayPalWebhookSignature(
      body,
      transmissionId,
      transmissionTime,
      transmissionSig,
      certUrl
    );

    if (!signatureVerified) {
      console.error("Invalid PayPal webhook signature");
      return new Response("Invalid PayPal webhook signature", { status: 400 });
    }

    const webhookEvent = JSON.parse(body);

    console.log("Webhook event received:", webhookEvent);

    if (webhookEvent.event_type === "CHECKOUT.ORDER.COMPLETED") {
      const orderID = webhookEvent.resource.id;
      const payerEmail = webhookEvent.resource.payer.email_address;
      const purchaseUnits = webhookEvent.resource.purchase_units[0];

      if (!payerEmail) {
        throw new Error("Missing user email");
      }

      const { userId, orderId } = purchaseUnits.custom_id
        ? JSON.parse(purchaseUnits.custom_id)
        : { userId: null, orderId: null };

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
              name: purchaseUnits.billing_address.name.full_name,
              city: billingAddress.admin_area_2,
              country: billingAddress.country_code,
              postalCode: billingAddress.postal_code,
              street: billingAddress.address_line_1,
              state: billingAddress.admin_area_1,
            },
          },
        },
      });

      // EnvÃ­a un correo electrÃ³nico al cliente
      // AquÃ­ debes implementar tu lÃ³gica para enviar un correo electrÃ³nico al cliente sobre el pedido completado

      return NextResponse.json({ result: updatedOrder, ok: true });
    }

    return NextResponse.json({ result: webhookEvent, ok: true });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { message: "Something went wrong", ok: false },
      { status: 500 }
    );
  }
}
