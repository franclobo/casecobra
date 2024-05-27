import { PRODUCT_PRICES } from "@/config/products";

export const COLORS = [
  {
    label: "Negro",
    value: "negro",
    tw: "zinc-900",
  },
  {
    label: "Azul",
    value: "azul",
    tw: "blue-950",
  },
  {
    label: "Rosa",
    value: "rosa",
    tw: "rose-950",
  },
] as const;

export const MODELS = {
  name: "models",
  options: [
    {
      label: "iPhone X",
      value: "iphonex",
    },
    {
      label: "iPhone 11",
      value: "iphone11",
    },
    {
      label: "iPhone 12",
      value: "iphone12",
    },
    {
      label: "iPhone 13",
      value: "iphone13",
    },
    {
      label: "iPhone 14",
      value: "iphone14",
    },
    {
      label: "iPhone 15",
      value: "iphone15",
    },
  ],
} as const;

export const MATERIALS = {
  name: "material",
  options: [
    {
      label: "Silicona",
      value: "silicona",
      description: undefined,
      price: PRODUCT_PRICES.material.silicona,
    },
    {
      label: "Policarbonato blando",
      value: "policarbonato",
      description: "Revestimiento resistente a rasguños",
      price: PRODUCT_PRICES.material.policarbonato,
    },
  ],
} as const;

export const FINISHES = {
  name: "acabado",
  options: [
    {
      label: "Acabado suave",
      value: "liso",
      description: undefined,
      price: PRODUCT_PRICES.acabado.suave,
    },
    {
      label: "Texturizado",
      value: "texturizado",
      description: "Textura suave y adherente",
      price: PRODUCT_PRICES.acabado.texturizado,
    },
  ],
} as const;
