import { BASE_PRICE, PRODUCT_PRICES } from "@/config/products";
import { db } from "@/db";
import paypal from "@paypal/checkout-server-sdk";
import { NextResponse, NextRequest } from "next/server";

const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_SECRET_KEY;

const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
const client = new paypal.core.PayPalHttpClient(environment);

export async function POST(request) {
  try {
    const { configId } = await request.json();
    const id = configId.id.toString();

    console.log(id);

    const configuration = await db.configuration.findUnique({
      where: {
        id: id,
      },
    });

    if (!configuration) {
      return NextResponse.json(
        { error: "Configuration not found" },
        { status: 404 }
      );
    }

    const { acabado, material } = configuration;
    let price = BASE_PRICE;

    if (acabado === "texturizado") {
      price += PRODUCT_PRICES.acabado.texturizado;
    }
    if (material === "policarbonato") {
      price += PRODUCT_PRICES.material.policarbonato;
    }
    console.log("Price: ", price);
    const formattedPrice = (price / 100).toFixed(2);
    console.log("Formatted Price: ", formattedPrice);
    const paypalRequest = new paypal.orders.OrdersCreateRequest();
    paypalRequest.prefer("return=representation");
    paypalRequest.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: formattedPrice,
            breakdown: {
              item_total: {
                currency_code: "USD",
                value: formattedPrice,
              },
            },
          },
          items: [
            {
              name: "Custom Phone Case",
              unit_amount: {
                currency_code: "USD",
                value: formattedPrice,
              },
              quantity: "1",
            },
          ],
        },
      ],
    });

    const response = await client.execute(paypalRequest);
    return NextResponse.json({
      id: response.result.id,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
