/**
 * @module shopify-csv-processor
 * @description
 * A module for parsing, processing, and writing Shopify Product CSVs.
 * It correctly handles the complex multi-row structure of products with variants and images.
 */

import { promises as fs } from 'fs';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';

// --- CONSTANTS ---
const OPTION_INDEXES = ['1', '2', '3'];
const REQUIRED_COLUMNS = ['Handle'];

// --- CUSTOM ERROR CLASS ---

/**
 * Custom error for handling specific issues during CSV processing,
 * allowing for more granular error handling by the consumer.
 */
export class CSVProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CSVProcessingError';
  }
}

// --- TYPE DEFINITIONS ---

/** A minimal interface for the first part of Shopify's standard columns. */
export interface ShopifyProductCSVPart1 {
  Handle: string;
  Title: string;
  "Body (HTML)": string;
  Vendor: string;
  "Product Category": string;
  Type: string;
  Tags: string;
  Published: string;
  'Option1 Name': string;
  'Option1 Value': string;
  'Option2 Name': string;
  'Option2 Value': string;
  'Option3 Name': string;
  'Option3 Value': string;
  'Variant SKU': string;
  'Image Src': string;
  'Image Position': string;
  'Image Alt Text': string;
  [key: string]: any; // Allows for all other standard columns
}

/** A minimal interface for the second part of Shopify's standard columns. */
export interface ShopifyProductCSVPart2 {
  'Variant Image': string;
  'Cost per item': string;
  Status: string;
  [key: string]: any; // Allows for all other standard columns
}

/** Represents a single row in a Shopify Product CSV, including any custom/metafield columns. */
export type ShopifyProductCSV<T extends Record<string, string> = {}> =
  ShopifyProductCSVPart1 & ShopifyProductCSVPart2 & T;

/** Represents a single product parsed from the CSV, containing all its variants and images. */
export type ShopifyProductCSVParsedRow<A extends Record<string, string> = {}> = {
  /** The full data from the first row of the product in the CSV. */
  data: ShopifyProductCSV<A>;
  /** An array of all unique images for the product. */
  images: ShopifyCSVParsedImage[];
  /** An array of all variants for the product. */
  variants: ShopifyCSVParsedVariant[];
}

/** Represents a single product variant with its specific data and option values. */
export type ShopifyCSVParsedVariant = {
  /** The option key-value pairs for this variant (e.g., { name: 'Color', value: 'Red' }). */
  options: { name: string, value: string }[];
  /** Contains all variant-specific columns (SKU, Price, Barcode, etc.). */
  data: Record<string, string>;
  /** True if this variant is the 'Default Title' variant. */
  isDefault: boolean;
}

/** Represents a single product image. */
export type ShopifyCSVParsedImage = {
  src: string;
  position: string;
  alt: string;
};


/**
 * Parses a Shopify product CSV into a structured, hierarchical format.
 *
 * @param path The file path to the Shopify CSV.
 * @throws {CSVProcessingError} If the file is not found, unreadable, or malformed.
 * @returns A promise resolving to a record of parsed product data, keyed by product handle.
 */
export async function parse_shopify_csv<A extends Record<string, string> = {}>(
  path: string
): Promise<Record<string, ShopifyProductCSVParsedRow<A>>> {
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

  const products: Record<string, ShopifyProductCSVParsedRow<A>> = {};
  let currentHandle: string | null = null;
  let currentOptionNames: string[] = [];

  for (const row of records) {
    const handleInRow = row['Handle'];

    if (handleInRow && handleInRow !== currentHandle) {
      currentHandle = handleInRow;
      products[currentHandle] = { data: row, images: [], variants: [] };
      currentOptionNames = OPTION_INDEXES.map(i => row[`Option${i} Name`]).filter(Boolean);
    }

    if (!currentHandle || !products[currentHandle]) continue;
    const product = products[currentHandle];

    if (row['Image Src'] && !product.images.some(img => img.src === row['Image Src'])) {
      product.images.push({ src: row['Image Src'], position: row['Image Position'], alt: row['Image Alt Text'] || '' });
    }

    const isVariantRow = currentOptionNames.length > 0 && row['Option1 Value'];
    if (isVariantRow) {
      const variantData = Object.fromEntries(Object.entries(row).filter(([key]) => key.startsWith('Variant ') || key === 'Cost per item'));
      const options = currentOptionNames.map((name, i) => ({ name, value: row[`Option${i + 1} Value`] })).filter(opt => opt.value);

      product.variants.push({
        options,
        data: variantData,
        isDefault: options.some(o => o.value === 'Default Title')
      });
    }
  }

  Object.defineProperties(products, {
    [Symbol.toStringTag]: { value: 'ShopifyProductCSV' },
    [Symbol.iterator]: { value: function* () {
      for (const handle in products) {
        yield products[handle];
      }
    } }
  });

  return products;
}

/**
 * Converts the structured product data back into a CSV formatted string.
 *
 * @param parsedData The structured data from `parse_shopify_csv`.
 * @throws {CSVProcessingError} If there is an issue during the stringification process.
 * @returns A promise resolving to the complete CSV content as a string.
 */
export async function stringify_shopify_csv(
  parsedData: Record<string, ShopifyProductCSVParsedRow<any>>
): Promise<string> {
  const productList = Object.values(parsedData);
  if (productList.length === 0) return "";

  const allRows: Record<string, any>[] = [];
  const headers = Object.keys(productList[0].data);
  const template = Object.fromEntries(headers.map(h => [h, '']));

  for (const handle in parsedData) {
    const { data: mainRowData, variants, images } = parsedData[handle];
    const writtenImageSrcs = new Set<string>();

    if (variants.length === 0) { // Handle simple products
      const simpleProductRow = { ...mainRowData };
      if (images.length > 0) {
        simpleProductRow['Image Src'] = images[0].src;
        simpleProductRow['Image Position'] = images[0].position;
        simpleProductRow['Image Alt Text'] = images[0].alt;
        writtenImageSrcs.add(images[0].src);
      }
      allRows.push(simpleProductRow);
    } else { // Handle products with variants
      variants.forEach((variant, index) => {
        const row = (index === 0) ? { ...mainRowData } : { ...template, Handle: handle };
        if (index > 0) OPTION_INDEXES.forEach(i => (row[`Option${i} Name`] = mainRowData[`Option${i} Name`]));

        Object.assign(row, variant.data);
        variant.options.forEach(opt => {
          const optIndex = OPTION_INDEXES.find(i => mainRowData[`Option${i} Name`] === opt.name);
          if (optIndex) row[`Option${optIndex} Value`] = opt.value;
        });

        const imageSrc = row['Variant Image'] || (index === 0 ? mainRowData['Image Src'] : null);
        if (imageSrc) writtenImageSrcs.add(imageSrc);
        allRows.push(row);
      });
    }

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
 *
 * @param path The file path to write the CSV to.
 * @param parsedData The structured data from `parse_shopify_csv`.
 * @throws {CSVProcessingError} If there is an error during stringification or writing the file.
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