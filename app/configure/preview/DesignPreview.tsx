"use client";

import { useState, useEffect } from "react";
import { Configuration } from "@prisma/client";
import { createCheckoutSession } from "./actions";
import Confetti from "react-dom-confetti";
import Phone from "@/app/_components/Phone";
import { COLORS, MODELS } from "@/validators/option-validator";
import { cn, formatPrice } from "@/lib/utils";
import { Check } from "lucide-react";
import { BASE_PRICE, PRODUCT_PRICES } from "@/config/products";
import { useToast } from "@/components/ui/use-toast";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import LoginModal from "@/app/_components/LoginModal";
import { useRouter } from "next/navigation";
import axios from "axios";
import { create } from "domain";


const  DesignPreview = ({ configuration }: { configuration: Configuration }) => {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  useEffect(() => setShowConfetti(true), []);

  const { color, model, acabado, material } = configuration;

  const tw = COLORS.find(
    (supportedColor) => supportedColor.value === color
  )?.tw;
  const { label: modelLabel } = MODELS.options.find(
    ({ value }) => value === model
  )!;

  let totalPrice = BASE_PRICE;
  if (acabado === "texturizado")
    totalPrice += PRODUCT_PRICES.acabado.texturizado;
  if (material === "policarbonato")
    totalPrice += PRODUCT_PRICES.material.policarbonato;

  const paypalCreateOrder = async () => {
    try {
      const response = await axios.post("/api/paypal/createorder", {
        configId: configuration,
      });

      if (response.status !== 200) {
        throw new Error(
          response.data.error || "Error al crear la orden en PayPal"
        );
      }

      console.log("Order ID:", response.data.orderId);
      return response.data.orderId;
    } catch (err) {
      console.error("Error al crear la orden:", err);
      toast({
        title: "Error",
        description: "Hubo un error al crear la orden.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleCheckOut = async () => {
    try {
      const response = await createCheckoutSession({
        configId: configuration.id,
      });
      console.log("ORDER: ", response?.order);
      if (response) {
        const orderId = response.order?.id;
        router.push(`/thankyou?orderId=${orderId}`);
      }
    } catch (err) {
      console.error("Error al crear la orden:", err);
      toast({
        title: "Error",
        description: "Hubo un error al crear la orden.",
        variant: "destructive",
      });
    }
  };

  const paypalCaptureOrder = async (orderId: string) => {
    try {
      const response = await axios.post("/api/paypal/captureorder", {
        orderId,
      });

      if (response.status !== 200) {
        throw new Error(
          response.data.error || "Error al capturar la orden en PayPal"
        );
      }

      console.log("Order captured:", response.data);
      return response.data;
    } catch (err) {
      console.error("Error al capturar la orden:", err);
      toast({
        title: "Error",
        description: "Hubo un error al capturar la orden.",
        variant: "destructive",
      });
      return null;
    }
  };

  const paypalCancelOrder = () => {
    toast({
      title: "Cancelled",
      description: "The transaction was cancelled.",
      variant: "destructive",
    });
    router.push(`/configure/preview?id=${configuration.id}`);
  }

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-0 overflow-hidden flex justify-center"
      >
        <Confetti
          active={showConfetti}
          config={{ elementCount: 200, spread: 90 }}
        />
      </div>
      <div className="mt-20 grid grid-cols-1 text-sm sm:grid-cols-12 sm:gap-x-6 md:gap-x-8 lg:gap-x-12">
        <div className="sm:col-span-4 md:col-span-3 md:row-span-2 md:row-end-2">
          <Phone
            className={cn(`bg-${tw}`)}
            imgSrc={configuration.croppedImageUrl!}
          />
        </div>

        <LoginModal isOpen={isLoginModalOpen} setIsOpen={setIsLoginModalOpen} />

        <div className="mt-6 sm:col-span-9 sm:mt-0 md:row-end-1">
          <h3 className="text-3xl font-bold tracking-tight text-gray-900">
            Tu Carcasa para {modelLabel}
          </h3>
          <div className="mt-3 flex items-center gap-1.5 text-base">
            <Check className="h-4 w-4 text-green-500" />
            En stock y listo para enviar
          </div>
        </div>

        <div className="sm:col-span-12 md:col-span-9 text-base">
          <div className="grid grid-cols-1 gap-y-8 border-b border-gray-200 py-8 sm:grid-cols-2 sm:gap-x-6 sm:py-6 md:py-10">
            <div>
              <p className="font-medium text-zinc-950">Detalles</p>
              <ol className="mt-3 text-zinc-700 list-disc list-inside">
                <li>Compatible con carga wireless</li>
                <li>Poliuretano termoplástico que absorbe los golpes</li>
                <li>Embalaje hecho con materiales reciclados</li>
                <li>Impresión con 5 años de garantía</li>
              </ol>
            </div>
            <div>
              <p className="font-medium text-zinc-950">Materiales</p>
              <ol className="mt-3 text-zinc-700 list-disc list-inside">
                <li>Material duradero de alta calidad</li>
                <li>Protección contra golpes y arañazos</li>
              </ol>
            </div>
          </div>

          <div className="mt-8">
            <div className="bg-gray-50 p-6 sm:rounded-lg sm:p-8">
              <div className="flow-root text-sm">
                <div className="flex items-center justify-between py-1 mt-2">
                  <p className="text-gray-600">Subtotal</p>
                  <p className="font-medium text-gray-900">
                    {formatPrice(BASE_PRICE / 100)}
                  </p>
                </div>

                {acabado === "texturizado" && (
                  <div className="flex items-center justify-between py-1 mt-2">
                    <p className="text-gray-600">Texturizado</p>
                    <p className="font-medium text-gray-900">
                      +{formatPrice(PRODUCT_PRICES.acabado.texturizado / 100)}
                    </p>
                  </div>
                )}
                {material === "policarbonato" && (
                  <div className="flex items-center justify-between py-1 mt-2">
                    <p className="text-gray-600">Policarbonato blando</p>
                    <p className="font-medium text-gray-900">
                      +
                      {formatPrice(PRODUCT_PRICES.material.policarbonato / 100)}
                    </p>
                  </div>
                )}
                <div className="my-2 h-px bg-gray-200" />
                <div className="flex items-center justify-between py-2">
                  <p className="text-semibold text-gray-900">Total</p>
                  <p className="font-semibold text-gray-900">
                    {formatPrice(totalPrice / 100)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end pb-12">
              <PayPalScriptProvider
                options={{
                  clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
                }}
              >
                <PayPalButtons
                  style={{
                    layout: "horizontal",
                    color: "blue",
                  }}
                  createOrder={paypalCreateOrder}
                  onApprove={async (data, actions) => {
                    let response = await paypalCaptureOrder(data.orderID);
                    const orderID = response.result.id;
                    console.log("Order Approved:", orderID);
                    actions.order?.capture().then((details) => {
                      console.log("Order captured:", details);
                      handleCheckOut();
                    });
                    const webhookID = process.env.PAYPAL_WEBHOOK_ID;
                    await axios.post("/api/webhooks", { webhookID });
                  }}
                  onCancel={paypalCancelOrder}
                />
              </PayPalScriptProvider>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default DesignPreview;
