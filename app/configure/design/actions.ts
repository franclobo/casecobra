"use server"

import { db } from "@/db"
import { CaseColor, CaseFinish, CaseMaterial, PhoneModel } from "@prisma/client"

export type SaveConfigArgs = {
  color: CaseColor;
  material: CaseMaterial;
  finish: CaseFinish;
  model: PhoneModel;
  configId: string;
};

export async function saveConfig({
  color,
  material,
  finish,
  model,
  configId
}: SaveConfigArgs) {
  await db.configuration.update({
    where: {
      id: configId
    },
    data: {
      color,
      material,
      finish,
      model
    }
  })
}
