# Duplicate Record and Balance Mismatch Finder

This React application allows users to upload CSV or XML files, validates the data against a schema using Zod, checks for duplicates, and displays error results in a table format or a success message.

## Implementations

Used zod schema validation for the file type and fields
Sanitizing the headers of a file to make it unique across different file format
Constructing dynamic headers in a error table to avoid static values

## Libraries Used

TypeScript - Type safety\
Zod - Data validation using schema\
PapaParse - To Parse CSV file content\
fast-xml-parser - To Parse XML file content\
React Dropzone - File uploads with drag and drop feature\
Jest & React Testing Library - Unit testing runner and library

## How to Run the App

### Prerequisites

Node.js (v20.19+)\
npm or yarn

### Steps to run the app

git clone https://github.com/Gowsick/file-validator.git \
npm install\
npm run dev\
open http://localhost:3000 in browser or click o button in terminal

## Assumptions

Considering only the two precision points in balance and mutation fields exists as part of the file
