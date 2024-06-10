import { db } from "@/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import crypto from "crypto";

// Función para verificar la firma del webhook de PayPal
async function verifyPayPalWebhookSignature(
  body: string,
  transmissionId: string,
  transmissionTime: string,
  certUrl: string,
  transmissionSig: string
): Promise<boolean> {
  try {
    // Fetch PayPal's public certificate
    const response = await axios.get(certUrl);
    const cert = response.data;
    console.log("PayPal certificate:", cert);

    // Create the expected signature
    const verifier = crypto.createVerify("sha256");
    verifier.update(transmissionId + "|" + transmissionTime + "|" + body);
    const expectedSignature = verifier.verify(cert, transmissionSig, "base64");
    console.log("Expected signature:", expectedSignature);

    return expectedSignature;
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    const transmissionId = headers().get("paypal-transmission-id");
    const transmissionTime = headers().get("paypal-transmission-time");
    const certUrl = headers().get("paypal-cert-url");
    const transmissionSig = headers().get("paypal-transmission-sig");

    // Registro para depuración
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

    // Registro para depuración
    console.log("Webhook event received:", webhookEvent);

    if (
      webhookEvent.event_type === "PAYMENT.CAPTURE.COMPLETED"
    ) {
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

      // Envía un correo electrónico al cliente
      // Aquí debes implementar tu lógica para enviar un correo electrónico al cliente sobre el pedido completado

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
