import { render, screen } from "@testing-library/react";
import { errorRecord } from "../../schema";
import ErrorRecordsTable from "./ErrorRecordsTable.tsx";

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

describe("ErrorRecordsTable", () => {
  it("should render nothing if the errorRecords array is empty", () => {
    render(<ErrorRecordsTable errorRecords={[]} />);
    expect(screen.queryByText("Records with Errors:")).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
  it("should render a table data when the errorRecords are provided", () => {
    render(<ErrorRecordsTable errorRecords={mockErrorRecords} />);
    expect(screen.getByText("Records with Errors:")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: /ERRORS/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Duplicate record error")).toBeInTheDocument();
  });
});
