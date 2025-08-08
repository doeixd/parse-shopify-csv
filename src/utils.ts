/**
 * @module product-utils
 * @description
 * A collection of utility functions for performing common CRUD (Create, Read, Update, Delete)
 * operations on the data structures returned by `parse-shopify-csv`.
 *
 * @remarks
 * These helpers simplify tasks like adding new products, managing variants,
 * manipulating images, and creating or updating metafields across an entire product
 * collection. They are designed to be used after parsing a CSV and before writing
 * it back, ensuring data integrity is maintained.
 */

import {
  ShopifyProductCSVParsedRow,
  ShopifyCSVParsedVariant,
  ShopifyCSVParsedImage,
  ShopifyMetafield,
  ShopifyProductCSV,
} from "./index";

// --- Enhanced Type Definitions for Better Type Experience ---

/**
 * Utility type for defining custom metafields with their types.
 * Provides better intellisense and type safety when working with known metafields.
 *
 * @example
 * ```typescript
 * type MyMetafields = DefineMetafields<{
 *   'custom.material': string;
 *   'custom.features': string[];
 *   'inventory.location': string;
 * }>;
 * ```
 */
export type DefineMetafields<T extends Record<string, string | string[]>> = {
  [K in keyof T]: T[K] extends string[]
    ? `Metafield: ${K & string}[list.single_line_text_field]`
    : `Metafield: ${K & string}[single_line_text_field]`;
}[keyof T];

/**
 * Helper type for creating strongly-typed custom columns.
 * Use this when you know the exact structure of your custom CSV columns.
 *
 * @example
 * ```typescript
 * type MyCustomColumns = DefineCustomColumns<{
 *   'Custom Field 1': string;
 *   'Custom Field 2': string;
 *   'Special Pricing': string;
 * }>;
 *
 * const products = await parseShopifyCSV<MyCustomColumns>('file.csv');
 * // Now you get full autocomplete for custom fields
 * ```
 */
export type DefineCustomColumns<T extends Record<string, string>> = T;

/**
 * Utility type that combines custom columns with metafield columns.
 * Provides the best type experience when you know both your custom fields and metafields.
 *
 * @example
 * ```typescript
 * type MyColumns = DefineCustomColumns<{
 *   'Custom Price': string;
 *   'Internal Notes': string;
 * }>;
 *
 * type MyMetafields = DefineMetafields<{
 *   'custom.material': string;
 *   'custom.features': string[];
 * }>;
 *
 * type AllColumns = CombineColumnsAndMetafields<MyColumns, MyMetafields>;
 * const products = await parseShopifyCSV<AllColumns>('file.csv');
 * ```
 */
export type CombineColumnsAndMetafields<
  C extends CustomColumns,
  M extends string,
> = C & { [K in M]: string };

/**
 * Utility type for variant-specific custom fields.
 * Use when you have custom variant columns beyond the standard Shopify ones.
 */
export type CustomVariantFields = Record<string, string>;

/**
 * Predicate type that preserves generic information for product filtering.
 */
export type TypedProductPredicate<T extends CustomColumns = {}> = (
  product: TypedProduct<T>,
) => boolean;

/**
 * Predicate type that preserves generic information for variant filtering.
 */
export type TypedVariantPredicate<T extends CustomColumns = {}> = (
  variant: ShopifyCSVParsedVariant,
  product: TypedProduct<T>,
) => boolean;

/**
 * Generic type for custom columns that can be added to Shopify products.
 * Provides better type safety when working with known custom fields.
 */
export type CustomColumns = Record<string, string>;

/**
 * Enhanced products collection type that maintains generic information.
 */
export type ProductsCollection<T extends CustomColumns = {}> = Record<
  string,
  ShopifyProductCSVParsedRow<T>
> &
  Iterable<ShopifyProductCSVParsedRow<T>>;

/**
 * Type helper for maintaining generic type information through utility functions.
 */
export type TypedProduct<T extends CustomColumns = {}> =
  ShopifyProductCSVParsedRow<T>;

// --- Type Definitions for Utility Functions ---

/**
 * Defines the data structure for creating a new product.
 * All properties are optional except for the `handle` provided to `createProduct`.
 */
export interface NewProductData {
  /** The product title. */
  Title?: string;
  /** The product description, which can include HTML. */
  "Body (HTML)"?: string;
  /** The name of the vendor or brand. */
  Vendor?: string;
  /** The category or type of the product. */
  Type?: string;
  /** A comma-separated string of tags. */
  Tags?: string;
  /** The product status. Defaults to `active`. */
  Status?: "active" | "draft" | "archived";
  /** Allows for any other custom columns to be added. */
  [key: string]: any;
}

/**
 * Defines the data structure for creating a new product variant.
 * Requires an `options` map to define the variant's characteristics.
 */
export interface NewVariantData {
  /**
   * A map of option names to values that define this variant.
   * @example { Color: 'Blue', Size: 'M' }
   */
  options: Record<string, string>;
  /**
   * Optional map of option names to linkedTo values (e.g., image filenames).
   * @example { Color: 'blue-variant.jpg', Size: 'medium-size.jpg' }
   */
  linkedTo?: Record<string, string>;
  /** The Stock Keeping Unit for the variant. */
  "Variant SKU"?: string;
  /** The cost of the item. */
  "Cost per item"?: string;
  /** Allows for any other variant-specific columns. */
  [key: string]: any;
}

/**
 * Defines the data structure for a new product image.
 * The `src` property is required.
 */
export interface NewImageData {
  /** The source URL of the image. */
  src: string;
  /** The alternative text for the image, used for accessibility. */
  alt?: string;
  /**
   * The display order of the image (1-based index).
   * If not provided, it will be appended to the end.
   */
  position?: number;
}

/**
 * Defines the options for creating a new metafield column across all products.
 * This ensures that every product in the collection will have this metafield.
 */
export interface NewMetafieldColumnOptions {
  /** The namespace for the metafield (e.g., 'custom', 'details'). */
  namespace: string;
  /** The key for the metafield (e.g., 'care_instructions', 'material'). */
  key: string;
  /**
   * The Shopify metafield type string.
   * @example 'string', 'integer', 'list.single_line_text_field'
   */
  type: string;
  /**
   * The default value to set for all existing products.
   * For list types, provide an array of strings.
   * Defaults to an empty string.
   */
  defaultValue?: string | string[];
}

// --- PRODUCT UTILS ---

/**
 * Creates a new, minimal product object ready to be added to a collection.
 * This function constructs the basic `ShopifyProductCSVParsedRow` structure with all required fields.
 *
 * @param {string} handle - The unique handle for the new product (e.g., 'my-new-shirt').
 * @param {NewProductData} productData - The core data for the product, like Title and Vendor.
 * @returns {ShopifyProductCSVParsedRow} A new `ShopifyProductCSVParsedRow` object.
 *
 * @example
 * ```typescript
 * const newProduct = createProduct('my-new-shirt', {
 *   Title: 'My New Shirt',
 *   Vendor: 'MyBrand',
 *   Status: 'draft'
 * });
 *
 * // Add the new product to your main collection
 * products[newProduct.data.Handle] = newProduct;
 * ```
 */
export function createProduct<T extends CustomColumns = {}>(
  handle: string,
  productData: NewProductData,
): ShopifyProductCSVParsedRow<T> {
  const newRow: ShopifyProductCSVParsedRow<T> = {
    data: {
      Handle: handle,
      Title: "",
      "Body (HTML)": "",
      Vendor: "",
      "Product Category": "",
      Type: "",
      Tags: "",
      Published: "TRUE",
      "Option1 Name": "",
      "Option1 Value": "",
      "Option1 Linked To": "",
      "Option2 Name": "",
      "Option2 Value": "",
      "Option2 Linked To": "",
      "Option3 Name": "",
      "Option3 Value": "",
      "Option3 Linked To": "",
      "Image Src": "",
      "Image Position": "",
      "Image Alt Text": "",
      "Gift Card": "FALSE",
      "SEO Title": "",
      "SEO Description": "",
      "Google Shopping / Google Product Category": "",
      "Google Shopping / Gender": "",
      "Google Shopping / Age Group": "",
      "Google Shopping / MPN": "",
      "Google Shopping / Condition": "",
      "Google Shopping / Custom Product": "FALSE",
      "Google Shopping / Custom Label 0": "",
      "Google Shopping / Custom Label 1": "",
      "Google Shopping / Custom Label 2": "",
      "Google Shopping / Custom Label 3": "",
      "Google Shopping / Custom Label 4": "",
      "Variant SKU": "",
      "Variant Image": "",
      "Variant Grams": "",
      "Variant Inventory Tracker": "",
      "Variant Inventory Qty": "",
      "Variant Inventory Policy": "",
      "Variant Fulfillment Service": "",
      "Variant Price": "",
      "Variant Compare At Price": "",
      "Variant Requires Shipping": "TRUE",
      "Variant Taxable": "TRUE",
      "Variant Barcode": "",
      "Variant Weight Unit": "",
      "Google Shopping / Size": "",
      "Google Shopping / Size System": "",
      "Google Shopping / Size Type": "",
      "Google Shopping / Color": "",
      "Google Shopping / Material": "",
      "Google Shopping / Unit Pricing Measure": "",
      "Google Shopping / Unit Pricing Measure Unit": "",
      "Google Shopping / Unit Pricing Base Measure": "",
      "Google Shopping / Unit Pricing Base Measure Unit": "",
      "Cost per item": "",
      Status: "active",
      ...productData,
    } as any as ShopifyProductCSV<T>,
    images: [],
    variants: [],
    metadata: {} as any, // Initially empty; populated by addMetafieldColumn
  };
  // Make metadata iterable
  Object.defineProperty(newRow, "metadata", {
    value: Object.defineProperty(newRow.metadata, Symbol.iterator, {
      value: function* () {
        for (const key in this) {
          if (Object.prototype.hasOwnProperty.call(this, key)) yield this[key];
        }
      },
    }),
  });
  return newRow;
}

/**
 * Deletes a product from the collection by its handle.
 *
 * @param {Record<string, ShopifyProductCSVParsedRow>} products - The main collection of products.
 * @param {string} handle - The handle of the product to remove.
 * @returns {boolean} `true` if the product was found and deleted, `false` otherwise.
 *
 * @example
 * ```typescript
 * const wasDeleted = deleteProduct(products, 'product-to-be-deleted');
 * console.log(wasDeleted); // true or false
 * ```
 */
export function deleteProduct<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  handle: string,
): boolean {
  if (products[handle]) {
    delete products[handle];
    return true;
  }
  return false;
}

// --- VARIANT UTILS ---

/**
 * Finds a specific variant on a product by its SKU.
 *
 * @param {ShopifyProductCSVParsedRow} product - The product to search within.
 * @param {string} sku - The SKU of the variant to find.
 * @returns {ShopifyCSVParsedVariant | undefined} The `ShopifyCSVParsedVariant` object or `undefined` if not found.
 *
 * @example
 * ```typescript
 * const variant = findVariant(product, 'SKU123');
 * if (variant) {
 *   console.log('Found variant:', variant.data['Cost per item']);
 * }
 * ```
 */
export function findVariant<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
  sku: string,
): ShopifyCSVParsedVariant | undefined {
  if (!sku) return undefined;
  return product.variants.find((v) => v.data["Variant SKU"] === sku);
}

/**
 * Adds a new variant to a product.
 * This function intelligently adds Option Name headers to the product if they
 * are new, and then constructs and adds the variant to the product's `variants` array.
 *
 * @param {ShopifyProductCSVParsedRow} product - The product to add the variant to.
 * @param {NewVariantData} newVariantData - The data for the new variant, including options and SKU.
 * @returns {ShopifyCSVParsedVariant} The newly created `ShopifyCSVParsedVariant` object.
 * @throws {Error} If the product already has 3 options and a new one is required.
 *
 * @example
 * ```typescript
 * addVariant(product, {
 *   options: { Color: 'Red', Size: 'XL' },
 *   'Variant SKU': 'MY-SHIRT-RED-XL',
 *   'Cost per item': '12.50'
 * });
 * ```
 */
export function addVariant<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
  newVariantData: NewVariantData,
): ShopifyCSVParsedVariant {
  const { options, linkedTo, ...variantSpecificData } = newVariantData;
  const optionNames = Object.keys(options);
  const existingOptionNames = [
    product.data["Option1 Name"],
    product.data["Option2 Name"],
    product.data["Option3 Name"],
  ];

  // Ensure product has the required Option Name headers
  optionNames.forEach((optName) => {
    if (!existingOptionNames.includes(optName)) {
      const emptySlotIndex = existingOptionNames.findIndex((name) => !name);
      if (emptySlotIndex === -1) {
        throw new Error(
          `Cannot add variant with new option "${optName}". Product already has 3 options defined.`,
        );
      }
      (product.data as Record<string, any>)[
        `Option${emptySlotIndex + 1} Name`
      ] = optName;
      existingOptionNames[emptySlotIndex] = optName; // Update our local copy for subsequent checks
    }
  });

  const newVariant: ShopifyCSVParsedVariant = {
    options: Object.entries(options).map(([name, value]) => ({
      name,
      value,
      linkedTo: newVariantData.linkedTo?.[name],
    })),
    data: { ...variantSpecificData },
    isDefault: false,
    metadata: {} as any,
  };

  product.variants.push(newVariant);
  return newVariant;
}

/**
 * Removes a variant from a product using its SKU.
 *
 * @param {ShopifyProductCSVParsedRow} product - The product to remove the variant from.
 * @param {string} sku - The SKU of the variant to remove.
 * @returns {boolean} `true` if the variant was found and removed, `false` otherwise.
 *
 * @example
 * ```typescript
 * const wasRemoved = removeVariant(product, 'SKU123');
 * console.log('Variant removed:', wasRemoved);
 * ```
 */
export function removeVariant<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
  sku: string,
): boolean {
  const initialLength = product.variants.length;
  product.variants = product.variants.filter(
    (v) => v.data["Variant SKU"] !== sku,
  );
  return product.variants.length < initialLength;
}

// --- IMAGE UTILS ---

/**
 * Adds a new image to a product's image collection.
 * It prevents adding images with duplicate source URLs.
 *
 * @param {ShopifyProductCSVParsedRow} product - The product to add the image to.
 * @param {NewImageData} newImageData - An object containing the image `src`, and optional `alt` and `position`.
 * @returns {ShopifyCSVParsedImage} The newly created `ShopifyCSVParsedImage` object, or the existing one if the `src` already exists.
 *
 * @example
 * ```typescript
 * addImage(product, { src: 'http://example.com/new.jpg', alt: 'A new product image' });
 * ```
 */
export function addImage<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
  newImageData: NewImageData,
): ShopifyCSVParsedImage {
  const existingImage = product.images.find(
    (img) => img.src === newImageData.src,
  );
  if (existingImage) {
    return existingImage;
  }

  const image: ShopifyCSVParsedImage = {
    src: newImageData.src,
    alt: newImageData.alt || "",
    position: newImageData.position
      ? String(newImageData.position)
      : String(product.images.length + 1),
  };

  product.images.push(image);
  return image;
}

/**
 * Assigns an existing image to a specific variant by its SKU.
 * This sets the 'Variant Image' property for the target variant.
 *
 * @param {ShopifyProductCSVParsedRow} product - The product containing the variant and image.
 * @param {string} imageSrc - The source URL of the image to assign.
 * @param {string} sku - The SKU of the target variant.
 * @throws {Error} if the image or variant cannot be found on the product.
 *
 * @example
 * ```typescript
 * try {
 *   assignImageToVariant(product, 'http://example.com/image.jpg', 'SKU123');
 * } catch (e) {
 *   console.error(e.message);
 * }
 * ```
 */
export function assignImageToVariant<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
  imageSrc: string,
  sku: string,
): void {
  const image = product.images.find((img) => img.src === imageSrc);
  if (!image) {
    throw new Error(`Image with src "${imageSrc}" not found on product.`);
  }

  const variant = findVariant(product, sku);
  if (!variant) {
    throw new Error(`Variant with SKU "${sku}" not found on product.`);
  }

  variant.data["Variant Image"] = image.src;
}

// --- METAFIELD UTILS ---

/**
 * Creates a new metafield column across an entire collection of products.
 * This is the correct way to create a *new* metafield, as it ensures every product
 * has the column, maintaining a consistent CSV structure.
 *
 * @param {Record<string, ShopifyProductCSVParsedRow>} products - The main collection of all products.
 * @param {NewMetafieldColumnOptions} options - The details of the new metafield column.
 *
 * @example
 * ```typescript
 * addMetafieldColumn(products, {
 *   namespace: 'custom',
 *   key: 'care_instructions',
 *   type: 'string',
 *   defaultValue: 'Machine wash cold.'
 * });
 * ```
 */
export function addMetafieldColumn<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  options: NewMetafieldColumnOptions,
): void {
  const { namespace, key, type, defaultValue } = options;
  const header = `Metafield: ${namespace}.${key}[${type}]`;
  const isList = type.startsWith("list.");
  const defaultValueString = Array.isArray(defaultValue)
    ? defaultValue.join(",")
    : String(defaultValue ?? "");

  for (const handle in products) {
    const product = products[handle];
    if (header in product.data) continue;

    // 1. Add the raw data property to the product's main data object.
    (product.data as Record<string, any>)[header] = defaultValueString;

    // 2. Add the "smart" getter/setter property to the metadata object.
    // This logic is adapted from the internal parser to dynamically add metadata capabilities.
    Object.defineProperty(product.metadata, header, {
      enumerable: true,
      configurable: true, // Allows this property to be deleted if needed
      get: (): ShopifyMetafield =>
        ({
          key,
          namespace,
          isList,
          get value(): string {
            return (product.data[header] as string) || "";
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
            (product.data as Record<string, any>)[header] = Array.isArray(
              newValue,
            )
              ? newValue.join(",")
              : newValue;
          },
        }) as ShopifyMetafield,
    });
  }
}

/**
 * Gets a specific metafield object from a product in a user-friendly way.
 *
 * @param {ShopifyProductCSVParsedRow} product - The product to search within.
 * @param {string} namespace - The namespace of the metafield.
 * @param {string} key - The key of the metafield.
 * @returns {ShopifyMetafield | undefined} The `ShopifyMetafield` object or `undefined` if not found.
 *
 * @example
 * ```typescript
 * const careInfo = getMetafield(product, 'custom', 'care_instructions');
 * if (careInfo) {
 *   console.log(careInfo.parsedValue);
 * }
 * ```
 */
export function getMetafield<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
  namespace: string,
  key: string,
): ShopifyMetafield | undefined {
  for (const meta of Object.values(product.metadata)) {
    if (meta.namespace === namespace && meta.key === key) {
      return meta;
    }
  }
  return undefined;
}

/**
 * Sets the value of an *existing* metafield on a single product.
 * This is the primary method for updating metafield data.
 *
 * @param {ShopifyProductCSVParsedRow} product - The product to update.
 * @param {string} namespace - The namespace of the metafield.
 * @param {string} key - The key of the metafield.
 * @param {string | string[]} value - The new value (string or array of strings for list types).
 * @throws {Error} if the metafield does not exist on the product.
 *
 * @example
 * ```typescript
 * // For a string metafield:
 * setMetafieldValue(product, 'custom', 'material', '100% Organic Cotton');
 *
 * // For a list-type metafield:
 * setMetafieldValue(product, 'custom', 'features', ['Durable', 'Lightweight']);
 * ```
 */
export function setMetafieldValue<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
  namespace: string,
  key: string,
  value: string | string[],
): void {
  const metafield = getMetafield(product, namespace, key);
  if (!metafield) {
    throw new Error(
      `Metafield with namespace "${namespace}" and key "${key}" not found. Use addMetafieldColumn to create it first.`,
    );
  }
  metafield.parsedValue = value;
}

/**
 * A predicate function used for finding products.
 * @param {ShopifyProductCSVParsedRow} product - The product to evaluate.
 * @returns {boolean} `true` if the product matches the condition.
 */
export type ProductPredicate<T extends CustomColumns = {}> = (
  product: TypedProduct<T>,
) => boolean;

/**
 * A predicate function used for finding variants across all products.
 * @param {ShopifyCSVParsedVariant} variant - The variant to evaluate.
 * @param {ShopifyProductCSVParsedRow} product - The parent product of the variant.
 * @returns {boolean} `true` if the variant matches the condition.
 */
export type VariantPredicate<T extends CustomColumns = {}> = (
  variant: ShopifyCSVParsedVariant,
  product: TypedProduct<T>,
) => boolean;

/**
 * A predicate function for matching a metafield's value.
 * @param {string | string[]} parsedValue - The parsed value of the metafield (string or string[]).
 * @returns {boolean} `true` if the value matches the condition.
 */
export type MetafieldValuePredicate = (
  parsedValue: string | string[],
) => boolean;

// --- PRODUCT QUERIES ---

/**
 * Finds a single product that satisfies the provided predicate function.
 * Returns the first match found.
 *
 * @param {Record<string, ShopifyProductCSVParsedRow>} products - The main collection of all products.
 * @param {ProductPredicate} predicate - A function that returns true for a matching product.
 * @returns {ShopifyProductCSVParsedRow | undefined} The first matching `ShopifyProductCSVParsedRow` or `undefined` if no match is found.
 *
 * @example
 * ```typescript
 * // Find the first product with a specific title
 * const product = findProduct(products, p => p.data.Title === 'Classic Leather Jacket');
 * ```
 */
export function findProduct<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  predicate: ProductPredicate<T>,
): TypedProduct<T> | undefined {
  for (const handle in products) {
    const product = products[handle];
    if (predicate(product)) {
      return product;
    }
  }
  return undefined;
}

/**
 * Finds all products that satisfy the provided predicate function.
 *
 * @param {Record<string, ShopifyProductCSVParsedRow>} products - The main collection of all products.
 * @param {ProductPredicate} predicate - A function that returns true for a matching product.
 * @returns {ShopifyProductCSVParsedRow[]} An array of matching `ShopifyProductCSVParsedRow` objects.
 *
 * @example
 * ```typescript
 * // Find all products from a specific vendor
 * const brandProducts = findProducts(products, p => p.data.Vendor === 'MyBrand');
 *
 * // Find all "draft" products
 * const draftProducts = findProducts(products, p => p.data.Status === 'draft');
 * ```
 */
export function findProducts<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  predicate: ProductPredicate<T>,
): TypedProduct<T>[] {
  const results: TypedProduct<T>[] = [];
  for (const handle in products) {
    const product = products[handle];
    if (predicate(product)) {
      results.push(product);
    }
  }
  return results;
}

// --- VARIANT QUERIES ---

/**
 * Finds a specific variant on a product by its option combination.
 * This is useful for finding a variant when you don't know its SKU.
 *
 * @param {ShopifyProductCSVParsedRow} product - The product to search within.
 * @param {Record<string, string>} optionsToMatch - A key-value map of the options to match, e.g., `{ Color: 'Blue', Size: 'M' }`.
 * @returns {ShopifyCSVParsedVariant | undefined} The matching `ShopifyCSVParsedVariant` or `undefined` if not found.
 *
 * @example
 * ```typescript
 * const shirt = products['classic-tee'];
 * // Find the variant with Color: Red and Size: L
 * const variant = findVariantByOptions(shirt, { Color: 'Red', Size: 'L' });
 * if (variant) {
 *   console.log('SKU is:', variant.data['Variant SKU']);
 * }
 * ```
 */
export function findVariantByOptions<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
  optionsToMatch: Record<string, string>,
): ShopifyCSVParsedVariant | undefined {
  const matchKeys = Object.keys(optionsToMatch);

  return product.variants.find((variant) => {
    if (variant.options.length !== matchKeys.length) {
      return false;
    }
    const variantOptionsMap = new Map(
      variant.options.map((o) => [o.name, o.value]),
    );
    return matchKeys.every(
      (key) => variantOptionsMap.get(key) === optionsToMatch[key],
    );
  });
}

/**
 * Finds all variants across all products that satisfy the provided predicate.
 * This is a powerful tool for global analysis or bulk updates on variants.
 *
 * @param {Record<string, ShopifyProductCSVParsedRow>} products - The main collection of all products.
 * @param {VariantPredicate} predicate - A function that returns true for a matching variant.
 * @returns {Array<{ handle: string, variant: ShopifyCSVParsedVariant }>} An array of objects, each containing a matching variant and its product's handle.
 *
 * @example
 * ```typescript
 * // Find all variants costing less than $10
 * const cheapVariants = findAllVariants(products, (variant, product) => {
 *   const cost = parseFloat(variant.data['Cost per item']);
 *   return !isNaN(cost) && cost < 10;
 * });
 *
 * console.log(`Found ${cheapVariants.length} variants under $10.`);
 * ```
 */
export function findAllVariants<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  predicate: VariantPredicate<T>,
): Array<{
  handle: string;
  variant: ShopifyCSVParsedVariant;
  product: TypedProduct<T>;
}> {
  const results: Array<{
    handle: string;
    variant: ShopifyCSVParsedVariant;
    product: TypedProduct<T>;
  }> = [];
  for (const handle in products) {
    const product = products[handle];
    for (const variant of product.variants) {
      if (predicate(variant, product)) {
        results.push({ handle, variant, product });
      }
    }
  }
  return results;
}

// --- IMAGE QUERIES ---

/**
 * Finds all product images across the entire collection that are missing alt text.
 * This is useful for SEO audits and data cleanup.
 *
 * @param {Record<string, ShopifyProductCSVParsedRow>} products - The main collection of all products.
 * @returns {Array<{ handle: string, image: ShopifyCSVParsedImage }>} An array of objects, each containing an image without alt text and its product's handle.
 *
 * @example
 * ```typescript
 * const imagesToFix = findImagesWithoutAltText(products);
 * console.log(`Found ${imagesToFix.length} images missing alt text.`);
 * imagesToFix.forEach(({ handle, image }) => {
 *   console.log(`- Product ${handle} has an image missing alt text: ${image.src}`);
 * });
 * ```
 */
export function findImagesWithoutAltText<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
): Array<{
  handle: string;
  image: ShopifyCSVParsedImage;
  product: TypedProduct<T>;
}> {
  const results: Array<{
    handle: string;
    image: ShopifyCSVParsedImage;
    product: TypedProduct<T>;
  }> = [];
  for (const handle in products) {
    const product = products[handle];
    for (const image of product.images) {
      if (!image.alt || image.alt.trim() === "") {
        results.push({ handle, image, product });
      }
    }
  }
  return results;
}

/**
 * Finds "orphaned" images on a product—images that exist in the `images` array
 * but are not assigned to the main product or any of its variants.
 *
 * @param {ShopifyProductCSVParsedRow} product - The product to check for orphaned images.
 * @returns {ShopifyCSVParsedImage[]} An array of `ShopifyCSVParsedImage` objects that are not in use.
 *
 * @example
 * ```typescript
 * const orphaned = findOrphanedImages(product);
 * if (orphaned.length > 0) {
 *   console.log(`Product ${product.data.Handle} has ${orphaned.length} unused images.`);
 * }
 * ```
 */
export function findOrphanedImages<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
): ShopifyCSVParsedImage[] {
  const usedImageSrcs = new Set<string>();

  if (product.data["Image Src"]) {
    usedImageSrcs.add(product.data["Image Src"]);
  }

  product.variants.forEach((variant) => {
    if (variant.data["Variant Image"]) {
      usedImageSrcs.add(variant.data["Variant Image"]);
    }
  });

  return product.images.filter((image) => !usedImageSrcs.has(image.src));
}

// --- METAFIELD QUERIES ---

/**
 * Finds all products that have a specific metafield value.
 *
 * @param {Record<string, ShopifyProductCSVParsedRow>} products - The main collection of all products.
 * @param {string} namespace - The namespace of the metafield to search for.
 * @param {string} key - The key of the metafield to search for.
 * @param {string | MetafieldValuePredicate} valueOrPredicate - The exact value (string) to match, or a predicate function for complex matching.
 * @returns {ShopifyProductCSVParsedRow[]} An array of matching `ShopifyProductCSVParsedRow` objects.
 *
 * @example
 * ```typescript
 * // Find all products where the material is 'Cotton'
 * const cottonProducts = findProductsByMetafield(products, 'custom', 'material', 'Cotton');
 *
 * // Find all products where the 'features' list includes 'Waterproof'
 * const waterproofProducts = findProductsByMetafield(
 *   products, 'custom', 'features',
 *   (val) => Array.isArray(val) && val.includes('Waterproof')
 * );
 * ```
 */
export function findProductsByMetafield<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  namespace: string,
  key: string,
  valueOrPredicate: string | MetafieldValuePredicate,
): TypedProduct<T>[] {
  const predicate =
    typeof valueOrPredicate === "function"
      ? valueOrPredicate
      : (val: string | string[]) => val === valueOrPredicate;

  return findProducts(products, (product) => {
    const metafield = getMetafield(product, namespace, key);
    return metafield ? predicate(metafield.parsedValue) : false;
  });
}

/**
 * Finds all products that are missing a specific metafield definition.
 * Useful for data integrity checks to ensure all products have required metafields.
 *
 * @param {Record<string, ShopifyProductCSVParsedRow>} products - The main collection of all products.
 * @param {string} namespace - The namespace of the required metafield.
 * @param {string} key - The key of the required metafield.
 * @returns {ShopifyProductCSVParsedRow[]} An array of products that do not have the specified metafield.
 *
 * @example
 * ```typescript
 * // Find all products that don't have 'care_instructions'
 * const missingCareInfo = findProductsMissingMetafield(products, 'custom', 'care_instructions');
 * if (missingCareInfo.length > 0) {
 *    console.log(`${missingCareInfo.length} products are missing care instructions.`);
 * }
 * ```
 */
export function findProductsMissingMetafield<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  namespace: string,
  key: string,
): TypedProduct<T>[] {
  return findProducts(products, (product) => {
    return getMetafield(product, namespace, key) === undefined;
  });
}

/**
 * Updates the 'Variant Price' and 'Variant Compare At Price' for multiple products at once.
 *
 * @param {ShopifyProductCSVParsedRow[]} products - The products to update.
 * @param {object} options - Defines how to update the prices.
 * @param {'price' | 'compare_at_price'} options.basedOn - The field to base the calculation on ('price' or 'compare_at_price').
 * @param {'percentage' | 'fixed_amount'} options.adjustment - The type of adjustment ('percentage', 'fixed_amount').
 * @param {number} options.amount - The value for the adjustment (e.g., -15 for 15% off, or 5 for a $5 increase).
 * @param {boolean} [options.setCompareAtPrice] - If true, moves the original price to the 'Compare At Price' field.
 */
export function bulkUpdatePrices<T extends CustomColumns = {}>(
  products: TypedProduct<T>[],
  options: {
    basedOn: "price" | "compare_at_price";
    adjustment: "percentage" | "fixed_amount";
    amount: number;
    setCompareAtPrice?: boolean;
  },
): void {
  for (const product of products) {
    for (const variant of product.variants) {
      const priceField = "Variant Price";
      const comparePriceField = "Variant Compare At Price";
      const originalPrice = parseFloat(variant.data[priceField]);

      if (isNaN(originalPrice)) continue;

      let newPrice = originalPrice;
      if (options.adjustment === "percentage") {
        newPrice = originalPrice * (1 + options.amount / 100);
      } else {
        newPrice = originalPrice + options.amount;
      }

      if (options.setCompareAtPrice) {
        variant.data[comparePriceField] = String(originalPrice);
      }

      variant.data[priceField] = newPrice.toFixed(2);
    }
  }
}

/**
 * Performs a find-and-replace operation on a specified text field for multiple products.
 *
 * @param {ShopifyProductCSVParsedRow[]} products - The products to update.
 * @param {keyof ShopifyProductCSVParsedRow['data']} field - The product data field to target (e.g., 'Title', 'Body (HTML)', 'Tags').
 * @param {string | RegExp} find - The string or RegExp to search for.
 * @param {string} replaceWith - The string to replace matches with.
 *
 * @example
 * ```typescript
 * // Replace a brand name in all product titles
 * bulkFindAndReplace(allProducts, 'Title', 'OldBrand', 'NewBrand');
 * ```
 */
export function bulkFindAndReplace<T extends CustomColumns = {}>(
  products: TypedProduct<T>[],
  field: keyof TypedProduct<T>["data"],
  find: string | RegExp,
  replaceWith: string,
): void {
  for (const product of products) {
    const originalValue = product.data[field] as string;
    if (typeof originalValue === "string") {
      (product.data as Record<string, any>)[field as string] =
        originalValue.replace(find, replaceWith);
    }
  }
}

/**
 * Scans the entire product collection for duplicate SKUs.
 *
 * @param {Record<string, ShopifyProductCSVParsedRow>} products - The main collection of all products.
 * @returns {Map<string, string[]>} A Map where keys are duplicate SKUs and values are an array of product handles that use that SKU.
 *
 * @example
 * ```typescript
 * const duplicates = findDuplicateSKUs(products);
 * if (duplicates.size > 0) {
 *   console.log('Found duplicate SKUs:');
 *   duplicates.forEach((handles, sku) => {
 *     console.log(`- SKU '${sku}' is used by products: ${handles.join(', ')}`);
 *   });
 * }
 * ```
 */
export function findDuplicateSKUs<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
): Map<string, string[]> {
  const skuMap = new Map<string, string[]>();
  const duplicates = new Map<string, string[]>();

  for (const handle in products) {
    for (const variant of products[handle].variants) {
      const sku = variant.data["Variant SKU"];
      if (sku) {
        if (!skuMap.has(sku)) {
          skuMap.set(sku, []);
        }
        skuMap.get(sku)!.push(handle);
      }
    }
  }

  for (const [sku, handles] of skuMap.entries()) {
    if (handles.length > 1) {
      duplicates.set(sku, handles);
    }
  }
  return duplicates;
}

/**
 * Cleans a string to make it a valid Shopify handle.
 * A Shopify handle can only contain letters, numbers, and hyphens.
 *
 * @param {string} input - The string to sanitize (e.g., a product title).
 * @returns {string} A Shopify-compliant handle string.
 *
 * @example
 * ```typescript
 * const title = "My Awesome & Cool Product!"
 * const handle = sanitizeHandle(title); // "my-awesome-cool-product"
 * ```
 */
export function sanitizeHandle(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with a hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Creates a deep clone of a product with a new handle and title.
 * All variants, images, and metafields are copied.
 *
 * @remarks
 * The parsed `metadata` object with its getters/setters is lost during the `JSON.parse(JSON.stringify(...))` cloning process.
 * For a true deep clone that preserves the live-updating metadata, this function would need to be more complex.
 * However, for most use cases where you clone a product and then modify its data directly, this is sufficient.
 *
 * @param {ShopifyProductCSVParsedRow} productToClone - The source product object.
 * @param {string} newHandle - The unique handle for the new product.
 * @param {string} newTitle - The title for the new product.
 * @returns {ShopifyProductCSVParsedRow} A new `ShopifyProductCSVParsedRow` object.
 */
export function cloneProduct<T extends CustomColumns = {}>(
  productToClone: TypedProduct<T>,
  newHandle: string,
  newTitle: string,
): TypedProduct<T> {
  // Create a deep copy to avoid reference issues
  const newProduct = JSON.parse(JSON.stringify(productToClone));

  newProduct.data.Handle = newHandle;
  newProduct.data.Title = newTitle;

  // The parsed `metadata` object with its getters/setters is lost during JSON stringification.
  // It needs to be recreated for the new object. (This would require exposing or
  // reusing the internal _createProductFromRow logic for a perfect implementation).
  // For simplicity here, we assume direct data manipulation is sufficient post-cloning.

  return newProduct;
}

/**
 * Removes a metafield column entirely from a product collection.
 *
 * @param {Record<string, ShopifyProductCSVParsedRow>} products - The main collection of all products.
 * @param {string} namespace - The namespace of the metafield to remove.
 * @param {string} key - The key of the metafield to remove.
 */
export function removeMetafieldColumn<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  namespace: string,
  key: string,
): void {
  let headerToRemove: string | null = null;

  // Find the full header key from the first product
  const firstProduct = Object.values(products)[0];
  if (!firstProduct) return;

  for (const meta of Object.values(firstProduct.metadata)) {
    if (meta.namespace === namespace && meta.key === key) {
      // A more robust solution would store the full type
      const fullHeader = Object.keys(firstProduct.data).find((h) =>
        h.startsWith(`Metafield: ${namespace}.${key}[`),
      );
      if (fullHeader) headerToRemove = fullHeader;
      break;
    }
  }

  if (!headerToRemove) {
    console.warn(`Metafield column for ${namespace}.${key} not found.`);
    return;
  }

  for (const handle in products) {
    const product = products[handle];
    delete product.data[headerToRemove];
    delete product.metadata[headerToRemove];
  }
}

/**
 * Adds a new product to the collection of products.
 *
 * @param {Record<string, ShopifyProductCSVParsedRow>} products - The main collection of all products.
 * @param {ShopifyProductCSVParsedRow} product - The new product to add.
 * @returns {Record<string, ShopifyProductCSVParsedRow>} The updated product collection.
 *
 * @example
 * ```ts
 * const newProduct = createProduct('new-handle', { Title: 'New Product' });
 * addProduct(products, newProduct);
 * ```
 */
export function addProduct<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  product: TypedProduct<T>,
): ProductsCollection<T> {
  products[product.data.Handle] = product;
  return products as ProductsCollection<T>;
}

/**
 * Maps over a collection of products, applying a callback to each product.
 *
 * @param {Record<string, ShopifyProductCSVParsedRow>} products - The product collection to map over.
 * @param {(product: ShopifyProductCSVParsedRow) => ShopifyProductCSVParsedRow} callback - The function to apply to each product.
 * @param {boolean} [shouldCloneBeforePassedToCb=true] - Whether to pass a deep clone of the product to the callback.
 * @returns {Record<string, ShopifyProductCSVParsedRow>} A new product collection with the results of the mapping.
 *
 * @example
 * ```typescript
 * const updatedProducts = map(products, (product) => {
 *   product.data.Title = product.data.Title.toUpperCase();
 *   return product;
 * });
 * ```
 */
export function map<T extends CustomColumns = {}, R extends CustomColumns = T>(
  products: ProductsCollection<T>,
  callback: (product: TypedProduct<T>) => TypedProduct<R>,
  shouldCloneBeforePassedToCb = true,
): ProductsCollection<R> {
  const newProducts: Record<string, TypedProduct<R>> = {};
  for (const handle in products) {
    const product = products[handle];
    const productToProcess = shouldCloneBeforePassedToCb
      ? structuredClone(product)
      : product;
    const newProduct = callback(productToProcess);
    newProducts[newProduct.data.Handle] = newProduct;
  }
  return newProducts as ProductsCollection<R>;
}

/**
 * Filters a collection of products based on a predicate function.
 *
 * @param {Record<string, ShopifyProductCSVParsedRow>} products - The product collection to filter.
 * @param {(product: ShopifyProductCSVParsedRow) => boolean} callback - The predicate function to apply to each product.
 * @param {boolean} [shouldCloneBeforePassedToCb=true] - Whether to pass a deep clone of the product to the callback.
 * @returns {Record<string, ShopifyProductCSVParsedRow>} A new product collection containing only the products that pass the predicate.
 *
 * @example
 * ```typescript
 * const activeProducts = filter(products, (product) => product.data.Status === 'active');
 * ```
 */
export function filter<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  callback: (product: TypedProduct<T>) => boolean,
  shouldCloneBeforePassedToCb = true,
): ProductsCollection<T> {
  const newProducts: Record<string, TypedProduct<T>> = {};
  for (const handle in products) {
    const product = products[handle];
    const productToProcess = shouldCloneBeforePassedToCb
      ? structuredClone(product)
      : product;
    if (callback(productToProcess)) {
      newProducts[handle] = product;
    }
  }
  return newProducts as ProductsCollection<T>;
}

/**
 * Reduces a product collection to a single value by executing a reducer callback for each product.
 *
 * @template A - The type of the accumulator and the return value.
 * @param {Record<string, ShopifyProductCSVParsedRow>} products - The product collection to reduce.
 * @param {(acc: A, product: ShopifyProductCSVParsedRow) => A} callback - A function to execute on each product, taking the current product and the accumulator, and returning the new accumulator value.
 * @param {A} initial - The initial value of the accumulator.
 * @param {boolean} [shouldCloneBeforePassedToCb=true] - Whether to pass a deep clone of the product to the callback to prevent mutations.
 * @returns {A} The final accumulated value.
 *
 * @example
 * ```typescript
 * // Count the total number of variants across all products
 * const totalVariants = reduce(products, (acc, product) => {
 *   return acc + product.variants.length;
 * }, 0);
 *
 * console.log(`Total variants in the store: ${totalVariants}`);
 * ```
 */

export function reduce<A, T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  callback: (acc: A, product: TypedProduct<T>) => A,
  initial: A,
  shouldCloneBeforePassedToCb: boolean = true,
): A {
  let acc: A = initial;
  for (const handle in products) {
    const product = products[handle];
    const productToProcess = shouldCloneBeforePassedToCb
      ? structuredClone(product)
      : product;
    acc = callback(acc, productToProcess);
  }
  return acc;
}

// ============================================================================
// Tag Management Utilities
// ============================================================================

/**
 * Parses a comma-separated tags string into an array of trimmed tag strings.
 * Handles deduplication and removes empty tags.
 *
 * @param tagsString - The comma-separated tags string from the CSV
 * @returns Array of unique, trimmed tag strings
 */
export function parseTags(tagsString?: string): string[] {
  if (!tagsString || typeof tagsString !== "string") {
    return [];
  }

  const tags = tagsString
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  // Remove duplicates while preserving order
  return [...new Set(tags)];
}

/**
 * Serializes an array of tags into a comma-separated string.
 * Handles deduplication and removes empty tags.
 *
 * @param tags - Array of tag strings
 * @returns Comma-separated tags string suitable for CSV
 */
export function serializeTags(tags: string[]): string {
  if (!Array.isArray(tags)) {
    return "";
  }

  const uniqueTags = [
    ...new Set(
      tags
        .map((tag) =>
          typeof tag === "string" ? tag.trim() : String(tag).trim(),
        )
        .filter((tag) => tag.length > 0),
    ),
  ];

  return uniqueTags.join(", ");
}

/**
 * Gets all tags for a product as an array of strings.
 *
 * @param product - The parsed product object
 * @returns Array of tag strings
 */
export function getTags<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
): string[] {
  return parseTags(product.data.Tags);
}

/**
 * Checks if a product has a specific tag (case-insensitive).
 *
 * @param product - The parsed product object
 * @param tag - The tag to check for
 * @returns True if the product has the tag
 */
export function hasTag<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
  tag: string,
): boolean {
  if (!tag || typeof tag !== "string") {
    return false;
  }

  const tags = getTags(product);
  const normalizedTag = tag.trim().toLowerCase();

  return tags.some(
    (existingTag) => existingTag.toLowerCase() === normalizedTag,
  );
}

/**
 * Adds a tag to a product's tags list. Handles deduplication automatically.
 *
 * @param product - The parsed product object to modify
 * @param tag - The tag to add
 * @returns The updated product object (for chaining)
 */
export function addTag<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
  tag: string,
): TypedProduct<T> {
  if (!tag || typeof tag !== "string") {
    return product;
  }

  const trimmedTag = tag.trim();
  if (trimmedTag.length === 0) {
    return product;
  }

  const currentTags = getTags(product);

  // Check if tag already exists (case-insensitive)
  const normalizedTag = trimmedTag.toLowerCase();
  const tagExists = currentTags.some(
    (existingTag) => existingTag.toLowerCase() === normalizedTag,
  );

  if (!tagExists) {
    currentTags.push(trimmedTag);
    product.data.Tags = serializeTags(currentTags);
  }

  return product;
}

/**
 * Removes a tag from a product's tags list (case-insensitive).
 *
 * @param product - The parsed product object to modify
 * @param tag - The tag to remove
 * @returns The updated product object (for chaining)
 */
export function removeTag<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
  tag: string,
): TypedProduct<T> {
  if (!tag || typeof tag !== "string") {
    return product;
  }

  const normalizedTag = tag.trim().toLowerCase();
  if (normalizedTag.length === 0) {
    return product;
  }

  const currentTags = getTags(product);
  const filteredTags = currentTags.filter(
    (existingTag) => existingTag.toLowerCase() !== normalizedTag,
  );

  product.data.Tags = serializeTags(filteredTags);
  return product;
}

/**
 * Sets the complete tags list for a product, replacing any existing tags.
 * Handles deduplication and serialization automatically.
 *
 * @param product - The parsed product object to modify
 * @param tags - Array of tags to set, or comma-separated string
 * @returns The updated product object (for chaining)
 */
export function setTags<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
  tags: string[] | string,
): TypedProduct<T> {
  let tagsArray: string[];

  if (typeof tags === "string") {
    tagsArray = parseTags(tags);
  } else if (Array.isArray(tags)) {
    tagsArray = tags;
  } else {
    tagsArray = [];
  }

  product.data.Tags = serializeTags(tagsArray);
  return product;
}

/**
 * Adds multiple tags to a product's tags list. Handles deduplication automatically.
 *
 * @param product - The parsed product object to modify
 * @param tags - Array of tags to add, or comma-separated string
 * @returns The updated product object (for chaining)
 */
export function addTags<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
  tags: string[] | string,
): TypedProduct<T> {
  let tagsToAdd: string[];

  if (typeof tags === "string") {
    tagsToAdd = parseTags(tags);
  } else if (Array.isArray(tags)) {
    tagsToAdd = tags.filter(
      (tag) => typeof tag === "string" && tag.trim().length > 0,
    );
  } else {
    return product;
  }

  const currentTags = getTags(product);
  const normalizedCurrentTags = currentTags.map((tag) => tag.toLowerCase());

  // Only add tags that don't already exist (case-insensitive)
  const newTags = tagsToAdd.filter((tag) => {
    const normalizedTag = tag.trim().toLowerCase();
    return (
      normalizedTag.length > 0 && !normalizedCurrentTags.includes(normalizedTag)
    );
  });

  if (newTags.length > 0) {
    const allTags = [...currentTags, ...newTags];
    product.data.Tags = serializeTags(allTags);
  }

  return product;
}

/**
 * Removes multiple tags from a product's tags list (case-insensitive).
 *
 * @param product - The parsed product object to modify
 * @param tags - Array of tags to remove, or comma-separated string
 * @returns The updated product object (for chaining)
 */
export function removeTags<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
  tags: string[] | string,
): TypedProduct<T> {
  let tagsToRemove: string[];

  if (typeof tags === "string") {
    tagsToRemove = parseTags(tags);
  } else if (Array.isArray(tags)) {
    tagsToRemove = tags.filter(
      (tag) => typeof tag === "string" && tag.trim().length > 0,
    );
  } else {
    return product;
  }

  const normalizedTagsToRemove = tagsToRemove.map((tag) =>
    tag.trim().toLowerCase(),
  );
  const currentTags = getTags(product);

  const filteredTags = currentTags.filter(
    (existingTag) =>
      !normalizedTagsToRemove.includes(existingTag.toLowerCase()),
  );

  product.data.Tags = serializeTags(filteredTags);
  return product;
}

/**
 * Checks if a product has all of the specified tags (case-insensitive).
 *
 * @param product - The parsed product object
 * @param tags - Array of tags to check for, or comma-separated string
 * @returns True if the product has all specified tags
 */
export function hasAllTags<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
  tags: string[] | string,
): boolean {
  let tagsToCheck: string[];

  if (typeof tags === "string") {
    tagsToCheck = parseTags(tags);
  } else if (Array.isArray(tags)) {
    tagsToCheck = tags.filter(
      (tag) => typeof tag === "string" && tag.trim().length > 0,
    );
  } else {
    return true; // Empty check returns true
  }

  if (tagsToCheck.length === 0) {
    return true;
  }

  const productTags = getTags(product);
  const normalizedProductTags = productTags.map((tag) => tag.toLowerCase());

  return tagsToCheck.every((tag) =>
    normalizedProductTags.includes(tag.trim().toLowerCase()),
  );
}

/**
 * Checks if a product has any of the specified tags (case-insensitive).
 *
 * @param product - The parsed product object
 * @param tags - Array of tags to check for, or comma-separated string
 * @returns True if the product has at least one of the specified tags
 */
export function hasAnyTag<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
  tags: string[] | string,
): boolean {
  let tagsToCheck: string[];

  if (typeof tags === "string") {
    tagsToCheck = parseTags(tags);
  } else if (Array.isArray(tags)) {
    tagsToCheck = tags.filter(
      (tag) => typeof tag === "string" && tag.trim().length > 0,
    );
  } else {
    return false; // Empty check returns false
  }

  if (tagsToCheck.length === 0) {
    return false;
  }

  const productTags = getTags(product);
  const normalizedProductTags = productTags.map((tag) => tag.toLowerCase());

  return tagsToCheck.some((tag) =>
    normalizedProductTags.includes(tag.trim().toLowerCase()),
  );
}

/**
 * Finds all products that have a specific tag (case-insensitive).
 *
 * @param products - The parsed products collection
 * @param tag - The tag to search for
 * @returns Array of products that have the specified tag
 */
export function findProductsByTag<T extends CustomColumns = {}>(
  products: Iterable<TypedProduct<T>>,
  tag: string,
): TypedProduct<T>[] {
  if (!tag || typeof tag !== "string") {
    return [];
  }

  const results: TypedProduct<T>[] = [];
  for (const product of products) {
    if (hasTag(product, tag)) {
      results.push(product);
    }
  }

  return results;
}

/**
 * Finds all products that have all of the specified tags (case-insensitive).
 *
 * @param products - The parsed products collection
 * @param tags - Array of tags to search for, or comma-separated string
 * @returns Array of products that have all specified tags
 */
export function findProductsByTags<T extends CustomColumns = {}>(
  products: Iterable<TypedProduct<T>>,
  tags: string[] | string,
): TypedProduct<T>[] {
  const results: TypedProduct<T>[] = [];
  for (const product of products) {
    if (hasAllTags(product, tags)) {
      results.push(product);
    }
  }

  return results;
}

/**
 * Gets all unique tags across all products in the collection.
 *
 * @param products - The parsed products collection
 * @returns Array of all unique tags found across products
 */
export function getAllTags<T extends CustomColumns = {}>(
  products: Iterable<TypedProduct<T>>,
): string[] {
  const allTags = new Set<string>();

  for (const product of products) {
    const productTags = getTags(product);
    productTags.forEach((tag) => allTags.add(tag));
  }

  return Array.from(allTags).sort();
}

/**
 * Gets tag usage statistics across all products.
 *
 * @param products - The parsed products collection
 * @returns Object mapping each tag to the number of products that use it
 */
export function getTagStats<T extends CustomColumns = {}>(
  products: Iterable<TypedProduct<T>>,
): Record<string, number> {
  const tagCounts: Record<string, number> = {};

  for (const product of products) {
    const productTags = getTags(product);
    productTags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  }

  return tagCounts;
}

// ============================================================================
// Inventory Management Utilities
// ============================================================================

/**
 * Updates the inventory quantity for a specific variant.
 *
 * @param product - The parsed product object
 * @param variantSKU - The SKU of the variant to update
 * @param quantity - The new inventory quantity
 * @returns The updated product object (for chaining)
 */
export function updateInventoryQuantity<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
  variantSKU: string,
  quantity: number,
): TypedProduct<T> {
  const variant = findVariant(product, variantSKU);
  if (!variant) {
    throw new Error(
      `Variant with SKU "${variantSKU}" not found on product "${product.data.Handle}"`,
    );
  }

  (variant.data as Record<string, any>)["Variant Inventory Qty"] =
    String(quantity);

  // Also update the main product data if this is the first variant
  if (product.variants[0] === variant) {
    (product.data as Record<string, any>)["Variant Inventory Qty"] =
      String(quantity);
  }

  return product;
}

/**
 * Bulk updates inventory quantities for multiple products/variants.
 *
 * @param products - The parsed products collection
 * @param updates - Object mapping SKU to new quantity
 * @returns Array of successfully updated products
 */
export function bulkUpdateInventory<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  updates: Record<string, number>,
): TypedProduct<T>[] {
  const updatedProducts: TypedProduct<T>[] = [];

  for (const sku in updates) {
    const quantity = updates[sku];
    let productUpdated = false;

    for (const handle in products) {
      const product = products[handle];
      const variant = findVariant(product, sku);

      if (variant) {
        updateInventoryQuantity(product, sku, quantity);
        if (!updatedProducts.includes(product)) {
          updatedProducts.push(product);
        }
        productUpdated = true;
        break;
      }
    }

    if (!productUpdated) {
      console.warn(`Warning: SKU "${sku}" not found in any product`);
    }
  }

  return updatedProducts;
}

// ============================================================================
// Advanced Variant Management Utilities
// ============================================================================

/**
 * Bulk updates a specific field across all variants in multiple products.
 *
 * @param products - The parsed products collection
 * @param field - The variant field to update
 * @param value - The new value to set, or a function that returns the new value
 * @returns Array of products that were modified
 */
export function bulkUpdateVariantField<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  field: string,
  value:
    | string
    | ((variant: ShopifyCSVParsedVariant, product: TypedProduct<T>) => string),
): TypedProduct<T>[] {
  const modifiedProducts: TypedProduct<T>[] = [];

  for (const handle in products) {
    const product = products[handle];
    let productModified = false;

    for (const variant of product.variants) {
      const newValue =
        typeof value === "function" ? value(variant, product) : value;

      if (variant.data[field] !== newValue) {
        (variant.data as Record<string, any>)[field] = newValue;
        productModified = true;

        // Also update the main product data if this is the first variant
        if (product.variants[0] === variant) {
          (product.data as Record<string, any>)[field] = newValue;
        }
      }
    }

    if (productModified) {
      modifiedProducts.push(product);
    }
  }

  return modifiedProducts;
}

// ============================================================================
// Advanced Image Management Utilities
// ============================================================================

/**
 * Finds duplicate images across all products based on image src URL.
 *
 * @param products - The parsed products collection
 * @returns Object mapping image src to array of products that use it
 */
export function findDuplicateImages<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
): Record<string, string[]> {
  const imageSrcMap = new Map<string, string[]>();
  const duplicates: Record<string, string[]> = {};

  for (const handle in products) {
    const product = products[handle];

    // Check main product image
    if (product.data["Image Src"]) {
      const src = product.data["Image Src"];
      if (!imageSrcMap.has(src)) {
        imageSrcMap.set(src, []);
      }
      imageSrcMap.get(src)!.push(handle);
    }

    // Check variant images
    for (const variant of product.variants) {
      if (variant.data["Variant Image"]) {
        const src = variant.data["Variant Image"];
        if (!imageSrcMap.has(src)) {
          imageSrcMap.set(src, []);
        }
        if (!imageSrcMap.get(src)!.includes(handle)) {
          imageSrcMap.get(src)!.push(handle);
        }
      }
    }

    // Check images array
    for (const image of product.images) {
      if (image.src) {
        if (!imageSrcMap.has(image.src)) {
          imageSrcMap.set(image.src, []);
        }
        if (!imageSrcMap.get(image.src)!.includes(handle)) {
          imageSrcMap.get(image.src)!.push(handle);
        }
      }
    }
  }

  // Find duplicates (images used by more than one product)
  for (const [src, handles] of imageSrcMap.entries()) {
    if (handles.length > 1) {
      duplicates[src] = handles;
    }
  }

  return duplicates;
}

/**
 * Interface for image assignment rules.
 */
export interface ImageAssignmentRule<T extends CustomColumns = {}> {
  /** Function to determine if this rule applies to a variant */
  matcher: (
    variant: ShopifyCSVParsedVariant,
    product: TypedProduct<T>,
  ) => boolean;
  /** Function to get the image src for this variant */
  getImageSrc: (
    variant: ShopifyCSVParsedVariant,
    product: TypedProduct<T>,
  ) => string;
}

/**
 * Assigns images to variants in bulk based on provided rules.
 *
 * @param product - The parsed product object
 * @param rules - Array of assignment rules to apply
 * @returns The updated product object (for chaining)
 */
export function assignBulkImagesToVariants<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
  rules: ImageAssignmentRule<T>[],
): TypedProduct<T> {
  for (const variant of product.variants) {
    for (const rule of rules) {
      if (rule.matcher(variant, product)) {
        const imageSrc = rule.getImageSrc(variant, product);

        // Verify the image exists in the product's images
        const imageExists = product.images.some((img) => img.src === imageSrc);

        if (imageExists) {
          variant.data["Variant Image"] = imageSrc;
          break; // Stop at first matching rule
        } else {
          console.warn(
            `Warning: Image "${imageSrc}" not found in product "${product.data.Handle}" images`,
          );
        }
      }
    }
  }

  return product;
}

// ============================================================================
// Product Organization & Categorization Utilities
// ============================================================================

/**
 * Configuration for what constitutes a "categorized" product.
 */
export interface CategorizationConfig<T extends CustomColumns = {}> {
  /** Fields that should have values for a product to be considered categorized */
  requiredFields?: string[];
  /** Tags that indicate a product is categorized */
  requiredTags?: string[];
  /** Metafields that should exist for categorization */
  requiredMetafields?: Array<{ namespace: string; key: string }>;
  /** Custom categorization function */
  customCheck?: (product: TypedProduct<T>) => boolean;
}

/**
 * Finds products that are not properly categorized based on specified criteria.
 *
 * @param products - The parsed products collection
 * @param config - Configuration defining categorization requirements
 * @returns Array of uncategorized products
 */
export function findUncategorizedProducts<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  config: CategorizationConfig<T> = {},
): TypedProduct<T>[] {
  const {
    requiredFields = ["Type"],
    requiredTags = [],
    requiredMetafields = [],
    customCheck,
  } = config;

  const uncategorized: TypedProduct<T>[] = [];

  for (const handle in products) {
    const product = products[handle];
    let isCategorized = true;

    // Check required fields
    for (const field of requiredFields) {
      const fieldValue = (product.data as any)[field];
      if (!fieldValue || String(fieldValue).trim() === "") {
        isCategorized = false;
        break;
      }
    }

    // Check required tags
    if (isCategorized && requiredTags.length > 0) {
      if (!hasAnyTag(product, requiredTags)) {
        isCategorized = false;
      }
    }

    // Check required metafields
    if (isCategorized && requiredMetafields.length > 0) {
      for (const { namespace, key } of requiredMetafields) {
        const metafield = getMetafield(product, namespace, key);
        if (!metafield || !metafield.value || metafield.value.trim() === "") {
          isCategorized = false;
          break;
        }
      }
    }

    // Check custom function
    if (isCategorized && customCheck) {
      isCategorized = customCheck(product);
    }

    if (!isCategorized) {
      uncategorized.push(product);
    }
  }

  return uncategorized;
}

// ============================================================================
// Collection Utilities (Count & Array Conversion)
// ============================================================================

/**
 * Counts the total number of products in the collection.
 *
 * @param products - The parsed products collection
 * @returns Number of products
 */
export function countProducts<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
): number {
  return Object.keys(products).length;
}

/**
 * Counts the total number of variants across all products.
 *
 * @param products - The parsed products collection
 * @returns Total number of variants
 */
export function countVariants<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
): number {
  let count = 0;
  for (const product of Object.values(products)) {
    count += product.variants.length;
  }
  return count;
}

/**
 * Counts the total number of images across all products.
 *
 * @param products - The parsed products collection
 * @returns Total number of images
 */
export function countImages<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
): number {
  let count = 0;
  for (const product of Object.values(products)) {
    count += product.images.length;
  }
  return count;
}

/**
 * Counts products that match a specific condition.
 *
 * @param products - The parsed products collection
 * @param predicate - Function to test each product
 * @returns Number of products matching the condition
 */
export function countProductsWhere<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  predicate: TypedProductPredicate<T>,
): number {
  let count = 0;
  for (const product of Object.values(products)) {
    if (predicate(product)) {
      count++;
    }
  }
  return count;
}

/**
 * Counts variants that match a specific condition across all products.
 *
 * @param products - The parsed products collection
 * @param predicate - Function to test each variant
 * @returns Number of variants matching the condition
 */
export function countVariantsWhere<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  predicate: TypedVariantPredicate<T>,
): number {
  let count = 0;
  for (const product of Object.values(products)) {
    for (const variant of product.variants) {
      if (predicate(variant, product)) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Counts products that have a specific tag.
 *
 * @param products - The parsed products collection
 * @param tag - The tag to count
 * @returns Number of products with the tag
 */
export function countProductsWithTag<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  tag: string,
): number {
  return countProductsWhere(products, (product) => hasTag(product, tag));
}

/**
 * Counts products by their type/category.
 *
 * @param products - The parsed products collection
 * @returns Object mapping each product type to its count
 */
export function countProductsByType<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const product of Object.values(products)) {
    const type = product.data.Type || "Uncategorized";
    counts[type] = (counts[type] || 0) + 1;
  }

  return counts;
}

/**
 * Counts products by vendor.
 *
 * @param products - The parsed products collection
 * @returns Object mapping each vendor to their product count
 */
export function countProductsByVendor<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const product of Object.values(products)) {
    const vendor = product.data.Vendor || "Unknown";
    counts[vendor] = (counts[vendor] || 0) + 1;
  }

  return counts;
}

/**
 * Converts the products collection to an array of products.
 * Useful for operations that require array methods.
 *
 * @param products - The parsed products collection
 * @returns Array of products
 */
export function toArray<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
): TypedProduct<T>[] {
  return Object.values(products);
}

/**
 * Converts products collection to an array of handles.
 *
 * @param products - The parsed products collection
 * @returns Array of product handles
 */
export function toHandleArray<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
): string[] {
  return Object.keys(products);
}

// --- GOOGLE SHOPPING UTILITIES ---

/**
 * Interface representing Google Shopping attributes for a product or variant.
 */
export interface GoogleShoppingAttributes {
  category?: string;
  gender?: string;
  ageGroup?: string;
  mpn?: string;
  condition?: string;
  customProduct?: boolean;
  customLabel0?: string;
  customLabel1?: string;
  customLabel2?: string;
  customLabel3?: string;
  customLabel4?: string;
  size?: string;
  sizeSystem?: string;
  sizeType?: string;
  color?: string;
  material?: string;
  unitPricingMeasure?: string;
  unitPricingMeasureUnit?: string;
  unitPricingBaseMeasure?: string;
  unitPricingBaseMeasureUnit?: string;
}

/**
 * Extracts Google Shopping attributes from a product's data.
 *
 * @param {ShopifyProductCSVParsedRow} product - The product to extract Google Shopping data from.
 * @returns {GoogleShoppingAttributes} Object containing all Google Shopping attributes.
 *
 * @example
 * ```typescript
 * const googleAttrs = getGoogleShoppingAttributes(product);
 * console.log(googleAttrs.gender); // 'unisex'
 * console.log(googleAttrs.condition); // 'new'
 * ```
 */
export function getGoogleShoppingAttributes<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
): GoogleShoppingAttributes {
  const data = product.data;
  return {
    category: data["Google Shopping / Google Product Category"] || undefined,
    gender: data["Google Shopping / Gender"] || undefined,
    ageGroup: data["Google Shopping / Age Group"] || undefined,
    mpn: data["Google Shopping / MPN"] || undefined,
    condition: data["Google Shopping / Condition"] || undefined,
    customProduct:
      data["Google Shopping / Custom Product"] === "TRUE" ||
      data["Google Shopping / Custom Product"] === "true",
    customLabel0: data["Google Shopping / Custom Label 0"] || undefined,
    customLabel1: data["Google Shopping / Custom Label 1"] || undefined,
    customLabel2: data["Google Shopping / Custom Label 2"] || undefined,
    customLabel3: data["Google Shopping / Custom Label 3"] || undefined,
    customLabel4: data["Google Shopping / Custom Label 4"] || undefined,
    size: data["Google Shopping / Size"] || undefined,
    sizeSystem: data["Google Shopping / Size System"] || undefined,
    sizeType: data["Google Shopping / Size Type"] || undefined,
    color: data["Google Shopping / Color"] || undefined,
    material: data["Google Shopping / Material"] || undefined,
    unitPricingMeasure:
      data["Google Shopping / Unit Pricing Measure"] || undefined,
    unitPricingMeasureUnit:
      data["Google Shopping / Unit Pricing Measure Unit"] || undefined,
    unitPricingBaseMeasure:
      data["Google Shopping / Unit Pricing Base Measure"] || undefined,
    unitPricingBaseMeasureUnit:
      data["Google Shopping / Unit Pricing Base Measure Unit"] || undefined,
  };
}

/**
 * Sets Google Shopping attributes on a product.
 *
 * @param {ShopifyProductCSVParsedRow} product - The product to update.
 * @param {Partial<GoogleShoppingAttributes>} attributes - The Google Shopping attributes to set.
 *
 * @example
 * ```typescript
 * setGoogleShoppingAttributes(product, {
 *   gender: 'unisex',
 *   condition: 'new',
 *   ageGroup: 'adult',
 *   customLabel0: 'premium'
 * });
 * ```
 */
export function setGoogleShoppingAttributes<T extends CustomColumns = {}>(
  product: TypedProduct<T>,
  attributes: Partial<GoogleShoppingAttributes>,
): void {
  const data = product.data as any;

  if (attributes.category !== undefined)
    data["Google Shopping / Google Product Category"] = attributes.category;
  if (attributes.gender !== undefined)
    data["Google Shopping / Gender"] = attributes.gender;
  if (attributes.ageGroup !== undefined)
    data["Google Shopping / Age Group"] = attributes.ageGroup;
  if (attributes.mpn !== undefined)
    data["Google Shopping / MPN"] = attributes.mpn;
  if (attributes.condition !== undefined)
    data["Google Shopping / Condition"] = attributes.condition;
  if (attributes.customProduct !== undefined)
    data["Google Shopping / Custom Product"] = attributes.customProduct
      ? "TRUE"
      : "FALSE";
  if (attributes.customLabel0 !== undefined)
    data["Google Shopping / Custom Label 0"] = attributes.customLabel0;
  if (attributes.customLabel1 !== undefined)
    data["Google Shopping / Custom Label 1"] = attributes.customLabel1;
  if (attributes.customLabel2 !== undefined)
    data["Google Shopping / Custom Label 2"] = attributes.customLabel2;
  if (attributes.customLabel3 !== undefined)
    data["Google Shopping / Custom Label 3"] = attributes.customLabel3;
  if (attributes.customLabel4 !== undefined)
    data["Google Shopping / Custom Label 4"] = attributes.customLabel4;
  if (attributes.size !== undefined)
    data["Google Shopping / Size"] = attributes.size;
  if (attributes.sizeSystem !== undefined)
    data["Google Shopping / Size System"] = attributes.sizeSystem;
  if (attributes.sizeType !== undefined)
    data["Google Shopping / Size Type"] = attributes.sizeType;
  if (attributes.color !== undefined)
    data["Google Shopping / Color"] = attributes.color;
  if (attributes.material !== undefined)
    data["Google Shopping / Material"] = attributes.material;
  if (attributes.unitPricingMeasure !== undefined)
    data["Google Shopping / Unit Pricing Measure"] =
      attributes.unitPricingMeasure;
  if (attributes.unitPricingMeasureUnit !== undefined)
    data["Google Shopping / Unit Pricing Measure Unit"] =
      attributes.unitPricingMeasureUnit;
  if (attributes.unitPricingBaseMeasure !== undefined)
    data["Google Shopping / Unit Pricing Base Measure"] =
      attributes.unitPricingBaseMeasure;
  if (attributes.unitPricingBaseMeasureUnit !== undefined)
    data["Google Shopping / Unit Pricing Base Measure Unit"] =
      attributes.unitPricingBaseMeasureUnit;
}

/**
 * Bulk update Google Shopping attributes across multiple products.
 *
 * @param {ShopifyProductCSVParsedRow[]} products - Array of products to update.
 * @param {Partial<GoogleShoppingAttributes>} attributes - The Google Shopping attributes to set.
 * @returns {ShopifyProductCSVParsedRow[]} Array of updated products.
 *
 * @example
 * ```typescript
 * const updated = bulkSetGoogleShoppingAttributes(
 *   toArray(products),
 *   { condition: 'new', ageGroup: 'adult' }
 * );
 * ```
 */
export function bulkSetGoogleShoppingAttributes<T extends CustomColumns = {}>(
  products: TypedProduct<T>[],
  attributes: Partial<GoogleShoppingAttributes>,
): TypedProduct<T>[] {
  products.forEach((product) =>
    setGoogleShoppingAttributes(product, attributes),
  );
  return products;
}

/**
 * Find products by Google Shopping category.
 *
 * @param {ProductsCollection} products - The products collection to search.
 * @param {string} category - The Google Shopping category to match.
 * @returns {TypedProduct[]} Array of products matching the category.
 *
 * @example
 * ```typescript
 * const clothingProducts = findProductsByGoogleCategory(products, 'Apparel & Accessories');
 * ```
 */
export function findProductsByGoogleCategory<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  category: string,
): TypedProduct<T>[] {
  return toArray(products).filter(
    (product) =>
      product.data["Google Shopping / Google Product Category"] === category,
  );
}

/**
 * Find products by Google Shopping gender.
 *
 * @param {ProductsCollection} products - The products collection to search.
 * @param {string} gender - The gender to match ('male', 'female', 'unisex').
 * @returns {TypedProduct[]} Array of products matching the gender.
 *
 * @example
 * ```typescript
 * const unisexProducts = findProductsByGoogleGender(products, 'unisex');
 * ```
 */
export function findProductsByGoogleGender<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  gender: string,
): TypedProduct<T>[] {
  return toArray(products).filter(
    (product) => product.data["Google Shopping / Gender"] === gender,
  );
}

/**
 * Find products by Google Shopping condition.
 *
 * @param {ProductsCollection} products - The products collection to search.
 * @param {string} condition - The condition to match ('new', 'refurbished', 'used').
 * @returns {TypedProduct[]} Array of products matching the condition.
 *
 * @example
 * ```typescript
 * const newProducts = findProductsByGoogleCondition(products, 'new');
 * ```
 */
export function findProductsByGoogleCondition<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  condition: string,
): TypedProduct<T>[] {
  return toArray(products).filter(
    (product) => product.data["Google Shopping / Condition"] === condition,
  );
}

/**
 * Get Google Shopping statistics from a products collection.
 *
 * @param {ProductsCollection} products - The products collection to analyze.
 * @returns {Object} Statistics about Google Shopping attributes.
 *
 * @example
 * ```typescript
 * const stats = getGoogleShoppingStats(products);
 * console.log(stats.genders); // { male: 5, female: 3, unisex: 2 }
 * ```
 */
export function getGoogleShoppingStats<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
): {
  categories: Record<string, number>;
  genders: Record<string, number>;
  conditions: Record<string, number>;
  ageGroups: Record<string, number>;
  customLabels0: Record<string, number>;
  totalWithGoogleData: number;
  totalProducts: number;
} {
  const productArray = toArray(products);
  const stats = {
    categories: {} as Record<string, number>,
    genders: {} as Record<string, number>,
    conditions: {} as Record<string, number>,
    ageGroups: {} as Record<string, number>,
    customLabels0: {} as Record<string, number>,
    totalWithGoogleData: 0,
    totalProducts: productArray.length,
  };

  productArray.forEach((product) => {
    const attrs = getGoogleShoppingAttributes(product);
    let hasGoogleData = false;

    if (attrs.category) {
      stats.categories[attrs.category] =
        (stats.categories[attrs.category] || 0) + 1;
      hasGoogleData = true;
    }
    if (attrs.gender) {
      stats.genders[attrs.gender] = (stats.genders[attrs.gender] || 0) + 1;
      hasGoogleData = true;
    }
    if (attrs.condition) {
      stats.conditions[attrs.condition] =
        (stats.conditions[attrs.condition] || 0) + 1;
      hasGoogleData = true;
    }
    if (attrs.ageGroup) {
      stats.ageGroups[attrs.ageGroup] =
        (stats.ageGroups[attrs.ageGroup] || 0) + 1;
      hasGoogleData = true;
    }
    if (attrs.customLabel0) {
      stats.customLabels0[attrs.customLabel0] =
        (stats.customLabels0[attrs.customLabel0] || 0) + 1;
      hasGoogleData = true;
    }

    if (hasGoogleData) stats.totalWithGoogleData++;
  });

  return stats;
}

// --- VARIANT SEARCH UTILITIES ---

/**
 * Find a variant by its SKU across all products.
 *
 * @param {ProductsCollection} products - The products collection to search.
 * @param {string} sku - The SKU to search for.
 * @returns {Object|undefined} Object with product handle, product, and variant, or undefined if not found.
 *
 * @example
 * ```typescript
 * const result = findVariantBySKU(products, 'SHIRT-RED-M');
 * if (result) {
 *   console.log(`Found in product: ${result.handle}`);
 *   console.log(`Variant: ${result.variant.data['Variant SKU']}`);
 * }
 * ```
 */
export function findVariantBySKU<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  sku: string,
):
  | {
      handle: string;
      product: TypedProduct<T>;
      variant: ShopifyCSVParsedVariant;
    }
  | undefined {
  if (!sku) return undefined;

  // Handle both enhanced collections (iterable) and plain objects
  const productList =
    Symbol.iterator in products
      ? (Array.from(products) as TypedProduct<T>[])
      : (Object.values(products) as TypedProduct<T>[]);

  for (const product of productList) {
    const variant = product.variants.find((v) => v.data["Variant SKU"] === sku);
    if (variant) {
      return {
        handle: product.data.Handle,
        product,
        variant,
      };
    }
  }
  return undefined;
}

/**
 * Find a variant by its barcode across all products.
 *
 * @param {ProductsCollection} products - The products collection to search.
 * @param {string} barcode - The barcode to search for.
 * @returns {Object|undefined} Object with product handle, product, and variant, or undefined if not found.
 *
 * @example
 * ```typescript
 * const result = findVariantByBarcode(products, '1234567890123');
 * if (result) {
 *   console.log(`Found variant: ${result.variant.data['Variant SKU']}`);
 * }
 * ```
 */
export function findVariantByBarcode<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  barcode: string,
):
  | {
      handle: string;
      product: TypedProduct<T>;
      variant: ShopifyCSVParsedVariant;
    }
  | undefined {
  if (!barcode) return undefined;

  // Handle both enhanced collections (iterable) and plain objects
  const productList =
    Symbol.iterator in products
      ? (Array.from(products) as TypedProduct<T>[])
      : (Object.values(products) as TypedProduct<T>[]);

  for (const product of productList) {
    const variant = product.variants.find(
      (v) => v.data["Variant Barcode"] === barcode,
    );
    if (variant) {
      return {
        handle: product.data.Handle,
        product,
        variant,
      };
    }
  }
  return undefined;
}

/**
 * Find all variants matching multiple SKUs.
 *
 * @param {ProductsCollection} products - The products collection to search.
 * @param {string[]} skus - Array of SKUs to search for.
 * @returns {Array} Array of objects with product handle, product, and variant for each found SKU.
 *
 * @example
 * ```typescript
 * const results = findVariantsBySKUs(products, ['SKU1', 'SKU2', 'SKU3']);
 * results.forEach(result => {
 *   console.log(`${result.variant.data['Variant SKU']} found in ${result.handle}`);
 * });
 * ```
 */
export function findVariantsBySKUs<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  skus: string[],
): Array<{
  handle: string;
  product: TypedProduct<T>;
  variant: ShopifyCSVParsedVariant;
  sku: string;
}> {
  const results: Array<{
    handle: string;
    product: TypedProduct<T>;
    variant: ShopifyCSVParsedVariant;
    sku: string;
  }> = [];

  skus.forEach((sku) => {
    const result = findVariantBySKU(products, sku);
    if (result) {
      results.push({ ...result, sku });
    }
  });

  return results;
}

/**
 * Find all variants matching multiple barcodes.
 *
 * @param {ProductsCollection} products - The products collection to search.
 * @param {string[]} barcodes - Array of barcodes to search for.
 * @returns {Array} Array of objects with product handle, product, and variant for each found barcode.
 *
 * @example
 * ```typescript
 * const results = findVariantsByBarcodes(products, ['123456789', '987654321']);
 * ```
 */
export function findVariantsByBarcodes<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
  barcodes: string[],
): Array<{
  handle: string;
  product: TypedProduct<T>;
  variant: ShopifyCSVParsedVariant;
  barcode: string;
}> {
  const results: Array<{
    handle: string;
    product: TypedProduct<T>;
    variant: ShopifyCSVParsedVariant;
    barcode: string;
  }> = [];

  barcodes.forEach((barcode) => {
    const result = findVariantByBarcode(products, barcode);
    if (result) {
      results.push({ ...result, barcode });
    }
  });

  return results;
}

/**
 * Find variants with missing SKUs.
 *
 * @param {ProductsCollection} products - The products collection to search.
 * @returns {Array} Array of objects with product handle, product, and variant for variants missing SKUs.
 *
 * @example
 * ```typescript
 * const missingSKUs = findVariantsWithMissingSKUs(products);
 * console.log(`Found ${missingSKUs.length} variants without SKUs`);
 * ```
 */
export function findVariantsWithMissingSKUs<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
): Array<{
  handle: string;
  product: TypedProduct<T>;
  variant: ShopifyCSVParsedVariant;
}> {
  const results: Array<{
    handle: string;
    product: TypedProduct<T>;
    variant: ShopifyCSVParsedVariant;
  }> = [];

  // Handle both enhanced collections (iterable) and plain objects
  const productList =
    Symbol.iterator in products
      ? (Array.from(products) as TypedProduct<T>[])
      : (Object.values(products) as TypedProduct<T>[]);

  for (const product of productList) {
    product.variants.forEach((variant) => {
      if (
        !variant.data["Variant SKU"] ||
        variant.data["Variant SKU"].trim() === ""
      ) {
        results.push({
          handle: product.data.Handle,
          product: product as TypedProduct<T>,
          variant,
        });
      }
    });
  }

  return results;
}

/**
 * Find variants with missing barcodes.
 *
 * @param {ProductsCollection} products - The products collection to search.
 * @returns {Array} Array of objects with product handle, product, and variant for variants missing barcodes.
 *
 * @example
 * ```typescript
 * const missingBarcodes = findVariantsWithMissingBarcodes(products);
 * console.log(`Found ${missingBarcodes.length} variants without barcodes`);
 * ```
 */
export function findVariantsWithMissingBarcodes<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
): Array<{
  handle: string;
  product: TypedProduct<T>;
  variant: ShopifyCSVParsedVariant;
}> {
  const results: Array<{
    handle: string;
    product: TypedProduct<T>;
    variant: ShopifyCSVParsedVariant;
  }> = [];

  // Handle both enhanced collections (iterable) and plain objects
  const productList =
    Symbol.iterator in products
      ? (Array.from(products) as TypedProduct<T>[])
      : (Object.values(products) as TypedProduct<T>[]);

  for (const product of productList) {
    product.variants.forEach((variant: any) => {
      if (
        !variant.data["Variant Barcode"] ||
        variant.data["Variant Barcode"].trim() === ""
      ) {
        results.push({
          handle: product.data.Handle,
          product: product as TypedProduct<T>,
          variant,
        });
      }
    });
  }

  return results;
}

export function toEntryArray<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
): Array<[string, TypedProduct<T>]> {
  return Object.entries(products);
}

/**
 * Converts all variants across all products to a flat array.
 * Each entry includes the variant, its parent product, and handle.
 *
 * @param products - The parsed products collection
 * @returns Array of variant objects with context
 */
export function toVariantArray<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
): Array<{
  handle: string;
  product: TypedProduct<T>;
  variant: ShopifyCSVParsedVariant;
}> {
  const variants: Array<{
    handle: string;
    product: TypedProduct<T>;
    variant: ShopifyCSVParsedVariant;
  }> = [];

  for (const handle in products) {
    const product = products[handle];
    for (const variant of product.variants) {
      variants.push({ handle, product, variant });
    }
  }

  return variants;
}

/**
 * Converts all images across all products to a flat array.
 * Each entry includes the image, its parent product, and handle.
 *
 * @param products - The parsed products collection
 * @returns Array of image objects with context
 */
export function toImageArray<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
): Array<{
  handle: string;
  product: TypedProduct<T>;
  image: ShopifyCSVParsedImage;
}> {
  const images: Array<{
    handle: string;
    product: TypedProduct<T>;
    image: ShopifyCSVParsedImage;
  }> = [];

  for (const handle in products) {
    const product = products[handle];
    for (const image of product.images) {
      images.push({ handle, product, image });
    }
  }

  return images;
}

/**
 * Provides comprehensive collection statistics.
 *
 * @param products - The parsed products collection
 * @returns Object containing various collection statistics
 */
export function getCollectionStats<T extends CustomColumns = {}>(
  products: ProductsCollection<T>,
): {
  totalProducts: number;
  totalVariants: number;
  totalImages: number;
  avgVariantsPerProduct: number;
  avgImagesPerProduct: number;
  productTypes: Record<string, number>;
  vendors: Record<string, number>;
  tagStats: Record<string, number>;
} {
  const totalProducts = countProducts(products);
  const totalVariants = countVariants(products);
  const totalImages = countImages(products);

  return {
    totalProducts,
    totalVariants,
    totalImages,
    avgVariantsPerProduct:
      totalProducts > 0 ? totalVariants / totalProducts : 0,
    avgImagesPerProduct: totalProducts > 0 ? totalImages / totalProducts : 0,
    productTypes: countProductsByType(products),
    vendors: countProductsByVendor(products),
    tagStats: getTagStats(Object.values(products)),
  };
}

// ============================================================================
// Price Formatting Utilities
// ============================================================================

/**
 * Parses a price string from Shopify CSV format into a number.
 * Handles various edge cases and formats commonly found in Shopify exports.
 *
 * @param priceString - The price string to parse
 * @returns The parsed price as a number, or NaN for invalid inputs
 *
 * @example
 * ```typescript
 * parsePrice("29.99")     // 29.99
 * parsePrice("$29.99")    // 29.99
 * parsePrice("29,99")     // 29.99
 * parsePrice("1,234.56")  // 1234.56
 * parsePrice("FREE")      // 0
 * parsePrice("")          // NaN
 * ```
 */
export function parsePrice(priceString: string | null | undefined): number {
  // Handle null, undefined, or empty string
  if (!priceString || typeof priceString !== "string") {
    return NaN;
  }

  // Trim whitespace
  const trimmed = priceString.trim();

  // Handle empty string after trimming
  if (trimmed === "") {
    return NaN;
  }

  // Handle special cases
  const upperCased = trimmed.toUpperCase();
  if (upperCased === "FREE" || upperCased === "0.00" || upperCased === "0") {
    return 0;
  }

  // Check for invalid mixed alphanumeric before cleaning
  // If it contains letters that aren't currency symbols or special words, reject it
  const hasInvalidLetters = /[a-zA-Z]/.test(
    trimmed.replace(/^(FREE|free)$/i, ""),
  );
  if (
    hasInvalidLetters &&
    !/^[\$£€¥₹₽¢₹₴₵₦₵₼₽₸₻₿\s]*[\d.,\-\s]+[\$£€¥₹₽¢₹₴₵₦₵₼₽₸₻₿\s]*$/.test(trimmed)
  ) {
    return NaN;
  }

  // Remove currency symbols and common prefixes/suffixes
  let cleaned = trimmed
    .replace(/^[\$£€¥₹₽¢₹₴₵₦₵₼₽₸₻₿]+/, "") // Remove leading currency symbols
    .replace(/[\$£€¥₹₽¢₹₴₵₦₵₼₽₸₻₿]+$/, "") // Remove trailing currency symbols
    .replace(/[^\d.,\-]/g, ""); // Keep only digits, commas, periods, and minus

  // Final check - if nothing is left or only separators, it's invalid
  if (!cleaned || /^[.,\-]+$/.test(cleaned)) {
    return NaN;
  }

  // Handle negative prices
  const isNegative = cleaned.includes("-");
  cleaned = cleaned.replace(/[-]/g, "");

  // Handle different decimal separators and thousands separators
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // Case: 1,234.56 (US format with thousands separator)
    const lastDotIndex = cleaned.lastIndexOf(".");
    const lastCommaIndex = cleaned.lastIndexOf(",");

    if (lastDotIndex > lastCommaIndex) {
      // Dot is decimal separator, comma is thousands separator
      cleaned = cleaned.replace(/,/g, "");
    } else {
      // Comma is decimal separator, dot is thousands separator
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    }
  } else if (cleaned.includes(",")) {
    // Case: could be 29,99 (European) or 1,234 (thousands)
    const commaIndex = cleaned.indexOf(",");
    const afterComma = cleaned.substring(commaIndex + 1);

    if (afterComma.length <= 2 && !afterComma.includes(",")) {
      // Likely decimal separator: 29,99
      cleaned = cleaned.replace(",", ".");
    } else {
      // Likely thousands separator: 1,234 or 1,234,567
      cleaned = cleaned.replace(/,/g, "");
    }
  }

  // Convert to number
  const result = parseFloat(cleaned);

  // Apply negative sign if needed
  return isNegative ? -result : result;
}

/**
 * Formats a number as a price string in Shopify CSV format.
 * Always uses dot as decimal separator, no currency symbols, no thousands separators.
 *
 * @param price - The price number to format
 * @param decimalPlaces - Number of decimal places (default: 2)
 * @returns Formatted price string suitable for Shopify CSV
 *
 * @example
 * ```typescript
 * stringifyPrice(29.99)      // "29.99"
 * stringifyPrice(30)         // "30.00"
 * stringifyPrice(1234.5)     // "1234.50"
 * stringifyPrice(0)          // "0.00"
 * stringifyPrice(29.999, 3)  // "29.999"
 * stringifyPrice(NaN)        // ""
 * ```
 */
export function stringifyPrice(
  price: number | string | null | undefined,
  decimalPlaces: number = 2,
): string {
  // Handle null/undefined
  if (price === null || price === undefined) {
    return "";
  }

  // Convert string to number if needed
  let numericPrice: number;
  if (typeof price === "string") {
    numericPrice = parsePrice(price);
  } else {
    numericPrice = price;
  }

  // Handle invalid numbers
  if (!isFinite(numericPrice) || isNaN(numericPrice)) {
    return "";
  }

  // Validate decimal places
  if (decimalPlaces < 0 || !Number.isInteger(decimalPlaces)) {
    decimalPlaces = 2;
  }

  // Format the price
  return numericPrice.toFixed(decimalPlaces);
}

/**
 * Validates if a price string is in valid Shopify CSV format.
 *
 * @param priceString - The price string to validate
 * @returns true if the price is valid for Shopify CSV format
 *
 * @example
 * ```typescript
 * isValidPrice("29.99")    // true
 * isValidPrice("30.00")    // true
 * isValidPrice("$29.99")   // false (contains currency symbol)
 * isValidPrice("29,99")    // false (wrong decimal separator)
 * isValidPrice("")         // false
 * isValidPrice("FREE")     // false
 * ```
 */
export function isValidPrice(priceString: string | null | undefined): boolean {
  if (!priceString || typeof priceString !== "string") {
    return false;
  }

  const trimmed = priceString.trim();

  // Shopify CSV format should be: digits with optional decimal point and 2 digits
  // No currency symbols, no thousands separators
  const shopifyPriceRegex = /^\d+(\.\d{1,2})?$/;

  return shopifyPriceRegex.test(trimmed);
}

/**
 * Normalizes a price to Shopify CSV format by parsing and re-stringifying.
 * Handles various input formats and converts them to the standard format.
 *
 * @param price - The price in any supported format
 * @param decimalPlaces - Number of decimal places (default: 2)
 * @returns Normalized price string in Shopify format, or empty string if invalid
 *
 * @example
 * ```typescript
 * normalizePrice("$29.99")     // "29.99"
 * normalizePrice("29,99")      // "29.99"
 * normalizePrice("1,234.56")   // "1234.56"
 * normalizePrice("FREE")       // "0.00"
 * normalizePrice("invalid")    // ""
 * ```
 */
export function normalizePrice(
  price: string | number | null | undefined,
  decimalPlaces: number = 2,
): string {
  if (typeof price === "number") {
    return stringifyPrice(price, decimalPlaces);
  }

  const parsed = parsePrice(price);
  return stringifyPrice(parsed, decimalPlaces);
}

/**
 * Safely updates a variant's price, handling parsing and validation.
 *
 * @param variant - The variant to update
 * @param newPrice - The new price (string, number, or parseable format)
 * @param field - The price field to update (default: "Variant Price")
 * @returns true if the price was successfully updated, false otherwise
 *
 * @example
 * ```typescript
 * updateVariantPrice(variant, 29.99)           // Sets "29.99"
 * updateVariantPrice(variant, "$30.00")        // Sets "30.00"
 * updateVariantPrice(variant, "invalid")       // Returns false, no change
 * ```
 */
export function updateVariantPrice(
  variant: ShopifyCSVParsedVariant,
  newPrice: string | number | null | undefined,
  field: string = "Variant Price",
): boolean {
  const normalizedPrice = normalizePrice(newPrice);

  if (normalizedPrice === "") {
    return false; // Invalid price, no update
  }

  variant.data[field] = normalizedPrice;
  return true;
}

/**
 * Safely updates a product's compare-at price, handling parsing and validation.
 *
 * @param variant - The variant to update
 * @param newPrice - The new compare-at price
 * @returns true if the price was successfully updated, false otherwise
 */
export function updateVariantCompareAtPrice(
  variant: ShopifyCSVParsedVariant,
  newPrice: string | number | null | undefined,
): boolean {
  return updateVariantPrice(variant, newPrice, "Variant Compare At Price");
}

/**
 * Calculates price adjustments with proper formatting.
 *
 * @param originalPrice - The original price (any format)
 * @param adjustment - The adjustment amount or percentage
 * @param type - "percentage" for percentage adjustment, "fixed" for fixed amount
 * @returns The adjusted price in Shopify format, or empty string if invalid
 *
 * @example
 * ```typescript
 * adjustPrice("29.99", 10, "percentage")  // "32.99" (10% increase)
 * adjustPrice("29.99", -5, "fixed")       // "24.99" ($5 decrease)
 * adjustPrice("$30.00", 0.5, "percentage") // "30.15" (0.5% increase)
 * ```
 */
export function adjustPrice(
  originalPrice: string | number | null | undefined,
  adjustment: number,
  type: "percentage" | "fixed",
): string {
  const parsed =
    typeof originalPrice === "number"
      ? originalPrice
      : parsePrice(originalPrice);

  if (!isFinite(parsed) || isNaN(parsed)) {
    return "";
  }

  let adjustedPrice: number;

  if (type === "percentage") {
    adjustedPrice = parsed * (1 + adjustment / 100);
  } else {
    adjustedPrice = parsed + adjustment;
  }

  // Ensure price doesn't go negative
  if (adjustedPrice < 0) {
    adjustedPrice = 0;
  }

  return stringifyPrice(adjustedPrice);
}

/**
 * Compares two prices, handling different formats.
 *
 * @param price1 - First price to compare
 * @param price2 - Second price to compare
 * @returns -1 if price1 < price2, 0 if equal, 1 if price1 > price2, NaN if either is invalid
 *
 * @example
 * ```typescript
 * comparePrice("29.99", "30.00")  // -1
 * comparePrice("$30", "29.99")    // 1
 * comparePrice("29.99", "29.99")  // 0
 * ```
 */
export function comparePrice(
  price1: string | number | null | undefined,
  price2: string | number | null | undefined,
): number {
  const parsed1 = typeof price1 === "number" ? price1 : parsePrice(price1);
  const parsed2 = typeof price2 === "number" ? price2 : parsePrice(price2);

  if (
    !isFinite(parsed1) ||
    !isFinite(parsed2) ||
    isNaN(parsed1) ||
    isNaN(parsed2)
  ) {
    return NaN;
  }

  if (parsed1 < parsed2) return -1;
  if (parsed1 > parsed2) return 1;
  return 0;
}

/**
 * Finds the minimum price among a set of price strings/numbers.
 *
 * @param prices - Array of prices in any supported format
 * @returns The minimum price in Shopify format, or empty string if no valid prices
 */
export function minPrice(
  prices: (string | number | null | undefined)[],
): string {
  const validPrices = prices
    .map((p) => (typeof p === "number" ? p : parsePrice(p)))
    .filter((p) => isFinite(p) && !isNaN(p));

  if (validPrices.length === 0) {
    return "";
  }

  return stringifyPrice(Math.min(...validPrices));
}

/**
 * Finds the maximum price among a set of price strings/numbers.
 *
 * @param prices - Array of prices in any supported format
 * @returns The maximum price in Shopify format, or empty string if no valid prices
 */
export function maxPrice(
  prices: (string | number | null | undefined)[],
): string {
  const validPrices = prices
    .map((p) => (typeof p === "number" ? p : parsePrice(p)))
    .filter((p) => isFinite(p) && !isNaN(p));

  if (validPrices.length === 0) {
    return "";
  }

  return stringifyPrice(Math.max(...validPrices));
}

/**
 * Calculates the average price among a set of price strings/numbers.
 *
 * @param prices - Array of prices in any supported format
 * @returns The average price in Shopify format, or empty string if no valid prices
 */
export function averagePrice(
  prices: (string | number | null | undefined)[],
): string {
  const validPrices = prices
    .map((p) => (typeof p === "number" ? p : parsePrice(p)))
    .filter((p) => isFinite(p) && !isNaN(p));

  if (validPrices.length === 0) {
    return "";
  }

  const sum = validPrices.reduce((acc, price) => acc + price, 0);
  const average = sum / validPrices.length;

  return stringifyPrice(average);
}
