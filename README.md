[![NPM Version](https://img.shields.io/npm/v/parse-shopify-csv.svg)](https://www.npmjs.com/package/parse-shopify-csv)
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

Here’s a complete example that adds a `new-collection` tag to every product.

```typescript
import { parseShopifyCSV, writeShopifyCSV, CSVProcessingError } from 'parse-shopify-csv';

async function bulkUpdateTags(inputFile: string, outputFile: string) {
  try {
    // 1. Read and parse the CSV
    const products = await parseShopifyCSV(inputFile);

    // 2. Modify the data
    // The result is iterable, so we can use a for...of loop
    for (const product of products) {
      console.log(`Updating tags for: ${product.data.Title}`);
      const currentTags = product.data.Tags
        ? product.data.Tags.split(',').map(t => t.trim())
        : [];

      if (!currentTags.includes('new-collection')) {
        currentTags.push('new-collection');
      }

      // Assign the updated array back. It will be correctly comma-joined.
      product.data.Tags = currentTags.join(', ');
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

## Utility Functions for Data Manipulation

Beyond parsing, this library includes a comprehensive set of utility functions to simplify common data manipulation tasks.

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

-   **`map(products, callback, shouldClone = true)`**: Iterates over each product, applies a `callback` function to it, and returns a new collection of the results. By default, a deep clone of each product is passed to the callback to prevent side effects.
-   **`filter(products, predicate, shouldClone = true)`**: Creates a new product collection containing only the products for which the `predicate` function returns `true`. By default, a deep clone of each product is passed to the predicate.
-   **`reduce(products, callback, initialValue, shouldClone = true)`**: Executes a `reducer` function on each product of the collection, resulting in a single output value. By default, a deep clone of each product is passed to the callback.

### Advanced & Bulk Utilities

These functions perform complex, task-oriented operations across multiple products, perfect for scripting and data migrations.

#### Bulk Operations

-   **`bulkUpdatePrices(products, options)`**: Updates prices for many products at once (e.g., for applying a store-wide sale).
-   **`bulkFindAndReplace(products, field, find, replaceWith)`**: Performs a find-and-replace on a text field (like `Title` or `Body (HTML)`) across multiple products.

#### Data Validation & Cleanup

-   **`findDuplicateSKUs(products)`**: Scans the entire collection for duplicate variant SKUs to prevent Shopify import errors.
-   **`sanitizeHandle(input)`**: Cleans a string (like a product title) to make it a valid, URL-safe Shopify handle.
-   **`removeMetafieldColumn(products, namespace, key)`**: Completely removes a metafield column from all products in the collection.

#### Product Lifecycle

-   **`cloneProduct(productToClone, newHandle, newTitle)`**: Creates a deep clone of a product, including its variants, images, and metafields, under a new handle and title.

### Custom Error

-   **`CSVProcessingError`**: A custom error class thrown for all library-specific errors, allowing for targeted `catch` blocks.

<br />

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

## Contributing

Contributions are welcome! Please feel free to submit a pull request with any bug fixes, documentation improvements, or new features.

## License

This project is licensed under the MIT License.
