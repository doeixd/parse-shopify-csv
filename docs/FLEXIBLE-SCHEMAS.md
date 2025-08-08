# Flexible Schema Support

This document explains how to use the enhanced flexible schema features in `parse-shopify-csv` that allow you to work with various Shopify CSV export formats, including those with market-specific pricing, varying Google Shopping fields, and custom columns.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Schema Detection](#schema-detection)
- [Market-Specific Pricing](#market-specific-pricing)
- [Type-Safe Schema Definitions](#type-safe-schema-definitions)
- [Working with Different Export Formats](#working-with-different-export-formats)
- [Utility Functions](#utility-functions)
- [Migration Guide](#migration-guide)
- [Examples](#examples)

## Overview

Shopify product exports can vary significantly in their column structure depending on:

- **Markets configured** (US, International, EU, etc.)
- **Google Shopping settings** enabled/disabled
- **Metafields** included in the export
- **Custom fields** added by apps or manual customization
- **Export settings** and filters applied

This library now automatically detects and handles these variations while maintaining full type safety.

## Core Concepts

### Flexible Schema Types

The library provides several type definitions to handle different scenarios:

```typescript
// Core required fields (always present)
type ShopifyProductCSVCore = {
  Handle: string;
  Title: string;
  "Body (HTML)": string;
  Vendor: string;
  Type: string;
  Tags: string;
  Published: PublishedStatus;
};

// Flexible schema that adapts to any export format
type ShopifyProductCSVFlexible<T = {}> = 
  ShopifyProductCSVCore & 
  Partial<ShopifyProductCSVStandard> & 
  Partial<ShopifyGoogleShoppingFields> & 
  Partial<ShopifyVariantCSVStandard> & 
  Partial<MarketPricingFields> & 
  T;
```

### Market Pricing Fields

Market-specific pricing follows the pattern:
- `Price / {Market Name}` (e.g., "Price / United States")
- `Compare At Price / {Market Name}` 
- `Included / {Market Name}`

```typescript
type MarketPricingFields = {
  [K in `${"Price" | "Compare At Price" | "Included"} / ${string}`]?: string;
};
```

## Schema Detection

### Automatic Detection

The library automatically detects the schema when parsing:

```typescript
import { parseShopifyCSV, detectCSVSchema } from 'parse-shopify-csv';

// Parse with automatic detection
const products = await parseShopifyCSV('products.csv', {
  detectMarketPricing: true,
  detectGoogleShopping: true,
  detectVariantFields: true
});

// Manual schema detection
const headers = ['Handle', 'Title', 'Price / US', 'Price / EU'];
const schema = detectCSVSchema(headers);
console.log(schema);
// {
//   coreFields: ['Handle', 'Title'],
//   marketPricingFields: ['Price / US', 'Price / EU'],
//   googleShoppingFields: [],
//   // ... etc
// }
```

### Schema Detection Options

```typescript
interface SchemaDetectionOptions {
  detectMarketPricing?: boolean;     // Detect "Price / Market" patterns
  detectGoogleShopping?: boolean;    // Detect "Google Shopping / *" fields
  detectVariantFields?: boolean;     // Detect "Variant *" fields
  customPatterns?: RegExp[];         // Custom field detection patterns
}
```

### Custom Pattern Detection

```typescript
const schema = detectCSVSchema(headers, {
  customPatterns: [
    /^Internal\s+/,      // Match "Internal Notes", "Internal SKU", etc.
    /^Custom\s+Field/,   // Match "Custom Field 1", "Custom Field 2", etc.
    /^Supplier\s+/       // Match supplier-related fields
  ]
});
```

## Market-Specific Pricing

### Working with Market Pricing

```typescript
import { 
  extractMarketPricing, 
  setMarketPricing, 
  getAvailableMarkets 
} from 'parse-shopify-csv';

// Extract pricing data from a product
const product = products['my-product'];
const marketPricing = extractMarketPricing(product.data);
console.log(marketPricing);
// {
//   'United States': { price: '25.00', compareAtPrice: '30.00', included: 'TRUE' },
//   'International': { price: '28.00', compareAtPrice: '33.00', included: 'TRUE' }
// }

// Set market pricing
setMarketPricing(product.data, 'Canada', {
  price: '32.00',
  compareAtPrice: '38.00',
  included: 'FALSE'
});

// Get all available markets across all products
const markets = getAvailableMarkets(products);
console.log(markets); // ['United States', 'International', 'Canada']
```

### Market Pricing Analysis

```typescript
// Analyze price differences across markets
for (const product of products) {
  const markets = extractMarketPricing(product.data);
  
  const usPrice = parseFloat(markets['United States']?.price || '0');
  const intlPrice = parseFloat(markets['International']?.price || '0');
  
  if (usPrice && intlPrice) {
    const difference = ((intlPrice - usPrice) / usPrice * 100).toFixed(1);
    console.log(`${product.data.Title}: ${difference}% price difference`);
  }
}
```

## Type-Safe Schema Definitions

### Defining Custom Schemas

```typescript
import { 
  DefineCustomColumns, 
  DefineMetafields, 
  CombineColumnsAndMetafields 
} from 'parse-shopify-csv';

// Define custom columns
type MyCustomColumns = DefineCustomColumns<{
  'Internal SKU': string;
  'Supplier Code': string;
  'Warehouse Location': string;
  'Last Updated': string;
}>;

// Define metafields
type MyMetafields = DefineMetafields<{
  'custom.material': string;
  'custom.care_instructions': string[];
  'inventory.reorder_point': string;
}>;

// Combine everything
type MyCompleteSchema = CombineColumnsAndMetafields<
  MyCustomColumns, 
  MyMetafields
> & MarketPricingFields;
```

### Schema-Aware Parser

```typescript
import { createSchemaAwareParser } from 'parse-shopify-csv';

const parser = createSchemaAwareParser<MyCompleteSchema>({
  'Internal SKU': '',
  'Supplier Code': '',
  'Warehouse Location': '',
  'Last Updated': '',
  // Metafields use their full column names
  'Metafield: custom.material[string]': '',
  'Metafield: custom.care_instructions[list.single_line_text_field]': '',
  'Metafield: inventory.reorder_point[number_integer]': ''
}, {
  detectMarketPricing: true,
  detectGoogleShopping: true
});

// Now you get full type safety
const products = await parser.parseFile('products.csv');
for (const product of products) {
  // TypeScript knows about your custom fields
  console.log(product.data['Internal SKU']);
  console.log(product.data['Supplier Code']);
  
  // And your metafields
  const material = product.metadata['custom.material'];
  if (material) {
    console.log(`Material: ${material.value}`);
  }
}
```

## Working with Different Export Formats

### Example 1: Basic Export

```csv
Handle,Title,Vendor,Type,Published,Status
simple-product,Simple Product,Vendor,Type,TRUE,active
```

```typescript
// Minimal parsing - works automatically
const products = await parseShopifyCSV('basic.csv');
```

### Example 2: International Markets Export

```csv
Handle,Title,Vendor,Price / United States,Price / International,Status
global-product,Global Product,Vendor,25.00,28.00,active
```

```typescript
const products = await parseShopifyCSV('international.csv', {
  detectMarketPricing: true
});

for (const product of products) {
  const markets = extractMarketPricing(product.data);
  console.log(markets);
}
```

### Example 3: Full-Featured Export

```csv
Handle,Title,Vendor,Variant SKU,Variant Grams,Google Shopping / Gender,Metafield: custom.material[string],Price / US,Status
product,Product,Vendor,SKU-001,100,unisex,cotton,25.00,active
```

```typescript
const products = await parseShopifyCSV('full.csv', {
  detectMarketPricing: true,
  detectGoogleShopping: true,
  detectVariantFields: true
});
```

### Example 4: Custom Pattern Detection

```csv
Handle,Title,Internal Notes,Custom Field 1,Supplier Code
product,Product,Internal notes here,Custom value,SUP-001
```

```typescript
const products = await parseShopifyCSV('custom.csv', {
  customPatterns: [/^Internal\s/, /^Custom\s/, /^Supplier\s/]
});
```

## Utility Functions

### Core Field Validation

```typescript
import { validateCoreFields, createMinimalProductRow } from 'parse-shopify-csv';

// Validate a row has required fields
if (validateCoreFields(someRowData)) {
  // Row is valid
}

// Create minimal product row
const minimalProduct = createMinimalProductRow({
  handle: 'new-product',
  title: 'New Product',
  vendor: 'My Vendor',
  type: 'Widget',
  tags: ['new', 'featured'],
  published: 'TRUE'
});
```

### Schema Creation Helpers

```typescript
import { createSchemaDefinition } from 'parse-shopify-csv';

// Type-safe schema definition
const mySchema = createSchemaDefinition({
  'Custom Field 1': '',
  'Custom Field 2': '',
  'Internal Notes': ''
});
```

## Migration Guide

### From Basic Usage

**Before:**
```typescript
const products = await parseShopifyCSV('products.csv');
```

**After (no changes needed):**
```typescript
// Still works the same way
const products = await parseShopifyCSV('products.csv');

// But now you can enable enhanced detection
const products = await parseShopifyCSV('products.csv', {
  detectMarketPricing: true,
  detectGoogleShopping: true
});
```

### From Custom Types

**Before:**
```typescript
type MyCustom = { 'Custom Field': string };
const products = await parseShopifyCSV<MyCustom>('products.csv');
```

**After:**
```typescript
// Option 1: Use flexible schema
const products = await parseShopifyCSV('products.csv');

// Option 2: Use enhanced type definitions
type MyCustom = DefineCustomColumns<{ 'Custom Field': string }>;
const parser = createSchemaAwareParser(myCustom);
const products = await parser.parseFile('products.csv');
```

## Examples

### Complete Workflow Example

```typescript
import { 
  parseShopifyCSV, 
  extractMarketPricing,
  getAvailableMarkets,
  createSchemaAwareParser,
  DefineCustomColumns,
  MarketPricingFields
} from 'parse-shopify-csv';

// Define your schema
type CustomSchema = DefineCustomColumns<{
  'Internal SKU': string;
  'Supplier': string;
}> & MarketPricingFields;

// Create parser
const parser = createSchemaAwareParser<CustomSchema>({
  'Internal SKU': '',
  'Supplier': ''
}, {
  detectMarketPricing: true,
  detectGoogleShopping: true
});

async function processProducts() {
  // Parse the CSV
  const products = await parser.parseFile('products.csv');
  
  // Analyze market coverage
  const markets = getAvailableMarkets(products);
  console.log(`Available markets: ${markets.join(', ')}`);
  
  // Process each product
  for (const product of products) {
    console.log(`\nProcessing: ${product.data.Title}`);
    console.log(`Internal SKU: ${product.data['Internal SKU']}`);
    console.log(`Supplier: ${product.data['Supplier']}`);
    
    // Market pricing analysis
    const marketPricing = extractMarketPricing(product.data);
    for (const [market, pricing] of Object.entries(marketPricing)) {
      console.log(`${market}: ${pricing.price} (${pricing.compareAtPrice})`);
    }
    
    // Variant analysis
    for (const variant of product.variants) {
      const sku = variant.data['Variant SKU'];
      const price = variant.data['Variant Price'];
      const weight = variant.data['Variant Grams'] || variant.data['Variant Weight'];
      
      console.log(`  Variant ${sku}: ${price} (${weight}g)`);
    }
  }
}

processProducts().catch(console.error);
```

### Handling Unknown Schemas

```typescript
// When you don't know the schema ahead of time
async function analyzeUnknownCSV(filePath: string) {
  // First, detect the schema
  const products = await parseShopifyCSV(filePath, {
    detectMarketPricing: true,
    detectGoogleShopping: true,
    detectVariantFields: true
  });
  
  if (Object.keys(products).length === 0) {
    console.log('No products found');
    return;
  }
  
  // Analyze the first product to understand the schema
  const firstProduct = Object.values(products)[0];
  const dataKeys = Object.keys(firstProduct.data);
  
  console.log('Available columns:');
  dataKeys.forEach(key => {
    const value = firstProduct.data[key];
    console.log(`  ${key}: ${typeof value} (${value})`);
  });
  
  // Check for market pricing
  const markets = getAvailableMarkets(products);
  if (markets.length > 0) {
    console.log(`\nMarket pricing detected for: ${markets.join(', ')}`);
  }
  
  // Check for Google Shopping fields
  const googleFields = dataKeys.filter(key => key.startsWith('Google Shopping'));
  if (googleFields.length > 0) {
    console.log(`\nGoogle Shopping fields: ${googleFields.join(', ')}`);
  }
  
  // Check for metafields
  const hasMetafields = Object.keys(firstProduct.metadata).length > 0;
  if (hasMetafields) {
    console.log(`\nMetafields found: ${Object.keys(firstProduct.metadata).join(', ')}`);
  }
}
```

## Best Practices

1. **Always use schema detection options** when you know your CSV might have market pricing or Google Shopping fields
2. **Define custom schemas** for better type safety when working with known custom fields
3. **Use the schema-aware parser** for production code where you control the CSV format
4. **Validate core fields** when working with user-uploaded CSVs
5. **Handle missing fields gracefully** using the `Partial<>` types in flexible schemas
6. **Use market pricing utilities** to analyze and manipulate international pricing data

## Troubleshooting

### Common Issues

**Q: My variants aren't being detected**
A: Make sure you have either Option columns defined OR Variant SKU values in your CSV. The library detects variants by either pattern.

**Q: Market pricing fields aren't recognized**
A: Ensure `detectMarketPricing: true` is set in your parsing options and that your fields follow the `Price / MarketName` pattern.

**Q: Custom fields show up as 'unknown'**
A: Use the `customPatterns` option in schema detection or define a custom schema with `DefineCustomColumns`.

**Q: Type errors with utility functions**
A: Some utility functions expect the enhanced collection returned by the parser. If you're creating products manually, make sure to use the proper types or convert to arrays using `Object.values()`.

For more examples and advanced usage, see the `examples/` directory in the repository.