import {
  parseShopifyCSV,
  writeShopifyCSV,
  addTag,
  removeTag,
  hasTag,
  getTags,
  setTags,
  addTags,
  removeTags,
  hasAllTags,
  hasAnyTag,
  findProductsByTag,
  findProductsByTags,
  getAllTags,
  getTagStats,
  createProduct,
  addProduct,
} from "../src/index";

/**
 * Comprehensive example demonstrating tag management utilities
 * for Shopify CSV products.
 */
async function tagManagementExample() {
  console.log("🏷️  Tag Management Example\n");

  // Create some sample products
  const products = {
    "summer-shirt": createProduct("summer-shirt", {
      Title: "Summer Cotton Shirt",
      Tags: "summer, cotton, shirts, sale",
      Vendor: "Fashion Co",
    }),
    "winter-jacket": createProduct("winter-jacket", {
      Title: "Winter Wool Jacket",
      Tags: "winter, wool, jackets, premium",
      Vendor: "Fashion Co",
    }),
    "spring-dress": createProduct("spring-dress", {
      Title: "Spring Floral Dress",
      Tags: "spring, floral, dresses",
      Vendor: "Fashion Co",
    }),
  };

  console.log("📦 Initial products created:");
  for (const handle in products) {
    const product = products[handle];
    console.log(`  ${product.data.Title}: [${getTags(product).join(", ")}]`);
  }
  console.log();

  // 1. Basic tag operations
  console.log("🔧 Basic Tag Operations:");

  // Add a single tag
  addTag(products["summer-shirt"], "bestseller");
  console.log(
    `  Added 'bestseller' to summer shirt: [${getTags(products["summer-shirt"]).join(", ")}]`,
  );

  // Try to add duplicate (should not duplicate)
  addTag(products["summer-shirt"], "SUMMER"); // Case-insensitive
  console.log(
    `  Tried to add 'SUMMER' (duplicate): [${getTags(products["summer-shirt"]).join(", ")}]`,
  );

  // Add multiple tags at once
  addTags(products["winter-jacket"], ["bestseller", "limited-edition"]);
  console.log(
    `  Added multiple tags to winter jacket: [${getTags(products["winter-jacket"]).join(", ")}]`,
  );

  // Remove a tag
  removeTag(products["spring-dress"], "floral");
  console.log(
    `  Removed 'floral' from spring dress: [${getTags(products["spring-dress"]).join(", ")}]`,
  );

  console.log();

  // 2. Tag checking operations
  console.log("🔍 Tag Checking Operations:");

  console.log(
    `  Summer shirt has 'summer' tag: ${hasTag(products["summer-shirt"], "summer")}`,
  );
  console.log(
    `  Winter jacket has 'summer' tag: ${hasTag(products["winter-jacket"], "summer")}`,
  );

  console.log(
    `  Summer shirt has all ['summer', 'cotton']: ${hasAllTags(products["summer-shirt"], ["summer", "cotton"])}`,
  );
  console.log(
    `  Summer shirt has all ['summer', 'wool']: ${hasAllTags(products["summer-shirt"], ["summer", "wool"])}`,
  );

  console.log(
    `  Spring dress has any ['summer', 'spring']: ${hasAnyTag(products["spring-dress"], ["summer", "spring"])}`,
  );
  console.log(
    `  Spring dress has any ['winter', 'fall']: ${hasAnyTag(products["spring-dress"], ["winter", "fall"])}`,
  );

  console.log();

  // 3. Bulk tag operations
  console.log("📋 Bulk Tag Operations:");

  // Add a common tag to all products
  for (const handle in products) {
    addTag(products[handle], "fashion-co-brand");
  }
  console.log('  Added "fashion-co-brand" to all products');

  // Set seasonal collections based on existing tags
  for (const handle in products) {
    const product = products[handle];
    if (hasAnyTag(product, ["summer", "spring"])) {
      addTag(product, "spring-summer-collection");
    }
    if (hasTag(product, "winter")) {
      addTag(product, "fall-winter-collection");
    }
  }
  console.log("  Added seasonal collection tags based on existing tags");

  console.log();

  // 4. Finding products by tags
  console.log("🔎 Finding Products by Tags:");

  const productsArray = Object.values(products);

  // Find products with 'bestseller' tag
  const bestsellers = findProductsByTag(productsArray, "bestseller");
  console.log(
    `  Products with 'bestseller' tag: ${bestsellers.map((p) => p.data.Title).join(", ")}`,
  );

  // Find products with both 'summer' and 'cotton' tags
  const summerCotton = findProductsByTags(productsArray, ["summer", "cotton"]);
  console.log(
    `  Products with both 'summer' and 'cotton': ${summerCotton.map((p) => p.data.Title).join(", ")}`,
  );

  console.log();

  // 5. Tag analytics
  console.log("📊 Tag Analytics:");

  const allTags = getAllTags(productsArray);
  console.log(`  All unique tags: [${allTags.join(", ")}]`);

  const tagStats = getTagStats(productsArray);
  console.log("  Tag usage statistics:");
  for (const [tag, count] of Object.entries(tagStats)) {
    console.log(`    ${tag}: used by ${count} product(s)`);
  }

  console.log();

  // 6. Advanced tag management scenarios
  console.log("🚀 Advanced Tag Management:");

  // Replace a tag across all products
  for (const handle in products) {
    const product = products[handle];
    if (hasTag(product, "sale")) {
      removeTag(product, "sale");
      addTag(product, "on-sale");
    }
  }
  console.log('  Replaced "sale" with "on-sale" across all products');

  // Clean up tags (remove common brand tag, add specific category tags)
  const categoryMappings = {
    shirts: "apparel-tops",
    jackets: "apparel-outerwear",
    dresses: "apparel-dresses",
  };

  for (const handle in products) {
    const product = products[handle];

    // Remove the generic brand tag
    removeTag(product, "fashion-co-brand");

    // Add specific category tags based on existing tags
    for (const [oldTag, newTag] of Object.entries(categoryMappings)) {
      if (hasTag(product, oldTag)) {
        addTag(product, newTag);
      }
    }
  }
  console.log("  Applied category-specific tagging rules");

  // Final state
  console.log("\n📋 Final Product Tags:");
  for (const handle in products) {
    const product = products[handle];
    console.log(`  ${product.data.Title}: [${getTags(product).join(", ")}]`);
  }

  console.log("\n✅ Tag management example completed!");
}

/**
 * Example of reading from a CSV file, modifying tags, and writing back
 */
async function csvTagWorkflowExample() {
  console.log("\n📁 CSV Tag Workflow Example\n");

  // This would work with an actual CSV file:
  /*
  try {
    // 1. Read and parse the CSV
    const products = await parseShopifyCSV('input-products.csv');

    console.log(`Loaded ${Object.keys(products).length} products from CSV`);

    // 2. Bulk tag operations
    for (const handle in products) {
      const product = products[handle];

      // Add a seasonal tag based on the current month
      const currentMonth = new Date().getMonth();
      if (currentMonth >= 2 && currentMonth <= 4) { // March-May
        addTag(product, 'spring-collection');
      } else if (currentMonth >= 5 && currentMonth <= 7) { // June-August
        addTag(product, 'summer-collection');
      } else if (currentMonth >= 8 && currentMonth <= 10) { // September-November
        addTag(product, 'fall-collection');
      } else { // December-February
        addTag(product, 'winter-collection');
      }

      // Add a tag for products on sale
      if (hasAnyTag(product, ['sale', 'discount', 'clearance'])) {
        addTag(product, 'promotional');
      }

      // Clean up old tags
      removeTags(product, ['old-tag', 'deprecated']);
    }

    // 3. Find and report on specific products
    const promotionalProducts = findProductsByTag(Object.values(products), 'promotional');
    console.log(`Found ${promotionalProducts.length} promotional products`);

    // 4. Write the modified data back to CSV
    await writeShopifyCSV(products, 'output-products.csv');
    console.log('Updated CSV written to output-products.csv');

  } catch (error) {
    console.error('Error processing CSV:', error);
  }
  */

  console.log(
    "💡 This example shows how you would work with actual CSV files.",
  );
  console.log(
    "   Uncomment the code above and provide input CSV files to try it!",
  );
}

// Run the examples
if (require.main === module) {
  tagManagementExample().then(() => {
    return csvTagWorkflowExample();
  });
}

export { tagManagementExample, csvTagWorkflowExample };

// ## 🏷️ Tag Management Utilities

// ### Core Functions:

// 1. **`parseTags(tagsString)`** - Converts comma-separated string to array with deduplication
// 2. **`serializeTags(tags)`** - Converts array back to comma-separated string
// 3. **`getTags(product)`** - Gets all tags for a product as an array
// 4. **`hasTag(product, tag)`** - Checks if product has a specific tag (case-insensitive)

// ### Tag Modification Functions:

// 5. **`addTag(product, tag)`** - Adds a single tag (with deduplication)
// 6. **`removeTag(product, tag)`** - Removes a tag (case-insensitive)
// 7. **`setTags(product, tags)`** - Replaces all tags with new ones
// 8. **`addTags(product, tags)`** - Adds multiple tags at once
// 9. **`removeTags(product, tags)`** - Removes multiple tags at once

// ### Tag Query Functions:

// 10. **`hasAllTags(product, tags)`** - Checks if product has all specified tags
// 11. **`hasAnyTag(product, tags)`** - Checks if product has any of the specified tags
// 12. **`findProductsByTag(products, tag)`** - Finds all products with a specific tag
// 13. **`findProductsByTags(products, tags)`** - Finds products with all specified tags

// ### Analytics Functions:

// 14. **`getAllTags(products)`** - Gets all unique tags across all products
// 15. **`getTagStats(products)`** - Returns tag usage statistics

// ## ✨ Key Features:

// - **Automatic Deduplication**: All functions handle duplicate tags automatically
// - **Case-Insensitive Matching**: Tag searches and comparisons are case-insensitive
// - **Flexible Input**: Functions accept both arrays and comma-separated strings
// - **Chainable**: Modification functions return the product for method chaining
// - **Type Safe**: Full TypeScript support with proper types
// - **Robust**: Handles edge cases like empty strings, invalid inputs, etc.

// ## 📖 Usage Examples:

// ```parse-shopify-csv/examples/tag-management-example.ts#L1-50
// // Basic usage
// const product = createProduct('my-product', {
//   Title: 'My Product',
//   Tags: 'summer, sale'
// });

// // Add single tag
// addTag(product, 'featured');

// // Add multiple tags
// addTags(product, ['bestseller', 'new-arrival']);

// // Check for tags
// if (hasTag(product, 'sale')) {
//   addTag(product, 'promotional');
// }

// // Remove tags
// removeTags(product, ['old-tag', 'deprecated']);

// // Find products
// const saleProducts = findProductsByTag(products, 'sale');
// const summerSaleProducts = findProductsByTags(products, ['summer', 'sale']);
