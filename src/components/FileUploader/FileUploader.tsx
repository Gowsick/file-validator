import { useCallback, useState } from "react";
import { FileRejection, useDropzone } from "react-dropzone";
import { z } from "zod";
import { errorRecord, fileSchema } from "../../schema";
import { parseCsv, parseXml } from "../../utility/utility.ts";
import ErrorRecordsTable from "../ErrorRecords/ErrorRecordsTable.tsx";

function FileUploader() {
  const [errorRecords, setErrorRecords] = useState<errorRecord[] | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const resetStateValues = () => {
    setErrorRecords(null);
    setUploadStatus("");
    setErrorMessage("");
    setIsProcessing(false);
    setUploadedFileName(null);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    resetStateValues();
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setUploadedFileName(file.name);
    setIsProcessing(true);

    try {
      fileSchema.parse({ originalname: file.name });

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          let errors: errorRecord[] = [];

          if (file.name.endsWith(".csv")) {
            errors = parseCsv(content);
          } else if (file.name.endsWith(".xml")) {
            errors = parseXml(content);
          }

          setErrorRecords(errors);
          setIsProcessing(false);
          setErrorMessage("");
        } catch (parseError) {
          setErrorMessage(
            `An error occurred during file parsing: ${parseError}`,
          );
          setErrorRecords(null);
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        setErrorMessage("Failed to read file.");
        setIsProcessing(false);
      };
      reader.readAsText(file, "windows-1252");
    } catch (error) {
      setIsProcessing(false);
      if (error instanceof z.ZodError) {
        setErrorMessage(error.issues.map((issue) => issue.message).join(", "));
        setErrorRecords(null);
      } else {
        setErrorMessage(
          `An unexpected error occurred during file processing.${error}`,
        );
        setErrorRecords(null);
      }
    }
  }, []);

  const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
    resetStateValues();
    if (fileRejections.length > 0) {
      const rejectedFile = fileRejections[0].file;
      const errorText = `Unsupported file type: ${rejectedFile.name}`;
      setErrorMessage(errorText);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: {
      "text/csv": [".csv"],
      "application/xml": [".xml"],
    },
  });

  return (
    <div>
      <div
        {...getRootProps()}
        style={{
          border: "2px dashed #ccc",
          padding: "20px",
          textAlign: "center",
          cursor: "pointer",
        }}
      >
        <input {...getInputProps()} data-testid="file-input" />
        {isDragActive ? (
          <p>Drop the file here ...</p>
        ) : (
          <p>Drag 'n' drop a CSV or XML file here, or click to select a file</p>
        )}
      </div>
      {isProcessing && <p>Processing... Please wait.</p>}
      {uploadStatus && errorRecords === null && <p>{uploadStatus}</p>}
      {errorMessage && (
        <p
          data-testid="error-text"
          style={{
            marginTop: 10,
            color: "#9b1b1b",
            fontSize: "1.25rem",
          }}
        >
          {errorMessage}
        </p>
      )}
      {uploadedFileName && !isProcessing && (
        <p style={{ marginTop: "10px" }}>
          Uploaded file: <strong>{uploadedFileName}</strong>
        </p>
      )}

      {errorRecords !== null && errorRecords.length > 0 && (
        <ErrorRecordsTable errorRecords={errorRecords} />
      )}
      {errorRecords !== null && errorRecords.length === 0 && (
        <p
          style={{
            marginTop: 10,
            color: "#41dc8e",
            fontSize: "1.25rem",
          }}
        >
          No error records found!
        </p>
      )}
    </div>
  );
}

export default FileUploader;
