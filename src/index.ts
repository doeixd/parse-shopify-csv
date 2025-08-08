/**
 * @module parse-shopify-csv
 * @description
 * A robust, type-safe, and production-ready module for parsing, processing, and
 * writing Shopify Product CSV files.
 *
 * This module intelligently handles the complex multi-row structure of Shopify's
 * product exports, where a single product can span multiple rows to define its
 * variants, images, and other attributes. It parses this format into a clean,
 * hierarchical, and iterable JavaScript object structure.
 *
 * @remarks
 * Key Features:
 * - **Correctly Parses Product Hierarchy:** Aggregates multiple CSV rows into single product objects.
 * - **Type-Safe:** Uses TypeScript generics to allow for custom column typing.
 * - **Rich Metafield Handling:** Parses metafield columns into structured objects and allows for direct manipulation.
 * - **Iterable Collections:** Parsed product, variant, and metafield collections can be used directly in `for...of` loops.
 * - **Read-Modify-Write:** Provides a complete toolkit to read a CSV, programmatically modify its data, and write it back to a valid Shopify CSV file.
 */

import { promises as fs } from "fs";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify";

// --- CONSTANTS ---

/**
 * The option number suffixes used in Shopify CSV headers (e.g., 'Option1 Name').
 * @internal
 */
const OPTION_INDEXES = ["1", "2", "3"];

/**
 * The minimum set of columns required to identify a product row.
 * @internal
 */
const REQUIRED_COLUMNS = ["Handle"];

/**
 * Regex to capture the three parts of a Shopify metafield column header.
 * It deconstructs headers like "Metafield: my_fields.fabric[string]" into:
 * 1. Namespace: `my_fields`
 * 2. Key: `fabric`
 * 3. Type: `string`
 * @internal
 */
const METAFIELD_REGEX = /^Metafield: (.*?)\.(.*?)\[(.*)\]$/;

// --- CUSTOM ERROR & TYPE DEFINITIONS ---

/**
 * Custom error for handling specific issues during CSV processing.
 * This allows consumers to differentiate between generic errors and errors
 * specific to the CSV parsing, stringifying, or file I/O operations of this module.
 *
 * @example
 * ```typescript
 * import { parseShopifyCSV, CSVProcessingError } from './parse-shopify-csv';
 *
 * try {
 *   // Attempt to parse a file that may not exist.
 *   const products = await parseShopifyCSV('non-existent-file.csv');
 * } catch (error) {
 *   // Check if the error is an instance of our custom error type.
 *   if (error instanceof CSVProcessingError) {
 *     console.error('CSV Processing failed:', error.message);
 *   } else {
 *     // Handle other unexpected errors.
 *     console.error('An unexpected error occurred:', error);
 *   }
 * }
 * ```
 */
export class CSVProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CSVProcessingError";
  }
}

/**
 * Defines the core product-level columns in a Shopify CSV.
 * These columns typically appear on the first row of a product entry.
 */
// Type unions for common Shopify field values while maintaining maximum flexibility

/** Boolean values used in Shopify CSV (case-insensitive) */
export type ShopifyBoolean =
  | "TRUE"
  | "FALSE"
  | "true"
  | "false"
  | boolean
  | string;

/** Published status values */
export type PublishedStatus =
  | "TRUE"
  | "FALSE"
  | "true"
  | "false"
  | boolean
  | string;

/** Inventory tracking systems */
export type InventoryTracker =
  | "shopify"
  | "shipwire"
  | "amazon_marketplace_web"
  | string;

/** Inventory policy options */
export type InventoryPolicy = "deny" | "continue" | string;

/** Fulfillment service options */
export type FulfillmentService =
  | "manual"
  | "amazon_marketplace_web"
  | "shipwire"
  | string;

/** Weight units */
export type WeightUnit = "kg" | "g" | "oz" | "lb" | string;

/** Google Shopping gender values */
export type GoogleGender = "male" | "female" | "unisex" | string;

/** Google Shopping age group values */
export type GoogleAgeGroup =
  | "newborn"
  | "infant"
  | "toddler"
  | "kids"
  | "adult"
  | string;

/** Google Shopping condition values */
export type GoogleCondition = "new" | "refurbished" | "used" | string;

/** Google Shopping size system values */
export type GoogleSizeSystem =
  | "AU"
  | "BR"
  | "CN"
  | "DE"
  | "EU"
  | "FR"
  | "IT"
  | "JP"
  | "MEX"
  | "UK"
  | "US"
  | string;

/** Google Shopping size type values */
export type GoogleSizeType =
  | "regular"
  | "petite"
  | "plus"
  | "tall"
  | "big"
  | "maternity"
  | string;

export interface ShopifyProductCSVPart1 {
  Handle: string;
  Title: string;
  "Body (HTML)": string;
  Vendor: string;
  "Product Category": string;
  Type: string;
  Tags: string;
  Published: PublishedStatus;
  "Option1 Name": string;
  "Option1 Value": string;
  "Option1 Linked To": string;
  "Option2 Name": string;
  "Option2 Value": string;
  "Option2 Linked To": string;
  "Option3 Name": string;
  "Option3 Value": string;
  "Option3 Linked To": string;
  "Image Src": string;
  "Image Position": string | number;
  "Image Alt Text": string;
  "Gift Card": ShopifyBoolean;
  "SEO Title": string;
  "SEO Description": string;
  "Google Shopping / Google Product Category": string;
  "Google Shopping / Gender": GoogleGender;
  "Google Shopping / Age Group": GoogleAgeGroup;
  "Google Shopping / MPN": string;
  "Google Shopping / Condition": GoogleCondition;
  "Google Shopping / Custom Product": ShopifyBoolean;
  "Google Shopping / Custom Label 0": string;
  "Google Shopping / Custom Label 1": string;
  [key: string]: any;
}

/**
 * Defines the core variant-level columns in a Shopify CSV.
 * These columns contain data specific to each product variant.
 */
export interface ShopifyProductCSVPart2 {
  "Variant SKU": string;
  "Variant Image": string;
  "Variant Grams": string | number;
  "Variant Inventory Tracker": InventoryTracker;
  "Variant Inventory Qty": string | number;
  "Variant Inventory Policy": InventoryPolicy;
  "Variant Fulfillment Service": FulfillmentService;
  "Variant Price": string | number;
  "Variant Compare At Price": string | number;
  "Variant Requires Shipping": ShopifyBoolean;
  "Variant Taxable": ShopifyBoolean;
  "Variant Barcode": string;
  "Variant Weight Unit": WeightUnit;
  "Cost per item": string | number;
  Status: string;
  "Google Shopping / Custom Label 2": string;
  "Google Shopping / Custom Label 3": string;
  "Google Shopping / Custom Label 4": string;
  "Google Shopping / Size": string;
  "Google Shopping / Size System": GoogleSizeSystem;
  "Google Shopping / Size Type": GoogleSizeType;
  "Google Shopping / Color": string;
  "Google Shopping / Material": string;
  "Google Shopping / Unit Pricing Measure": string | number;
  "Google Shopping / Unit Pricing Measure Unit": string;
  "Google Shopping / Unit Pricing Base Measure": string | number;
  "Google Shopping / Unit Pricing Base Measure Unit": string;
  [key: `Metafield: ${string}`]: string;
  [key: string]: any;
}

/**
 * Represents a single row in a Shopify Product CSV.
 * It includes all standard Shopify fields and can be extended with a generic
 * type `T` to provide type safety for any custom or metafield columns.
 *
 * @template T - A record type for any additional custom columns (e.g., `{ "Custom Column": string }`).
 */
export type ShopifyProductCSV<T extends Record<string, string> = {}> =
  ShopifyProductCSVPart1 & ShopifyProductCSVPart2 & T;

/**
 * Represents a single parsed metafield with rich information and self-updating capabilities.
 * This structure provides a clean, object-oriented interface for reading and writing metafield data.
 */
export type ShopifyMetafield = {
  /** The short key of the metafield (e.g., 'fabric'). */
  readonly key: string;
  /** The namespace of the metafield (e.g., 'my_fields'). */
  readonly namespace: string;
  /** A boolean indicating if the metafield is a list type (e.g., 'list.single_line_text_field'). */
  readonly isList: boolean;
  /** The raw string value directly from the CSV cell. */
  readonly value: string;
  /**
   * The parsed value. If `isList` is true, this is an array of strings; otherwise, it's the raw string.
   *
   * @remarks
   * **Note:** Assigning a new value to this property automatically updates the underlying
   * CSV data object. This change will be reflected when the data is stringified back to a CSV file.
   *
   * @example
   * ```typescript
   * // Given a metafield for care instructions
   * const careMetafield = product.metadata['Metafield: details.care[string]'];
   *
   * // Read the value
   * console.log(careMetafield.parsedValue); // "Hand wash only"
   *
   * // Update the value
   * careMetafield.parsedValue = "Machine wash cold";
   *
   * // The underlying product.data is now updated automatically.
   * ```
   */
  parsedValue: string | string[];
};

/**
 * An iterable, map-like object containing all of a product's metafields.
 * Keys are the full metafield column headers (e.g., "Metafield: my_fields.fabric[string]").
 * You can iterate over this object using `for...of` to get each `ShopifyMetafield` object.
 */
export type ShopifyProductMetafields = Record<string, ShopifyMetafield> &
  Iterable<ShopifyMetafield>;

/**
 * Represents a single, fully parsed product, aggregating all its associated
 * CSV rows into one hierarchical object.
 *
 * @template A - A record type for any additional custom columns in the source CSV.
 */
export type ShopifyProductCSVParsedRow<A extends Record<string, string> = {}> =
  {
    /**
     * The full data from the product's first row in the CSV.
     *
     * @remarks
     * **Note:** All updates to `metadata.parsedValue` are automatically reflected here,
     * ensuring that any modifications are saved when writing the file back.
     */
    data: ShopifyProductCSV<A>;
    /** An iterable object containing all parsed metafields for the product. */
    metadata: ShopifyProductMetafields;
    /** An array of all unique images for the product, collected from all its rows. */
    images: ShopifyCSVParsedImage[];
    /** An array of all product variants, each corresponding to a row with variant-specific data. */
    variants: ShopifyCSVParsedVariant[];
  };

/** Represents a single product variant with its specific data and option values. */
export type ShopifyCSVParsedVariant = {
  /** The combination of option name and value that defines this variant (e.g., `{ name: 'Color', value: 'Blue' }`). */
  options: { name: string; value: string }[];
  /** A key-value map of all variant-specific columns, like 'Variant SKU' and 'Cost per item'. */
  data: Record<string, string>;
  /** An iterable object containing all parsed metafields for the variant. */
  metadata: ShopifyProductMetafields;
  /** Indicates if this is the default variant (i.e., has an option value of 'Default Title'). */
  isDefault: boolean;
};

/** Represents a single product image with its source, position, and alt text. */
export type ShopifyCSVParsedImage = {
  /** The URL of the image. */
  src: string;
  /** The display order of the image (e.g., '1', '2'). */
  position: string;
  /** The alt text for the image. */
  alt: string;
};

// --- CORE FUNCTIONS ---

/**
 * Parses a Shopify product CSV from a file path into a structured, hierarchical format.
 *
 * @description
 * The function reads the CSV, identifies rows belonging to the same product via its 'Handle',
 * and groups them into a single, easy-to-use object. The returned collection is iterable,
 * allowing you to use it directly in `for...of` loops.
 *
 * @template A - A generic to type-define custom columns beyond the standard Shopify set.
 * @param {string} path - The file path to the Shopify CSV.
 * @returns {Promise<Record<string, ShopifyProductCSVParsedRow<A>> & Iterable<ShopifyProductCSVParsedRow<A>>>}
 *          A promise that resolves to a custom iterable record of parsed product data,
 *          where keys are product handles and values are `ShopifyProductCSVParsedRow` objects.
 * @throws {CSVProcessingError} If the file is not found, is unreadable, or is a malformed CSV
 *         (e.g., missing the required 'Handle' column).
 *
 * @example
 * ```typescript
 * import { parseShopifyCSV, CSVProcessingError } from './parse-shopify-csv';
 *
 * (async () => {
 *   try {
 *     const products = await parseShopifyCSV< { "My Custom Column": string } >('./my-products.csv');
 *
 *     // Iterate over each product
 *     for (const product of products) {
 *       console.log(`Processing Product: ${product.data.Title}`);
 *
 *       // Access basic data
 *       console.log(`- Handle: ${product.data.Handle}`);
 *       console.log(`- Custom Column: ${product.data["My Custom Column"]}`);
 *
 *       // Access and modify a metafield
 *       for (const meta of product.metadata) {
 *          if (meta.key === 'care_instructions') {
 *              console.log(`- Old care instructions: ${meta.parsedValue}`);
 *              // This modification will be saved if you write the data back to a CSV
 *              meta.parsedValue = 'Machine wash cold; Tumble dry low.';
 *          }
 *       }
 *
 *       // List all images
 *       product.images.forEach(img => {
 *         console.log(`- Image: ${img.src} (Alt: ${img.alt})`);
 *       });
 *
 *       // List all variants
 *       product.variants.forEach(variant => {
 *         const optionStr = variant.options.map(o => `${o.name}: ${o.value}`).join(', ');
 *         console.log(`- Variant SKU ${variant.data['Variant SKU']} with options: ${optionStr}`);
 *       });
 *     }
 *   } catch (error) {
 *     if (error instanceof CSVProcessingError) {
 *       console.error(`Failed to process CSV: ${error.message}`);
 *     }
 *   }
 * })();
 * ```
 */
export async function parseShopifyCSV<A extends Record<string, string> = {}>(
  path: string,
): Promise<
  Record<string, ShopifyProductCSVParsedRow<A>> &
    Iterable<ShopifyProductCSVParsedRow<A>>
> {
  const records = await _getRecordsFromFile<A>(path);
  const products: Record<string, ShopifyProductCSVParsedRow<A>> = {};
  let currentHandle: string | null = null;

  for (const row of records) {
    const handleInRow = row.Handle;

    // If a new handle is found, create a new product entry.
    if (handleInRow && handleInRow !== currentHandle) {
      currentHandle = handleInRow;
      products[currentHandle] = _createProductFromRow(row);
    }

    // Skip rows that aren't associated with a product (e.g., extra blank rows at the end).
    if (!currentHandle || !products[currentHandle]) continue;
    const product = products[currentHandle];

    // Aggregate images and variants from all rows belonging to the product.
    _addImageToProduct(product, row);
    _addVariantToProduct(product, row);
  }

  function push(
    obj: Record<string, ShopifyProductCSVParsedRow<A>>,
    item: ShopifyProductCSVParsedRow<A>,
  ) {
    obj[item?.data?.Handle] = item;
  }

  return _enhanceWithIterator(products, "ShopifyProductCollection", push);
}

/**
 * Parses a Shopify product CSV from a string into a structured, hierarchical format.
 *
 * @description
 * This function processes a raw CSV string, identifies rows belonging to the same product
 * via its 'Handle', and groups them into a single, easy-to-use object. It is an
 * in-memory alternative to `parseShopifyCSV`, useful when the CSV data is already
 * available as a string.
 *
 * @template A - A generic to type-define custom columns beyond the standard Shopify set.
 * @param {string} csvContent - The string containing the full Shopify CSV data.
 * @returns {Promise<Record<string, ShopifyProductCSVParsedRow<A>> & Iterable<ShopifyProductCSVParsedRow<A>>>}
 *          A promise that resolves to a custom iterable record of parsed product data,
 *          where keys are product handles and values are `ShopifyProductCSVParsedRow` objects.
 * @throws {CSVProcessingError} If the string is unparsable or is a malformed CSV
 *         (e.g., missing the required 'Handle' column).
 *
 * @example
 * ```typescript
 * import { parseShopifyCSVFromString, CSVProcessingError } from './parse-shopify-csv';
 *
 * const myCSVString = `Handle,Title\nmy-product,My Awesome Product`;
 *
 * (async () => {
 *   try {
 *     const products = await parseShopifyCSVFromString(myCSVString);
 *
 *     for (const product of products) {
 *       console.log(product.data.Title); // "My Awesome Product"
 *     }
 *   } catch (error) {
 *     if (error instanceof CSVProcessingError) {
 *       console.error(`Failed to process CSV string: ${error.message}`);
 *     }
 *   }
 * })();
 * ```
 */
export async function parseShopifyCSVFromString<
  A extends Record<string, string> = {},
>(
  csvContent: string,
): Promise<
  Record<string, ShopifyProductCSVParsedRow<A>> &
    Iterable<ShopifyProductCSVParsedRow<A>>
> {
  // Step 1: Parse the raw CSV string into an array of records.
  // This logic is adapted directly from the _getRecordsFromFile helper function.
  const records = await new Promise<ShopifyProductCSV<A>[]>(
    (resolve, reject) => {
      parse(
        csvContent,
        { columns: true, skip_empty_lines: true },
        (err, result) => {
          if (err)
            return reject(
              new CSVProcessingError(`CSV parsing failed: ${err.message}`),
            );
          resolve(result as ShopifyProductCSV<A>[]);
        },
      );
    },
  );

  // Step 2: Validate that the parsed records contain the required columns.
  // This is identical to the validation in _getRecordsFromFile.
  if (
    records.length > 0 &&
    !REQUIRED_COLUMNS.every((col) => col in records[0])
  ) {
    throw new CSVProcessingError(
      `Invalid CSV format: Missing required columns. Must include: ${REQUIRED_COLUMNS.join(", ")}`,
    );
  }

  // Step 3: Process the records to build the hierarchical product structure.
  // This logic is identical to the main loop in the parseShopifyCSV function.
  const products: Record<string, ShopifyProductCSVParsedRow<A>> = {};
  let currentHandle: string | null = null;

  for (const row of records) {
    const handleInRow = row.Handle;

    // If a new handle is found, create a new product entry.
    if (handleInRow && handleInRow !== currentHandle) {
      currentHandle = handleInRow;
      products[currentHandle] = _createProductFromRow(row);
    }

    // Skip rows that aren't associated with a product.
    if (!currentHandle || !products[currentHandle]) continue;
    const product = products[currentHandle];

    // Aggregate images and variants from all rows belonging to the product.
    _addImageToProduct(product, row);
    _addVariantToProduct(product, row);
  }

  function push(
    obj: Record<string, ShopifyProductCSVParsedRow<A>>,
    item: ShopifyProductCSVParsedRow<A>,
  ) {
    obj[item?.data?.Handle] = item;
  }

  // Step 4: Enhance the final object to be iterable and return it.
  return _enhanceWithIterator(products, "ShopifyProductCollection", push);
}

/**
 * Converts the structured product data from `parseShopifyCSV` back into a
 * CSV formatted string, correctly recreating Shopify's multi-row structure.
 *
 * @param {Record<string, ShopifyProductCSVParsedRow<any>>} parsedData - The structured product data object returned by `parseShopifyCSV`.
 * @returns {Promise<string>} A promise resolving to the complete CSV content as a string.
 * @throws {CSVProcessingError} If the underlying `csv-stringify` library encounters an error.
 *
 * @example
 * ```typescript
 * // (Continuing from parseShopifyCSV example)
 * // const products = await parseShopifyCSV('./my-products.csv');
 * // ... modify products ...
 *
 * try {
 *   const csvString = await stringifyShopifyCSV(products);
 *   console.log(csvString); // Outputs the CSV string to the console
 * } catch (error) {
 *    if (error instanceof CSVProcessingError) {
 *     console.error(`Failed to stringify CSV: ${error.message}`);
 *   }
 * }
 * ```
 */
export async function stringifyShopifyCSV(
  parsedData: Record<string, ShopifyProductCSVParsedRow<any>>,
): Promise<string> {
  const productList = Object.values(parsedData);
  if (productList.length === 0) return "";

  const allRows: Record<string, any>[] = [];
  // Use the first product's data to establish all column headers in the correct order.
  const headers = Object.keys(productList[0].data);
  const template = Object.fromEntries(headers.map((h) => [h, ""]));

  for (const handle in parsedData) {
    if (!Object.prototype.hasOwnProperty.call(parsedData, handle)) continue;

    const { data: mainRowData, variants, images } = parsedData[handle];
    const writtenImageSrcs = new Set<string>();

    // Case 1: Simple product (no variants)
    if (variants.length === 0) {
      const simpleProductRow = { ...mainRowData };
      if (images.length > 0) {
        simpleProductRow["Image Src"] = images[0].src;
        simpleProductRow["Image Position"] = images[0].position;
        simpleProductRow["Image Alt Text"] = images[0].alt;
        writtenImageSrcs.add(images[0].src);
      }
      allRows.push(simpleProductRow);
    } else {
      // Case 2: Product with variants
      variants.forEach((variant, index) => {
        // The first variant row contains all main product data.
        const row =
          index === 0 ? { ...mainRowData } : { ...template, Handle: handle };
        // Subsequent variant rows only need the handle and the shared option names.
        if (index > 0)
          OPTION_INDEXES.forEach(
            (i) => (row[`Option${i} Name`] = mainRowData[`Option${i} Name`]),
          );

        Object.assign(row, variant.data);
        variant.options.forEach((opt) => {
          const optIndex = OPTION_INDEXES.find(
            (i) => mainRowData[`Option${i} Name`] === opt.name,
          );
          if (optIndex) row[`Option${optIndex} Value`] = opt.value;
        });

        // Track which images are associated with variants to avoid duplicating them later.
        const imageSrc =
          row["Variant Image"] ||
          (index === 0 ? mainRowData["Image Src"] : null);
        if (imageSrc) writtenImageSrcs.add(imageSrc);
        allRows.push(row);
      });
    }

    // Add any remaining images that weren't assigned to a variant.
    // These get their own rows with only a Handle and image columns populated.
    images.forEach((image) => {
      if (!writtenImageSrcs.has(image.src)) {
        allRows.push({
          ...template,
          Handle: handle,
          "Image Src": image.src,
          "Image Position": image.position,
          "Image Alt Text": image.alt,
        });
      }
    });
  }

  return new Promise((resolve, reject) => {
    stringify(allRows, { header: true, columns: headers }, (err, output) => {
      if (err)
        return reject(
          new CSVProcessingError(`CSV stringification failed: ${err.message}`),
        );
      resolve(output);
    });
  });
}

/**
 * Writes the structured product data back into a valid Shopify CSV file.
 * This function serves as a convenient wrapper around `stringifyShopifyCSV` and `fs.writeFile`.
 *
 * @param {string} path - The file path where the new CSV file will be saved.
 * @param {Record<string, ShopifyProductCSVParsedRow<any>>} parsedData - The structured data from `parseShopifyCSV`.
 * @throws {CSVProcessingError} If stringification or file writing fails.
 *
 * @example
 * // A complete "read-modify-write" workflow:
 *
 * import { parseShopifyCSV, writeShopifyCSV, CSVProcessingError } from './parse-shopify-csv';
 *
 * async function updateProductTags(inputFile: string, outputFile: string) {
 *   try {
 *     // 1. Read and parse the CSV
 *     const products = await parseShopifyCSV(inputFile);
 *
 *     // 2. Modify the data
 *     for (const product of products) {
 *       const currentTags = product.data.Tags ? product.data.Tags.split(',').map(t => t.trim()) : [];
 *       if (!currentTags.includes('new-collection')) {
 *         currentTags.push('new-collection');
 *       }
 *       product.data.Tags = currentTags.join(', ');
 *     }
 *
 *     // 3. Write the modified data to a new file
 *     await writeShopifyCSV(outputFile, products);
 *     console.log(`Successfully updated products and saved to ${outputFile}`);
 *
 *   } catch (error) {
 *     console.error(`An error occurred:`, error);
 *   }
 * }
 *
 * updateProductTags('shopify-export.csv', 'shopify-export-modified.csv');
 */
export async function writeShopifyCSV(
  path: string,
  parsedData: Record<string, ShopifyProductCSVParsedRow<any>>,
): Promise<void> {
  try {
    const csvString = await stringifyShopifyCSV(parsedData);
    await fs.writeFile(path, csvString);
  } catch (error: unknown) {
    if (error instanceof CSVProcessingError) throw error;
    throw new CSVProcessingError(
      `Failed to write CSV to ${path}: ${(error as Error).message}`,
    );
  }
}

// --- HELPER FUNCTIONS ---

/**
 * Creates the initial product structure from its first corresponding row in the CSV.
 * It also sets up the smart `metadata` object with getters and setters for live updates.
 * @param {ShopifyProductCSV<A>} row - The first CSV row for a given product.
 * @returns {ShopifyProductCSVParsedRow<A>} The initial, partially-hydrated product object.
 * @template A - A record type for any additional custom columns.
 * @internal
 */
function _createProductFromRow<A extends Record<string, string>>(
  row: ShopifyProductCSV<A>,
): ShopifyProductCSVParsedRow<A> {
  const product: ShopifyProductCSVParsedRow<A> = {
    data: row,
    images: [],
    variants: [],
    metadata: _createMetadata(row),
  };

  return product;
}

/**
 * Creates a "live" metadata object from a given data source row.
 * This function iterates over the columns of a data row, finds columns that match
 * the metafield format, and creates a `ShopifyProductMetafields` object. Each property
 * on this object is a `ShopifyMetafield` with a getter/setter that reads from and
 * writes to the original `dataRow` object.
 *
 * @param {T} dataRow - The source data object (e.g., the `data` property of a product or variant).
 * @returns {ShopifyProductMetafields} An iterable object for accessing and modifying metafields.
 * @template T - A record of string keys and any values.
 * @internal
 */
function _createMetadata<T extends Record<string, any>>(
  dataRow: T,
): ShopifyProductMetafields {
  const metadata = {} as ShopifyProductMetafields;

  for (const columnHeader in dataRow) {
    const match = columnHeader.match(METAFIELD_REGEX);
    if (match) {
      const [, namespace, key, type] = match;
      const isList = type.startsWith("list.");

      Object.defineProperty(metadata, columnHeader, {
        enumerable: true,
        configurable: true,
        get: () => ({
          key,
          namespace,
          isList,
          get value(): string {
            return (dataRow[columnHeader] as string) || "";
          },
          get parsedValue(): string | string[] {
            const rawValue = this.value;
            return isList
              ? rawValue
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              : rawValue;
          },
          set parsedValue(newValue: string | string[]) {
            (dataRow as Record<string, any>)[columnHeader] = Array.isArray(
              newValue,
            )
              ? newValue.join(",")
              : newValue;
          },
        }),
      });
    }
  }

  function push(obj: ShopifyProductMetafields, item: any) {
    obj[item.key] = item;
  }

  return _enhanceWithIterator(metadata, "ShopifyMetafieldCollection", push);
}

/**
 * Adds an image to a product's image collection if the row contains a unique image source.
 * It checks for the existence of `Image Src` and ensures the same source is not added twice.
 *
 * @param {ShopifyProductCSVParsedRow<any>} product - The product object to modify.
 * @param {ShopifyProductCSV<any>} row - The current CSV row being processed.
 * @internal
 */
function _addImageToProduct(
  product: ShopifyProductCSVParsedRow<any>,
  row: ShopifyProductCSV<any>,
) {
  if (
    row["Image Src"] &&
    !product.images.some((img) => img.src === row["Image Src"])
  ) {
    product.images.push({
      src: row["Image Src"],
      position: row["Image Position"],
      alt: row["Image Alt Text"] || "",
    });
  }
}

/**
 * Adds a variant to a product's variant collection if the row contains variant-defining data.
 * A row is considered a variant row if the product has defined option names and the row has a value for the first option.
 *
 * @param {ShopifyProductCSVParsedRow<any>} product - The product object to modify.
 * @param {ShopifyProductCSV<any>} row - The current CSV row being processed.
 * @internal
 */
function _addVariantToProduct(
  product: ShopifyProductCSVParsedRow<any>,
  row: ShopifyProductCSV<any>,
) {
  const optionNames = OPTION_INDEXES.map(
    (i) => product.data[`Option${i} Name`],
  ).filter(Boolean);
  const isVariantRow = optionNames.length > 0 && row["Option1 Value"];

  if (isVariantRow) {
    // Collect all columns that are variant-specific into a separate data object.
    const variantData = Object.entries(row)
      .filter(
        ([key]) =>
          key.startsWith("Variant ") ||
          key === "Cost per item" ||
          key === "Status",
      )
      .reduce(
        (acc, [key, value]) => {
          acc[key] = String(value ?? ""); // Ensure value is a string.
          return acc;
        },
        {} as Record<string, string>,
      );

    const options = optionNames
      .map((name, i) => ({ name, value: row[`Option${i + 1} Value`] }))
      .filter((opt) => opt.value);

    product.variants.push({
      options,
      data: variantData,
      metadata: _createMetadata(variantData),
      isDefault: options.some((o) => o.value === "Default Title"),
    });
  }
}

/**
 * Reads a file, parses it as a CSV, and performs basic validation.
 *
 * @param {string} path - The absolute or relative path to the CSV file.
 * @returns {Promise<ShopifyProductCSV<A>[]>} A promise that resolves to an array of raw CSV row objects.
 * @throws {CSVProcessingError} If the file cannot be read, parsing fails, or required columns are missing.
 * @template A - A record type for any additional custom columns.
 * @internal
 */
async function _getRecordsFromFile<A extends Record<string, string>>(
  path: string,
): Promise<ShopifyProductCSV<A>[]> {
  let fileContent: Buffer;
  try {
    fileContent = await fs.readFile(path);
  } catch (error) {
    throw new CSVProcessingError(
      `Failed to read file at ${path}: ${(error as Error).message}`,
    );
  }

  const records = await new Promise<ShopifyProductCSV<A>[]>(
    (resolve, reject) => {
      parse(
        fileContent,
        { columns: true, skip_empty_lines: true },
        (err, result) => {
          if (err)
            return reject(
              new CSVProcessingError(`CSV parsing failed: ${err.message}`),
            );
          resolve(result as ShopifyProductCSV<A>[]);
        },
      );
    },
  );

  if (
    records.length > 0 &&
    !REQUIRED_COLUMNS.every((col) => col in records[0])
  ) {
    throw new CSVProcessingError(
      `Invalid CSV format: Missing required columns. Must include: ${REQUIRED_COLUMNS.join(", ")}`,
    );
  }
  return records;
}

/**
 * Enhances a plain object with `Symbol.iterator` and `Symbol.toStringTag`
 * to make it behave like a built-in iterable collection. This allows using
 * `for...of` loops directly on the object.
 *
 * @param {T} obj - The object to enhance.
 * @param {string} tag - The string to use for the `Symbol.toStringTag` property.
 * @param {(obj: T, item: T[keyof T]) => void} push - A function to push items into the object.
 * @returns {T & Iterable<T[keyof T]>} The original object, now enhanced with iterable properties.
 * @template T - The type of the object being enhanced.
 * @internal
 */
function _enhanceWithIterator<T extends Record<string, any>>(
  obj: T,
  tag: string,
  push?: (obj: T, item: T[keyof T]) => void,
): T & Iterable<T[keyof T]> {
  Object.defineProperties(obj, {
    push: {
      value: function (item: T[keyof T]) {
        try {
          push?.(this, item);
          // this[item?.data?.Handle] = item
        } catch (e) {}
      },
      configurable: true,
      enumerable: false,
    },
    [Symbol.toStringTag]: { value: tag, configurable: true, enumerable: false },
    [Symbol.iterator]: {
      value: function* () {
        for (const key in this) {
          if (Object.prototype.hasOwnProperty.call(this, key)) {
            yield this[key];
          }
        }
      },
      configurable: true,
      enumerable: false,
    },
  });
  return obj as T & Iterable<T[keyof T]>;
}

export * from "./utils";

export default {
  parseFromString: parseShopifyCSVFromString,
  parse: parseShopifyCSV,
  write: writeShopifyCSV,
  stringify: stringifyShopifyCSV,
} as const;
