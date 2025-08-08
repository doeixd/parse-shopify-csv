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
      Type: "",
      Tags: "",
      Published: "TRUE",
      "Option1 Name": "",
      "Option1 Value": "",
      "Option2 Name": "",
      "Option2 Value": "",
      "Option3 Name": "",
      "Option3 Value": "",
      "Image Src": "",
      "Image Position": "",
      "Image Alt Text": "",
      "Variant SKU": "",
      "Variant Image": "",
      "Cost per item": "",
      Status: "active",
      ...productData,
    } as ShopifyProductCSV<T>,
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
  const { options, ...variantSpecificData } = newVariantData;
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
    options: Object.entries(options).map(([name, value]) => ({ name, value })),
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
