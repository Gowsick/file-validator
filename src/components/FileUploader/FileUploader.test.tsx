import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { errorRecord } from "../../schema";
import FileUploader from "./FileUploader.tsx";

const mockErrorRecords: errorRecord[] = [
  {
    errors: "Duplicate record error",
    reference: 1,
    accountNumber: "1001",
    startBalance: 100,
    mutation: 20,
    endBalance: 120,
    description: "desc",
  },
  {
    errors: "Mismatching end balance: Expected: 110.00, Received: 120.00",
    reference: 3,
    accountNumber: "1003",
    startBalance: 100,
    mutation: 10,
    endBalance: 120,
    description: "desc_wrong_balance",
  },
];
const mockEmptyErrorRecords: errorRecord[] = [];

// Create Jest mocks for the utility functions
const mockParseCsv = jest.fn();
const mockParseXml = jest.fn();

jest.mock("../../utility/utility.ts", () => ({
  parseCsv: () => mockParseCsv(),
  parseXml: () => mockParseXml(),
}));

// Mock FileReader
let fileReaderInstance: FileReader | null = null;

jest.spyOn(window, "FileReader").mockImplementation(() => {
  const reader: FileReader = {
    result: null,
    readyState: 0,
    error: null,
    readAsText: jest.fn(),
    abort: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    onload: null,
    onerror: null,
    onloadstart: null,
    onprogress: null,
    onabort: null,
    onloadend: null,
    EMPTY: 0,
    LOADING: 1,
    DONE: 2,
    readAsArrayBuffer: jest.fn(),
    readAsBinaryString: jest.fn(),
    readAsDataURL: jest.fn(),
  };
  fileReaderInstance = reader;
  return fileReaderInstance;
});

describe("FileUploader", () => {
  afterEach(() => {
    jest.clearAllMocks();
    fileReaderInstance = null;
  });

  it("should display file name and success message when no errors", async () => {
    mockParseCsv.mockReturnValue(mockEmptyErrorRecords);

    render(<FileUploader />);
    const user = userEvent.setup();
    const file = new File(["Reference,AccountNumber\n1,1001"], "test.csv", {
      type: "text/csv",
    });
    const input = screen.getByTestId("file-input");

    await user.upload(input, file);

    // Manually trigger the onload event
    act(() => {
      if (fileReaderInstance && fileReaderInstance.onload) {
        fileReaderInstance.onload({
          target: { result: "valid content" },
        } as any);
      }
    });

    await waitFor(() => {
      expect(
        screen.queryByText("Processing... Please wait."),
      ).not.toBeInTheDocument();
      expect(screen.getByText(/Uploaded file:/i)).toBeInTheDocument();
      expect(screen.getByText(/test.csv/i)).toBeInTheDocument();
      expect(screen.getByText("No error records found!")).toBeInTheDocument();
    });

    expect(fileReaderInstance?.readAsText).toHaveBeenCalledTimes(1);
    expect(mockParseCsv).toHaveBeenCalledTimes(1);
  });

  it("should display an error for unsupported file type", async () => {
    render(<FileUploader />);
    const rejectedFile = new File(["hello"], "hello.txt", {
      type: "text/plain",
    });
    const input = screen.getByTestId("file-input");

    fireEvent.drop(input, {
      dataTransfer: {
        files: [rejectedFile],
        items: [
          {
            kind: "file",
            type: rejectedFile.type,
            getAsFile: () => rejectedFile,
          } as DataTransferItem,
        ],
        types: ["Files"],
      },
    });

    await waitFor(() => {
      const errorElement = screen.getByTestId("error-text");
      expect(errorElement).toBeInTheDocument();
      expect(
        screen.getByText(/Unsupported file type: hello.txt/i),
      ).toBeInTheDocument();
    });
  });

  it("should display records with errors when duplicates or end balance mismatch exists", async () => {
    mockParseCsv.mockReturnValue(mockErrorRecords);

    render(<FileUploader />);
    const user = userEvent.setup();
    const file = new File(["...csv content..."], "errors.csv", {
      type: "text/csv",
    });
    const input = screen.getByTestId("file-input");

    await user.upload(input, file);

    // Manually trigger the onload event
    act(() => {
      if (fileReaderInstance && fileReaderInstance.onload) {
        fileReaderInstance.onload({
          target: { result: "invalid content" },
        } as any);
      }
    });

    await waitFor(() => {
      expect(screen.getByText("Records with Errors:")).toBeInTheDocument();
      expect(screen.getByText(/Uploaded file:/i)).toBeInTheDocument();
      expect(screen.getByText(/errors.csv/i)).toBeInTheDocument();
      const table = screen.getByRole("table");
      expect(table).toBeInTheDocument();
      expect(screen.getByText("Duplicate record error")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Mismatching end balance: Expected: 110.00, Received: 120.00",
        ),
      ).toBeInTheDocument();
    });

    expect(fileReaderInstance?.readAsText).toHaveBeenCalledTimes(1);
    expect(mockParseCsv).toHaveBeenCalledTimes(1);
  });

  it("should use the XML parser utility when an XML file is uploaded", async () => {
    mockParseXml.mockReturnValue(mockErrorRecords);
    mockParseCsv.mockReset();
    const readerResult = "<root><record>...</record></root>";

    render(<FileUploader />);
    const user = userEvent.setup();
    const file = new File([readerResult], "data.xml", {
      type: "application/xml",
    });
    const input = screen.getByTestId("file-input");

    await user.upload(input, file);

    // Manually trigger the onload event
    act(() => {
      if (fileReaderInstance && fileReaderInstance.onload) {
        fileReaderInstance.onload({ target: { result: readerResult } } as any);
      }
    });
    await waitFor(() => {
      expect(screen.getByText("Records with Errors:")).toBeInTheDocument();
      expect(screen.getByText(/data.xml/i)).toBeInTheDocument();
      expect(screen.getByText("desc_wrong_balance")).toBeInTheDocument();
    });

    expect(mockParseXml).toHaveBeenCalledTimes(1);
    expect(mockParseCsv).not.toHaveBeenCalled();
  });
});
