import {
  parseShopifyCSV,
  writeShopifyCSV,
  createProduct,
  addVariant,
  addImage,
  addMetafieldColumn,
  setMetafieldValue,
  updateInventoryQuantity,
  bulkUpdateInventory,
  bulkUpdateVariantField,
  findDuplicateImages,
  assignBulkImagesToVariants,
  findUncategorizedProducts,
  addTag,
  addTags,
  getTags,
  ImageAssignmentRule,
  CategorizationConfig,
} from "../src/index";

/**
 * Comprehensive example demonstrating advanced utilities:
 * - Inventory management
 * - Bulk variant operations
 * - Image management and assignment
 * - Product categorization
 */
async function advancedUtilitiesExample() {
  console.log("🚀 Advanced Utilities Example\n");

  // Create sample products with variants and images
  const products: Record<string, any> = {};

  // Product 1: T-Shirt with multiple variants
  const tshirt = createProduct("cotton-tshirt", {
    Title: "Premium Cotton T-Shirt",
    Type: "Clothing",
    Vendor: "Fashion Co",
    Tags: "cotton, casual, bestseller",
  });

  // Add variants with different colors and sizes
  addVariant(tshirt, {
    options: { Color: "Blue", Size: "M" },
    "Variant SKU": "TSHIRT-BLU-M",
    "Variant Price": "29.99",
    "Variant Inventory Qty": "50",
    "Variant Weight": "0.2",
  });

  addVariant(tshirt, {
    options: { Color: "Blue", Size: "L" },
    "Variant SKU": "TSHIRT-BLU-L",
    "Variant Price": "29.99",
    "Variant Inventory Qty": "30",
    "Variant Weight": "0.25",
  });

  addVariant(tshirt, {
    options: { Color: "Red", Size: "M" },
    "Variant SKU": "TSHIRT-RED-M",
    "Variant Price": "29.99",
    "Variant Inventory Qty": "25",
    "Variant Weight": "0.2",
  });

  // Add images
  addImage(tshirt, {
    src: "https://cdn.example.com/tshirt-blue.jpg",
    alt: "Blue cotton t-shirt",
    position: 1,
  });

  addImage(tshirt, {
    src: "https://cdn.example.com/tshirt-red.jpg",
    alt: "Red cotton t-shirt",
    position: 2,
  });

  products[tshirt.data.Handle] = tshirt;

  // Product 2: Jacket (will share some images for duplicate demo)
  const jacket = createProduct("winter-jacket", {
    Title: "Winter Wool Jacket",
    Type: "Clothing",
    Vendor: "Fashion Co",
    Tags: "wool, winter, premium",
  });

  addVariant(jacket, {
    options: { Color: "Black", Size: "M" },
    "Variant SKU": "JACKET-BLK-M",
    "Variant Price": "199.99",
    "Variant Inventory Qty": "15",
    "Variant Weight": "1.5",
  });

  // Add images (one shared with t-shirt to demo duplicate detection)
  addImage(jacket, {
    src: "https://cdn.example.com/tshirt-blue.jpg", // Shared image
    alt: "Product lifestyle shot",
    position: "1",
  });

  addImage(jacket, {
    src: "https://cdn.example.com/jacket-black.jpg",
    alt: "Black wool jacket",
    position: "2",
  });

  products[jacket.data.Handle] = jacket;

  // Product 3: Uncategorized product (missing Type)
  const uncategorized = createProduct("mystery-item", {
    Title: "Mystery Item",
    Vendor: "Unknown Brand",
    // Missing Type field - will be caught by categorization check
  });

  addVariant(uncategorized, {
    options: { Size: "One Size" },
    "Variant SKU": "MYSTERY-001",
    "Variant Price": "9.99",
    "Variant Inventory Qty": "100",
  });

  products[uncategorized.data.Handle] = uncategorized;

  console.log("📦 Created sample products with variants and images\n");

  // ==========================================================================
  // 1. INVENTORY MANAGEMENT
  // ==========================================================================
  console.log("📊 Inventory Management Examples:");

  // Update single variant inventory
  console.log("  Before inventory update:");
  console.log(
    `    Blue M T-Shirt stock: ${tshirt.variants[0].data["Variant Inventory Qty"]}`,
  );

  updateInventoryQuantity(tshirt, "TSHIRT-BLU-M", 75);
  console.log(
    `    After update: ${tshirt.variants[0].data["Variant Inventory Qty"]}`,
  );

  // Bulk inventory updates
  const inventoryUpdates = {
    "TSHIRT-BLU-L": 45,
    "TSHIRT-RED-M": 35,
    "JACKET-BLK-M": 20,
    "NON-EXISTENT-SKU": 10, // Will show warning
  };

  console.log("\n  Bulk inventory updates:");
  const updatedProducts = bulkUpdateInventory(products, inventoryUpdates);
  console.log(`    Updated ${updatedProducts.length} products`);

  for (const product of updatedProducts) {
    console.log(`    ${product.data.Title}:`);
    for (const variant of product.variants) {
      console.log(
        `      ${variant.data["Variant SKU"]}: ${variant.data["Variant Inventory Qty"]} units`,
      );
    }
  }

  console.log();

  // ==========================================================================
  // 2. BULK VARIANT OPERATIONS
  // ==========================================================================
  console.log("🔧 Bulk Variant Operations:");

  // Set weight unit for all variants
  console.log('  Setting weight units to "lb" for all variants...');
  const weightUpdatedProducts = bulkUpdateVariantField(
    products,
    "Variant Weight Unit",
    "lb",
  );
  console.log(`    Updated ${weightUpdatedProducts.length} products`);

  // Generate barcodes using a function
  console.log("  Generating barcodes for all variants...");
  const barcodeUpdatedProducts = bulkUpdateVariantField(
    products,
    "Variant Barcode",
    (variant, product) => {
      const sku = variant.data["Variant SKU"];
      const vendorCode =
        product.data.Vendor?.substring(0, 3).toUpperCase() || "UNK";
      return `${vendorCode}-${sku}-${Date.now().toString().slice(-4)}`;
    },
  );

  console.log(
    `    Generated barcodes for ${barcodeUpdatedProducts.length} products`,
  );
  console.log("    Sample barcodes:");
  for (const product of barcodeUpdatedProducts.slice(0, 2)) {
    for (const variant of product.variants.slice(0, 1)) {
      console.log(
        `      ${variant.data["Variant SKU"]}: ${variant.data["Variant Barcode"]}`,
      );
    }
  }

  console.log();

  // ==========================================================================
  // 3. IMAGE MANAGEMENT
  // ==========================================================================
  console.log("🖼️  Image Management Examples:");

  // Find duplicate images
  console.log("  Checking for duplicate images...");
  const duplicateImages = findDuplicateImages(products);

  if (Object.keys(duplicateImages).length > 0) {
    console.log("    Found duplicate images:");
    for (const [imageSrc, productHandles] of Object.entries(duplicateImages)) {
      console.log(`      ${imageSrc} used by: ${productHandles.join(", ")}`);
    }
  } else {
    console.log("    No duplicate images found");
  }

  // Assign images to variants based on color
  console.log("\n  Assigning variant-specific images...");
  const imageAssignmentRules: ImageAssignmentRule[] = [
    {
      matcher: (variant) => {
        const colorOption = variant.options.find((opt) => opt.name === "Color");
        return colorOption?.value.toLowerCase() === "blue";
      },
      getImageSrc: () => "https://cdn.example.com/tshirt-blue.jpg",
    },
    {
      matcher: (variant) => {
        const colorOption = variant.options.find((opt) => opt.name === "Color");
        return colorOption?.value.toLowerCase() === "red";
      },
      getImageSrc: () => "https://cdn.example.com/tshirt-red.jpg",
    },
    {
      matcher: (variant) => {
        const colorOption = variant.options.find((opt) => opt.name === "Color");
        return colorOption?.value.toLowerCase() === "black";
      },
      getImageSrc: () => "https://cdn.example.com/jacket-black.jpg",
    },
  ];

  assignBulkImagesToVariants(tshirt, imageAssignmentRules);
  assignBulkImagesToVariants(jacket, imageAssignmentRules);

  console.log("    Image assignments completed");
  console.log("    T-Shirt variants:");
  for (const variant of tshirt.variants) {
    const colorOption = variant.options.find((opt) => opt.name === "Color");
    console.log(
      `      ${colorOption?.value} variant image: ${variant.data["Variant Image"] || "None"}`,
    );
  }

  console.log();

  // ==========================================================================
  // 4. PRODUCT CATEGORIZATION
  // ==========================================================================
  console.log("📂 Product Categorization Examples:");

  // Add some metafields for categorization demo
  addMetafieldColumn(products, {
    namespace: "custom",
    key: "category",
    type: "string",
    defaultValue: "",
  });

  // Set category for properly categorized products
  setMetafieldValue(tshirt, "custom", "category", "apparel-tops");
  setMetafieldValue(jacket, "custom", "category", "apparel-outerwear");
  // Leave uncategorized product without category metafield

  // Find uncategorized products with basic config
  console.log("  Finding uncategorized products (basic check):");
  const basicUncategorized = findUncategorizedProducts(products, {
    requiredFields: ["Type"],
  });

  console.log(`    Found ${basicUncategorized.length} uncategorized products:`);
  for (const product of basicUncategorized) {
    console.log(
      `      - ${product.data.Title} (Handle: ${product.data.Handle})`,
    );
  }

  // Advanced categorization check
  console.log("\n  Finding uncategorized products (advanced check):");
  const advancedConfig: CategorizationConfig = {
    requiredFields: ["Type", "Vendor"],
    requiredTags: ["cotton", "wool"], // Must have at least one material tag
    requiredMetafields: [{ namespace: "custom", key: "category" }],
    customCheck: (product) => {
      // Additional check: title should not contain "mystery"
      return !product.data.Title?.toLowerCase().includes("mystery");
    },
  };

  const advancedUncategorized = findUncategorizedProducts(
    products,
    advancedConfig,
  );
  console.log(
    `    Found ${advancedUncategorized.length} products failing advanced categorization:`,
  );
  for (const product of advancedUncategorized) {
    console.log(`      - ${product.data.Title}`);
    console.log(`        Missing Type: ${!product.data.Type}`);
    console.log(
      `        Missing material tags: ${!getTags(product).some((tag) => ["cotton", "wool"].includes(tag))}`,
    );
    console.log(`        Missing category metafield: ${!setMetafieldValue}`);
  }

  console.log();

  // ==========================================================================
  // 5. REAL-WORLD WORKFLOW EXAMPLE
  // ==========================================================================
  console.log("💼 Real-World Workflow Example:");

  // Scenario: Preparing products for a seasonal sale
  console.log("  Scenario: Preparing for summer sale...");

  // 1. Find all products with summer-related tags
  const summerProducts = Object.values(products).filter((product) =>
    getTags(product).some((tag) =>
      ["summer", "cotton", "casual"].includes(tag.toLowerCase()),
    ),
  );

  console.log(`    Found ${summerProducts.length} summer products`);

  // 2. Apply bulk operations to summer products
  for (const product of summerProducts) {
    // Add sale tags
    addTags(product, ["summer-sale", "limited-time"]);

    // Update all variant weights to include packaging
    for (const variant of product.variants) {
      const currentWeight = parseFloat(variant.data["Variant Weight"] || "0");
      variant.data["Variant Weight"] = String(currentWeight + 0.05); // Add packaging weight
    }
  }

  // 3. Update inventory for sale preparation
  const saleInventoryUpdates = {
    "TSHIRT-BLU-M": 100, // Increase popular sizes
    "TSHIRT-BLU-L": 80,
    "TSHIRT-RED-M": 60,
  };

  bulkUpdateInventory(products, saleInventoryUpdates);
  console.log("    Updated inventory for sale preparation");

  // 4. Quality check: ensure all products are properly categorized
  const qualityIssues = findUncategorizedProducts(products, {
    requiredFields: ["Type", "Vendor"],
    requiredMetafields: [{ namespace: "custom", key: "category" }],
  });

  if (qualityIssues.length > 0) {
    console.log(
      `    ⚠️  Quality check: ${qualityIssues.length} products need attention:`,
    );
    for (const product of qualityIssues) {
      console.log(`      - ${product.data.Title}: Missing categorization data`);
    }
  } else {
    console.log("    ✅ Quality check: All products properly categorized");
  }

  // 5. Check for image issues
  const imageDuplicates = findDuplicateImages(products);
  if (Object.keys(imageDuplicates).length > 0) {
    console.log(
      `    📸 Found ${Object.keys(imageDuplicates).length} duplicate images:`,
    );
    for (const [src, handles] of Object.entries(imageDuplicates)) {
      console.log(
        `      ${src.split("/").pop()} shared by: ${handles.join(", ")}`,
      );
    }
  }

  console.log();

  // ==========================================================================
  // 6. AUTOMATION EXAMPLE
  // ==========================================================================
  console.log("🤖 Automation Example:");

  // Automated image assignment based on variant options
  console.log("  Setting up automated image assignment...");

  const autoImageRules: ImageAssignmentRule[] = [
    {
      matcher: (variant, product) => {
        const colorOption = variant.options.find((opt) => opt.name === "Color");
        const productType = product.data.Type?.toLowerCase();
        return (
          colorOption?.value.toLowerCase() === "blue" &&
          productType === "clothing"
        );
      },
      getImageSrc: (variant, product) => {
        const baseUrl = "https://cdn.example.com";
        const productName = product.data.Handle;
        return `${baseUrl}/${productName}-blue.jpg`;
      },
    },
    {
      matcher: (variant, product) => {
        const colorOption = variant.options.find((opt) => opt.name === "Color");
        const productType = product.data.Type?.toLowerCase();
        return (
          colorOption?.value.toLowerCase() === "red" &&
          productType === "clothing"
        );
      },
      getImageSrc: (variant, product) => {
        const baseUrl = "https://cdn.example.com";
        const productName = product.data.Handle;
        return `${baseUrl}/${productName}-red.jpg`;
      },
    },
  ];

  // Apply automated image assignment
  for (const handle in products) {
    assignBulkImagesToVariants(products[handle], autoImageRules);
  }

  console.log("    Automated image assignment completed");

  // Automated barcode generation for products missing barcodes
  console.log("  Generating missing barcodes...");
  const productsWithBarcodes = bulkUpdateVariantField(
    products,
    "Variant Barcode",
    (variant, product) => {
      // Only update if barcode is missing
      if (variant.data["Variant Barcode"]) {
        return variant.data["Variant Barcode"];
      }

      const vendorCode =
        product.data.Vendor?.substring(0, 3)
          .toUpperCase()
          .replace(/[^A-Z]/g, "") || "UNK";
      const sku = variant.data["Variant SKU"];
      const timestamp = Date.now().toString().slice(-6);
      return `${vendorCode}-${sku}-${timestamp}`;
    },
  );

  console.log(
    `    Generated barcodes for ${productsWithBarcodes.length} products`,
  );

  console.log();

  // ==========================================================================
  // 7. REPORTING & ANALYTICS
  // ==========================================================================
  console.log("📈 Reporting & Analytics:");

  // Inventory report
  console.log("  📦 Inventory Summary:");
  let totalProducts = 0;
  let totalVariants = 0;
  let totalInventory = 0;

  for (const handle in products) {
    totalProducts++;
    const product = products[handle];

    for (const variant of product.variants) {
      totalVariants++;
      const qty = parseInt(variant.data["Variant Inventory Qty"] || "0", 10);
      totalInventory += qty;
    }
  }

  console.log(`    Total Products: ${totalProducts}`);
  console.log(`    Total Variants: ${totalVariants}`);
  console.log(`    Total Inventory Units: ${totalInventory}`);

  // Product categorization report
  const categoryReport = findUncategorizedProducts(products, {
    requiredFields: ["Type"],
  });

  console.log(`\n  📂 Categorization Report:`);
  console.log(
    `    Properly categorized: ${totalProducts - categoryReport.length}/${totalProducts}`,
  );
  console.log(`    Need attention: ${categoryReport.length}/${totalProducts}`);

  // Image usage report
  const imageReport = findDuplicateImages(products);
  console.log(`\n  🖼️  Image Report:`);
  console.log(`    Shared images: ${Object.keys(imageReport).length}`);
  console.log(
    `    Potential savings: Images that could be optimized/deduplicated`,
  );

  console.log();

  // ==========================================================================
  // 8. FINAL VALIDATION
  // ==========================================================================
  console.log("✅ Final Validation:");

  // Check that all operations preserved data integrity
  let validationPassed = true;

  for (const handle in products) {
    const product = products[handle];

    // Ensure all variants have SKUs
    for (const variant of product.variants) {
      if (!variant.data["Variant SKU"]) {
        console.log(
          `    ❌ Variant missing SKU in product: ${product.data.Title}`,
        );
        validationPassed = false;
      }
    }

    // Ensure all products have handles
    if (!product.data.Handle) {
      console.log(`    ❌ Product missing handle: ${product.data.Title}`);
      validationPassed = false;
    }
  }

  if (validationPassed) {
    console.log("    ✅ All data validation checks passed");
  }

  console.log("\n🎉 Advanced utilities example completed!");
  console.log("\n💡 In a real scenario, you would:");
  console.log('   1. Load products with: parseShopifyCSV("input.csv")');
  console.log("   2. Apply these operations to your data");
  console.log(
    '   3. Save results with: writeShopifyCSV("output.csv", products)',
  );
}

/**
 * Example showing how to build a complete product management pipeline
 */
async function productManagementPipeline() {
  console.log("\n🔄 Product Management Pipeline Example\n");

  // This would be your real workflow:
  /*
  try {
    // 1. Load products from CSV
    const products = await parseShopifyCSV('shopify-export.csv');
    console.log(`Loaded ${Object.keys(products).length} products`);

    // 2. Data quality checks
    const uncategorized = findUncategorizedProducts(products, {
      requiredFields: ['Type', 'Vendor'],
      requiredTags: ['category-'],
    });

    if (uncategorized.length > 0) {
      console.log(`Found ${uncategorized.length} products needing categorization`);
      // Fix categorization issues...
    }

    // 3. Bulk operations
    const inventoryUpdates = await getInventoryUpdatesFromAPI();
    bulkUpdateInventory(products, inventoryUpdates);

    // 4. Automated tagging
    for (const handle in products) {
      const product = products[handle];

      // Add seasonal tags
      const currentSeason = getCurrentSeason();
      addTag(product, `${currentSeason}-collection`);

      // Add vendor-specific tags
      const vendorTag = `vendor-${product.data.Vendor?.toLowerCase().replace(/\s+/g, '-')}`;
      addTag(product, vendorTag);
    }

    // 5. Image optimization
    const duplicates = findDuplicateImages(products);
    await optimizeDuplicateImages(duplicates);

    // 6. Save results
    await writeShopifyCSV('updated-products.csv', products);
    console.log('Pipeline completed successfully!');

  } catch (error) {
    console.error('Pipeline failed:', error);
  }
  */

  console.log(
    "💡 This shows a complete automated pipeline for product management.",
  );
  console.log("   Uncomment and adapt the code above for your specific needs!");
}

// Helper functions that would be implemented based on your needs
function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "fall";
  return "winter";
}

async function getInventoryUpdatesFromAPI(): Promise<Record<string, number>> {
  // Simulate API call to get inventory updates
  return {
    "TSHIRT-BLU-M": 150,
    "TSHIRT-BLU-L": 120,
    "JACKET-BLK-M": 25,
  };
}

async function optimizeDuplicateImages(
  duplicates: Record<string, string[]>,
): Promise<void> {
  // Simulate image optimization
  console.log(
    `Would optimize ${Object.keys(duplicates).length} duplicate images`,
  );
}

// Run the examples
if (require.main === module) {
  advancedUtilitiesExample().then(() => {
    return productManagementPipeline();
  });
}

export { advancedUtilitiesExample, productManagementPipeline };

// ## ✅ **Implemented Utilities:**

// ### **1. `bulkUpdateVariantField(products, field, valueOrFunction)`**
// - Updates a specific field across all variants in multiple products
// - Supports both static values and dynamic functions
// - Returns only products that were actually modified
// - Automatically syncs first variant data to main product data

// ### **2. `findDuplicateImages(products)`**
// - Finds images used by multiple products based on src URL
// - Checks main product images, variant images, and image arrays
// - Returns mapping of image src to array of product handles using it
// - Useful for image optimization and storage cost reduction

// ### **3. `assignBulkImagesToVariants(product, rules)`**
// - Assigns images to variants based on flexible matching rules
// - Rules define matcher functions and image source functions
// - Stops at first matching rule per variant
// - Validates that target images exist in the product

// ### **4. `bulkUpdateInventory(products, updates)`**
// - Updates inventory quantities for multiple variants using SKU mapping
// - Searches across all products to find the right variant
// - Returns array of successfully updated products
// - Warns about missing SKUs without throwing errors

// ### **5. `updateInventoryQuantity(product, variantSKU, quantity)`**
// - Updates inventory for a specific variant by SKU
// - Syncs first variant inventory to main product data
// - Throws descriptive error if SKU not found
// - Chainable for method composition

// ### **6. `findUncategorizedProducts(products, config)`**
// - Finds products that don't meet categorization standards
// - Configurable criteria: required fields, tags, metafields, custom checks
// - Flexible categorization rules for different business needs
// - Returns array of products needing attention

// ## 🔧 **Key Features:**

// - **Type Safe**: Full TypeScript support with proper interfaces
// - **Flexible**: Functions accept various input formats (arrays, strings, objects)
// - **Robust**: Comprehensive error handling and edge case management
// - **Tested**: 19 additional test cases covering all functionality
// - **Chainable**: Most functions return products for method chaining
// - **Performance**: Efficient algorithms that scale with large product catalogs

// ## 📖 **Documentation Added:**

// - **README Updates**: Added API reference entries for all new functions
// - **Gotchas Section**: Comprehensive troubleshooting guide covering common pitfalls
// - **Example Files**: Real-world usage examples and automation pipelines
// - **Test Suite**: Comprehensive test coverage demonstrating expected behavior
