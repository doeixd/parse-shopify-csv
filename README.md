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
-   **Flexible Schema Support:** Automatically adapts to various CSV export formats including market-specific pricing (US, International, etc.), varying Google Shopping fields, and custom columns. See [Flexible Schemas Guide](docs/FLEXIBLE-SCHEMAS.md).
-   **Market-Specific Pricing:** Built-in support for international pricing fields like `Price / United States`, `Price / International` with dedicated utilities for analysis and manipulation.
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

## Parsing Complex CSVs with Type Safety

The library automatically handles complex Shopify exports with metafields, Google Shopping fields, and market-specific pricing. Here's a practical example:

```typescript
import {
  parseShopifyCSVFromString,
  extractMarketPricing,
} from 'parse-shopify-csv';

async function parseComplexJewelryCSV() {
  // Your complex CSV with metafields and Google Shopping fields
  const csvData = `Handle,Title,Vendor,Type,Google Shopping / Gender,Google Shopping / Age Group,Metal (product.metafields.product.metal),Chain Length (product.metafields.product.chain_length),Occasions (product.metafields.product.occasions),Price / United States,Price / International,Status
heart-necklace,Sterling Silver Heart Necklace,Premium Jewelry,Necklace,unisex,adult,Sterling Silver,18 inches,Valentine's Day,89.99,99.99,active`;

  // Parse the CSV - automatically detects all field types
  const products = await parseShopifyCSVFromString(csvData);
  const product = products['heart-necklace'];

  // Access basic product data
  console.log(`Product: ${product.data.Title}`);
  console.log(`Vendor: ${product.data.Vendor}`);
  console.log(`Type: ${product.data.Type}`);

  // Access Google Shopping fields
  console.log(`Google Gender: ${product.data['Google Shopping / Gender']}`);
  console.log(`Google Age Group: ${product.data['Google Shopping / Age Group']}`);

  // Access metafields via parsed metadata object (recommended)
  console.log(`Metal: ${product.metadata['product.metal']?.value}`);
  console.log(`Chain Length: ${product.metadata['product.chain_length']?.value}`);
  console.log(`Occasions: ${product.metadata['product.occasions']?.value}`);

  // Alternative: access metafields via raw column names
  console.log(`Metal (raw): ${product.data['Metal (product.metafields.product.metal)']}`);

  // Work with market-specific pricing
  const marketPrices = extractMarketPricing(product.data);
  console.log('Market Pricing:', marketPrices);
  // Output: { 'United States': { price: '89.99' }, 'International': { price: '99.99' } }

  // Type-safe filtering using metafields
  const silverJewelry = Object.values(products).filter(p => 
    p.metadata['product.metal']?.value?.toLowerCase().includes('silver')
  );
  
  const valentinesItems = Object.values(products).filter(p =>
    p.metadata['product.occasions']?.value?.toLowerCase().includes('valentine')
  );

  console.log(`Found ${silverJewelry.length} silver items and ${valentinesItems.length} Valentine's items`);
}
```

### Advanced Schema Analysis (Optional)

For advanced use cases, you can analyze your CSV structure before parsing:

```typescript
import { detectCSVSchema, generateTypeScriptInterface } from 'parse-shopify-csv';

// Analyze your CSV structure
const headers = csvData.split('\n')[0].split(',');
const schema = detectCSVSchema(headers, {
  detectMarketPricing: true,
  detectGoogleShopping: true,
  detectVariantFields: true
});

console.log(`Detected: ${schema.metafieldColumns.length} metafields, ${schema.marketPricingFields.length} market prices`);

// Generate TypeScript interface for your codebase
const tsInterface = generateTypeScriptInterface(headers, 'JewelryCSVSchema');
// Copy this interface to your TypeScript files for full type safety
```

### Two Ways to Access Metafields

The library provides two convenient ways to access metafield data:

1. **Structured access** (recommended): `product.metadata['namespace.key']?.value`
   - Clean, consistent format
   - Automatically parsed with proper typing
   - Easy to work with programmatically

2. **Raw column access**: `product.data['Display Name (product.metafields.namespace.key)']`
   - Direct access to original column values
   - Useful when you need the exact CSV column name
   - Good for debugging or one-off access

This approach provides:
- **Automatic parsing** of all field types without configuration
- **Structured metafield access** via the `metadata` object
- **Market pricing utilities** for international stores
- **Flexible data access** via both structured and raw column names

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
  const saleProducts = findProductsByTag(products, 'sale');
  const summerCottonProducts = findProductsByTags(products, ['summer', 'cotton']);

  // Tag analytics
  const allTags = getAllTags(products);
  const tagUsage = getTagStats(products);

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
  writeShopifyCSV,
  bulkUpdateVariantField,
  findDuplicateImages,
  assignBulkImagesToVariants,
  findVariant,
  addVariant,
  removeVariant,
  findVariantByOptions,
  findAllVariants,
  addImage,
  assignImageToVariant,
  findImagesWithoutAltText,
  findOrphanedImages,
  toVariantArray,
  toImageArray,
  ImageAssignmentRule
} from 'parse-shopify-csv';

async function manageVariantsAndImages() {
    const products = await parseShopifyCSV('shopify-export.csv');

    // 1. Bulk update variant prices with a 10% increase
    const modifiedProducts = bulkUpdateVariantField(products, 'Variant Price',
        (variant, product) => {
            const currentPrice = parseFloat(variant.data['Variant Price'] || '0');
            return (currentPrice * 1.1).toFixed(2);
        }
    );

    // 2. Find and resolve duplicate images
    const duplicates = findDuplicateImages(products);
    console.log('Duplicate images found:', duplicates);

    // 3. Bulk assign images to variants based on rules
    for (const handle in products) {
        const product = products[handle];

        const rules: ImageAssignmentRule<{}>[] = [
            {
                matcher: (variant) => variant.data['Option1 Value'] === 'Red',
                getImageSrc: () => 'https://example.com/red-variant.jpg'
            },
            {
                matcher: (variant) => variant.data['Option1 Value'] === 'Blue',
                getImageSrc: () => 'https://example.com/blue-variant.jpg'
            }
        ];

        assignBulkImagesToVariants(product, rules);
    }

    // 4. Find variants across all products
    const expensiveVariants = findAllVariants(products, (variant) => {
        const price = parseFloat(variant.data['Variant Price'] || '0');
        return price > 100;
    });

    // 5. Find and fix images without alt text
    const imagesWithoutAlt = findImagesWithoutAltText(products);
    imagesWithoutAlt.forEach(({ image, product }) => {
        image.alt = `${product.data.Title} product image`;
    });

    // 6. Clean up orphaned images
    for (const handle in products) {
        const orphanedImages = findOrphanedImages(products[handle]);
        console.log(`Product ${handle} has ${orphanedImages.length} orphaned images`);
    }

    // 7. Convert to arrays for analysis
    const allVariants = toVariantArray(products);
    const allImages = toImageArray(products);

    console.log(`Total variants: ${allVariants.length}`);
    console.log(`Total images: ${allImages.length}`);

    await writeShopifyCSV(products, 'updated-products.csv');
}
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

#### Price Management & Formatting

```typescript
import {
  parseShopifyCSV,
  writeShopifyCSV,
  parsePrice,
  stringifyPrice,
  normalizePrice,
  adjustPrice,
  updateVariantPrice,
  bulkUpdateVariantField,
  minPrice,
  maxPrice,
  averagePrice
} from 'parse-shopify-csv';

async function managePricing() {
    const products = await parseShopifyCSV('shopify-export.csv');

    // 1. Parse prices from various formats
    const price1 = parsePrice("$29.99");        // 29.99
    const price2 = parsePrice("29,99");         // 29.99 (European format)
    const price3 = parsePrice("1,234.56");      // 1234.56 (with thousands separator)
    const price4 = parsePrice("FREE");          // 0

    // 2. Format prices to Shopify CSV format
    const formattedPrice = stringifyPrice(29.99);      // "29.99"
    const wholeDollar = stringifyPrice(30);             // "30.00"
    const threeDecimals = stringifyPrice(29.999, 3);   // "29.999"

    // 3. Normalize mixed price formats
    const normalizedPrices = [
        normalizePrice("$29.99"),      // "29.99"
        normalizePrice("30,00"),       // "30.00"
        normalizePrice("1,234.56"),    // "1234.56"
    ];

    // 4. Apply bulk price adjustments
    const discountedProducts = bulkUpdateVariantField(
        products,
        'Variant Price',
        (variant, product) => adjustPrice(variant.data['Variant Price'], -10, 'percentage')
    );

    // 5. Update individual variant prices safely
    for (const handle in products) {
        const product = products[handle];
        for (const variant of product.variants) {
            // Apply 15% markup, with validation
            const success = updateVariantPrice(
                variant,
                adjustPrice(variant.data['Variant Price'], 15, 'percentage')
            );
            if (!success) {
                console.warn(`Failed to update price for SKU: ${variant.data['Variant SKU']}`);
            }
        }
    }

    // 6. Price analysis across products
    const allPrices = [];
    for (const product of Object.values(products)) {
        for (const variant of product.variants) {
            allPrices.push(variant.data['Variant Price']);
        }
    }

    console.log('Price Analysis:');
    console.log(`Minimum price: ${minPrice(allPrices)}`);
    console.log(`Maximum price: ${maxPrice(allPrices)}`);
    console.log(`Average price: ${averagePrice(allPrices)}`);

    await writeShopifyCSV('updated-pricing.csv', products);
}
```

<br />

## Flexible Schema Support & Type Generation

This library automatically adapts to various Shopify CSV export formats, including different column structures, market-specific pricing, Google Shopping fields, and extensive metafields.

### Automatic Schema Detection

The library automatically detects and handles:

- **Market-Specific Pricing**: `Price / United States`, `Price / International`, `Compare At Price / Canada`, etc.
- **Google Shopping Fields**: All Google Shopping columns with varying configurations
- **Metafields**: Both user-friendly format (`Field Name (product.metafields.namespace.key)`) and standard format (`Metafield: namespace.key[type]`)
- **Custom Fields**: Any additional columns not part of standard Shopify schema

```typescript
import { parseShopifyCSVFromString, detectCSVSchema } from 'parse-shopify-csv';

// Analyze your CSV structure
const csvHeaders = ['Handle', 'Title', 'Price / United States', 'Metal (product.metafields.product.metal)', ...];
const schema = detectCSVSchema(csvHeaders, {
  detectMarketPricing: true,
  detectGoogleShopping: true,
  detectVariantFields: true
});

console.log(schema);
// {
//   totalColumns: 45,
//   coreFields: 7,
//   marketPricingFields: 3,
//   googleShoppingFields: 6,
//   metafieldColumns: 12,
//   customFields: 2
// }
```

### TypeScript Interface Generation

Generate type-safe TypeScript interfaces directly from your CSV headers:

```typescript
import { generateTypeScriptInterface, getCSVHeadersFromString } from 'parse-shopify-csv';

const csvData = `Handle,Title,Vendor,Metal (product.metafields.product.metal),Chain Length (product.metafields.product.chain_length)
jewelry-item,Silver Necklace,Premium Co,Sterling Silver,18 inches`;

// Extract headers and generate TypeScript interface
const headers = getCSVHeadersFromString(csvData);
const tsInterface = generateTypeScriptInterface(headers, 'JewelrySchema');

console.log(tsInterface);
// interface JewelrySchema {
//   "Handle": string;
//   "Title": string;
//   "Vendor": string;
//   "Metal (product.metafields.product.metal)"?: string;
//   "Chain Length (product.metafields.product.chain_length)"?: string;
// }
```

### Zod Schema Generation

Generate runtime validation schemas using Zod:

```typescript
import { generateZodSchema } from 'parse-shopify-csv';

const zodSchema = generateZodSchema(headers, 'JewelrySchema');
console.log(zodSchema);
// const JewelrySchema = z.object({
//   "Handle": z.string(),
//   "Title": z.string(),
//   "Vendor": z.string(),
//   "Metal (product.metafields.product.metal)": z.string().optional(),
//   "Chain Length (product.metafields.product.chain_length)": z.string().optional(),
// });
```

### Complete Analysis & Schema Generation

For comprehensive analysis of your CSV structure:

```typescript
import { analyzeCSVAndGenerateSchemas } from 'parse-shopify-csv';

const analysis = analyzeCSVAndGenerateSchemas(csvData, {
  interfaceName: 'MyProductSchema',
  zodSchemaName: 'MyProductSchema',
  schemaDetectionOptions: {
    detectMarketPricing: true,
    detectGoogleShopping: true,
    detectVariantFields: true
  }
});

console.log('Headers:', analysis.headers);
console.log('Schema:', analysis.detectedSchema);
console.log('TypeScript:', analysis.typeScript);
console.log('Zod:', analysis.zodSchema);
```

### Working with Complex Metafields

The library handles various metafield formats automatically:

```typescript
// Your CSV with extensive metafields
const complexCSV = `Handle,Title,Metal (product.metafields.product.metal),Chain Length (product.metafields.product.chain_length),Jewelry Material (product.metafields.shopify.jewelry-material)
necklace,Silver Heart Necklace,Sterling Silver,18 inches,Sterling Silver`;

const products = await parseShopifyCSVFromString(complexCSV);
const product = products['necklace'];

// Access metafields via structured object (when available)
if (product.metafields.product) {
  console.log('Metal:', product.metafields.product.metal?.value);
  console.log('Chain Length:', product.metafields.product.chain_length?.value);
}

// Or access via raw data columns
console.log('Metal:', product.data['Metal (product.metafields.product.metal)']);
console.log('Chain Length:', product.data['Chain Length (product.metafields.product.chain_length)']);
```

### Market-Specific Pricing Utilities

Built-in utilities for international pricing:

```typescript
import { extractMarketPricing, setMarketPricing, getAvailableMarkets } from 'parse-shopify-csv';

// Extract all market pricing from a product
const marketPrices = extractMarketPricing(product.data);
console.log(marketPrices);
// {
//   'United States': { price: '29.99', compareAtPrice: '39.99' },
//   'International': { price: '34.99', compareAtPrice: '44.99' }
// }

// Set pricing for a specific market
setMarketPricing(product.data, 'Canada', {
  price: '39.99',
  compareAtPrice: '49.99'
});

// Get all available markets in your data
const markets = getAvailableMarkets(products);
console.log('Available markets:', markets);
```

### CSV Header Utilities

Extract and analyze CSV headers:

```typescript
import { getCSVHeaders, getCSVHeadersFromString } from 'parse-shopify-csv';

// From file
const headersFromFile = await getCSVHeaders('products.csv');

// From string
const headersFromString = getCSVHeadersFromString(csvData);

console.log('Total columns:', headersFromString.length);
console.log('First 5 headers:', headersFromString.slice(0, 5));
```

## API Reference

### Core Functions

-   **`parseShopifyCSV<T>(path)`**: Parses a Shopify product CSV from a file path.
-   **`parseShopifyCSVFromString<T>(csv)`**: Parses a Shopify product CSV from a string.
-   **`stringifyShopifyCSV(parsedData)`**: Converts the structured product data back into a CSV formatted string.
-   **`writeShopifyCSV(path, parsedData)`**: A convenient wrapper that stringifies data and writes it to a file.

### Schema Detection & Type Generation

-   **`detectCSVSchema(headers, options?)`**: Analyzes CSV headers and returns schema information including core fields, metafields, Google Shopping fields, and market pricing fields.
-   **`getCSVHeaders(filePath)`**: Extracts column headers from a CSV file.
-   **`getCSVHeadersFromString(csvString)`**: Extracts column headers from a CSV string.
-   **`generateTypeScriptInterface(headers, interfaceName?, options?)`**: Generates a TypeScript interface definition from CSV headers.
-   **`generateZodSchema(headers, schemaName?, options?)`**: Generates a Zod validation schema from CSV headers.
-   **`analyzeCSVAndGenerateSchemas(csvData, options?)`**: Complete analysis that returns headers, detected schema, TypeScript interface, and Zod schema.

### Market Pricing Utilities

-   **`extractMarketPricing(productData)`**: Extracts all market-specific pricing fields from a product's data.
-   **`setMarketPricing(productData, market, pricing)`**: Sets pricing for a specific market on a product.
-   **`getAvailableMarkets(products)`**: Returns all available markets found across the product collection.

### Validation & Helper Functions

-   **`validateCoreFields(productData)`**: Validates that a product data object contains all required core Shopify fields.
-   **`createMinimalProductRow(options)`**: Creates a minimal product row with required fields for CSV export.

### Utility Functions (CRUD)

These functions are for creating, updating, or deleting individual items on a product.

-   **`createProduct(handle, data)`**: Creates a new, minimal product object.
-   **`addProduct(products, product)`**: Adds a new product to the collection.
-   **`deleteProduct(products, handle)`**: Deletes a product from the collection.
-   **`addVariant(product, data)`**: Adds a new variant to a product.
-   **`removeVariant(product, sku)`**: Removes a single variant from a product by its SKU.
-   **`addImage(product, data)`**: Adds a new image to a product's image collection.
-   **`assignImageToVariant(product, imageSrc, sku)`**: Assigns an existing image to a specific variant.
-   **`addMetafieldColumn(products, options)`**: Creates a new metafield column for all products in a collection.
-   **`setMetafieldValue(product, ns, key, value)`**: Sets the value of an existing metafield on a product.
-   **`getMetafield(product, ns, key)`**: Retrieves a metafield object from a product.

### Utility Functions (Querying)

These functions are for finding items based on specific criteria.

-   **`findProduct<T>(products, predicate)`**: Finds the first product matching a condition.
-   **`findProducts<T>(products, predicate)`**: Finds all products matching a condition.
-   **`findProductsByMetafield<T>(products, ns, key, value)`**: Finds all products with a specific metafield value.
-   **`findProductsMissingMetafield<T>(products, ns, key)`**: Finds all products that do not have a specific metafield defined.

### Functional Utilities

These functions provide common functional programming helpers to process the entire product collection in an immutable way.

-   **`map<T, R>(products, callback, shouldClone = true)`**: Iterates over each product, applies a `callback` function to it, and returns a new collection of the results. Supports type transformation from `T` to `R`. By default, a deep clone of each product is passed to the callback to prevent side effects.
-   **`filter<T>(products, predicate, shouldClone = true)`**: Creates a new product collection containing only the products for which the `predicate` function returns `true`. Preserves generic type information. By default, a deep clone of each product is passed to the predicate.
-   **`reduce<A, T>(products, callback, initialValue, shouldClone = true)`**: Executes a `reducer` function on each product of the collection, resulting in a single output value. Maintains generic type information throughout the reduction. By default, a deep clone of each product is passed to the callback.
-   **`toArray<T>(products)`**: Converts a product collection into a plain array of products. Useful for compatibility with array methods or when you need indexed access.
-   **`countProducts<T>(products)`**: Returns the total number of products in the collection.
-   **`countVariants<T>(products)`**: Returns the total number of variants across all products.
-   **`countImages<T>(products)`**: Returns the total number of images across all products.
-   **`countProductsWhere<T>(products, predicate)`**: Returns the count of products that match the given predicate function.
-   **`countVariantsWhere<T>(products, predicate)`**: Returns the count of variants that match the given predicate function.
-   **`countProductsWithTag<T>(products, tag)`**: Returns the count of products that have the specified tag.
-   **`countProductsByType<T>(products)`**: Returns an object mapping product types to their counts.
-   **`countProductsByVendor<T>(products)`**: Returns an object mapping vendors to their product counts.
-   **`getCollectionStats<T>(products)`**: Returns comprehensive statistics about the collection including totals, averages, and breakdowns by type/vendor/tags.

### Advanced & Bulk Utilities

These functions perform complex, task-oriented operations across multiple products, perfect for scripting and data migrations.

#### Bulk Operations

-   **`bulkUpdatePrices<T>(products: TypedProduct<T>[], options)`**: Updates prices for many products at once (e.g., for applying a store-wide sale). Takes an array of products.
-   **`bulkFindAndReplace<T>(products: TypedProduct<T>[], field, find, replaceWith)`**: Performs a find-and-replace on a text field across multiple products. Takes an array of products.
-   **`bulkUpdateVariantField<T>(products, field, value)`**: Updates a specific field across all variants in multiple products. Supports both static values and dynamic functions.
-   **`bulkUpdateInventory<T>(products, updates)`**: Mass inventory updates using SKU-to-quantity mapping with type preservation.

#### Inventory Management

Utilities for managing product inventory quantities and tracking with full type safety.

-   **`updateInventoryQuantity<T>(product, variantSKU, quantity)`**: Updates inventory quantity for a specific variant by SKU.

#### Advanced Variant Management

Enhanced utilities for working with product variants across multiple products with type preservation.

-   **`findVariant<T>(product, sku)`**: Finds a specific variant within a product by SKU.
-   **`addVariant<T>(product, newVariantData)`**: Adds a new variant to a product with proper option handling.
-   **`removeVariant<T>(product, sku)`**: Removes a variant from a product by SKU.
-   **`findVariantByOptions<T>(product, optionsToMatch)`**: Finds a variant by matching option values.
-   **`findAllVariants<T>(products, predicate)`**: Finds all variants across all products that match a predicate.
-   **`toVariantArray<T>(products)`**: Converts all variants from all products into a flat array with product context.

#### Advanced Image Management

Enhanced utilities for managing product images and variant assignments.

-   **`findDuplicateImages<T>(products)`**: Finds images used by multiple products (useful for optimization).
-   **`assignBulkImagesToVariants<T>(product, rules)`**: Assigns images to variants based on configurable rules.
-   **`addImage<T>(product, newImageData)`**: Adds a new image to a product (prevents duplicates).
-   **`assignImageToVariant<T>(product, imageSrc, sku)`**: Assigns an existing image to a specific variant.
-   **`findImagesWithoutAltText<T>(products)`**: Finds all images across products that lack alt text.
-   **`findOrphanedImages<T>(product)`**: Finds images in a product that aren't assigned to any variant.
-   **`toImageArray<T>(products)`**: Converts all images from all products into a flat array with product context.

#### Product Organization

Utilities for categorizing and organizing products with custom field type safety.



#### Tag Management

Modern, comprehensive utilities for managing product tags with automatic deduplication and case-insensitive operations.

-   **`getTags<T>(product)`**: Gets all tags for a product as an array of strings.
-   **`hasTag<T>(product, tag)`**: Checks if a product has a specific tag (case-insensitive).
-   **`addTag<T>(product, tag)`**: Adds a single tag with automatic deduplication.
-   **`removeTag<T>(product, tag)`**: Removes a tag (case-insensitive).
-   **`setTags<T>(product, tags)`**: Replaces all tags with new ones (accepts array or comma-separated string).
-   **`addTags<T>(product, tags)`**: Adds multiple tags at once.
-   **`removeTags<T>(product, tags)`**: Removes multiple tags at once.
-   **`hasAllTags<T>(product, tags)`**: Checks if product has all specified tags.
-   **`hasAnyTag<T>(product, tags)`**: Checks if product has any of the specified tags.
-   **`findProductsByTag<T>(products, tag)`**: Finds all products with a specific tag.
-   **`findProductsByTags<T>(products, tags)`**: Finds products with all specified tags.
-   **`getAllTags<T>(products)`**: Gets all unique tags across all products with type preservation.
-   **`getTagStats<T>(products)`**: Returns tag usage statistics while maintaining generic type information.
-   **`parseTags(tagsString)`**: Parses comma-separated tags string into array.
-   **`serializeTags(tags)`**: Converts tag array to comma-separated string.

#### Inventory Management

Modern utilities for managing product inventory and stock levels.

-   **`updateInventoryQuantity<T>(product, variantSKU, quantity)`**: Updates inventory quantity for a specific variant by SKU.

#### Advanced Variant Management

Enhanced utilities for bulk variant operations and management.

-   **`bulkUpdateVariantField<T>(products, field, value)`**: Bulk updates a specific field across all variants (supports static values or functions).
-   **`findVariant<T>(product, sku)`**: Finds a specific variant within a product by SKU.
-   **`addVariant<T>(product, newVariantData)`**: Adds a new variant to a product with proper option handling.
-   **`removeVariant<T>(product, sku)`**: Removes a variant from a product by SKU.
-   **`findVariantByOptions<T>(product, optionsToMatch)`**: Finds a variant by matching option values.
-   **`findAllVariants<T>(products, predicate)`**: Finds all variants across all products that match a predicate.
-   **`toVariantArray<T>(products)`**: Converts all variants from all products into a flat array with product context.

#### Advanced Image Management

Enhanced utilities for managing product images and variant assignments.

-   **`findDuplicateImages<T>(products)`**: Finds images used by multiple products (useful for optimization).
-   **`assignBulkImagesToVariants<T>(product, rules)`**: Assigns images to variants based on configurable rules.
-   **`addImage<T>(product, newImageData)`**: Adds a new image to a product (prevents duplicates).
-   **`assignImageToVariant<T>(product, imageSrc, sku)`**: Assigns an existing image to a specific variant.
-   **`findImagesWithoutAltText<T>(products)`**: Finds all images across products that lack alt text.
-   **`findOrphanedImages<T>(product)`**: Finds images in a product that aren't assigned to any variant.
-   **`toImageArray<T>(products)`**: Converts all images from all products into a flat array with product context.

#### Product Organization & Categorization

Utilities for organizing and categorizing products.

-   **`findUncategorizedProducts<T>(products, config)`**: Finds products that don't meet categorization criteria (missing required fields, tags, metafields, or custom conditions).

#### Data Validation & Cleanup

-   **`findDuplicateSKUs<T>(products)`**: Scans the entire collection for duplicate variant SKUs to prevent Shopify import errors.
-   **`sanitizeHandle(input)`**: Cleans a string (like a product title) to make it a valid, URL-safe Shopify handle.
-   **`removeMetafieldColumn<T>(products, namespace, key)`**: Completely removes a metafield column from all products in the collection.

#### Price Utilities

Comprehensive utilities for parsing, formatting, and manipulating prices in Shopify CSV format.

-   **`parsePrice(priceString)`**: Parses various price formats into numbers. Handles currency symbols, different decimal separators, thousands separators, and special cases like "FREE".
-   **`stringifyPrice(price, decimalPlaces?)`**: Formats numbers as Shopify-compatible price strings with proper decimal formatting.
-   **`isValidPrice(priceString)`**: Validates if a price string is in correct Shopify CSV format (no symbols, dot decimal separator).
-   **`normalizePrice(price, decimalPlaces?)`**: Converts any price format to standard Shopify CSV format.
-   **`updateVariantPrice(variant, newPrice, field?)`**: Safely updates variant price with automatic parsing and validation.
-   **`updateVariantCompareAtPrice(variant, newPrice)`**: Updates variant compare-at price with validation.
-   **`adjustPrice(originalPrice, adjustment, type)`**: Calculates price adjustments (percentage or fixed amount) with proper formatting.
-   **`comparePrice(price1, price2)`**: Compares two prices handling different input formats.
-   **`minPrice(prices[])`**: Finds minimum price from an array of various price formats.
-   **`maxPrice(prices[])`**: Finds maximum price from an array of various price formats.
-   **`averagePrice(prices[])`**: Calculates average price from an array of various price formats.

#### Product Lifecycle

-   **`cloneProduct<T>(productToClone, newHandle, newTitle)`**: Creates a deep clone of a product, including its variants, images, and metafields, under a new handle and title. Preserves custom type information.

### Custom Error

-   **`CSVProcessingError`**: A custom error class thrown for all library-specific errors, allowing for targeted `catch` blocks.

<br />

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
  return product.data['Internal Category'] === 'Premium' && // ✅ Autocomplete!
         product.data['Supplier SKU'] !== '';               // ✅ Type-safe!
};

// Type-safe transformations
const enrichedProducts = map(products, (product: TypedProduct<MyCompleteSchema>) => {
  // Full autocomplete for all your custom fields
  const category = product.data['Internal Category'];
  const supplierSku = product.data['Supplier SKU'];

  // Apply business logic with compile-time safety
  if (category === 'Premium') {
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
