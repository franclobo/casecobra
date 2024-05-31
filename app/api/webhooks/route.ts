import { db } from "@/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import paypal from "@paypal/checkout-server-sdk";


const clientID = process.env.PAYPAL_CLIENT_ID || "";
const clientSecret = process.env.PAYPAL_CLIENT_SECRET || "";

const environment = new paypal.core.SandboxEnvironment(clientID, clientSecret);
const client = new paypal.core.PayPalHttpClient(environment);

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = headers().get("paypal-auth-algo"); // Adjust if needed

    if (!signature) {
      return new Response("Invalid signature", { status: 400 });
    }

    const webhookEvent = JSON.parse(body);

    if (webhookEvent.event_type === "CHECKOUT.ORDER.APPROVED") {
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
              city: shippingAddress.city,
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
              city: billingAddress.city,
              country: billingAddress.country_code,
              postalCode: billingAddress.postal_code,
              street: billingAddress.address_line_1,
              state: billingAddress.admin_area_1,
            },
          },
        },
      });
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
