import React from "react";
import { errorRecord } from "../../schema";

const parseErrors = (record: errorRecord, header: keyof errorRecord) => {
  return Array.isArray(record[header])
    ? record[header].join(" ")
    : record[header];
};

interface ErrorRecordsTableProps {
  errorRecords: errorRecord[];
}

const ErrorRecordsTable: React.FC<ErrorRecordsTableProps> = ({
  errorRecords,
}) => {
  if (!errorRecords || errorRecords.length === 0) {
    return null;
  }

  // Get table headers dynamically from the first record
  const tableHeaders =
    errorRecords && errorRecords.length > 0 ? Object.keys(errorRecords[0]) : [];

  return (
    <div>
      <h2>Records with Errors:</h2>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "20px",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#f2f2f2" }}>
            {tableHeaders.map((header, index) => (
              <th
                key={index}
                style={{
                  border: "1px solid #ddd",
                  padding: "8px",
                  textAlign: "left",
                }}
              >
                {header.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {errorRecords.map((record, index) => (
            <tr key={index}>
              {tableHeaders.map((header, i) => (
                <td
                  key={i}
                  style={{
                    border: "1px solid #ddd",
                    padding: "8px",
                    backgroundColor: header === "errors" ? "#ffe6e6" : "white",
                  }}
                >
                  {header === "errors" ? (
                    <pre>{parseErrors(record, header)}</pre>
                  ) : (
                    <>{parseErrors(record, header as keyof errorRecord)}</>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ErrorRecordsTable;
