"use client"
import { useState, useEffect, use } from "react"
import { Configuration } from "@prisma/client"
import Confetti from "react-dom-confetti"
import Phone from "@/app/_components/Phone";
import { COLORS, FINISHES, MODELS } from "@/validators/option-validator";
import { cn, formatPrice } from "@/lib/utils";
import { ArrowRight, Check } from "lucide-react";
import { BASE_PRICE, PRODUCT_PRICES } from "@/config/products";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { createCheckoutSession } from "./actions";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import {useKindeBrowserClient} from "@kinde-oss/kinde-auth-nextjs"
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import LoginModal from "@/app/_components/LoginModal";

function DesignPreview({ configuration }: { configuration: Configuration }) {
  const router = useRouter()
  const {toast} = useToast()
  const {id} = configuration
  const {user} = useKindeBrowserClient()
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false)

  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  useEffect(() => setShowConfetti(true), []);
  const { color, model, acabado, material } = configuration
  const tw = COLORS.find((supportedColor) => supportedColor.value === color)?.tw
  const { label: modelLabel } = MODELS.options.find(({ value }) => value === model)!
  let totalPrice = BASE_PRICE
  if (acabado === "texturizado")
    totalPrice += PRODUCT_PRICES.acabado.texturizado
  if (material === "policarbonato")
    totalPrice += PRODUCT_PRICES.material.policarbonato
  const { mutate: createPaymentSession } = useMutation({
    mutationKey: ["get-checkout-session"],
    mutationFn: createCheckoutSession,
    onSuccess: ({url}) => {
      if(url)
        router.push(url)
      else
        throw new Error("No se pudo crear la sesión de pago")
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  const handleCheckout = () => {
    if(user){
      createPaymentSession({configId: id})
    } else {
      localStorage.setItem("configurationId", id)
      setIsLoginModalOpen(true)
    }
  }

  return (
    <>
      <div  aria-hidden="true" className="pointer-events-none select-none absolute inset-0 overflow-hidden flex justify-center">
        <Confetti active={showConfetti} config={{ elementCount: 200, spread: 90 }} />
      </div>
      <div className="mt-20 grid grid-cols-1 text-sm sm:grid-cols-12 sm:grid-rows-1 sm:gap-x-6 md:gap-x-8 lg:gap-x-12">
        <div className="sm:col-span-4 md:col-span-3 md:row-span-2 md:row-end-2">
          <Phone
            className={cn(
              `bg-${tw}`
            )}
            imgSrc={configuration.croppedImageUrl!} />
        </div>

        <LoginModal isOpen={isLoginModalOpen} setIsOpen={setIsLoginModalOpen} />

        <div className="mt-6 sm:col-span-9 sm:mt-0 md:row-end-1">
          <h3 className="text-3xl font-bold tracking-tight text-gray-900">Tu Carcasa para {modelLabel}</h3>
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
                  <p className="text-.gray-600">Subtotal</p>
                  <p className="font-medium text-gray-900">{formatPrice(BASE_PRICE / 100)}</p>
                </div>

                {acabado === "texturizado"
                  ? (
                    <div className="flex items-center justify-between py-1 mt-2">
                      <p className="text-gray-600">Texturizado</p>
                      <p className="font-medium text-gray-900">+{formatPrice(PRODUCT_PRICES.acabado.texturizado / 100)}</p>
                    </div>
                  )
                  : null
                }
                {material === "policarbonato"
                  ? (
                    <div className="flex items-center justify-between py-1 mt-2">
                      <p className="text-gray-600">Policarbonato blando</p>
                      <p className="font-medium text-gray-900">+{formatPrice(PRODUCT_PRICES.material.policarbonato / 100)}</p>
                    </div>
                  )
                  : null
                }
                <div className="my-2 h-px bg-gray-200" />
                <div className="flex items-center justify-between py-2">
                  <p className="text-semibold text-gray-900">
                    Total
                  </p>
                  <p className="font-semibold text-gray-900">
                    {formatPrice(totalPrice / 100)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end pb-12">
              <Button
                onClick={() => handleCheckout()}
                disabled={false}
                isLoading={false}
                loadingText="Verificando"
                className="px-4 sm:px-6 lg:px-8"
              >
                Verificar
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>

  )
}

export default DesignPreview
