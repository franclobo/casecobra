import { db } from "@/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import crypto from "crypto";
import crc32 from "buffer-crc32";
import { Resend } from "resend";
import OrderReceivedEmail from "@/components/emails/OrderReceivedEmail";

const resend = new Resend(process.env.RESEND_API_KEY!);
// Función para verificar la firma del webhook de PayPal
// Función para descargar y cachear el certificado de PayPal
const WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID!;

async function downloadAndCache(certUrl: string): Promise<string> {
  const response = await axios.get(certUrl);
  return response.data;
}

// Función para verificar la firma del webhook de PayPal
async function verifyPayPalWebhookSignature(
  event: string,
  headers: { [key: string]: string },
): Promise<boolean> {

  const transmissionId = headers["paypal-transmission-id"];
  const timeStamp = headers["paypal-transmission-time"];
  const crc = parseInt("0x" + crc32(event).toString("hex"));

  const message = `${transmissionId}|${timeStamp}|${WEBHOOK_ID}|${crc}`;

  const certPem = await downloadAndCache(headers["paypal-cert-url"]);

  // Create buffer from base64-encoded signature
  const signatureBuffer = Buffer.from(
    headers["paypal-transmission-sig"],
    "base64"
  );

  // Create a verification object
  const verifier = crypto.createVerify("SHA256");

  // Add the original message to the verifier
  verifier.update(message);

  return verifier.verify(certPem, signatureBuffer);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    const transmissionId = headers().get("paypal-transmission-id");
    const transmissionTime = headers().get("paypal-transmission-time");
    const certUrl = headers().get("paypal-cert-url");
    const transmissionSig = headers().get("paypal-transmission-sig");

    const headersObj = {
      "paypal-transmission-id": transmissionId!,
      "paypal-transmission-time": transmissionTime!,
      "paypal-cert-url": certUrl!,
      "paypal-transmission-sig": transmissionSig!,
    };

    // Verificar la firma del webhook de PayPal
    const signatureVerified = await verifyPayPalWebhookSignature(
      body,
      headersObj
    );

    if (!signatureVerified) {
      console.error("Invalid PayPal webhook signature");
      return new Response("Invalid PayPal webhook signature", { status: 400 });
    }

    const webhookEvent = JSON.parse(body);

    if (webhookEvent.event_type === "CHECKOUT.ORDER.APPROVED") {
      const payerEmail = webhookEvent.resource.payer.email_address;
      const purchaseUnits = webhookEvent.resource.purchase_units[0];

      if (!payerEmail) {
        throw new Error("Missing user email");
      }

      const orderId = purchaseUnits.reference_id;

      if (!orderId) {
        throw new Error("Invalid request metadata");
      }

      const shippingAddress = purchaseUnits.shipping.address;

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
        },
      });

      await resend.emails.send({
        from: "CaseCobra <fjbl2788@gmail.com>",
        to: payerEmail,
        subject: "¡Gracias por tu compra!",
        react: OrderReceivedEmail({
          orderId,
          orderDate: updatedOrder.createdAt.toLocaleDateString(),
          // @ts-ignore
          shippingAddress: {
            name: purchaseUnits.shipping.name.full_name,
            city: shippingAddress.admin_area_2,
            country: shippingAddress.country_code,
            postalCode: shippingAddress.postal_code,
            street: shippingAddress.address_line_1,
            state: shippingAddress.admin_area_1,
          },
        }),
      });


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
