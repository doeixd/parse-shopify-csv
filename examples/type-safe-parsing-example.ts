import {
  parseShopifyCSVFromString,
  generateTypeScriptInterface,
  generateZodSchema,
  detectCSVSchema,
  type ShopifyProductCSVParsedRow,
  type SchemaDetectionOptions,
} from "../src/index";

/**
 * Type-Safe Parsing Example for Complex Shopify CSV
 *
 * This example shows how to parse a CSV with extensive metafields
 * in a completely type-safe manner.
 */

// Simplified CSV with your header structure
const csvData = `Handle,Title,Body (HTML),Vendor,Product Category,Type,Tags,Published,Option1 Name,Option1 Value,Option2 Name,Option2 Value,Variant SKU,Variant Price,Variant Compare At Price,Variant Inventory Qty,Variant Barcode,Image Src,Image Position,Google Shopping / Google Product Category,Google Shopping / Gender,Google Shopping / Age Group,Google Shopping / Condition,Accents (product.metafields.product.accents),Metal (product.metafields.product.metal),Chain Length (product.metafields.product.chain_length),Pendant Shape (product.metafields.product.pendant_shape),Occasions (product.metafields.product.occasions),Gift Box (product.metafields.product.gift_box),Jewelry Material (product.metafields.shopify.jewelry-material),Target Gender (product.metafields.shopify.target-gender),Status
heart-necklace,Sterling Silver Heart Necklace,Beautiful heart pendant,Premium Jewelry,Apparel & Accessories > Jewelry,Necklace,"jewelry, heart, silver",TRUE,Size,One Size,Color,Silver,HEART-001,89.99,119.99,25,123456,https://example.com/heart.jpg,1,Apparel & Accessories > Jewelry > Necklaces,unisex,adult,new,elegant,Sterling Silver,18 inches,Heart,Valentine's Day,Gift Box,Sterling Silver,female,active`;

async function typeSafeParsingExample() {
  console.log("=== Type-Safe Shopify CSV Parsing ===\n");

  // Step 1: Analyze the CSV schema
  const firstLine = csvData.split("\n")[0];
  const headers = firstLine.split(",");
  const schemaOptions: SchemaDetectionOptions = {
    detectMarketPricing: true,
    detectGoogleShopping: true,
    detectVariantFields: true,
  };

  const schema = detectCSVSchema(headers, schemaOptions);
  console.log("📊 Schema Analysis:");
  console.log(`- Total columns: ${schema.totalColumns}`);
  console.log(`- Core fields: ${schema.coreFields.length}`);
  console.log(
    `- Google Shopping fields: ${schema.googleShoppingFields.length}`,
  );
  console.log(`- Metafields: ${schema.metafieldColumns.length}`);

  // Step 2: Generate TypeScript interface
  console.log("\n🔧 Generated TypeScript Interface:");
  const tsInterface = generateTypeScriptInterface(
    headers,
    "JewelryCSVSchema",
    schemaOptions,
  );
  console.log(tsInterface);

  // Step 3: Parse the CSV with full type safety
  console.log("\n📝 Parsing CSV Data:");
  const products = await parseShopifyCSVFromString(csvData, schemaOptions);

  // Step 4: Access data in a type-safe way
  const product = products["heart-necklace"];
  console.log(`Product: ${product.data.Title}`);
  console.log(`Vendor: ${product.data.Vendor}`);
  console.log(`Type: ${product.data.Type}`);

  // Access Google Shopping fields
  console.log(
    `Google Category: ${product.data["Google Shopping / Google Product Category"]}`,
  );
  console.log(`Google Gender: ${product.data["Google Shopping / Gender"]}`);

  // Access metafields - they're available in two ways:
  console.log("\n🏷️  Metafields (via product.data columns):");
  console.log(
    `Metal: ${product.data["Metal (product.metafields.product.metal)"] || "N/A"}`,
  );
  console.log(
    `Chain Length: ${product.data["Chain Length (product.metafields.product.chain_length)"] || "N/A"}`,
  );
  console.log(
    `Pendant Shape: ${product.data["Pendant Shape (product.metafields.product.pendant_shape)"] || "N/A"}`,
  );
  console.log(
    `Occasions: ${product.data["Occasions (product.metafields.product.occasions)"] || "N/A"}`,
  );
  console.log(
    `Gift Box: ${product.data["Gift Box (product.metafields.product.gift_box)"] || "N/A"}`,
  );

  // Access Shopify namespace metafields
  console.log(
    `Jewelry Material: ${product.data["Jewelry Material (product.metafields.shopify.jewelry-material)"] || "N/A"}`,
  );
  console.log(
    `Target Gender: ${product.data["Target Gender (product.metafields.shopify.target-gender)"] || "N/A"}`,
  );

  // Access metafields via the structured metafields object (if available)
  console.log("\n🏗️  Structured Metafields:");
  if (product.metafields && Object.keys(product.metafields).length > 0) {
    Object.keys(product.metafields).forEach((namespace) => {
      console.log(`Namespace: ${namespace}`);
      Object.keys(product.metafields[namespace])
        .slice(0, 3)
        .forEach((key) => {
          const field = product.metafields[namespace][key];
          console.log(`  - ${key}: "${field.value}" (${field.type})`);
        });
    });
  } else {
    console.log("Metafields are accessible via product.data columns above");
  }

  // Access variant data
  console.log("\n💎 Variants:");
  product.variants.forEach((variant, index) => {
    console.log(`Variant ${index + 1}:`);
    console.log(`  SKU: ${variant.data["Variant SKU"]}`);
    console.log(`  Price: $${variant.data["Variant Price"]}`);
    console.log(
      `  Options: ${variant.options.map((o) => `${o.name}: ${o.value}`).join(", ")}`,
    );
  });

  // Step 5: Type-safe filtering and querying
  console.log("\n🔍 Type-Safe Querying:");

  // Filter by metafield values (using product.data columns)
  const silverJewelry = Object.values(products).filter((p) => {
    const metal = p.data["Metal (product.metafields.product.metal)"];
    return metal && metal.toLowerCase().includes("silver");
  });
  console.log(`Silver jewelry items: ${silverJewelry.length}`);

  // Filter by Google Shopping category
  const necklaces = Object.values(products).filter((p) =>
    p.data["Google Shopping / Google Product Category"]
      ?.toLowerCase()
      .includes("necklace"),
  );
  console.log(`Necklace items: ${necklaces.length}`);

  // Filter by price range
  const affordableItems = Object.values(products).filter((p) =>
    p.variants.some((v) => {
      const price = parseFloat(v.data["Variant Price"] || "0");
      return price > 0 && price < 100;
    }),
  );
  console.log(`Items under $100: ${affordableItems.length}`);

  console.log("\n✅ Type-safe parsing complete!");
}

// Helper functions for working with this specific schema
export const JewelryCSVHelpers = {
  getMetalType: (product: ShopifyProductCSVParsedRow): string | null => {
    return (
      product.data["Metal (product.metafields.product.metal)"] ||
      product.metafields.product?.metal?.value ||
      null
    );
  },

  getChainLength: (product: ShopifyProductCSVParsedRow): string | null => {
    return (
      product.data["Chain Length (product.metafields.product.chain_length)"] ||
      product.metafields.product?.chain_length?.value ||
      null
    );
  },

  isCustomizable: (product: ShopifyProductCSVParsedRow): boolean => {
    const giftBox =
      product.data["Gift Box (product.metafields.product.gift_box)"];
    const occasions =
      product.data["Occasions (product.metafields.product.occasions)"];
    return giftBox === "Gift Box" || !!occasions;
  },

  getTargetGender: (product: ShopifyProductCSVParsedRow): string | null => {
    return (
      product.data["Google Shopping / Gender"] ||
      product.data[
        "Target Gender (product.metafields.shopify.target-gender)"
      ] ||
      product.metafields.shopify?.["target-gender"]?.value ||
      null
    );
  },
};

// Run the example
if (require.main === module) {
  typeSafeParsingExample().catch(console.error);
}

export default typeSafeParsingExample;
