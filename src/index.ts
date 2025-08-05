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
 * Key Features:
 * - **Correctly Parses Product Hierarchy:** Aggregates multiple CSV rows into single product objects.
 * - **Type-Safe:** Uses TypeScript generics to allow for custom column typing.
 * - **Rich Metafield Handling:** Parses metafield columns into structured objects and allows for direct manipulation.
 * - **Iterable Collections:** Parsed product, variant, and metafield collections can be used directly in `for...of` loops.
 * - **Read-Modify-Write:** Provides a complete toolkit to read a CSV, programmatically modify its data, and write it back to a valid Shopify CSV file.
 */

import { promises as fs } from 'fs';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';

// --- CONSTANTS ---

/** @internal The option number suffixes used in Shopify CSV headers (e.g., 'Option1 Name'). */
const OPTION_INDEXES = ['1', '2', '3'];

/** @internal The minimum set of columns required to identify a product row. */
const REQUIRED_COLUMNS = ['Handle'];

/**
 * @internal
 * Regex to capture the three parts of a Shopify metafield column header.
 * It deconstructs headers like "Metafield: my_fields.fabric[string]" into:
 * 1. Namespace: `my_fields`
 * 2. Key: `fabric`
 * 3. Type: `string`
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
 * try {
 *   const products = await parse_shopify_csv('non-existent-file.csv');
 * } catch (error) {
 *   if (error instanceof CSVProcessingError) {
 *     console.error('CSV Processing failed:', error.message);
 *   } else {
 *     console.error('An unexpected error occurred:', error);
 *   }
 * }
 * ```
 */
export class CSVProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CSVProcessingError';
  }
}

/** A minimal interface for the standard Shopify product columns (Part 1). */
export interface ShopifyProductCSVPart1 {
  Handle: string;
  Title: string;
  "Body (HTML)": string;
  Vendor: string;
  Type: string;
  Tags: string;
  Published: string;
  'Option1 Name': string;
  'Option1 Value': string;
  'Option2 Name': string;
  'Option2 Value': string;
  'Option3 Name': string;
  'Option3 Value': string;
  'Image Src': string;
  'Image Position': string;
  'Image Alt Text': string;
  [key: string]: any;
}

/** A minimal interface for the standard Shopify variant columns (Part 2). */
export interface ShopifyProductCSVPart2 {
  'Variant SKU': string;
  'Variant Image': string;
  'Cost per item': string;
  Status: string;
  [key:string]: any;
}

/**
 * Represents a single row in a Shopify Product CSV.
 * It includes all standard Shopify fields and can be extended with a generic
 * type `T` to provide type safety for any custom or metafield columns.
 * @template T - A record type for any additional custom columns.
 */
export type ShopifyProductCSV<T extends Record<string, string> = {}> =
  ShopifyProductCSVPart1 & ShopifyProductCSVPart2 & T;

/**
 * Represents a single parsed metafield with rich information and self-updating capabilities.
 * This structure provides a clean interface for reading and writing metafield data.
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
   * **Note:** Assigning a new value to this property automatically updates the underlying
   * CSV data object, which will be reflected when the data is stringified back to a CSV file.
   */
  parsedValue: string | string[];
}

/**
 * An iterable, map-like object containing all of a product's metafields,
 * where keys are the full metafield column headers (e.g., "Metafield: my_fields.fabric[string]").
 * You can iterate over this object using `for...of` to get each `ShopifyMetafield` object.
 */
export type ShopifyProductMetafields = Record<string, ShopifyMetafield> & Iterable<ShopifyMetafield>;

/**
 * Represents a single, fully parsed product, aggregating all its associated
 * CSV rows into one hierarchical object.
 * @template A - A record type for any additional custom columns in the source CSV.
 */
export type ShopifyProductCSVParsedRow<A extends Record<string, string> = {}> = {
  /**
   * The full data from the product's first row in the CSV.
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
}

/** Represents a single product variant with its specific data and option values. */
export type ShopifyCSVParsedVariant = {
  /** The combination of option name and value that defines this variant (e.g., `{ name: 'Color', value: 'Blue' }`). */
  options: { name: string, value: string }[];
  /** A key-value map of all variant-specific columns, like 'Variant SKU' and 'Cost per item'. */
  data: Record<string, string>;
  /** Indicates if this is the default variant. */
  isDefault: boolean;
}

/** Represents a single product image. */
export type ShopifyCSVParsedImage = {
  src: string;
  position: string;
  alt: string;
};


// --- CORE FUNCTIONS ---

/**
 * Parses a Shopify product CSV from a file path into a structured, hierarchical format.
 * The function reads the CSV, identifies rows belonging to the same product via its 'Handle',
 * and groups them into a single, easy-to-use object. The returned collection is iterable,
 * allowing you to use it directly in `for...of` loops.
 *
 * @template A - A generic to type-define custom columns beyond the standard Shopify set.
 * @param path - The file path to the Shopify CSV.
 * @returns A promise that resolves to a custom iterable record of parsed product data,
 *          where keys are product handles and values are `ShopifyProductCSVParsedRow` objects.
 * @throws {CSVProcessingError} If the file is not found, is unreadable, or is a malformed CSV
 *         (e.g., missing the required 'Handle' column).
 *
 * @example
 * ```typescript
 * import { parse_shopify_csv, CSVProcessingError } from './parse-shopify-csv';
 *
 * (async () => {
 *   try {
 *     const products = await parse_shopify_csv('./my-products.csv');
 *
 *     // Iterate over each product
 *     for (const product of products) {
 *       console.log(`Processing Product: ${product.data.Title}`);
 *
 *       // Access basic data
 *       console.log(`- Handle: ${product.data.Handle}`);
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
export async function parse_shopify_csv<A extends Record<string, string> = {}>(
  path: string
): Promise<Record<string, ShopifyProductCSVParsedRow<A>> & Iterable<ShopifyProductCSVParsedRow<A>>> {
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

  return _enhanceWithIterator(products, 'ShopifyProductCollection');
}


/**
 * Converts the structured product data from `parse_shopify_csv` back into a
 * CSV formatted string, correctly recreating Shopify's multi-row structure.
 *
 * @param parsedData - The structured product data object returned by `parse_shopify_csv`.
 * @returns A promise resolving to the complete CSV content as a string.
 *
 * @example
 * ```typescript
 * // (Continuing from parse_shopify_csv example)
 * // const products = await parse_shopify_csv('./my-products.csv');
 * // ... modify products ...
 *
 * const csvString = await stringify_shopify_csv(products);
 * console.log(csvString); // Outputs the CSV string to the console
 * ```
 */
export async function stringify_shopify_csv(
  parsedData: Record<string, ShopifyProductCSVParsedRow<any>>
): Promise<string> {
  const productList = Object.values(parsedData);
  if (productList.length === 0) return "";

  const allRows: Record<string, any>[] = [];
  // Use the first product's data to establish all column headers in the correct order.
  const headers = Object.keys(productList[0].data);
  const template = Object.fromEntries(headers.map(h => [h, '']));

  for (const handle in parsedData) {
    if (!Object.prototype.hasOwnProperty.call(parsedData, handle)) continue;
    
    const { data: mainRowData, variants, images } = parsedData[handle];
    const writtenImageSrcs = new Set<string>();

    // Case 1: Simple product (no variants)
    if (variants.length === 0) {
      const simpleProductRow = { ...mainRowData };
      if (images.length > 0) {
        simpleProductRow['Image Src'] = images[0].src;
        simpleProductRow['Image Position'] = images[0].position;
        simpleProductRow['Image Alt Text'] = images[0].alt;
        writtenImageSrcs.add(images[0].src);
      }
      allRows.push(simpleProductRow);
    } else { // Case 2: Product with variants
      variants.forEach((variant, index) => {
        // The first variant row contains all main product data.
        const row = (index === 0) ? { ...mainRowData } : { ...template, Handle: handle };
        // Subsequent variant rows only need the handle and the shared option names.
        if (index > 0) OPTION_INDEXES.forEach(i => (row[`Option${i} Name`] = mainRowData[`Option${i} Name`]));

        Object.assign(row, variant.data);
        variant.options.forEach(opt => {
          const optIndex = OPTION_INDEXES.find(i => mainRowData[`Option${i} Name`] === opt.name);
          if (optIndex) row[`Option${optIndex} Value`] = opt.value;
        });

        // Track which images are associated with variants to avoid duplicating them later.
        const imageSrc = row['Variant Image'] || (index === 0 ? mainRowData['Image Src'] : null);
        if (imageSrc) writtenImageSrcs.add(imageSrc);
        allRows.push(row);
      });
    }

    // Add any remaining images that weren't assigned to a variant.
    // These get their own rows with only a Handle and image columns populated.
    images.forEach(image => {
      if (!writtenImageSrcs.has(image.src)) {
        allRows.push({ ...template, Handle: handle, 'Image Src': image.src, 'Image Position': image.position, 'Image Alt Text': image.alt });
      }
    });
  }

  return new Promise((resolve, reject) => {
    stringify(allRows, { header: true, columns: headers }, (err, output) => {
      if (err) return reject(new CSVProcessingError(`CSV stringification failed: ${err.message}`));
      resolve(output);
    });
  });
}


/**
 * Writes the structured product data back into a valid Shopify CSV file.
 * This function serves as a convenient wrapper around `stringify_shopify_csv` and `fs.writeFile`.
 *
 * @param path - The file path where the new CSV file will be saved.
 * @param parsedData - The structured data from `parse_shopify_csv`.
 * @throws {CSVProcessingError} If stringification or file writing fails.
 *
 * @example
 * // A complete "read-modify-write" workflow:
 *
 * import { parse_shopify_csv, write_shopify_csv, CSVProcessingError } from './parse-shopify-csv';
 *
 * async function updateProductTags(inputFile: string, outputFile: string) {
 *   try {
 *     // 1. Read and parse the CSV
 *     const products = await parse_shopify_csv(inputFile);
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
 *     await write_shopify_csv(outputFile, products);
 *     console.log(`Successfully updated products and saved to ${outputFile}`);
 *
 *   } catch (error) {
 *     console.error(`An error occurred:`, error);
 *   }
 * }
 *
 * updateProductTags('shopify-export.csv', 'shopify-export-modified.csv');
 */
export async function write_shopify_csv(
  path: string,
  parsedData: Record<string, ShopifyProductCSVParsedRow<any>>
): Promise<void> {
  try {
    const csvString = await stringify_shopify_csv(parsedData);
    await fs.writeFile(path, csvString);
  } catch (error: unknown) {
    if (error instanceof CSVProcessingError) throw error;
    throw new CSVProcessingError(`Failed to write CSV to ${path}: ${(error as Error).message}`);
  }
}


// --- HELPER FUNCTIONS ---

/**
 * @internal
 * Creates the initial product structure from its first corresponding row in the CSV.
 * It also sets up the smart `metadata` object with getters and setters for live updates.
 */
function _createProductFromRow<A extends Record<string, string>>(row: ShopifyProductCSV<A>): ShopifyProductCSVParsedRow<A> {
  const product: ShopifyProductCSVParsedRow<A> = {
    data: row,
    images: [],
    variants: [],
    metadata: {} as ShopifyProductMetafields,
  };

  // Scan all columns to find metafields and build the metadata object.
  for (const columnHeader in row) {
    const match = columnHeader.match(METAFIELD_REGEX);
    if (match) {
      const [, namespace, key, type] = match;
      const isList = type.startsWith('list.');

      // Define a property on the metadata object for each metafield.
      // This uses getters and setters to link the parsed value directly to the raw `product.data`.
      Object.defineProperty(product.metadata, columnHeader, {
        enumerable: true,
        configurable: true,
        get: () => ({
          key,
          namespace,
          isList,
          get value(): string { return product.data[columnHeader] as string || ''; },
          get parsedValue(): string | string[] {
            const rawValue = this.value;
            return isList ? rawValue.split(',').map((s: string) => s.trim()).filter(Boolean) : rawValue;
          },
          set parsedValue(newValue: string | string[]) {
            // When `parsedValue` is set, update the underlying `product.data` object.
            // This is the magic that makes modifications persistent for stringification.
            (product.data as Record<string, any>)[columnHeader] = Array.isArray(newValue) ? newValue.join(',') : newValue;
          },
        }),
      });
    }
  }

  // Finally, make the metadata object itself iterable.
  return Object.defineProperty(product, 'metadata', {
    value: _enhanceWithIterator(product.metadata, 'ShopifyMetafieldCollection'),
  });
}

/**
 * @internal
 * Adds an image to a product's image collection if the row contains a unique image source.
 */
function _addImageToProduct(product: ShopifyProductCSVParsedRow<any>, row: ShopifyProductCSV<any>) {
  if (row['Image Src'] && !product.images.some(img => img.src === row['Image Src'])) {
    product.images.push({ src: row['Image Src'], position: row['Image Position'], alt: row['Image Alt Text'] || '' });
  }
}

/**
 * @internal
 * Adds a variant to a product's variant collection if the row contains variant-defining data.
 */
function _addVariantToProduct(product: ShopifyProductCSVParsedRow<any>, row: ShopifyProductCSV<any>) {
  const optionNames = OPTION_INDEXES.map(i => product.data[`Option${i} Name`]).filter(Boolean);
  const isVariantRow = optionNames.length > 0 && row['Option1 Value'];

  if (isVariantRow) {
    // Collect all columns that are variant-specific into a separate data object.
    const variantData = Object.entries(row)
      .filter(([key]) => key.startsWith('Variant ') || key === 'Cost per item' || key === 'Status')
      .reduce((acc, [key, value]) => {
        acc[key] = String(value ?? ''); // Ensure value is a string.
        return acc;
      }, {} as Record<string, string>);
    
    const options = optionNames.map((name, i) => ({ name, value: row[`Option${i + 1} Value`] })).filter(opt => opt.value);

    product.variants.push({
      options,
      data: variantData,
      isDefault: options.some(o => o.value === 'Default Title'),
    });
  }
}

/**
 * @internal
 * Reads a file, parses it as a CSV, and performs basic validation.
 */
async function _getRecordsFromFile<A extends Record<string, string>>(path: string): Promise<ShopifyProductCSV<A>[]> {
  let fileContent: Buffer;
  try {
    fileContent = await fs.readFile(path);
  } catch (error) {
    throw new CSVProcessingError(`Failed to read file at ${path}: ${(error as Error).message}`);
  }

  const records = await new Promise<ShopifyProductCSV<A>[]>((resolve, reject) => {
    parse(fileContent, { columns: true, skip_empty_lines: true }, (err, result) => {
      if (err) return reject(new CSVProcessingError(`CSV parsing failed: ${err.message}`));
      resolve(result as ShopifyProductCSV<A>[]);
    });
  });

  if (records.length > 0 && !REQUIRED_COLUMNS.every(col => col in records[0])) {
    throw new CSVProcessingError(`Invalid CSV format: Missing required columns. Must include: ${REQUIRED_COLUMNS.join(', ')}`);
  }
  return records;
}

/**
 * @internal
 * Enhances a plain object with `Symbol.iterator` and `Symbol.toStringTag`
 * to make it behave like a built-in iterable collection.
 */
function _enhanceWithIterator<T extends Record<string, any>>(obj: T, tag: string): T & Iterable<T[keyof T]> {
  Object.defineProperties(obj, {
    [Symbol.toStringTag]: { value: tag, configurable: true },
    [Symbol.iterator]: {
      value: function* () {
        for (const key in this) {
          if (Object.prototype.hasOwnProperty.call(this, key)) {
            yield this[key];
          }
        }
      },
      configurable: true,
    },
  });
  return obj as T & Iterable<T[keyof T]>;
}


export * from './utils';
