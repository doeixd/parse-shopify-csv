[![NPM Version](https://img.shields.io/npm/v/parse-shopify-csv.svg)](https://www.npmjs.com/package/parse-shopify-csv)
[![Build Status](https://img.shields.io/github/actions/workflow/status/doeixd/parse-shopify-csv/main.yml?branch=main)](https://github.com/doeixd/parse-shopify-csv/actions)
[![Coverage Status](https://img.shields.io/codecov/c/github/doeixd/parse-shopify-csv.svg)](https://codecov.io/gh/doeixd/parse-shopify-csv)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# Shopify CSV Parser (`parse-shopify-csv`)

A Node.js library/module for parsing and stringifying Shopify product CSV files.

<br />

## Overview

Shopify's product CSV format is powerful but complex because a single product can span multiple rows for its variants and images. This makes simple row-by-row parsing insufficient.

This library correctly parses the entire CSV into a structured, hierarchical JavaScript object, grouping all variants and images under their parent product. It can also stringify this structured object back into a valid, multi-row CSV file that Shopify can import.

<br />

## Key Features

-   **Handles Multi-Row Products:** Correctly parses products with multiple variants and images into a single, logical object.
-   **Type-Safe:** Written entirely in TypeScript to provide strong type safety for all data structures and functions.
-   **Robust Error Handling:** Throws a custom `CSVProcessingError` for predictable error handling of file issues, malformed CSVs, and missing required columns.
-   **Modular and Testable:** Core logic is separated into distinct `parse`, `stringify`, and `write` functions, making them easy to test and reuse.
-   **Relies on Standard Dependencies:** Built on the industry-standard `csv-parse` and `csv-stringify`, giving you direct control over their versions.

<br />

## Installation


```bash
npm install parse-shopify-csv 
```

<br />

## Quick Start

Here is a complete example of reading a Shopify CSV, modifying a product's title, and writing it back to a new file.

```typescript
import {
  parse_shopify_csv,
  write_shopify_csv,
  CSVProcessingError
} from 'parse-shopify-csv';

async function processProducts() {
  const inputFile = 'shopify-export.csv';
  const outputFile = 'shopify-import.csv';

  try {
    // 1. Parse the CSV into a structured object
    const products = await parse_shopify_csv(inputFile);

    console.log(`Successfully parsed ${Object.keys(products).length} products.`);

    // 2. Manipulate the data
    // Let's find a product by its handle and change its title
    const productHandleToEdit = 'my-awesome-product';
    if (products[productHandleToEdit]) {
      products[productHandleToEdit].data.Title = "My Even More Awesome Product (Updated)";
      console.log(`Updated title for handle: ${productHandleToEdit}`);
    }

    // 3. Write the modified object back to a new CSV file
    await write_shopify_csv(outputFile, products);

    console.log(`Successfully created new CSV at ${outputFile}`);

  } catch (error) {
    if (error instanceof CSVProcessingError) {
      // Handle specific processing errors (file not found, bad format, etc.)
      console.error(`Processing Error: ${error.message}`);
    } else {
      // Handle other unexpected errors
      console.error('An unexpected error occurred:', error);
    }
  }
}

processProducts();
```

<br />

## API Reference

### `parse_shopify_csv(path)`

Parses a Shopify product CSV into a structured, hierarchical format.

-   **`@param`** `{string} path` - The file path to the Shopify CSV.
-   **`@returns`** `Promise<Record<string, ShopifyProductCSVParsedRow>>` - A promise that resolves to an object where keys are product handles and values are the parsed product data.
-   **`@throws`** `{CSVProcessingError}` - If the file is not found, unreadable, or malformed.

### `stringify_shopify_csv(parsedData)`

Converts the structured product data back into a CSV formatted string.

-   **`@param`** `{Record<string, ShopifyProductCSVParsedRow>} parsedData` - The structured data from `parse_shopify_csv`.
-   **`@returns`** `Promise<string>` - A promise resolving to the complete CSV content as a string.
-   **`@throws`** `{CSVProcessingError}` - If there is an issue during the stringification process.

### `write_shopify_csv(path, parsedData)`

Orchestrates the process of stringifying the data and writing it to a file.

-   **`@param`** `{string} path` - The file path to write the new CSV to.
-   **`@param`** `{Record<string, ShopifyProductCSVParsedRow>} parsedData` - The structured data object.
-   **`@returns`** `Promise<void>` - A promise that resolves when the file has been successfully written.
-   **`@throws`** `{CSVProcessingError}` - If there is an error during stringification or writing the file.

<br />

## Data Structures

The core purpose of this library is to transform the flat CSV into the `ShopifyProductCSVParsedRow` structure. The top-level object returned by `parse_shopify_csv` is a record where each key is a product's `Handle`.

### `ShopifyProductCSVParsedRow`

This is the main object representing a single, complete product.

```typescript
{
  // The full data from the product's first row in the CSV.
  data: ShopifyProductCSV;

  // An array of all unique images for the product.
  images: ShopifyCSVParsedImage[];

  // An array of all variants for the product.
  variants: ShopifyCSVParsedVariant[];
}
```

-   **`data`**: An object containing all columns from the *first row* of the product in the CSV. This includes the `Handle`, `Title`, `Body (HTML)`, `Vendor`, `Tags`, and all metafields.
-   **`images`**: An array of all images associated with the product. The parser automatically de-duplicates images.
-   **`variants`**: An array containing all product variants. For simple products without options, this array will be empty.

### `ShopifyCSVParsedVariant`

```typescript
{
  // The option key-value pairs for this variant (e.g., { name: 'Color', value: 'Red' }).
  options: { name: string, value: string }[];

  // Contains all variant-specific columns (SKU, Price, Barcode, etc.).
  data: Record<string, string>;

  // True if this variant is the 'Default Title' variant.
  isDefault: boolean;
}
```

### `ShopifyCSVParsedImage`

```typescript
{
  src: string;
  position: string;
  alt: string;
}
```

<br />

## Error Handling

The library throws a custom `CSVProcessingError` for predictable failures. You should wrap calls in a `try...catch` block to handle them gracefully.

```typescript
import { parse_shopify_csv, CSVProcessingError } from 'parse-shopify-csv';

async function safeParse(filePath) {
  try {
    const products = await parse_shopify_csv(filePath);
    return products;
  } catch (error) {
    if (error instanceof CSVProcessingError) {
      console.error(`A known error occurred: ${error.message}`);
      // e.g., "Invalid CSV format: Missing required columns. Must include: Handle"
    } else {
      console.error("An unknown error occurred:", error);
    }
    return null;
  }
}
```

<br />

## Contributing

Contributions are welcome! Please feel free to submit a pull request with any bug fixes or improvements.

1.  Fork the repository.
2.  Create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.


<br />

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.