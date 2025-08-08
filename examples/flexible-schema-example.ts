/**
 * @fileoverview
 * Flexible Schema Example - Demonstrates how to work with various Shopify CSV export formats
 *
 * This example shows how to:
 * 1. Handle different CSV schemas automatically
 * 2. Work with market-specific pricing (US, International, etc.)
 * 3. Create type-safe parsers for custom schemas
 * 4. Detect and validate CSV structures
 * 5. Work with exports that have more or fewer fields
 */

import {
  parseShopifyCSV,
  parseShopifyCSVFromString,
  detectCSVSchema,
  createSchemaAwareParser,
  extractMarketPricing,
  setMarketPricing,
  getAvailableMarkets,
  createMinimalProductRow,
  type SchemaDetectionOptions,
  type ShopifyProductCSVFlexible,
  type MarketPricingFields,
} from "../src/index";
import {
  DefineCustomColumns,
  DefineMetafields,
  CombineColumnsAndMetafields,
} from "../src/utils";

// === EXAMPLE 1: Working with the user's CSV format ===

/**
 * This matches the CSV format provided by the user with international pricing
 */
type UserCSVFormat = ShopifyProductCSVFlexible<{
  "Variant SKU": string;
  "Variant Grams": string;
  "Variant Inventory Tracker": string;
  "Variant Inventory Qty": string;
  "Variant Inventory Policy": string;
  "Variant Fulfillment Service": string;
  "Variant Price": string;
  "Variant Compare At Price": string;
  "Variant Requires Shipping": string;
  "Variant Taxable": string;
  "Variant Barcode": string;
  "Google Shopping / Google Product Category": string;
  "Google Shopping / Gender": string;
  "Google Shopping / Age Group": string;
  "Google Shopping / MPN": string;
  "Google Shopping / Condition": string;
  "Google Shopping / Custom Product": string;
  "Cost per item": string;
  "Included / United States": string;
  "Price / United States": string;
  "Compare At Price / United States": string;
  "Included / International": string;
  "Price / International": string;
  "Compare At Price / International": string;
}>;

async function workWithUserCSVFormat() {
  console.log("=== Working with User's CSV Format ===");

  // Sample CSV data matching the user's format
  const csvData = `Handle,Title,Body (HTML),Vendor,Product Category,Type,Tags,Published,Option1 Name,Option1 Value,Option2 Name,Option2 Value,Option3 Name,Option3 Value,Variant SKU,Variant Grams,Variant Inventory Tracker,Variant Inventory Qty,Variant Inventory Policy,Variant Fulfillment Service,Variant Price,Variant Compare At Price,Variant Requires Shipping,Variant Taxable,Variant Barcode,Image Src,Image Position,Image Alt Text,Gift Card,SEO Title,SEO Description,Google Shopping / Google Product Category,Google Shopping / Gender,Google Shopping / Age Group,Google Shopping / MPN,Google Shopping / Condition,Google Shopping / Custom Product,Variant Image,Variant Weight Unit,Variant Tax Code,Cost per item,Included / United States,Price / United States,Compare At Price / United States,Included / International,Price / International,Compare At Price / International,Status
test-shirt,Test Shirt,<p>A great test shirt</p>,Test Vendor,Apparel & Accessories > Clothing,Shirt,casual,TRUE,Size,Small,Color,Blue,,,TEST-S-BLUE,100,shopify,10,deny,manual,25.00,30.00,TRUE,TRUE,123456789,https://example.com/image.jpg,1,Test shirt image,FALSE,Test Shirt SEO,Best test shirt ever,Apparel & Accessories > Clothing > Shirts,unisex,adult,TEST123,new,FALSE,,lb,,20.00,TRUE,25.00,30.00,TRUE,35.00,40.00,active
test-shirt,,,,,,,,,Size,Medium,Color,Blue,,,TEST-M-BLUE,120,shopify,5,deny,manual,25.00,30.00,TRUE,TRUE,123456790,,,,,,,,,,,,,,,,,20.00,TRUE,25.00,30.00,TRUE,35.00,40.00,active`;

  // Parse with automatic schema detection
  const products = await parseShopifyCSVFromString<UserCSVFormat>(csvData, {
    detectMarketPricing: true,
    detectGoogleShopping: true,
    detectVariantFields: true,
  });

  // Work with the parsed data
  for (const product of products) {
    console.log(`\nProduct: ${product.data.Title}`);
    console.log(`Handle: ${product.data.Handle}`);

    // Extract market pricing information
    const marketPricing = extractMarketPricing(product.data);
    console.log("Market Pricing:", marketPricing);

    // Show variant information
    console.log(`Variants (${product.variants.length}):`);
    for (const variant of product.variants) {
      console.log(`  - SKU: ${variant.data["Variant SKU"]}`);
      console.log(
        `    Options: ${variant.options.map((o) => `${o.name}: ${o.value}`).join(", ")}`,
      );
      console.log(`    Weight: ${variant.data["Variant Grams"]}g`);
    }
  }
}

// === EXAMPLE 2: Schema Detection and Validation ===

async function demonstrateSchemaDetection() {
  console.log("\n=== Schema Detection Example ===");

  // Sample headers from different CSV formats
  const basicHeaders = [
    "Handle",
    "Title",
    "Body (HTML)",
    "Vendor",
    "Type",
    "Tags",
    "Published",
    "Variant Price",
    "Variant SKU",
    "Status",
  ];

  const fullHeaders = [
    "Handle",
    "Title",
    "Body (HTML)",
    "Vendor",
    "Product Category",
    "Type",
    "Tags",
    "Published",
    "Option1 Name",
    "Option1 Value",
    "Option2 Name",
    "Option2 Value",
    "Variant SKU",
    "Variant Price",
    "Variant Compare At Price",
    "Price / United States",
    "Price / International",
    "Compare At Price / United States",
    "Google Shopping / Gender",
    "Google Shopping / Age Group",
    "Metafield: custom.material[string]",
    "Metafield: seo.keywords[list.single_line_text_field]",
    "Custom Field 1",
    "Internal Notes",
  ];

  // Detect schema for basic CSV
  console.log("\nBasic CSV Schema:");
  const basicSchema = detectCSVSchema(basicHeaders);
  console.log({
    totalColumns: basicSchema.allColumns.length,
    coreFields: basicSchema.coreFields,
    marketPricing: basicSchema.marketPricingFields,
    customFields: basicSchema.customFields,
  });

  // Detect schema for full-featured CSV
  console.log("\nFull-featured CSV Schema:");
  const fullSchema = detectCSVSchema(fullHeaders, {
    detectMarketPricing: true,
    detectGoogleShopping: true,
    customPatterns: [/^Internal\s+/, /^Custom\s+Field/],
  });
  console.log({
    totalColumns: fullSchema.allColumns.length,
    coreFields: fullSchema.coreFields.length,
    standardFields: fullSchema.standardFields.length,
    googleShoppingFields: fullSchema.googleShoppingFields,
    marketPricingFields: fullSchema.marketPricingFields,
    metafieldColumns: fullSchema.metafieldColumns,
    customFields: fullSchema.customFields,
  });
}

// === EXAMPLE 3: Type-Safe Schema Definition ===

type MyCustomFields = DefineCustomColumns<{
  "Internal SKU": string;
  "Supplier Code": string;
  "Warehouse Location": string;
  "Last Updated": string;
}>;

type MyMetafields = DefineMetafields<{
  "custom.material": string;
  "custom.care_instructions": string;
  "inventory.reorder_point": string;
  "seo.focus_keyword": string;
}>;

type MyCompleteSchema = CombineColumnsAndMetafields<
  MyCustomFields,
  MyMetafields
> &
  MarketPricingFields;

async function demonstrateTypeSafeSchema() {
  console.log("\n=== Type-Safe Schema Example ===");

  // Create a schema-aware parser
  const parser = createSchemaAwareParser<MyCompleteSchema>(
    {
      "Internal SKU": "",
      "Supplier Code": "",
      "Warehouse Location": "",
      "Last Updated": "",
      "Metafield: custom.material[single_line_text_field]": "",
      "Metafield: custom.care_instructions[single_line_text_field]": "",
      "Metafield: inventory.reorder_point[single_line_text_field]": "",
      "Metafield: seo.focus_keyword[single_line_text_field]": "",
    },
    {
      detectMarketPricing: true,
      detectGoogleShopping: true,
    },
  );

  // Sample CSV with custom fields
  const customCSV = `Handle,Title,Body (HTML),Vendor,Type,Tags,Published,Internal SKU,Supplier Code,Warehouse Location,Price / US,Price / EU,Metafield: custom.material[string],Status
custom-product,Custom Product,<p>Custom description</p>,Custom Vendor,Widget,premium,TRUE,INT-001,SUP-ABC,WH-A1,29.99,25.99,Cotton,active`;

  const products = await parser.parseString(customCSV);

  for (const product of products) {
    console.log(`\nCustom Product: ${product.data.Title}`);
    console.log(`Internal SKU: ${product.data["Internal SKU"]}`);
    console.log(`Supplier: ${product.data["Supplier Code"]}`);
    console.log(`Location: ${product.data["Warehouse Location"]}`);

    // Type-safe access to metafields
    const material = product.metadata["custom.material"];
    if (material) {
      console.log(`Material: ${material.value}`);
    }

    // Market pricing
    const marketPricing = extractMarketPricing(product.data);
    console.log("Market Pricing:", marketPricing);
  }
}

// === EXAMPLE 4: Working with Minimal CSV Exports ===

async function workWithMinimalCSV() {
  console.log("\n=== Minimal CSV Example ===");

  // Sometimes you get very basic exports with just core fields
  const minimalCSV = `Handle,Title,Vendor,Type,Published,Status
simple-product,Simple Product,Simple Vendor,Basic,TRUE,active
another-product,Another Product,Simple Vendor,Basic,FALSE,draft`;

  const products = await parseShopifyCSVFromString(minimalCSV, {
    detectMarketPricing: false,
    detectGoogleShopping: false,
  });

  console.log(
    `Parsed ${Object.keys(products).length} products from minimal CSV`,
  );

  for (const product of products) {
    console.log(`- ${product.data.Title} (${product.data.Handle})`);
    console.log(`  Vendor: ${product.data.Vendor}`);
    console.log(`  Status: ${product.data.Status}`);
  }
}

// === EXAMPLE 5: Market Pricing Utilities ===

function demonstrateMarketPricingUtilities() {
  console.log("\n=== Market Pricing Utilities ===");

  // Create a product row with market pricing
  const productRow = createMinimalProductRow({
    handle: "global-product",
    title: "Global Product",
    vendor: "Global Vendor",
    type: "International",
  }) as any;

  // Add market-specific pricing
  setMarketPricing(productRow, "United States", {
    price: "25.00",
    compareAtPrice: "30.00",
    included: "TRUE",
  });

  setMarketPricing(productRow, "European Union", {
    price: "22.00",
    compareAtPrice: "27.00",
    included: "TRUE",
  });

  setMarketPricing(productRow, "Canada", {
    price: "32.00",
    compareAtPrice: "38.00",
    included: "FALSE",
  });

  console.log("Product with market pricing:");
  console.log(`Title: ${productRow.Title}`);

  const marketPricing = extractMarketPricing(productRow);
  console.log("Market Pricing Data:");
  for (const [market, pricing] of Object.entries(marketPricing)) {
    console.log(`  ${market}:`);
    console.log(`    Price: ${pricing.price}`);
    console.log(`    Compare At: ${pricing.compareAtPrice}`);
    console.log(`    Included: ${pricing.included}`);
  }
}

// === EXAMPLE 6: Real-World Workflow ===

async function realWorldWorkflow() {
  console.log("\n=== Real-World Workflow Example ===");

  // Step 1: Parse a CSV file (simulated with string)
  const csvContent = `Handle,Title,Body (HTML),Vendor,Type,Tags,Published,Variant SKU,Variant Price,Price / US,Price / EU,Price / UK,Google Shopping / Gender,Status
global-tshirt,Global T-Shirt,<p>Comfortable cotton t-shirt</p>,Fashion Co,Apparel,casual worldwide,TRUE,GT-001,0,24.99,22.99,19.99,unisex,active
global-tshirt,,,,,,,GT-002,0,26.99,24.99,21.99,,active`;

  const products = await parseShopifyCSVFromString(csvContent);

  // Step 2: Analyze the data
  console.log("Available markets:", getAvailableMarkets(products));

  // Step 3: Process each product
  for (const product of products) {
    console.log(`\nProcessing: ${product.data.Title}`);

    // Get market pricing
    const markets = extractMarketPricing(product.data);

    // Calculate price differences
    const usPriceStr = markets["US"]?.price;
    const euPriceStr = markets["EU"]?.price;

    if (usPriceStr && euPriceStr) {
      const usPrice = parseFloat(usPriceStr);
      const euPrice = parseFloat(euPriceStr);
      const difference = (((usPrice - euPrice) / euPrice) * 100).toFixed(1);
      console.log(`Price difference (US vs EU): ${difference}%`);
    }

    // Check variant pricing
    for (const variant of product.variants) {
      const sku = variant.data["Variant SKU"];
      const price = variant.data["Variant Price"];
      if (sku && price === "0") {
        console.log(
          `Warning: Variant ${sku} has zero price (using market pricing)`,
        );
      }
    }
  }
}

// === RUN ALL EXAMPLES ===

export async function runFlexibleSchemaExample() {
  console.log("🔄 Running Flexible Schema Examples...\n");

  try {
    await workWithUserCSVFormat();
    await demonstrateSchemaDetection();
    await demonstrateTypeSafeSchema();
    await workWithMinimalCSV();
    demonstrateMarketPricingUtilities();
    await realWorldWorkflow();

    console.log("\n✅ All flexible schema examples completed successfully!");
  } catch (error) {
    console.error("❌ Error running examples:", error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runFlexibleSchemaExample();
}
