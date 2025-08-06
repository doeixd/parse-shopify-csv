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
  ShopifyMetafield
} from './index';

// --- Type Definitions for Utility Functions ---

/**
 * Defines the data structure for creating a new product.
 * All properties are optional except for the `handle` provided to `createProduct`.
 */
export interface NewProductData {
  /** The product title. */
  Title?: string;
  /** The product description, which can include HTML. */
  'Body (HTML)'?: string;
  /** The name of the vendor or brand. */
  Vendor?: string;
  /** The category or type of the product. */
  Type?: string;
  /** A comma-separated string of tags. */
  Tags?: string;
  /** The product status. Defaults to `active`. */
  Status?: 'active' | 'draft' | 'archived';
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
  'Variant SKU'?: string;
  /** The cost of the item. */
  'Cost per item'?: string;
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
export function createProduct(handle: string, productData: NewProductData): ShopifyProductCSVParsedRow {
  const newRow: ShopifyProductCSVParsedRow = {
    data: {
      Handle: handle,
      Title: '',
      'Body (HTML)': '',
      Vendor: '',
      Type: '',
      Tags: '',
      Published: 'TRUE',
      'Option1 Name': '', 'Option1 Value': '',
      'Option2 Name': '', 'Option2 Value': '',
      'Option3 Name': '', 'Option3 Value': '',
      'Image Src': '', 'Image Position': '', 'Image Alt Text': '',
      'Variant SKU': '', 'Variant Image': '', 'Cost per item': '',
      Status: 'active',
      ...productData,
    },
    images: [],
    variants: [],
    metadata: {} as any, // Initially empty; populated by addMetafieldColumn
  };
  // Make metadata iterable
  Object.defineProperty(newRow, 'metadata', {
      value: Object.defineProperty(newRow.metadata, Symbol.iterator, {
          value: function* () {
              for (const key in this) {
                  if (Object.prototype.hasOwnProperty.call(this, key)) yield this[key];
              }
          }
      })
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
export function deleteProduct(products: Record<string, ShopifyProductCSVParsedRow>, handle: string): boolean {
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
export function findVariant(product: ShopifyProductCSVParsedRow, sku: string): ShopifyCSVParsedVariant | undefined {
    if (!sku) return undefined;
    return product.variants.find(v => v.data['Variant SKU'] === sku);
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
export function addVariant(product: ShopifyProductCSVParsedRow, newVariantData: NewVariantData): ShopifyCSVParsedVariant {
  const { options, ...variantSpecificData } = newVariantData;
  const optionNames = Object.keys(options);
  const existingOptionNames = [product.data['Option1 Name'], product.data['Option2 Name'], product.data['Option3 Name']];

  // Ensure product has the required Option Name headers
  optionNames.forEach(optName => {
    if (!existingOptionNames.includes(optName)) {
      const emptySlotIndex = existingOptionNames.findIndex(name => !name);
      if (emptySlotIndex === -1) {
        throw new Error(`Cannot add variant with new option "${optName}". Product already has 3 options defined.`);
      }
      product.data[`Option${emptySlotIndex + 1} Name`] = optName;
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
export function removeVariant(product: ShopifyProductCSVParsedRow, sku: string): boolean {
  const initialLength = product.variants.length;
  product.variants = product.variants.filter(v => v.data['Variant SKU'] !== sku);
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
export function addImage(product: ShopifyProductCSVParsedRow, newImageData: NewImageData): ShopifyCSVParsedImage {
  const existingImage = product.images.find(img => img.src === newImageData.src);
  if (existingImage) {
    return existingImage;
  }

  const image: ShopifyCSVParsedImage = {
    src: newImageData.src,
    alt: newImageData.alt || '',
    position: newImageData.position ? String(newImageData.position) : String(product.images.length + 1),
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
export function assignImageToVariant(product: ShopifyProductCSVParsedRow, imageSrc: string, sku: string): void {
  const image = product.images.find(img => img.src === imageSrc);
  if (!image) {
    throw new Error(`Image with src "${imageSrc}" not found on product.`);
  }

  const variant = findVariant(product, sku);
  if (!variant) {
    throw new Error(`Variant with SKU "${sku}" not found on product.`);
  }

  variant.data['Variant Image'] = image.src;
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
export function addMetafieldColumn(products: Record<string, ShopifyProductCSVParsedRow>, options: NewMetafieldColumnOptions): void {
  const { namespace, key, type, defaultValue } = options;
  const header = `Metafield: ${namespace}.${key}[${type}]`;
  const isList = type.startsWith('list.');
  const defaultValueString = Array.isArray(defaultValue) ? defaultValue.join(',') : String(defaultValue ?? '');

  for (const handle in products) {
    const product = products[handle];
    if (header in product.data) continue;

    // 1. Add the raw data property to the product's main data object.
    product.data[header] = defaultValueString;

    // 2. Add the "smart" getter/setter property to the metadata object.
    // This logic is adapted from the internal parser to dynamically add metadata capabilities.
    Object.defineProperty(product.metadata, header, {
      enumerable: true,
      configurable: true, // Allows this property to be deleted if needed
      get: (): ShopifyMetafield => ({
        key,
        namespace,
        isList,
        get value(): string { return product.data[header] as string || ''; },
        get parsedValue(): string | string[] {
          const rawValue = this.value;
          return isList ? rawValue.split(',').map((s: string) => s.trim()).filter(Boolean) : rawValue;
        },
        set parsedValue(newValue: string | string[]) {
          (product.data as Record<string, any>)[header] = Array.isArray(newValue) ? newValue.join(',') : newValue;
        },
      } as ShopifyMetafield),
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
export function getMetafield(product: ShopifyProductCSVParsedRow, namespace: string, key: string): ShopifyMetafield | undefined {
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
export function setMetafieldValue(product: ShopifyProductCSVParsedRow, namespace: string, key: string, value: string | string[]): void {
  const metafield = getMetafield(product, namespace, key);
  if (!metafield) {
    throw new Error(`Metafield with namespace "${namespace}" and key "${key}" not found. Use addMetafieldColumn to create it first.`);
  }
  metafield.parsedValue = value;
}




/**
 * A predicate function used for finding products.
 * @param {ShopifyProductCSVParsedRow} product - The product to evaluate.
 * @returns {boolean} `true` if the product matches the condition.
 */
export type ProductPredicate = (product: ShopifyProductCSVParsedRow) => boolean;

/**
 * A predicate function used for finding variants across all products.
 * @param {ShopifyCSVParsedVariant} variant - The variant to evaluate.
 * @param {ShopifyProductCSVParsedRow} product - The parent product of the variant.
 * @returns {boolean} `true` if the variant matches the condition.
 */
export type VariantPredicate = (variant: ShopifyCSVParsedVariant, product: ShopifyProductCSVParsedRow) => boolean;

/**
 * A predicate function for matching a metafield's value.
 * @param {string | string[]} parsedValue - The parsed value of the metafield (string or string[]).
 * @returns {boolean} `true` if the value matches the condition.
 */
export type MetafieldValuePredicate = (parsedValue: string | string[]) => boolean;


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
export function findProduct(
  products: Record<string, ShopifyProductCSVParsedRow>,
  predicate: ProductPredicate
): ShopifyProductCSVParsedRow | undefined {
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
export function findProducts(
  products: Record<string, ShopifyProductCSVParsedRow>,
  predicate: ProductPredicate
): ShopifyProductCSVParsedRow[] {
  const results: ShopifyProductCSVParsedRow[] = [];
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
export function findVariantByOptions(
  product: ShopifyProductCSVParsedRow,
  optionsToMatch: Record<string, string>
): ShopifyCSVParsedVariant | undefined {
  const matchKeys = Object.keys(optionsToMatch);

  return product.variants.find(variant => {
    if (variant.options.length !== matchKeys.length) {
      return false;
    }
    const variantOptionsMap = new Map(variant.options.map(o => [o.name, o.value]));
    return matchKeys.every(key => variantOptionsMap.get(key) === optionsToMatch[key]);
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
export function findAllVariants(
  products: Record<string, ShopifyProductCSVParsedRow>,
  predicate: VariantPredicate
): Array<{ handle: string, variant: ShopifyCSVParsedVariant }> {
  const results: Array<{ handle: string, variant: ShopifyCSVParsedVariant }> = [];
  for (const handle in products) {
    const product = products[handle];
    for (const variant of product.variants) {
      if (predicate(variant, product)) {
        results.push({ handle, variant });
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
export function findImagesWithoutAltText(
  products: Record<string, ShopifyProductCSVParsedRow>
): Array<{ handle: string, image: ShopifyCSVParsedImage }> {
  const results: Array<{ handle: string, image: ShopifyCSVParsedImage }> = [];
  for (const handle in products) {
    const product = products[handle];
    for (const image of product.images) {
      if (!image.alt) {
        results.push({ handle, image });
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
export function findOrphanedImages(product: ShopifyProductCSVParsedRow): ShopifyCSVParsedImage[] {
  const usedImageSrcs = new Set<string>();

  if (product.data['Image Src']) {
    usedImageSrcs.add(product.data['Image Src']);
  }

  product.variants.forEach(variant => {
    if (variant.data['Variant Image']) {
      usedImageSrcs.add(variant.data['Variant Image']);
    }
  });

  return product.images.filter(image => !usedImageSrcs.has(image.src));
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
export function findProductsByMetafield(
  products: Record<string, ShopifyProductCSVParsedRow>,
  namespace: string,
  key: string,
  valueOrPredicate: string | MetafieldValuePredicate
): ShopifyProductCSVParsedRow[] {
  const predicate = typeof valueOrPredicate === 'function'
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
export function findProductsMissingMetafield(
  products: Record<string, ShopifyProductCSVParsedRow>,
  namespace: string,
  key: string
): ShopifyProductCSVParsedRow[] {
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
export function bulkUpdatePrices(
  products: ShopifyProductCSVParsedRow[],
  options: {
    basedOn: 'price' | 'compare_at_price';
    adjustment: 'percentage' | 'fixed_amount';
    amount: number;
    setCompareAtPrice?: boolean;
  }
): void {
  for (const product of products) {
    for (const variant of product.variants) {
      const priceField = 'Variant Price';
      const comparePriceField = 'Variant Compare At Price';
      const originalPrice = parseFloat(variant.data[priceField]);

      if (isNaN(originalPrice)) continue;

      let newPrice = originalPrice;
      if (options.adjustment === 'percentage') {
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
export function bulkFindAndReplace(
  products: ShopifyProductCSVParsedRow[],
  field: keyof ShopifyProductCSVParsedRow['data'],
  find: string | RegExp,
  replaceWith: string
): void {
  for (const product of products) {
    const originalValue = product.data[field] as string;
    if (typeof originalValue === 'string') {
      product.data[field] = originalValue.replace(find, replaceWith);
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
export function findDuplicateSKUs(
  products: Record<string, ShopifyProductCSVParsedRow>
): Map<string, string[]> {
  const skuMap = new Map<string, string[]>();
  const duplicates = new Map<string, string[]>();

  for (const handle in products) {
    for (const variant of products[handle].variants) {
      const sku = variant.data['Variant SKU'];
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
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with a hyphen
    .replace(/^-+|-+$/g, '');   // Remove leading/trailing hyphens
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
export function cloneProduct(
  productToClone: ShopifyProductCSVParsedRow,
  newHandle: string,
  newTitle: string
): ShopifyProductCSVParsedRow {
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
export function removeMetafieldColumn(
  products: Record<string, ShopifyProductCSVParsedRow>,
  namespace: string,
  key: string
): void {
  let headerToRemove: string | null = null;

  // Find the full header key from the first product
  const firstProduct = Object.values(products)[0];
  if (!firstProduct) return;

  for (const meta of Object.values(firstProduct.metadata)) {
      if (meta.namespace === namespace && meta.key === key) {
          // A more robust solution would store the full type
          const fullHeader = Object.keys(firstProduct.data).find(h => h.startsWith(`Metafield: ${namespace}.${key}[`));
          if(fullHeader) headerToRemove = fullHeader;
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
export function addProduct(
  products: Record<string, ShopifyProductCSVParsedRow>,
  product: ShopifyProductCSVParsedRow
): Record<string, ShopifyProductCSVParsedRow> {
  products[product.data.Handle] = product;
  return products;
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
export function map(
  products: Record<string, ShopifyProductCSVParsedRow>,
  callback: (product: ShopifyProductCSVParsedRow) => ShopifyProductCSVParsedRow,
  shouldCloneBeforePassedToCb = true
): Record<string, ShopifyProductCSVParsedRow> {
  const newProducts: Record<string, ShopifyProductCSVParsedRow> = {};
  for (const handle in products) {
    const product = products[handle];
    const productToProcess = shouldCloneBeforePassedToCb ? structuredClone(product) : product;
    const newProduct = callback(productToProcess);
    newProducts[newProduct.data.Handle] = newProduct;
  }
  return newProducts;
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
export function filter(
  products: Record<string, ShopifyProductCSVParsedRow>,
  callback: (product: ShopifyProductCSVParsedRow) => boolean,
  shouldCloneBeforePassedToCb = true
): Record<string, ShopifyProductCSVParsedRow> {
  const newProducts: Record<string, ShopifyProductCSVParsedRow> = {};
  for (const handle in products) {
    const product = products[handle];
    const productToProcess = shouldCloneBeforePassedToCb ? structuredClone(product) : product;
    if (callback(productToProcess)) {
      newProducts[handle] = product;
    }
  }
  return newProducts;
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

export function reduce<A>(
  products: Record<string, ShopifyProductCSVParsedRow>,
  callback: (acc: A, product: ShopifyProductCSVParsedRow) => A,
  initial: A,
  shouldCloneBeforePassedToCb: boolean = true
): A {
  let acc: A = initial;
  for (const handle in products) {
    const product = products[handle];
    const productToProcess = shouldCloneBeforePassedToCb ? structuredClone(product) : product;
    acc = callback(acc, productToProcess);
  }
  return acc;
} 
