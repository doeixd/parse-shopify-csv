[![NPM Version](https://img.shields.io/npm/v/parse-shopify-csv.svg)](https://www.npmjs.com/package/parse-shopify-csv)
[![Build Status](https://img.shields.io/github/actions/workflow/status/doeixd/parse-shopify-csv/main.yml?branch=main)](https://github.com/doeixd/parse-shopify-csv/actions)
[![Coverage Status](https://img.shields.io/codecov/c/github/doeixd/parse-shopify-csv.svg)](https://codecov.io/gh/doeixd/parse-shopify-csv)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# Shopify CSV Parser (`parse-shopify-csv`)

A robust, type-safe, and production-ready Node.js library for intelligently parsing, modifying, and writing complex Shopify product CSV files, with first-class support for metafields.

### The Problem

Shopify's product CSV format is powerful but complex. A single logical product can span multiple rows to define its variants, images, and other attributes. A simple CSV parser sees these as disconnected rows, making it notoriously difficult to reconstruct the product hierarchy correctly.

### The Solution

This library is purpose-built to understand the Shopify CSV structure. It handles all the complexity for you, parsing the entire file into a structured, hierarchical JavaScript object. It intelligently groups all variants, images, and metafields under their parent product, allowing you to work with your data in a simple and intuitive way.

## Key Features

-   **Intelligent Hierarchy Parsing:** Correctly aggregates multiple CSV rows into single, complete product objects.
-   **Seamless Metafield Manipulation:** Automatically parses metafield columns into a dedicated, iterable `metadata` object. Changes to this object are **automatically synced** back to the raw data for effortless writing.
-   **Powerful Utility Functions:** A rich set of helpers to perform CRUD (Create, Read, Update, Delete) and query operations on products, variants, images, and metafields.
-   **Iterable by Default:** The returned product collection and each product's metafields are directly iterable. Use them in `for...of` loops, with the spread syntax (`...`), and more.
-   **Fully Type-Safe with Generics:** Use TypeScript generics to provide strong types for your custom metafield columns, enabling full auto-completion and compile-time safety.
-   **Complete Read-Modify-Write Workflow:** Provides a full toolkit (`parse`, `stringify`, `write`) to programmatically read, modify, and save Shopify CSVs.
-   **Robust Error Handling:** Throws a custom `CSVProcessingError` for predictable handling of file I/O issues, malformed CSVs, and missing required columns.

## Installation

```bash
npm install parse-shopify-csv 
```

## Quick Start: The Read-Modify-Write Workflow

The most common use case is to read a Shopify export, perform bulk edits, and save the result. This library makes that simple.

Here's a complete example that adds a `new-collection` tag to every product using the modern tag utilities.

```typescript
import { parseShopifyCSV, writeShopifyCSV, addTag, CSVProcessingError } from 'parse-shopify-csv';

async function bulkUpdateTags(inputFile: string, outputFile: string) {
  try {
    // 1. Read and parse the CSV
    const products = await parseShopifyCSV(inputFile);

    // 2. Modify the data using tag utilities
    // The result is iterable, so we can use a for...of loop
    for (const product of products) {
      console.log(`Updating tags for: ${product.data.Title}`);
      
      // Add tag with automatic deduplication
      addTag(product, 'new-collection');
    }

    // 3. Write the modified data back to a new file
    await writeShopifyCSV(outputFile, products);
    console.log(`✅ Successfully updated products and saved to ${outputFile}`);

  } catch (error) {
    if (error instanceof CSVProcessingError) {
      console.error(`A CSV processing error occurred: ${error.message}`);
    } else {
      console.error("An unexpected error occurred:", error);
    }
  }
}

bulkUpdateTags('shopify-export.csv', 'shopify-export-modified.csv');
```

### Old vs New Tag Management

**Before (manual string manipulation):**
```typescript
// Manual, error-prone approach
const currentTags = product.data.Tags
  ? product.data.Tags.split(',').map(t => t.trim())
  : [];

if (!currentTags.includes('new-collection')) {
  currentTags.push('new-collection');
}

product.data.Tags = currentTags.join(', ');
```

**After (using tag utilities):**
```typescript
// Simple, robust, and handles all edge cases
addTag(product, 'new-collection');
```

## Utility Functions for Data Manipulation

Beyond parsing, this library includes a comprehensive set of utility functions to simplify common data manipulation tasks.

### Tag Management

The library provides modern, powerful tag management utilities that handle all the complexity of working with Shopify's comma-separated tag format. All tag operations are case-insensitive and handle deduplication automatically.

```typescript
import {
  parseShopifyCSV,
  addTag,
  removeTags,
  hasTag,
  getTags,
  findProductsByTag,
  getAllTags,
  getTagStats
} from 'parse-shopify-csv';

async function manageTags() {
  const products = await parseShopifyCSV('shopify-export.csv');

  // Get the first product for demonstration
  const product = Object.values(products)[0];

  // Basic tag operations
  console.log('Current tags:', getTags(product));
  
  addTag(product, 'featured');              // Add single tag
  addTags(product, ['sale', 'bestseller']); // Add multiple tags
  removeTag(product, 'old-tag');            // Remove single tag
  removeTags(product, ['clearance', 'discontinued']); // Remove multiple

  // Tag checking
  if (hasTag(product, 'sale')) {
    addTag(product, 'promotional');
  }

  if (hasAllTags(product, ['summer', 'cotton'])) {
    addTag(product, 'summer-cotton-collection');
  }

  // Finding products by tags
  const saleProducts = findProductsByTag(Object.values(products), 'sale');
  const summerCottonProducts = findProductsByTags(Object.values(products), ['summer', 'cotton']);

  // Tag analytics
  const allTags = getAllTags(Object.values(products));
  const tagUsage = getTagStats(Object.values(products));
  
  console.log('All tags in store:', allTags);
  console.log('Most popular tags:', Object.entries(tagUsage)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5));
}
```

#### Inventory Management

```typescript
import {
  parseShopifyCSV,
  updateInventoryQuantity,
  bulkUpdateInventory,
  findVariant
} from 'parse-shopify-csv';

async function manageInventory() {
  const products = await parseShopifyCSV('shopify-export.csv');
  const product = Object.values(products)[0];

  // Update single variant inventory
  updateInventoryQuantity(product, 'SKU-123', 50);

  // Bulk update multiple SKUs
  const inventoryUpdates = {
    'SKU-123': 25,
    'SKU-456': 100,
    'SKU-789': 0
  };
  
  const updatedProducts = bulkUpdateInventory(products, inventoryUpdates);
  console.log(`Updated inventory for ${updatedProducts.length} products`);
}
```

#### Advanced Variant & Image Management

```typescript
import {
  parseShopifyCSV,
  bulkUpdateVariantField,
  findDuplicateImages,
  assignBulkImagesToVariants,
  ImageAssignmentRule
} from 'parse-shopify-csv';

async function manageVari
```

### Modifying Data (CRUD)

These helpers allow you to programmatically create or update products, variants, and more.

```typescript
import {
  parseShopifyCSV,
  writeShopifyCSV,
  createProduct,
  addVariant,
  addMetafieldColumn,
  setMetafieldValue
} from 'parse-shopify-csv';

async function addNewProduct() {
    const products = await parseShopifyCSV('shopify-export.csv');

    // 1. Create a new, empty metafield column for all products
    addMetafieldColumn(products, {
        namespace: 'custom',
        key: 'material',
        type: 'string',
        defaultValue: 'N/A'
    });

    // 2. Create a new product
    const newProduct = createProduct('my-new-jacket', {
        Title: 'The All-Weather Jacket',
        Vendor: 'MyBrand',
        Status: 'draft'
    });
    // Add it to the main collection
    products[newProduct.data.Handle] = newProduct;
    // or use addProduct(products, newProduct);


    // 3. Add variants to the new product
    addVariant(newProduct, {
        options: { Size: 'M', Color: 'Black' },
        'Variant SKU': 'JKT-BLK-M',
        'Cost per item': '99.50'
    });

    // 4. Set a value for its new metafield
    setMetafieldValue(newProduct, 'custom', 'material', 'Gore-Tex');

    await writeShopifyCSV('export-with-new-product.csv', products);
}
```

### Querying and Finding Data

These helpers allow you to efficiently search and filter your product data.

```typescript
import {
  parseShopifyCSV,
  findProducts,
  findProductsByMetafield,
  findImagesWithoutAltText
} from 'parse-shopify-csv';

async function runAudits() {
    const products = await parseShopifyCSV('shopify-export.csv');

    // Example 1: Find all products from a specific vendor
    const brandProducts = findProducts(products, p => p.data.Vendor === 'MyBrand');
    console.log(`Found ${brandProducts.length} products from MyBrand.`);

    // Example 2: Find all products with a specific metafield value
    // (e.g., all products where the 'features' list includes 'Waterproof')
    const waterproofProducts = findProductsByMetafield(
      products, 'custom', 'features',
      (val) => Array.isArray(val) && val.includes('Waterproof')
    );
    console.log(`Found ${waterproofProducts.length} waterproof products.`);

    // Example 3: Perform an SEO audit to find images missing alt text
    const imagesToFix = findImagesWithoutAltText(products);
    if (imagesToFix.length > 0) {
        console.log(`Found ${imagesToFix.length} images missing alt text.`);
    }
}
```

<br />

## API Reference

### Core Functions

-   **`parseShopifyCSV<T>(path)`**: Parses a Shopify product CSV from a file path.
-   **`parseShopifyCSVFromString<T>(csv)`**: Parses a Shopify product CSV from a string.
-   **`stringifyShopifyCSV(parsedData)`**: Converts the structured product data back into a CSV formatted string.
-   **`writeShopifyCSV(path, parsedData)`**: A convenient wrapper that stringifies data and writes it to a file.

### Utility Functions (CRUD)

These functions are for creating, updating, or deleting individual items on a product.

-   **`createProduct(handle, data)`**: Creates a new, minimal product object.
-   **`addProduct(products, product)`**: Adds a new product to the collection.
-   **`deleteProduct(products, handle)`**: Deletes a product from the collection.
-   **`addVariant(product, data)`**: Adds a new variant to a product.
-   **`removeVariant(product, sku)`**: Removes a variant from a product by its SKU.
-   **`addImage(product, data)`**: Adds a new image to a product's image collection.
-   **`assignImageToVariant(product, imageSrc, sku)`**: Assigns an existing image to a variant.
-   **`addMetafieldColumn(products, options)`**: Creates a new metafield column for all products in a collection.
-   **`setMetafieldValue(product, ns, key, value)`**: Sets the value of an existing metafield on a product.
-   **`getMetafield(product, ns, key)`**: Retrieves a metafield object from a product.

### Utility Functions (Querying)

These functions are for finding items based on specific criteria.

-   **`findProduct(products, predicate)`**: Finds the first product matching a condition.
-   **`findProducts(products, predicate)`**: Finds all products matching a condition.
-   **`findVariantByOptions(product, options)`**: Finds a variant by its specific option combination (e.g., Color: Blue, Size: M).
-   **`findAllVariants(products, predicate)`**: Finds all variants across all products matching a condition.
-   **`findImagesWithoutAltText(products)`**: Finds all images across all products that are missing alt text.
-   **`findOrphanedImages(product)`**: Finds images on a product that are not assigned to the main product or any variant.
-   **`findProductsByMetafield(products, ns, key, value)`**: Finds all products with a specific metafield value.
-   **`findProductsMissingMetafield(products, ns, key)`**: Finds all products that do not have a specific metafield defined.

### Functional Utilities

These functions provide common functional programming helpers to process the entire product collection in an immutable way.

-   **`map<T, R>(products, callback, shouldClone = true)`**: Iterates over each product, applies a `callback` function to it, and returns a new collection of the results. Supports type transformation from `T` to `R`. By default, a deep clone of each product is passed to the callback to prevent side effects.
-   **`filter<T>(products, predicate, shouldClone = true)`**: Creates a new product collection containing only the products for which the `predicate` function returns `true`. Preserves generic type information. By default, a deep clone of each product is passed to the predicate.
-   **`reduce<A, T>(products, callback, initialValue, shouldClone = true)`**: Executes a `reducer` function on each product of the collection, resulting in a single output value. Maintains generic type information throughout the reduction. By default, a deep clone of each product is passed to the callback.

### Advanced & Bulk Utilities

These functions perform complex, task-oriented operations across multiple products, perfect for scripting and data migrations.

#### Bulk Operations

-   **`bulkUpdatePrices<T>(products, options)`**: Updates prices for many products at once (e.g., for applying a store-wide sale). Preserves custom type information.
-   **`bulkFindAndReplace<T>(products, field, find, replaceWith)`**: Performs a find-and-replace on a text field (like `Title` or custom fields) across multiple products. Type-safe field selection.
-   **`bulkUpdateVariantField<T>(products, field, valueOrFunction)`**: Updates a specific field across all variants in multiple products. Supports both static values and dynamic functions with full type safety.
-   **`bulkUpdateInventory<T>(products, updates)`**: Mass inventory updates using SKU-to-quantity mapping with type preservation.

#### Inventory Management

Utilities for managing product inventory quantities and tracking with full type safety.

-   **`updateInventoryQuantity<T>(product, variantSKU, quantity)`**: Updates inventory quantity for a specific variant by SKU.
-   **`bulkUpdateInventory<T>(products, updates)`**: Bulk updates inventory quantities using SKU-to-quantity mapping.

#### Advanced Variant Management

Enhanced utilities for working with product variants across multiple products with type preservation.

-   **`bulkUpdateVariantField<T>(products, field, valueOrFunction)`**: Updates a specific field across all variants in multiple products. Value can be static or a function that receives (variant, product) parameters.

#### Enhanced Image Management

Advanced utilities for managing product images and variant assignments with type safety.

-   **`findDuplicateImages<T>(products)`**: Finds images that are used by multiple products (returns mapping of image src to product handles).
-   **`assignBulkImagesToVariants<T>(product, rules)`**: Assigns images to variants based on flexible matching rules. Rules define matchers and image source functions with full type safety.

#### Product Organization

Utilities for categorizing and organizing products with custom field type safety.

-   **`findUncategorizedProducts<T>(products, config)`**: Finds products that don't meet categorization criteria (missing required fields, tags, metafields, or custom conditions). Supports type-safe field validation.

#### Tag Management

Modern, comprehensive utilities for managing product tags with automatic deduplication and case-insensitive operations.

-   **`getTags(product)`**: Gets all tags for a product as an array of strings.
-   **`hasTag(product, tag)`**: Checks if a product has a specific tag (case-insensitive).
-   **`addTag(product, tag)`**: Adds a single tag with automatic deduplication.
-   **`removeTag(product, tag)`**: Removes a tag (case-insensitive).
-   **`setTags(product, tags)`**: Replaces all tags with new ones (accepts array or comma-separated string).
-   **`addTags(product, tags)`**: Adds multiple tags at once.
-   **`removeTags(product, tags)`**: Removes multiple tags at once.
-   **`hasAllTags(product, tags)`**: Checks if product has all specified tags.
-   **`hasAnyTag(product, tags)`**: Checks if product has any of the specified tags.
-   **`findProductsByTag(products, tag)`**: Finds all products with a specific tag.
-   **`findProductsByTags(products, tags)`**: Finds products with all specified tags.
-   **`getAllTags<T>(products)`**: Gets all unique tags across all products with type preservation.
-   **`getTagStats<T>(products)`**: Returns tag usage statistics while maintaining generic type information.
-   **`parseTags(tagsString)`**: Parses comma-separated tags string into array.
-   **`serializeTags(tags)`**: Converts tag array to comma-separated string.

#### Inventory Management

Modern utilities for managing product inventory and stock levels.

-   **`updateInventoryQuantity(product, variantSKU, quantity)`**: Updates inventory quantity for a specific variant.
-   **`bulkUpdateInventory(products, updates)`**: Bulk updates inventory quantities using SKU-to-quantity mapping.

#### Advanced Variant Management

Enhanced utilities for bulk variant operations and management.

-   **`bulkUpdateVariantField(products, field, value)`**: Bulk updates a specific field across all variants (supports static values or functions).

#### Advanced Image Management

Enhanced utilities for managing product images and variant assignments.

-   **`findDuplicateImages(products)`**: Finds images used by multiple products (useful for optimization).
-   **`assignBulkImagesToVariants(product, rules)`**: Assigns images to variants based on configurable rules.

#### Product Organization & Categorization

Utilities for organizing and categorizing products.

-   **`findUncategorizedProducts(products, config)`**: Finds products that don't meet categorization requirements.

#### Data Validation & Cleanup

-   **`findDuplicateSKUs<T>(products)`**: Scans the entire collection for duplicate variant SKUs to prevent Shopify import errors.
-   **`sanitizeHandle(input)`**: Cleans a string (like a product title) to make it a valid, URL-safe Shopify handle.
-   **`removeMetafieldColumn<T>(products, namespace, key)`**: Completely removes a metafield column from all products in the collection.

#### Product Lifecycle

-   **`cloneProduct<T>(productToClone, newHandle, newTitle)`**: Creates a deep clone of a product, including its variants, images, and metafields, under a new handle and title. Preserves custom type information.

### Enhanced Type Utilities

Modern type helpers for better development experience:

-   **`DefineCustomColumns<T>`**: Type helper for defining custom CSV columns with full autocomplete support.
-   **`DefineMetafields<T>`**: Type helper for defining metafields with their expected types (string or string[]).
-   **`CombineColumnsAndMetafields<C, M>`**: Combines custom columns and metafields into a complete type schema.
-   **`TypedProduct<T>`**: Enhanced product type that preserves your custom type information throughout operations.
-   **`ProductsCollection<T>`**: Type-safe collection that maintains generic information and iterability.
-   **`TypedProductPredicate<T>`**: Predicate function type that preserves generic information for type-safe filtering.
-   **`TypedVariantPredicate<T>`**: Variant predicate type with preserved generic information for advanced queries.

### Custom Error

-   **`CSVProcessingError`**: A custom error class thrown for all library-specific errors, allowing for targeted `catch` blocks.

<br />

## Default Export

## Advanced Type Safety Features

### Generic Type Utilities

The library provides advanced type utilities to enhance your development experience:

```typescript
import { 
  DefineCustomColumns, 
  DefineMetafields, 
  CombineColumnsAndMetafields,
  TypedProduct,
  ProductsCollection 
} from 'parse-shopify-csv';

// Define your business-specific column types
type MyCustomColumns = DefineCustomColumns<{
  'Supplier SKU': string;
  'Cost Basis': string;
  'Margin Target': string;
  'Internal Category': string;
}>;

// Define your metafield structure
type MyMetafields = DefineMetafields<{
  'custom.material': string;
  'custom.features': string[];
  'inventory.reorder_point': string;
}>;

// Combine for complete schema
type MyCompleteSchema = CombineColumnsAndMetafields<MyCustomColumns, MyMetafields>;

// Use throughout your application
const products = await parseShopifyCSV<MyCompleteSchema>('products.csv');
```

### Type-Safe Business Logic

Create strongly-typed business logic that prevents runtime errors:

```typescript
// Type-safe predicate functions
const premiumProductPredicate: TypedProductPredicate<MyCompleteSchema> = (product) => {
  return product.data['Custom Price Tier'] === 'Premium' && // ✅ Autocomplete!
         product.data['Supplier Code'] !== '';               // ✅ Type-safe!
};

// Type-safe transformations
const enrichedProducts = map(products, (product: TypedProduct<MyCompleteSchema>) => {
  // Full autocomplete for all your custom fields
  const tier = product.data['Custom Price Tier'];
  const supplierCode = product.data['Supplier Code'];
  
  // Apply business logic with compile-time safety
  if (tier === 'Premium') {
    addTag(product, 'premium-tier');
  }
  
  return product; // Type information preserved!
});
```

### Gradual Type Adoption

Start with flexible typing and add more specificity as needed:

```typescript
// Start loose - works with any CSV structure
const anyProducts = await parseShopifyCSV('unknown-structure.csv');

// Add typing for specific operations
type KnownFields = DefineCustomColumns<{
  'Important Field': string;
}>;

// Cast when you know the structure
const typedProduct = anyProducts['some-handle'] as TypedProduct<KnownFields>;
console.log(typedProduct.data['Important Field']); // ✅ Now type-safe!
```

## Default Export

The library's default export is an object containing the core functions for convenience:

-   `parse`: Alias for `parseShopifyCSV`.
-   `write`: Alias for `writeShopifyCSV`.
-   `stringify`: Alias for `stringifyShopifyCSV`.
-   `parseFromString`: Alias for `parseShopifyCSVFromString`.


This allows for a more concise import style:

```typescript
import shopifyCSV from 'parse-shopify-csv';

async function process(file: string) {
    const products = await shopifyCSV.parse(file);
    // ...
    await shopifyCSV.write('new-file.csv', products);
}
```

<br />

## Key Data Structures

### `ShopifyProductCSVParsedRow<T>`

The main object for a single, fully parsed product.

-   `data: ShopifyProductCSV<T>`: The full data from the product's first row. **This object is automatically updated when you modify `metadata.parsedValue`**.
-   `metadata: ShopifyProductMetafields`: An iterable object containing all parsed metafields.
-   `images: ShopifyCSVParsedImage[]`: An array of all unique product images.
-   `variants: ShopifyCSVParsedVariant[]`: An array of all product variants.

### `ShopifyMetafield`

The structure for each entry within `product.metadata`.

-   `key: string`: The short key of the metafield (e.g., `fabric`).
-   `namespace: string`: The namespace of the metafield (e.g., `my_fields`).
-   `isList: boolean`: True if the metafield type is a list (e.g., `list.single_line_text_field`).
-   `value: string`: The raw string value directly from the CSV cell.
-   `parsedValue: string | string[]`: The parsed value (an array for lists, a string otherwise). **Assigning a new value to this property automatically updates the underlying `product.data` object**, ensuring your changes are saved.

### Enhanced Generic Types

The library provides several utility types to improve your development experience:

-   **`DefineCustomColumns<T>`**: Type helper for defining your custom CSV columns with full autocomplete.
-   **`DefineMetafields<T>`**: Type helper for defining metafields with their expected types (string or string[]).
-   **`CombineColumnsAndMetafields<C, M>`**: Combines custom columns and metafields into a complete schema.
-   **`TypedProduct<T>`**: Alias for `ShopifyProductCSVParsedRow<T>` that preserves your custom type information.
-   **`ProductsCollection<T>`**: Enhanced collection type that maintains generic information and iterability.
-   **`TypedProductPredicate<T>`**: Predicate function type that preserves generic information for filtering.
-   **`TypedVariantPredicate<T>`**: Variant predicate type with preserved generic information.

## Gotchas & Troubleshooting

### **Mutability and Side Effects**

Most utility functions **mutate the original objects** by default for performance. If you need immutable operations, clone the objects first:

```typescript
// ❌ This modifies the original product
addTag(product, 'new-tag');

// ✅ This preserves the original
const productCopy = structuredClone(product);
addTag(productCopy, 'new-tag');

// ✅ Or use functional utilities with cloning enabled (default)
const newProducts = map(products, (p) => {
  addTag(p, 'new-tag');
  return p;
}, true); // shouldClone = true (default)
```

**Exception:** The functional utilities (`map`, `filter`, `reduce`) clone by default unless you explicitly set `shouldClone = false`.

### **Tags Serialization**

Tags are stored as comma-separated strings in the CSV, but the tag utilities handle this automatically:

```typescript
// ✅ These are equivalent
product.data.Tags = 'summer, sale, featured';
setTags(product, ['summer', 'sale', 'featured']);

// ❌ Don't manually manipulate the Tags string
product.data.Tags += ', new-tag'; // Can create duplicates and formatting issues

// ✅ Use tag utilities instead
addTag(product, 'new-tag');
```

### **Metadata Syncing**

Changes to `metadata.parsedValue` automatically sync to the raw CSV data, but direct data changes don't sync back:

```typescript
// ✅ This syncs automatically
product.metadata['Metafield: custom.color[string]'].parsedValue = 'Blue';
console.log(product.data['Metafield: custom.color[string]']); // 'Blue'

// ❌ This doesn't sync to metadata
product.data['Metafield: custom.color[string]'] = 'Red';
console.log(product.metadata['Metafield: custom.color[string]'].parsedValue); // Still 'Blue'

// ✅ Use utility functions for consistency
setMetafieldValue(product, 'custom', 'color', 'Red');
```

### **Product vs. Variant Metadata**

Products and variants have separate metadata objects:

```typescript
// Product-level metafield
setMetafieldValue(product, 'custom', 'brand', 'Nike');

// Variant-level metafield (if supported by your setup)
// Note: Standard Shopify CSV doesn't support variant metafields
// You'd need custom columns for this
```

### **Handle Overwrites in createProduct**

The `createProduct` function sets the handle in the data object, potentially overwriting any handle passed in the second parameter:

```typescript
// ❌ The handle in productData will be ignored
const product = createProduct('correct-handle', {
  Handle: 'ignored-handle', // This will be overwritten
  Title: 'My Product'
});
console.log(product.data.Handle); // 'correct-handle'

// ✅ Only pass the handle as the first parameter
const product = createProduct('my-product-handle', {
  Title: 'My Product'
});
```

### **Products Collection is Not an Array**

The parsed products collection is an iterable object, not an array:

```typescript
const products = await parseShopifyCSV('file.csv');

// ✅ These work
for (const product of products) { }
const productArray = Object.values(products);
const handles = Object.keys(products);

// ❌ These don't work
products.map(p => p.data.Title); // Error: products.map is not a function
products.length; // undefined
products[0]; // undefined (unless you have a product with handle '0')

// ✅ Use functional utilities (maintains type information)
const titles = map(products, p => p.data.Title);
// or
const titles = Object.values(products).map(p => p.data.Title);

// ✅ Type-safe conversion to array
const productArray: TypedProduct<MySchema>[] = Object.values(products);
```

### **Working with Custom Types**

When using custom column types, follow these patterns for the best experience:

```typescript
// Define your schema once
type MySchema = DefineCustomColumns<{
  'Custom Price': string;
  'Supplier Code': string;
}>;

// Use consistently throughout your app
const products = await parseShopifyCSV<MySchema>('file.csv');
const filtered = filter<MySchema>(products, p => p.data['Custom Price'] !== '');
const mapped = map<MySchema>(products, p => { /* transform */ return p; });

// ❌ Don't mix typed and untyped
const mixed: Record<string, ShopifyProductCSVParsedRow> = products; // Loses type info

// ✅ Maintain type consistency
const consistent: ProductsCollection<MySchema> = products; // Preserves types
```

### **Generic Type Information Loss**

Be careful not to lose type information when using utility functions:

```typescript
// ❌ Loses custom type information
const products = await parseShopifyCSV<MyCustomColumns>('file.csv');
const genericProducts: Record<string, ShopifyProductCSVParsedRow> = products;
// Custom field autocomplete is now lost

// ✅ Preserve type information
const products = await parseShopifyCSV<MyCustomColumns>('file.csv');
const typedProducts: ProductsCollection<MyCustomColumns> = products;
// Custom field autocomplete preserved

// ✅ Functions that preserve generics
const filtered = filter<MyCustomColumns>(products, p => p.data['Custom Field'] === 'value');
const mapped = map<MyCustomColumns>(products, p => { /* transform */ return p; });
```

### **Finding Variants Across Products**

When searching for variants by SKU across multiple products, remember to iterate through all products:

```typescript
// ❌ This only searches one product
const variant = findVariant(products['some-handle'], 'SKU-123');

// ✅ Search across all products
function findVariantAnywhere(products, sku) {
  for (const handle in products) {
    const variant = findVariant(products[handle], sku);
    if (variant) return { product: products[handle], variant };
  }
  return null;
}

// ✅ Or use the bulk utility
const results = findAllVariants(products, v => v.data['Variant SKU'] === 'SKU-123');
```

### **CSV Column Order Matters**

When writing back to CSV, the column order is preserved from the original file. New columns (like metafields) are added at the end:

```typescript
// The output CSV will maintain the original column order
// New metafield columns appear after existing columns
await writeShopifyCSV('output.csv', products);
```

### **Memory Usage with Large Files**

For very large CSV files, consider processing in chunks or streaming if memory becomes an issue:

```typescript
// For large files, monitor memory usage
const products = await parseShopifyCSV('large-file.csv');
console.log(`Loaded ${Object.keys(products).length} products`);

// Consider processing in batches
const handles = Object.keys(products);
const batchSize = 100;
for (let i = 0; i < handles.length; i += batchSize) {
  const batch = handles.slice(i, i + batchSize);
  // Process batch...
}
```

### **Error Handling Best Practices**

Always wrap file operations and catch `CSVProcessingError`:

```typescript
import { CSVProcessingError } from 'parse-shopify-csv';

try {
  const products = await parseShopifyCSV('file.csv');
  // Process products...
  await writeShopifyCSV('output.csv', products);
} catch (error) {
  if (error instanceof CSVProcessingError) {
    console.error('CSV processing failed:', error.message);
    // Handle CSV-specific errors
  } else {
    console.error('Unexpected error:', error);
    // Handle other errors
  }
}
```

### **Best Practices for Type Safety**

#### **Start Simple, Scale Complexity**

```typescript
// Begin with minimal typing for fields you actively use
type Essential = DefineCustomColumns<{
  'Important Field': string;
}>;

// Gradually expand as your needs grow
type Expanded = DefineCustomColumns<{
  'Important Field': string;
  'Another Field': string;
  'Business Logic Field': string;
}>;
```

#### **Use Type Utilities for Team Consistency**

```typescript
// Create team-wide type definitions
export type CompanyProductSchema = CombineColumnsAndMetafields<
  DefineCustomColumns<{
    'Supplier Code': string;
    'Cost Center': string;
    'Profit Margin': string;
  }>,
  DefineMetafields<{
    'inventory.location': string;
    'marketing.campaign': string[];
  }>
>;

// Use across your entire codebase
export type CompanyProduct = TypedProduct<CompanyProductSchema>;
export type CompanyProductsCollection = ProductsCollection<CompanyProductSchema>;
```

#### **Type-Safe Business Logic**

```typescript
// Create strongly-typed business functions
function calculateProfitability<T extends DefineCustomColumns<{'Cost Basis': string}>>(
  product: TypedProduct<T>
): number {
  const cost = parseFloat(product.data['Cost Basis'] || '0');
  const price = parseFloat(product.data['Variant Price'] || '0');
  return ((price - cost) / price) * 100;
}

// Type-safe predicates
const highMarginPredicate: TypedProductPredicate<CompanyProductSchema> = (product) => {
  return calculateProfitability(product) > 40;
};
```

## Contributing

Contributions are welcome! Please feel free to submit a pull request with any bug fixes, documentation improvements, or new features.

## License

This project is licensed under the MIT License.
