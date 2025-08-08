# How parse-shopify-csv Works: Complete Technical Guide

This document provides a comprehensive technical explanation of how the `parse-shopify-csv` library works, including the new flexible schema support, metafield handling, and all the moving parts that make it robust and type-safe.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Core Parsing Process](#core-parsing-process)
- [Schema Detection System](#schema-detection-system)
- [Metafield Handling](#metafield-handling)
- [Type System & Generics](#type-system--generics)
- [Market Pricing Support](#market-pricing-support)
- [CSV Generation & Analysis](#csv-generation--analysis)
- [Memory Management & Performance](#memory-management--performance)
- [Error Handling](#error-handling)
- [Backward Compatibility](#backward-compatibility)

## Architecture Overview

The library follows a multi-layered architecture designed for flexibility, type safety, and performance:

```
┌─────────────────────────────────────────────────────────────┐
│                    Public API Layer                        │
├─────────────────────────────────────────────────────────────┤
│  parseShopifyCSV() │ stringifyShopifyCSV() │ Utilities     │
├─────────────────────────────────────────────────────────────┤
│                  Schema Detection Layer                    │
├─────────────────────────────────────────────────────────────┤
│  detectCSVSchema() │ Market Pricing │ Metafield Detection │
├─────────────────────────────────────────────────────────────┤
│                   Data Processing Layer                    │
├─────────────────────────────────────────────────────────────┤
│  Row Processing │ Hierarchy Building │ Metadata Creation  │
├─────────────────────────────────────────────────────────────┤
│                     Core Data Layer                        │
├─────────────────────────────────────────────────────────────┤
│   CSV Parser (csv-parse) │ Enhanced Collections │ Types   │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Progressive Enhancement**: Works with any CSV format, from minimal to complex
2. **Type Safety**: Comprehensive TypeScript support with generics
3. **Immutable Source Data**: Original CSV structure is preserved
4. **Live Metadata**: Changes to metafields automatically sync to source data
5. **Iterability**: All collections support `for...of` loops and array methods

## Core Parsing Process

### 1. File Reading & Initial Parsing

```typescript
// 1. Read file and parse with csv-parse library
const fileContent = await fs.readFile(path);
const records = await parse(fileContent, { 
  columns: true, 
  skip_empty_lines: true 
});
```

### 2. Schema Detection (Optional)

```typescript
// 2. Detect schema if options provided
if (Object.keys(options).length > 0) {
  const schema = detectCSVSchema(Object.keys(records[0]), options);
  // Log detected schema for debugging
}
```

### 3. Product Hierarchy Building

The core challenge: Shopify CSVs represent a single product across multiple rows.

```
CSV Row Structure:
┌─────────────────────────────────────────────────────────┐
│ Row 1: product-handle, Product Name, ..., variant-data │
│ Row 2: product-handle, ,,,,,,,,,,,...., variant-data   │  
│ Row 3: product-handle, ,,,,,,,,,,,...., variant-data   │
└─────────────────────────────────────────────────────────┘

Parsed Structure:
┌──────────────────────────────────────────┐
│ Product: product-handle                  │
│ ├── data: { all product-level fields }  │
│ ├── variants: [                         │
│ │     { variant1 data },               │
│ │     { variant2 data },               │ 
│ │     { variant3 data }                │
│ │   ]                                  │
│ ├── images: [ image objects ]          │
│ └── metadata: { metafield objects }    │
└──────────────────────────────────────────┘
```

### 4. Row Processing Algorithm

```typescript
for (const row of records) {
  const handleInRow = row.Handle;

  // Start new product when handle changes
  if (handleInRow && handleInRow !== currentHandle) {
    currentHandle = handleInRow;
    products[currentHandle] = _createProductFromRow(row);
  }

  // Skip orphaned rows
  if (!currentHandle || !products[currentHandle]) continue;
  
  const product = products[currentHandle];

  // Aggregate data from this row
  _addImageToProduct(product, row);
  _addVariantToProduct(product, row);
}
```

### 5. Enhanced Collection Creation

```typescript
// Add iterator support and utility methods
return _enhanceWithIterator(products, "ShopifyProductCollection", push);
```

## Schema Detection System

### Column Classification Process

The schema detection system categorizes columns into different types:

```typescript
enum ColumnType {
  CORE,           // Required fields: Handle, Title, etc.
  STANDARD,       // Optional standard fields: Product Category, etc.
  GOOGLE_SHOPPING,// Google Shopping / * fields
  VARIANT,        // Variant * fields  
  MARKET_PRICING, // Price / Market fields
  METAFIELD,      // Metafield columns (both formats)
  CUSTOM          // Everything else
}
```

### Detection Patterns

```typescript
// Core fields (always required)
const CORE_FIELDS = new Set([
  "Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published"
]);

// Pattern matching
const VARIANT_PATTERN = /^Variant\s/;
const GOOGLE_SHOPPING_PATTERN = /^Google Shopping\s*\/\s*/;
const MARKET_PRICING_PATTERN = /^(Price|Compare At Price|Included)\s*\/\s*.+$/;
const OPTION_PATTERN = /^Option[123]\s+(Name|Value|Linked To)$/;

// Metafield patterns (dual format support)
const METAFIELD_REGEX = /^Metafield: (.*?)\.(.*?)\[(.*)\]$/;
const METAFIELD_PARENTHESES_REGEX = /^(.+?)\s*\((?:product\.)?metafields\.([^.]+)\.(.+)\)$/;
```

### Schema Detection Algorithm

```typescript
function detectCSVSchema(headers: string[], options: SchemaDetectionOptions) {
  const categorized = {
    coreFields: [],
    standardFields: [],
    googleShoppingFields: [],
    variantFields: [],
    marketPricingFields: [],
    metafieldColumns: [],
    customFields: []
  };

  for (const header of headers) {
    // Priority-based classification
    if (isMetafield(header)) {
      categorized.metafieldColumns.push(header);
    } else if (isCoreField(header)) {
      categorized.coreFields.push(header);
    } else if (isGoogleShopping(header) && options.detectGoogleShopping) {
      categorized.googleShoppingFields.push(header);
    } else if (isVariantField(header) && options.detectVariantFields) {
      categorized.variantFields.push(header);
    } else if (isMarketPricing(header) && options.detectMarketPricing) {
      categorized.marketPricingFields.push(header);
    } else if (matchesCustomPattern(header, options.customPatterns)) {
      categorized.customFields.push(header);
    } else if (isStandardField(header)) {
      categorized.standardFields.push(header);
    } else {
      categorized.customFields.push(header);
    }
  }

  return {
    ...categorized,
    allColumns: headers,
    totalColumns: headers.length
  };
}
```

## Metafield Handling

The library supports two metafield column formats commonly found in Shopify exports:

### Format 1: Standard Metafield Format
```
Metafield: namespace.key[type]
```
Example: `Metafield: custom.material[string]`

### Format 2: Parentheses Format  
```
Display Name (product.metafields.namespace.key)
```
Example: `Age Group (product.metafields.product.age_group)`

### Metafield Detection

```typescript
function detectMetafield(columnHeader: string) {
  // Try standard format first
  let match = columnHeader.match(METAFIELD_REGEX);
  if (match) {
    const [, namespace, key, type] = match;
    return { namespace, key, type };
  }

  // Try parentheses format
  const altMatch = columnHeader.match(METAFIELD_PARENTHESES_REGEX);
  if (altMatch) {
    const [, displayName, namespace, key] = altMatch;
    return { namespace, key, type: "string" }; // Default type
  }

  return null; // Not a metafield
}
```

### Live Metadata System

The metadata system creates "live" objects where changes automatically sync to the source data:

```typescript
function _createMetadata(dataRow) {
  const metadata = {};

  for (const columnHeader in dataRow) {
    const metafield = detectMetafield(columnHeader);
    if (!metafield) continue;

    const { namespace, key, type } = metafield;
    const metafieldKey = `${namespace}.${key}`;
    const isList = type.startsWith("list.");

    Object.defineProperty(metadata, metafieldKey, {
      enumerable: true,
      configurable: true,
      get: () => ({
        key,
        namespace,
        isList,
        get value() {
          return dataRow[columnHeader] || "";
        },
        get parsedValue() {
          const rawValue = this.value;
          return isList 
            ? rawValue.split(",").map(s => s.trim()).filter(Boolean)
            : rawValue;
        },
        set parsedValue(newValue) {
          dataRow[columnHeader] = Array.isArray(newValue) 
            ? newValue.join(",") 
            : newValue;
        }
      })
    });
  }

  return _enhanceWithIterator(metadata, "ShopifyMetafieldCollection");
}
```

### Metafield Usage

```typescript
// Reading metafields
const material = product.metadata["custom.material"];
console.log(material.value); // "Cotton"
console.log(material.namespace); // "custom"
console.log(material.key); // "material"

// Modifying metafields (automatically syncs to source data)
product.metadata["custom.material"].parsedValue = "Polyester";

// List metafields
const features = product.metadata["custom.features"];
features.parsedValue = ["waterproof", "breathable", "lightweight"];
// Automatically becomes: "waterproof,breathable,lightweight"
```

## Type System & Generics

### Core Type Architecture

```typescript
// Base required fields
type ShopifyProductCSVCore = {
  Handle: string;
  Title: string;
  "Body (HTML)": string;
  Vendor: string;
  Type: string;
  Tags: string;
  Published: PublishedStatus;
};

// Flexible schema that adapts to any export
type ShopifyProductCSVFlexible<T = {}> = 
  ShopifyProductCSVCore &
  Partial<ShopifyProductCSVStandard> &
  Partial<ShopifyGoogleShoppingFields> &
  Partial<ShopifyVariantCSVStandard> &
  Partial<MarketPricingFields> &
  T;
```

### Generic Type Flow

```typescript
// 1. User defines custom schema (optional)
type MyCustomSchema = {
  'Internal SKU': string;
  'Supplier Code': string;
};

// 2. Parser accepts generic type
const products = await parseShopifyCSV<MyCustomSchema>('file.csv');

// 3. Type flows through the system
function _createProductFromRow<T>(row: ShopifyProductCSV<T>): ShopifyProductCSVParsedRow<T> {
  return {
    data: row,
    variants: [],
    images: [],
    metadata: _createMetadata(row)
  };
}

// 4. Full type safety in usage
for (const product of products) {
  // TypeScript knows about custom fields
  console.log(product.data['Internal SKU']); // ✅ Type-safe
  console.log(product.data['Unknown Field']); // ❌ Type error
}
```

### Type Utilities

```typescript
// Helper types for custom schemas
export type DefineCustomColumns<T extends Record<string, any>> = T;
export type DefineMetafields<T extends Record<string, any>> = {
  [K in keyof T as `Metafield: ${string & K}[${string}]`]: string;
};
export type CombineColumnsAndMetafields<C, M> = C & M;

// Usage
type MyColumns = DefineCustomColumns<{
  'Custom Field 1': string;
  'Custom Field 2': string;
}>;

type MyMetafields = DefineMetafields<{
  'custom.material': string;
  'custom.features': string[];
}>;

type CompleteSchema = CombineColumnsAndMetafields<MyColumns, MyMetafields>;
```

## Market Pricing Support

### Market Pricing Pattern Detection

Market-specific pricing follows the pattern `{Field Type} / {Market Name}`:

```typescript
type MarketPricingFields = {
  [K in `${"Price" | "Compare At Price" | "Included"} / ${string}`]?: string;
};

// Examples:
// "Price / United States" -> US pricing
// "Price / International" -> International pricing  
// "Compare At Price / European Union" -> EU compare-at pricing
// "Included / Canada" -> Whether tax is included in Canada
```

### Market Pricing Utilities

```typescript
// Extract all market pricing from a product
function extractMarketPricing(row: ShopifyProductCSV) {
  const markets = {};

  for (const [key, value] of Object.entries(row)) {
    const priceMatch = key.match(/^Price \/ (.+)$/);
    const compareMatch = key.match(/^Compare At Price \/ (.+)$/);
    const includedMatch = key.match(/^Included \/ (.+)$/);

    if (priceMatch) {
      const market = priceMatch[1];
      if (!markets[market]) markets[market] = {};
      markets[market].price = value;
    } 
    // ... similar for compare and included
  }

  return markets;
}

// Set market pricing
function setMarketPricing(row, market, pricing) {
  if (pricing.price !== undefined) {
    row[`Price / ${market}`] = pricing.price;
  }
  // ... similar for other fields
}
```

### Market Analysis Example

```typescript
// Analyze price differences across markets
for (const product of products) {
  const markets = extractMarketPricing(product.data);
  
  const usPrice = parseFloat(markets['United States']?.price || '0');
  const intlPrice = parseFloat(markets['International']?.price || '0');
  
  if (usPrice && intlPrice) {
    const difference = ((intlPrice - usPrice) / usPrice * 100).toFixed(1);
    console.log(`${product.data.Title}: ${difference}% international markup`);
  }
}
```

## CSV Generation & Analysis

### TypeScript Interface Generation

```typescript
function generateTypeScriptInterface(
  headers: string[], 
  interfaceName: string, 
  options: SchemaDetectionOptions
): string {
  const schema = detectCSVSchema(headers, options);
  
  let typescript = `interface ${interfaceName} {\n`;
  
  // Core fields as required
  schema.coreFields.forEach(field => {
    typescript += `  "${field}": string;\n`;
  });
  
  // All other fields as optional
  [...schema.standardFields, ...schema.googleShoppingFields, 
   ...schema.variantFields, ...schema.marketPricingFields,
   ...schema.metafieldColumns, ...schema.customFields].forEach(field => {
    typescript += `  "${field}"?: string;\n`;
  });
  
  typescript += `}`;
  return typescript;
}
```

### Zod Schema Generation

```typescript
function generateZodSchema(
  headers: string[], 
  schemaName: string, 
  options: SchemaDetectionOptions
): string {
  const schema = detectCSVSchema(headers, options);
  
  let zodSchema = `import { z } from 'zod';\n\n`;
  zodSchema += `export const ${schemaName} = z.object({\n`;
  
  // Required fields
  schema.coreFields.forEach(field => {
    zodSchema += `  "${field}": z.string(),\n`;
  });
  
  // Optional fields  
  const optionalFields = [
    ...schema.standardFields, ...schema.googleShoppingFields,
    ...schema.variantFields, ...schema.marketPricingFields,
    ...schema.metafieldColumns, ...schema.customFields
  ];
  
  optionalFields.forEach(field => {
    zodSchema += `  "${field}": z.string().optional(),\n`;
  });
  
  zodSchema += `});\n\n`;
  zodSchema += `export type ${schemaName}Type = z.infer<typeof ${schemaName}>;`;
  
  return zodSchema;
}
```

### CSV Header Extraction

```typescript
function getCSVHeadersFromString(csvString: string): string[] {
  const firstLine = csvString.split('\n')[0];
  
  if (!firstLine || firstLine.trim() === '') {
    return [];
  }
  
  // Handle quoted fields and commas within quotes
  const headers: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < firstLine.length; i++) {
    const char = firstLine[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      headers.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field (handles trailing commas)
  headers.push(current.trim());
  
  return headers;
}
```

## Memory Management & Performance

### Lazy Evaluation

The library uses lazy evaluation for metadata creation:

```typescript
Object.defineProperty(metadata, metafieldKey, {
  get: () => ({
    // Getters/setters are created on-demand
    get value() { return dataRow[columnHeader] || ""; },
    get parsedValue() { /* ... */ },
    set parsedValue(newValue) { /* ... */ }
  })
});
```

### Iterator Enhancement

Collections are enhanced with iterator support without copying data:

```typescript
function _enhanceWithIterator<T>(obj: T, tag: string, push?: Function): T & Iterable<T[keyof T]> {
  Object.defineProperties(obj, {
    [Symbol.iterator]: {
      value: function* () {
        for (const key in this) {
          if (this.hasOwnProperty(key)) {
            yield this[key];
          }
        }
      }
    },
    [Symbol.toStringTag]: {
      value: tag
    },
    push: {
      value: function(item: T[keyof T]) {
        push?.(this, item);
      }
    }
  });
  
  return obj as T & Iterable<T[keyof T]>;
}
```

### Variant Detection Optimization

The variant detection algorithm is optimized for different CSV patterns:

```typescript
function _addVariantToProduct(product, row) {
  const optionNames = OPTION_INDEXES
    .map(i => product.data[`Option${i} Name`])
    .filter(Boolean);
  
  // Multiple detection strategies for maximum compatibility
  const hasOptionValues = optionNames.length > 0 && row["Option1 Value"];
  const hasVariantSKU = row["Variant SKU"] && row["Variant SKU"].trim() !== "";
  const isVariantRow = hasOptionValues || hasVariantSKU;
  
  if (isVariantRow) {
    // Efficiently collect variant-specific columns
    const variantData = Object.entries(row)
      .filter(([key]) => 
        key.startsWith("Variant ") || 
        key === "Cost per item" || 
        key === "Status"
      )
      .reduce((acc, [key, value]) => {
        acc[key] = String(value ?? "");
        return acc;
      }, {} as Record<string, string>);
    
    // Create variant with fallback for missing options
    const options = optionNames.length > 0
      ? optionNames.map((name, i) => ({
          name,
          value: row[`Option${i + 1} Value`] || "",
          linkedTo: row[`Option${i + 1} Linked To`] || undefined
        })).filter(opt => opt.name)
      : [{ name: "Title", value: "Default Title", linkedTo: undefined }];
    
    product.variants.push({
      options,
      data: variantData,
      metadata: _createMetadata(variantData),
      isDefault: options.length === 0 || options.some(o => o.value === "Default Title")
    });
  }
}
```

## Error Handling

### Custom Error Class

```typescript
class CSVProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CSVProcessingError";
  }
}
```

### Error Context

The library provides detailed error context:

```typescript
// File reading errors
try {
  fileContent = await fs.readFile(path);
} catch (error) {
  throw new CSVProcessingError(
    `Failed to read file at ${path}: ${(error as Error).message}`
  );
}

// CSV parsing errors
parse(fileContent, { columns: true }, (err, result) => {
  if (err) {
    return reject(
      new CSVProcessingError(`CSV parsing failed: ${err.message}`)
    );
  }
  resolve(result);
});

// Validation errors
if (!REQUIRED_COLUMNS.every(col => col in records[0])) {
  throw new CSVProcessingError(
    `Invalid CSV format: Missing required columns. Must include: ${REQUIRED_COLUMNS.join(", ")}`
  );
}
```

## Backward Compatibility

### Default Behavior Preservation

```typescript
// v1.x behavior (still works)
const products = await parseShopifyCSV('products.csv');

// v2.x enhanced behavior (opt-in)
const products = await parseShopifyCSV('products.csv', {
  detectMarketPricing: true,
  detectGoogleShopping: true
});
```

### Type Compatibility

```typescript
// Legacy type (still supported)
type LegacyCustom = { 'Custom Field': string };
const products = await parseShopifyCSV<LegacyCustom>('file.csv');

// Enhanced types (recommended)
type EnhancedCustom = DefineCustomColumns<{ 'Custom Field': string }>;
const parser = createSchemaAwareParser<EnhancedCustom>({
  'Custom Field': ''
});
```

### Utility Function Compatibility

The library maintains compatibility with both plain objects and enhanced collections:

```typescript
function findVariantBySKU<T>(products: ProductsCollection<T>, sku: string) {
  // Handle both enhanced collections (iterable) and plain objects
  const productList = Symbol.iterator in products
    ? Array.from(products) as TypedProduct<T>[]
    : Object.values(products) as TypedProduct<T>[];
  
  for (const product of productList) {
    // ... rest of function
  }
}
```

## Performance Considerations

### Streaming for Large Files

For large CSV files, consider streaming:

```typescript
// For very large files, use streaming (future enhancement)
const stream = fs.createReadStream('huge-file.csv');
const parser = parseShopifyCSVStream(stream, options);

for await (const product of parser) {
  // Process one product at a time
  processProduct(product);
}
```

### Memory Usage

- **Metadata objects**: Created lazily, no duplication of data
- **Collections**: Enhanced in-place, no data copying
- **Type information**: Compile-time only, zero runtime overhead

### Optimization Tips

1. **Use schema detection sparingly**: Only enable options you need
2. **Process incrementally**: Use `for...of` loops instead of converting to arrays
3. **Batch operations**: Group related changes before writing back to CSV
4. **Cache expensive operations**: Store results of market pricing analysis

## Conclusion

The `parse-shopify-csv` library achieves its goals through:

1. **Layered Architecture**: Each layer has a specific responsibility
2. **Progressive Enhancement**: Works with any CSV, enhanced with options
3. **Type Safety**: Comprehensive TypeScript support without runtime overhead
4. **Live Data Binding**: Changes to metafields automatically sync
5. **Performance Optimization**: Lazy evaluation and in-place enhancement
6. **Extensibility**: Schema detection and analysis utilities for future needs

This design makes it both beginner-friendly for simple use cases and powerful enough for complex enterprise scenarios, while maintaining excellent performance and type safety throughout.