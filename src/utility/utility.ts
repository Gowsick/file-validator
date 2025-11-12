import { XMLParser } from "fast-xml-parser";
import Papa, { ParseResult } from "papaparse";
import { ZodError } from "zod";
import {
  AccountRecord,
  accountRecordSchema,
  errorRecord,
  RawInputRecord,
} from "../schema";

// Helper function to sanitize object keys (e.g., remove whitespace and convert first char to lowercase)
const sanitizeKeys = (record: RawInputRecord): AccountRecord => {
  const sanitizeRecord: RawInputRecord = {};
  for (const key in record) {
    const trimmedKey = key.replace(/\s+/g, "");
    const sanitizedKey = (trimmedKey.charAt(0).toLowerCase() +
      trimmedKey.slice(1)) as keyof AccountRecord;
    sanitizeRecord[sanitizedKey] = record[key];
  }
  return sanitizeRecord as AccountRecord;
};

const validateEndBalance = (record: AccountRecord): string | null => {
  const startBalance = Number(record.startBalance);
  const mutation = Number(record.mutation);
  const endBalance = Number(record.endBalance);

  if (
    Number.isNaN(startBalance) ||
    Number.isNaN(mutation) ||
    Number.isNaN(endBalance)
  ) {
    return "Invalid number format for balance or mutation.";
  }

  const calculatedEndBalance = startBalance + mutation;

  if (calculatedEndBalance.toFixed(2) !== endBalance.toFixed(2)) {
    return `Mismatching end balance: Expected: ${calculatedEndBalance}, Received: ${endBalance}`;
  }
  return null;
};

// Reordering the record to have reference key as the first key after xml parsing
const reorderRecordForXml = (record: AccountRecord): AccountRecord => {
  const { reference, ...rest } = record;
  return { reference, ...rest };
};

// Helper function to format Zod issues into a single error string
const formatZodErrors = (error: ZodError): string => {
  return error?.issues
    .map((issue) => `Field - ${issue.path.join(".")} Error - ${issue.message}`)
    .join(" | ");
};

// Processes all records to find duplicates and validate balances
const processFile = (
  records: RawInputRecord[],
  type: string,
): errorRecord[] => {
  const validationErrorRecords: errorRecord[] = [];
  const errorRecords: errorRecord[] = [];
  const uniqueReferences = new Set<number>();

  records.forEach((record) => {
    const sanitizedRecord = sanitizeKeys(record);
    const validationResult = accountRecordSchema.safeParse(sanitizedRecord);

    if (!validationResult.success) {
      const arrangedRecord =
        type === "xml" ? reorderRecordForXml(sanitizedRecord) : sanitizedRecord;
      validationErrorRecords.push({
        ...arrangedRecord,
        errors: formatZodErrors(validationResult.error),
      });
    }
  });

  if (validationErrorRecords.length === 0) {
    records.forEach((record) => {
      const sanitizedRecord = sanitizeKeys(record);
      const errors: string[] = [];

      if (uniqueReferences.has(sanitizedRecord.reference)) {
        errors.push("Duplicate record");
      } else {
        uniqueReferences.add(sanitizedRecord.reference);
      }

      const endBalanceError = validateEndBalance(sanitizedRecord);
      if (endBalanceError) {
        errors.push(endBalanceError);
      }

      if (errors.length > 0) {
        const arrangedRecord =
          type === "xml"
            ? reorderRecordForXml(sanitizedRecord)
            : sanitizedRecord;
        errorRecords.push({
          ...arrangedRecord,
          errors: errors.join(" &\n"),
        });
      }
    });
    return errorRecords;
  }

  return validationErrorRecords;
};

const parseCsv = (csvString: string): errorRecord[] => {
  let results: RawInputRecord[] = [];
  Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
    complete: (res: ParseResult<RawInputRecord>) => {
      results = res.data;
    },
  });
  return processFile(results, "csv");
};

const parseXml = (xmlString: string): errorRecord[] => {
  const options = {
    ignoreAttributes: false,
    attributeNamePrefix: "",
    isArray: (name: string) => name === "record",
    htmlEntities: true,
  };
  const parser = new XMLParser(options);
  const result = parser.parse(xmlString);
  const dataArray: RawInputRecord[] = result?.records?.record || [];
  return processFile(dataArray, "xml");
};

export {
  formatZodErrors,
  parseCsv,
  parseXml,
  processFile,
  reorderRecordForXml,
  sanitizeKeys,
  validateEndBalance,
};
