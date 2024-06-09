import paypal from "@paypal/checkout-server-sdk";

const configureEnvironment = (): paypal.core.PayPalHttpClient => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_SECRET_KEY;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal client ID or secret not provided.");
  }

  const environment =
    process.env.NODE_ENV === "production"
      ? new paypal.core.SandboxEnvironment(clientId, clientSecret)
      : new paypal.core.SandboxEnvironment(clientId, clientSecret);

  return new paypal.core.PayPalHttpClient(environment);
};

const client = configureEnvironment();

export default client;
