import { z } from "zod";

export const fileSchema = z.object({
  originalname: z.string().refine(
    (name: string) => {
      const validExtensions = ["csv", "xml"];
      const ext = name.split(".").pop()?.toLowerCase();
      return ext && validExtensions.includes(ext);
    },
    { message: `Unsupported file type. Only CSV and XML files are accepted` },
  ),
});

export const accountRecordSchema = z.object({
  reference: z.coerce.number().int().nonnegative(),
  accountNumber: z.string(),
  startBalance: z.coerce.number(),
  mutation: z.coerce.number(),
  endBalance: z.coerce.number(),
  description: z.string(),
});

export type FileType = z.infer<typeof fileSchema>;
export type AccountRecord = z.infer<typeof accountRecordSchema>;
export type errorRecord = AccountRecord & {
  errors: string;
};
export type RawInputRecord = Record<string, string | number>;
