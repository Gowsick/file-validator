import {
  AccountRecord,
  accountRecordSchema,
  errorRecord,
  RawInputRecord,
} from "../schema";
import {
  formatZodErrors,
  parseCsv,
  parseXml,
  processFile,
  reorderRecordForXml,
  sanitizeKeys,
  validateEndBalance,
} from "./utility.ts";

jest.mock("papaparse", () => {
  const papaparseLib = jest.requireActual("papaparse");
  return {
    ...papaparseLib,
    __esModule: true,
    default: papaparseLib,
  };
});

// Mock data
const mockValidAccountRecord: AccountRecord = {
  reference: 1,
  accountNumber: "1001",
  startBalance: 100,
  mutation: 20,
  endBalance: 120,
  description: "Valid record",
};

const mockInvalidBalanceRecord: AccountRecord = {
  ...mockValidAccountRecord,
  mutation: 10,
  endBalance: 120,
};

const mockInvalidFormatRecord = {
  ...mockValidAccountRecord,
  mutation: "33e",
};

const mockParsedXmlRecord: AccountRecord = {
  accountNumber: "1001",
  startBalance: 100,
  mutation: 20,
  endBalance: 120,
  description: "Valid record",
  reference: 1,
};

const mockRawInputRecords: RawInputRecord[] = [
  {
    " Reference ": 1,
    AccountNumber: "1001",
    StartBalance: 100,
    Mutation: 20,
    EndBalance: 120,
    Description: "Valid record",
  },
  {
    " Reference ": 1,
    AccountNumber: "1002",
    StartBalance: 100,
    Mutation: 20,
    EndBalance: 120,
    Description: "Duplicate record",
  },
  {
    " Reference ": 3,
    AccountNumber: "1003",
    StartBalance: 100,
    Mutation: 10,
    EndBalance: 120,
    Description: "Wrong balance",
  },
];

const mockValidCsvString = `
Reference,AccountNumber,StartBalance,Mutation,EndBalance,Description
1,1001,100,20,120,Valid record
`;

const mockDuplicateCsvString = `
Reference,AccountNumber,StartBalance,Mutation,EndBalance,Description
1,1001,100,20,120,desc_ok_1
1,1001,100,20,120,desc_duplicate
3,1003,100,10,120,desc_wrong_balance
`;

const mockValidXmlString = `
<records>
    <record reference="1" accountNumber="1001" startBalance="100" mutation="20" endBalance="120" description="Valid record"/>
</records>
`;

const mockInValidXmlString = `
<records>
    <record reference="1" accountNumber="1001" startBalance="100" mutation="20" endBalance="120" description="Valid record"/>
    <record reference="1" accountNumber="1002" startBalance="100" mutation="20" endBalance="120" description="Duplicate record"/>
</records>
`;

describe("Utility Functions", () => {
  describe("sanitizeKeys", () => {
    it("should sanitize keys to lowercase first character and trim whitespace", () => {
      const sanitized = sanitizeKeys(mockRawInputRecords[0]);

      expect(sanitized).toHaveProperty("reference", 1);
      expect(sanitized).toHaveProperty("accountNumber", "1001");
      expect(sanitized).toHaveProperty("startBalance", 100);
      expect(sanitized).not.toHaveProperty("Reference");
      expect(sanitized).not.toHaveProperty("AccountNumber");
    });
  });

  describe("validateEndBalance", () => {
    it("should return null for a correct end balance", () => {
      const error = validateEndBalance(mockValidAccountRecord);
      expect(error).toBeNull();
    });

    it("should return an error message for an incorrect end balance", () => {
      const error = validateEndBalance(mockInvalidBalanceRecord);
      expect(error).toContain(
        "Mismatching end balance: Expected: 110, Received: 120",
      );
    });
  });

  describe("formatZodErrors", () => {
    it("should format Zod issues into a single readable string", () => {
      const result = accountRecordSchema.safeParse(mockInvalidFormatRecord);

      if (!result.success) {
        const formatted = formatZodErrors(result.error);
        expect(formatted).toBe(
          "Field - mutation Error - Invalid input: expected number, received NaN",
        );
      }
    });
  });

  describe("processFile", () => {
    it("should return validation errors if Zod validation fails", () => {
      const errors = processFile([mockInvalidFormatRecord], "csv");

      expect(errors).toHaveLength(1);
      expect(errors[0].errors).toContain(
        "Field - mutation Error - Invalid input: expected number, received NaN",
      );
    });

    it("should return duplicate and balance errors if no validation errors exist", () => {
      const errors = processFile(mockRawInputRecords, "csv");

      expect(errors).toHaveLength(2);
      expect(errors[0].errors).toContain("Duplicate record");
      expect(errors[1].errors).toContain("Mismatching end balance");
    });
  });

  describe("parseCsv and parseXml", () => {
    const extractErrors = (records: errorRecord[]): string[] =>
      records.map((r) => r.errors);
    beforeEach(() => {
      jest.clearAllMocks();
    });
    it("should return empty errors for valid CSV content", () => {
      const errors = parseCsv(mockValidCsvString);
      expect(errors).toHaveLength(0);
    });

    it("should return errors array for invalid CSV content", () => {
      const errors = parseCsv(mockDuplicateCsvString);
      expect(errors).toHaveLength(2);
      const errorMessages = extractErrors(errors);
      expect(errorMessages[0]).toBe("Duplicate record");
      expect(errorMessages[1]).toBe(
        "Mismatching end balance: Expected: 110, Received: 120",
      );
    });

    it("should return empty errors for valid XML content", () => {
      const errors = parseXml(mockValidXmlString);
      expect(errors).toHaveLength(0);
    });

    it("should return errors array for invalid XML content", () => {
      const errors = parseXml(mockInValidXmlString);
      expect(errors).toHaveLength(1);
      const errorMessages = extractErrors(errors);
      expect(errorMessages).toContain("Duplicate record");
    });
  });

  describe("reorderRecordForXml", () => {
    it("should show reference key as the first key after the reorder is called for an xml file", () => {
      const reorderRecord = reorderRecordForXml(mockParsedXmlRecord);
      const firstKey = Object.keys(reorderRecord)[0];
      expect(firstKey).toBe("reference");
    });
  });
});
