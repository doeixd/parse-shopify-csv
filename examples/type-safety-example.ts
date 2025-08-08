/**
 * Comprehensive example demonstrating enhanced type safety with generics
 * in the parse-shopify-csv library.
 */

import {
  parseShopifyCSV,
  writeShopifyCSV,
  createProduct,
  addVariant,
  addMetafieldColumn,
  setMetafieldValue,
  findProducts,
  findProductsByMetafield,
  addTag,
  getTags,
  map,
  filter,
  DefineCustomColumns,
  DefineMetafields,
  CombineColumnsAndMetafields,
  TypedProduct,
  ProductsCollection,
  TypedProductPredicate,
} from '../src/index';

// =============================================================================
// TYPE DEFINITIONS - Define your custom structure
// =============================================================================

/**
 * Step 1: Define your custom CSV columns
 * These are columns you've added beyond Shopify's standard fields
 */
type MyCustomColumns = DefineCustomColumns<{
  'Internal Notes': string;
  'Supplier Code': string;
  'Custom Price Tier': string;
  'Marketing Category': string;
  'Seasonal Flag': string;
}>;

/**
 * Step 2: Define your metafields with their types
 * This gives you full type safety for metafield operations
 */
type MyMetafieldsDefinition = {
  'custom.material': string;
  'custom.features': string[];
  'inventory.supplier': string;
  'seo.focus_keyword': string;
  'pricing.cost_basis': string;
};

/**
 * Step 3: Convert metafields to column format
 */
type MyMetafieldColumns = DefineMetafields<MyMetafieldsDefinition>;

/**
 * Step 4: Combine everything for the complete type
 */
type MyCompleteColumns = CombineColumnsAndMetafields<MyCustomColumns, MyMetafieldColumns>;

/**
 * Step 5: Create type aliases for convenience
 */
type MyProduct = TypedProduct<MyCompleteColumns>;
type MyProductsCollection = ProductsCollection<MyCompleteColumns>;

// =============================================================================
// TYPED PARSING AND CREATION
// =============================================================================

async function typedParsingExample() {
  console.log('🎯 Type-Safe Parsing Example\n');

  // Parse with full type information
  const products: MyProductsCollection = await parseShopifyCSV<MyCompleteColumns>('products.csv');

  // Now you get full autocomplete and type checking!
  for (const product of products) {
    // ✅ Full autocomplete for standard fields
    console.log(`Product: ${product.data.Title}`);
    console.log(`Vendor: ${product.data.Vendor}`);

    // ✅ Full autocomplete for YOUR custom columns
    console.log(`Internal Notes: ${product.data['Internal Notes']}`);
    console.log(`Supplier Code: ${product.data['Supplier Code']}`);
    console.log(`Price Tier: ${product.data['Custom Price Tier']}`);

    // ✅ Full type safety for metafields (after they're added)
    // product.data['Metafield: custom.material[single_line_text_field]']
  }

  console.log('✅ Parsed with full type safety\n');
}

// =============================================================================
// TYPED PRODUCT CREATION
// =============================================================================

function typedProductCreation() {
  console.log('🏗️  Type-Safe Product Creation\n');

  // Create product with type safety
  const newProduct: MyProduct = createProduct<MyCompleteColumns>('premium-jacket', {
    Title: 'Premium Winter Jacket',
    Type: 'Outerwear',
    Vendor: 'Premium Brands',
    Tags: 'winter, premium, jackets',
    // Custom columns with full autocomplete
    'Internal Notes': 'High-margin product, promote heavily',
    'Supplier Code': 'SUP-001-JACKET',
    'Custom Price Tier': 'Premium',
    'Marketing Category': 'Winter Essentials',
    'Seasonal Flag': 'Winter',
  });

  console.log(`Created: ${newProduct.data.Title}`);
  console.log(`Supplier: ${newProduct.data['Supplier Code']}`); // Full type safety!
  console.log(`Price Tier: ${newProduct.data['Custom Price Tier']}`); // Autocomplete works!

  console.log('✅ Product created with full type safety\n');
}

// =============================================================================
// TYPED METAFIELD MANAGEMENT
// =============================================================================

async function typedMetafieldManagement(products: MyProductsCollection) {
  console.log('🏷️  Type-Safe Metafield Management\n');

  // Add metafield columns with known types
  addMetafieldColumn(products, {
    namespace: 'custom',
    key: 'material',
    type: 'single_line_text_field',
    defaultValue: '',
  });

  addMetafieldColumn(products, {
    namespace: 'custom',
    key: 'features',
    type: 'list.single_line_text_field',
    defaultValue: [],
  });

  addMetafieldColumn(products, {
    namespace: 'inventory',
    key: 'supplier',
    type: 'single_line_text_field',
    defaultValue: '',
  });

  // Now work with metafields in a type-safe way
  for (const product of products) {
    // Set metafield values
    setMetafieldValue(product, 'custom', 'material', 'Cotton Blend');
    setMetafieldValue(product, 'custom', 'features', ['Waterproof', 'Breathable', 'Durable']);
    setMetafieldValue(product, 'inventory', 'supplier', product.data['Supplier Code'] || 'Unknown');

    // Access with type safety
    const materialField = product.metadata['Metafield: custom.material[single_line_text_field]'];
    const featuresField = product.metadata['Metafield: custom.features[list.single_line_text_field]'];

    console.log(`${product.data.Title}:`);
    console.log(`  Material: ${materialField?.value}`);
    console.log(`  Features: ${Array.isArray(featuresField?.parsedValue) ? featuresField.parsedValue.join(', ') : featuresField?.parsedValue}`);
  }

  console.log('✅ Metafields managed with type safety\n');
}

// =============================================================================
// TYPED QUERYING AND FILTERING
// =============================================================================

function typedQueryingExample(products: MyProductsCollection) {
  console.log('🔍 Type-Safe Querying Example\n');

  // Create type-safe predicates
  const premiumProductPredicate: TypedProductPredicate<MyCompleteColumns> = (product) => {
    return product.data['Custom Price Tier'] === 'Premium' &&
           product.data.Vendor === 'Premium Brands';
  };

  const winterProductPredicate: TypedProductPredicate<MyCompleteColumns> = (product) => {
    return product.data['Seasonal Flag'] === 'Winter' ||
           getTags(product).some(tag => tag.toLowerCase().includes('winter'));
  };

  // Use predicates with full type safety
  const premiumProducts = findProducts(products, premiumProductPredicate);
  const winterProducts = findProducts(products, winterProductPredicate);

  console.log(`Found ${premiumProducts.length} premium products`);
  console.log(`Found ${winterProducts.length} winter products`);

  // Find products by custom metafields
  const cottonProducts = findProductsByMetafield(
    products,
    'custom',
    'material',
    (value) => String(value).toLowerCase().includes('cotton')
  );

  console.log(`Found ${cottonProducts.length} cotton products`);

  // Advanced filtering with custom columns
  const highValueProducts = filter(products, (product) => {
    const tier = product.data['Custom Price Tier'];
    const hasSupplier = product.data['Supplier Code'] !== '';
    return tier === 'Premium' && hasSupplier;
  });

  console.log(`Found ${Object.keys(highValueProducts).length} high-value products with suppliers`);
  console.log('✅ Querying completed with full type safety\n');
}

// =============================================================================
// TYPED TRANSFORMATIONS
// =============================================================================

function typedTransformationsExample(products: MyProductsCollection) {
  console.log('🔄 Type-Safe Transformations Example\n');

  // Transform products while maintaining type information
  const enrichedProducts = map(products, (product: MyProduct): MyProduct => {
    // Add marketing tags based on custom fields
    const tier = product.data['Custom Price Tier'];
    const category = product.data['Marketing Category'];

    if (tier === 'Premium') {
      addTag(product, 'premium-tier');
    }

    if (category) {
      addTag(product, `category-${category.toLowerCase().replace(/\s+/g, '-')}`);
    }

    // Update internal notes with computed information
    const variantCount = product.variants.length;
    const currentNotes = product.data['Internal Notes'] || '';
    product.data['Internal Notes'] = `${currentNotes} | Variants: ${variantCount}`;

    return product; // Type is preserved!
  });

  // The result maintains full type information
  console.log('Enriched products maintain type safety:');
  for (const product of Object.values(enrichedProducts).slice(0, 2)) {
    console.log(`  ${product.data.Title}: Tier ${product.data['Custom Price Tier']}`);
    console.log(`    Notes: ${product.data['Internal Notes']}`);
  }

  console.log('✅ Transformations completed with type preservation\n');
}

// =============================================================================
// FLEXIBLE TYPING PATTERNS
// =============================================================================

/**
 * Example showing how to work with partial type information
 * when you only know some of your custom fields
 */
function flexibleTypingExample() {
  console.log('🔧 Flexible Typing Patterns\n');

  // Pattern 1: Minimal typing - just the fields you care about
  type MinimalCustom = DefineCustomColumns<{
    'Internal Notes': string;
  }>;

  const minimalProduct: TypedProduct<MinimalCustom> = createProduct<MinimalCustom>('test-1', {
    Title: 'Test Product',
    'Internal Notes': 'This has type safety for the field I care about',
    // Other custom fields can still be added but won't have specific typing
  });

  // Pattern 2: Gradual typing - start loose, add types as needed
  const looseProduct = createProduct('test-2', {
    Title: 'Loose Product',
    'Some Custom Field': 'This works without predefined types',
  });

  // Pattern 3: Mixed approach - typed for critical fields, flexible for others
  type CriticalFields = DefineCustomColumns<{
    'Price Override': string;
    'Inventory Alert Level': string;
  }>;

  function processCriticalData(product: TypedProduct<CriticalFields>) {
    // Get type safety for the fields that matter most
    const priceOverride = product.data['Price Override'];
    const alertLevel = product.data['Inventory Alert Level'];

    console.log(`  Processing ${product.data.Title}:`);
    console.log(`    Price Override: ${priceOverride || 'None'}`);
    console.log(`    Alert Level: ${alertLevel || 'Default'}`);
  }

  console.log('✅ Flexible typing patterns demonstrated\n');
}

// =============================================================================
// REAL-WORLD TYPED WORKFLOW
// =============================================================================

async function realWorldTypedWorkflow() {
  console.log('💼 Real-World Typed Workflow Example\n');

  // This shows how you'd structure a real project with strong typing

  /*
  // 1. Define your business-specific types
  type MyStoreColumns = DefineCustomColumns<{
    'Supplier SKU': string;
    'Cost Basis': string;
    'Margin Target': string;
    'Reorder Point': string;
    'Category Path': string;
    'Brand Guidelines': string;
  }>;

  type MyStoreMetafields = DefineMetafields<{
    'inventory.reorder_point': string;
    'inventory.supplier_info': string;
    'marketing.target_audience': string;
    'marketing.seasonal_boost': string[];
    'seo.meta_title': string;
    'seo.meta_description': string;
  }>;

  type MyStoreSchema = CombineColumnsAndMetafields<MyStoreColumns, MyStoreMetafields>;

  // 2. Parse with full type safety
  const products = await parseShopifyCSV<MyStoreSchema>('full-catalog.csv');

  // 3. Set up metafields (you get autocomplete for namespace/key!)
  addMetafieldColumn(products, {
    namespace: 'inventory',
    key: 'reorder_point',
    type: 'number_integer',
    defaultValue: '10',
  });

  // 4. Type-safe business logic
  const needsReorderPredicate: TypedProductPredicate<MyStoreSchema> = (product) => {
    const reorderPoint = parseInt(product.data['Reorder Point'] || '0', 10);
    const currentStock = product.variants.reduce((total, variant) => {
      return total + parseInt(variant.data['Variant Inventory Qty'] || '0', 10);
    }, 0);
    return currentStock <= reorderPoint;
  };

  const lowStockProducts = findProducts(products, needsReorderPredicate);

  // 5. Type-safe transformations
  const enrichedProducts = map(products, (product) => {
    // Calculate and set margin
    const costBasis = parseFloat(product.data['Cost Basis'] || '0');
    const price = parseFloat(product.data['Variant Price'] || '0');
    const margin = ((price - costBasis) / price * 100).toFixed(2);

    product.data['Margin Target'] = `${margin}%`;

    // Set SEO metafields based on business rules
    setMetafieldValue(product, 'seo', 'meta_title',
      `${product.data.Title} - ${product.data.Vendor} | Your Store`);

    return product; // Type information preserved!
  });

  // 6. Business reporting with type safety
  const report = {
    totalProducts: Object.keys(products).length,
    lowStockProducts: lowStockProducts.length,
    premiumProducts: findProducts(products, p => p.data['Cost Basis'] && parseFloat(p.data['Cost Basis']) > 50).length,
    avgMargin: calculateAverageMargin(Object.values(products)),
  };

  console.log('Business Report:', report);

  // 7. Save with maintained type information
  await writeShopifyCSV('enriched-catalog.csv', enrichedProducts);
  */

  console.log('💡 This example shows a complete typed workflow for enterprise use.');
  console.log('   Uncomment the code above and adapt the types to your business needs!');
}

function calculateAverageMargin<T extends CustomColumns>(products: TypedProduct<T>[]): number {
  const margins = products
    .map(p => parseFloat((p.data as any)['Cost Basis'] || '0'))
    .filter(margin => !isNaN(margin) && margin > 0);

  return margins.length > 0 ? margins.reduce((sum, margin) => sum + margin, 0) / margins.length : 0;
}

// =============================================================================
// ADVANCED TYPING PATTERNS
// =============================================================================

/**
 * Example of creating typed utility functions for your specific business logic
 */
function customTypedUtilities() {
  console.log('🔧 Custom Typed Utilities Example\n');

  // Create business-specific typed utilities
  function findPremiumProducts<T extends MyCustomColumns>(
    products: ProductsCollection<T>
  ): TypedProduct<T>[] {
    return findProducts(products, (product) => {
      return product.data['Custom Price Tier'] === 'Premium';
    });
  }

  function updateSupplierInfo<T extends MyCustomColumns>(
    products: ProductsCollection<T>,
    supplierMappings: Record<string, string>
  ): TypedProduct<T>[] {
    return map(products, (product) => {
      const supplierCode = product.data['Supplier Code'];
      if (supplierCode && supplierMappings[supplierCode]) {
        product.data['Internal Notes'] =
          `${product.data['Internal Notes'] || ''} | Supplier: ${supplierMappings[supplierCode]}`;
      }
      return product;
    });
  }

  // Create type-safe predicates for complex business logic
  const highValuePredicate: TypedProductPredicate<MyCustomColumns> = (product) => {
    const tier = product.data['Custom Price Tier'];
    const hasSupplier = product.data['Supplier Code'] !== '';
    const hasNotes = product.data['Internal Notes'] !== '';

    return tier === 'Premium' && hasSupplier && hasNotes;
  };

  console.log('✅ Custom typed utilities demonstrate business-specific type safety\n');
}

// =============================================================================
// MIGRATION AND COMPATIBILITY
// =============================================================================

function migrationAndCompatibility() {
  console.log('🔄 Migration and Compatibility Patterns\n');

  // Pattern 1: Gradual migration from untyped to typed
  async function migrateToTypedWorkflow() {
    // Start with existing untyped code
    const products = await parseShopifyCSV('legacy-data.csv');

    // Gradually add typing where it provides value
    const typedTransformation = (product: TypedProduct) => {
      // Your existing logic works unchanged
      addTag(product, 'migrated');
      return product;
    };

    // Apply typed transformations
    const migratedProducts = map(products, typedTransformation);

    return migratedProducts;
  }

  // Pattern 2: Backward compatibility
  function workWithLegacyData(legacyProducts: ProductsCollection) {
    // Legacy code continues to work
    for (const product of legacyProducts) {
      addTag(product, 'legacy-processed');
    }

    // But you can opt into typing where beneficial
    const typedSubset = filter(legacyProducts, (product) => {
      return product.data.Type === 'Clothing';
    });

    // Now typedSubset can be treated as typed if needed
  }

  // Pattern 3: Conditional typing based on runtime checks
  function conditionalTyping<T extends CustomColumns>(product: TypedProduct<T>) {
    // Check if product has your custom fields
    if ('Custom Price Tier' in product.data) {
      // TypeScript now knows this field exists
      const tier = product.data['Custom Price Tier'];
      console.log(`Product has custom pricing: ${tier}`);
    }
  }

  console.log('✅ Migration patterns support gradual adoption\n');
}

// =============================================================================
// BEST PRACTICES SUMMARY
// =============================================================================

function bestPracticesExample() {
  console.log('📋 Type Safety Best Practices\n');

  console.log('🎯 DO:');
  console.log('  ✅ Define types for fields you actively use');
  console.log('  ✅ Use DefineCustomColumns for custom CSV columns');
  console.log('  ✅ Use DefineMetafields for known metafields');
  console.log('  ✅ Combine types with CombineColumnsAndMetafields');
  console.log('  ✅ Use TypedProduct<T> for function parameters');
  console.log('  ✅ Start with loose typing and tighten gradually');

  console.log('\n❌ AVOID:');
  console.log('  ❌ Over-typing fields you never access');
  console.log('  ❌ Creating overly complex type hierarchies');
  console.log('  ❌ Forcing typing on legacy code that works');
  console.log('  ❌ Using "any" when generics preserve type information');

  console.log('\n🔗 TYPE FLOW:');
  console.log('  1. DefineCustomColumns<{...}> → Your custom fields');
  console.log('  2. DefineMetafields<{...}> → Your metafield structure');
  console.log('  3. CombineColumnsAndMetafields<C, M> → Complete schema');
  console.log('  4. parseShopifyCSV<Schema>() → Fully typed parsing');
  console.log('  5. TypedProduct<Schema> → Type-safe operations');

  console.log('\n✨ BENEFITS:');
  console.log('  • Full autocomplete in your IDE');
  console.log('  • Compile-time error detection');
  console.log('  • Self-documenting code');
  console.log('  • Refactoring safety');
  console.log('  • Better team collaboration');

  console.log('\n✅ Best practices guide complete\n');
}

// =============================================================================
// RUNTIME EXAMPLE
// =============================================================================

async function runTypeSafetyExample() {
  console.log('🚀 Running Type Safety Example\n');

  try {
    // Run all examples
    await typedParsingExample();
    typedProductCreation();

    // Create sample products for demonstration
    const sampleProducts: MyProductsCollection = {} as any;
    const sampleProduct = createProduct<MyCompleteColumns>('sample', {
      Title: 'Sample Product',
      'Custom Price Tier': 'Premium',
      'Supplier Code': 'SUP-001',
    });
    sampleProducts[sampleProduct.data.Handle] = sampleProduct;

    await typedMetafieldManagement(sampleProducts);
    typedQueryingExample(sampleProducts);
    customTypedUtilities();
    migrationAndCompatibility();
    bestPracticesExample();

    console.log('🎉 Type safety example completed successfully!');

  } catch (error) {
    console.error('❌ Example failed:', error);
  }
}

// Export for use in other examples
export {
  MyCustomColumns,
  MyMetafieldColumns,
  MyCompleteColumns,
  MyProduct,
  MyProductsCollection,
  runTypeSafetyExample,
  typedParsingExample,
  typedProductCreation,
  typedMetafieldManagement,
  typedQueryingExample,
  customTypedUtilities,
  migrationAndCompatibility,
  bestPracticesExample,
};

// Run if executed directly
if (require.main === module) {
  runTypeSafetyExample();
}
