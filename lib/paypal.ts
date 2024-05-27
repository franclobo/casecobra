import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js"
import { ReactNode } from "react";

interface PayPalProps {
  children: ReactNode;
}



export const PayPal = ({ children }: PayPalProps) => {
  return (
    <PayPalScriptProvider
      options={{
        clientId: process.env.PAYPAL_CLIENT_ID,
        currency: "USD",
      }}
    >
      {children}
    </PayPalScriptProvider>
  )
}
