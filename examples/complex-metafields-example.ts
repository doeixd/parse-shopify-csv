import {
  parseShopifyCSVFromString,
  generateTypeScriptInterface,
  generateZodSchema,
  detectCSVSchema,
  type ShopifyProductCSVParsedRow,
  type SchemaDetectionOptions,
} from "../src/index";

/**
 * Example: Parsing Complex Shopify CSV with Extensive Metafields
 *
 * This example demonstrates how to parse a complex Shopify CSV export
 * that includes extensive metafields, Google Shopping fields, and all
 * standard Shopify product fields in a type-safe manner.
 */

// Sample CSV header from your actual export
const complexCSVHeader = `Handle	Title	Body (HTML)	Vendor	Product Category	Type	Tags	Published	Option1 Name	Option1 Value	Option1 Linked To	Option2 Name	Option2 Value	Option2 Linked To	Option3 Name	Option3 Value	Option3 Linked To	Variant SKU	Variant Grams	Variant Inventory Tracker	Variant Inventory Qty	Variant Inventory Policy	Variant Fulfillment Service	Variant Price	Variant Compare At Price	Variant Requires Shipping	Variant Taxable	Variant Barcode	Image Src	Image Position	Image Alt Text	Gift Card	SEO Title	SEO Description	Google Shopping / Google Product Category	Google Shopping / Gender	Google Shopping / Age Group	Google Shopping / MPN	Google Shopping / Condition	Google Shopping / Custom Product	Google Shopping / Custom Label 0	Google Shopping / Custom Label 1	Google Shopping / Custom Label 2	Google Shopping / Custom Label 3	Google Shopping / Custom Label 4	Accents (product.metafields.product.accents)	Adjustable (product.metafields.product.adjustable)	Ages (product.metafields.product.ages)	Age Group (product.metafields.product.age_group)	Age Range (product.metafields.product.age_range)	Album Size (product.metafields.product.album_size)	Animal (product.metafields.product.animal)	Animals (product.metafields.product.animals)	Asdf (product.metafields.product.asdf)	Ashes Holder (product.metafields.product.ashes_holder)	Attachment (product.metafields.product.attachment)	Attachmenttype (product.metafields.product.attachmenttype)	Attachment Type (product.metafields.product.attachment_type)	A A Gifts (product.metafields.product.a_a_gifts)	Background Finish (product.metafields.product.background_finish)	Back Engarving (product.metafields.product.back_engarving)	Back Engraving (product.metafields.product.back_engraving)	Band Style (product.metafields.product.band_style)	Band Width (product.metafields.product.band_width)	Bead Size (product.metafields.product.bead_size)	Box (product.metafields.product.box)	Braceletstyle (product.metafields.product.braceletstyle)	Bracelet Material (product.metafields.product.bracelet_material)	Branch (product.metafields.product.branch)	Brand (product.metafields.product.brand)	Breeds (product.metafields.product.breeds)	Capacity (product.metafields.product.capacity)	Care (product.metafields.product.care)	Categories (product.metafields.product.categories)	Cause (product.metafields.product.cause)	Causes (product.metafields.product.causes)	Center Width (product.metafields.product.center_width)	Chain (product.metafields.product.chain)	Chainlength (product.metafields.product.chainlength)	Chain Extender (product.metafields.product.chain_extender)	Chain Legth (product.metafields.product.chain_legth)	Chain Length (product.metafields.product.chain_length)	Chain Style (product.metafields.product.chain_style)	Chain Type (product.metafields.product.chain_type)	Charm (product.metafields.product.charm)	Charms (product.metafields.product.charms)	Charm Diameter (product.metafields.product.charm_diameter)	Charm Engraving (product.metafields.product.charm_engraving)	Charm Finish (product.metafields.product.charm_finish)	Charm Length (product.metafields.product.charm_length)	Charm Material (product.metafields.product.charm_material)	Charm Shape (product.metafields.product.charm_shape)	Charm Type (product.metafields.product.charm_type)	Clasp (product.metafields.product.clasp)	Clasps (product.metafields.product.clasps)	Clasp Type (product.metafields.product.clasp_type)	Closure (product.metafields.product.closure)	Collections (product.metafields.product.collections)	Colors (product.metafields.product.colors)	Contents (product.metafields.product.contents)	Cord (product.metafields.product.cord)	Cord Material (product.metafields.product.cord_material)	Country (product.metafields.product.country)	Culturalorigin (product.metafields.product.culturalorigin)	Cultural Inspiration (product.metafields.product.cultural_inspiration)	Cultural Origin (product.metafields.product.cultural_origin)	Cultural Region (product.metafields.product.cultural_region)	Cultural Style (product.metafields.product.cultural_style)	Cultural Theme (product.metafields.product.cultural_theme)	Cultural Themes (product.metafields.product.cultural_themes)	Culture (product.metafields.product.culture)	Customizable (product.metafields.product.customizable)	Customization (product.metafields.product.customization)	Cut (product.metafields.product.cut)	Date Added (product.metafields.product.date_added)	Decoration (product.metafields.product.decoration)	Description (product.metafields.product.description)	Design (product.metafields.product.design)	Design Elements (product.metafields.product.design_elements)	Detail (product.metafields.product.detail)	Diameter (product.metafields.product.diameter)	Earrings (product.metafields.product.earrings)	Earring Back (product.metafields.product.earring_back)	Earring Backing (product.metafields.product.earring_backing)	Earring Size (product.metafields.product.earring_size)	Earring Type (product.metafields.product.earring_type)	Edge (product.metafields.product.edge)	Engraved (product.metafields.product.engraved)	Engraving (product.metafields.product.engraving)	Engraving Color (product.metafields.product.engraving_color)	Engraving Location (product.metafields.product.engraving_location)	Engraving Message (product.metafields.product.engraving_message)	Engraving Method (product.metafields.product.engraving_method)	Engraving On Heart Pendant (product.metafields.product.engraving_on_heart_pendant)	Engraving On Oval Pendant (product.metafields.product.engraving_on_oval_pendant)	Engraving Placement (product.metafields.product.engraving_placement)	Engraving Text (product.metafields.product.engraving_text)	Era (product.metafields.product.era)	Extender (product.metafields.product.extender)	Extender Length (product.metafields.product.extender_length)	Fastener (product.metafields.product.fastener)	Fastening (product.metafields.product.fastening)	Finish (product.metafields.product.finish)	Finishes (product.metafields.product.finishes)	Fit (product.metafields.product.fit)	Fits (product.metafields.product.fits)	Frame Color (product.metafields.product.frame_color)	Frame Size (product.metafields.product.frame_size)	Front Engraving (product.metafields.product.front_engraving)	Gemstone (product.metafields.product.gemstone)	Gemstones (product.metafields.product.gemstones)	Genders (product.metafields.product.genders)	Genuine Stone (product.metafields.product.genuine_stone)	Giftee (product.metafields.product.giftee)	Giftfors (product.metafields.product.giftfors)	Giftgiving (product.metafields.product.giftgiving)	Giftgivings (product.metafields.product.giftgivings)	Gifting (product.metafields.product.gifting)	Gift Box (product.metafields.product.gift_box)	Gift From (product.metafields.product.gift_from)	Gift Givings (product.metafields.product.gift_givings)	Gift Idea (product.metafields.product.gift_idea)	Height (product.metafields.product.height)	Holiday (product.metafields.product.holiday)	Inlay (product.metafields.product.inlay)	Inscription (product.metafields.product.inscription)	Inscription Technique (product.metafields.product.inscription_technique)	Insert Finish (product.metafields.product.insert_finish)	Insert Length (product.metafields.product.insert_length)	Inside Engraving (product.metafields.product.inside_engraving)	Jewelry Type (product.metafields.product.jewelry_type)	Keychain Compatible (product.metafields.product.keychain_compatible)	Keychain Type (product.metafields.product.keychain_type)	Keyring (product.metafields.product.keyring)	Keyringsize (product.metafields.product.keyringsize)	Keyring Shape (product.metafields.product.keyring_shape)	Keywords (product.metafields.product.keywords)	Key Features (product.metafields.product.key_features)	Language (product.metafields.product.language)	Languages (product.metafields.product.languages)	Length (product.metafields.product.length)	Lengthand Width (product.metafields.product.lengthand_width)	Lengths (product.metafields.product.lengths)	Linksize (product.metafields.product.linksize)	Link Length (product.metafields.product.link_length)	Link Size (product.metafields.product.link_size)	Locket Finish (product.metafields.product.locket_finish)	Made In (product.metafields.product.made_in)	Main Stone (product.metafields.product.main_stone)	Materials (product.metafields.product.materials)	Maxlength (product.metafields.product.maxlength)	Meaning (product.metafields.product.meaning)	Meanings (product.metafields.product.meanings)	Message Theme (product.metafields.product.message_theme)	Metal (product.metafields.product.metal)	Metal Color (product.metafields.product.metal_color)	Metal Tone (product.metafields.product.metal_tone)	Metal Type (product.metafields.product.metal_type)	Name (product.metafields.product.name)	Necklace Type (product.metafields.product.necklace_type)	Occasions (product.metafields.product.occasions)	Old Name (product.metafields.product.old_name)	Outside (product.metafields.product.outside)	Outside Engraving (product.metafields.product.outside_engraving)	Packaging (product.metafields.product.packaging)	Pages (product.metafields.product.pages)	Pattern (product.metafields.product.pattern)	Pendant (product.metafields.product.pendant)	Pendantlength (product.metafields.product.pendantlength)	Pendanttype (product.metafields.product.pendanttype)	Pendant Design (product.metafields.product.pendant_design)	Pendant Details (product.metafields.product.pendant_details)	Pendant Diameter (product.metafields.product.pendant_diameter)	Pendant Feature (product.metafields.product.pendant_feature)	Pendant Finish (product.metafields.product.pendant_finish)	Pendant Height (product.metafields.product.pendant_height)	Pendant Length (product.metafields.product.pendant_length)	Pendant Lengths (product.metafields.product.pendant_lengths)	Pendant Material (product.metafields.product.pendant_material)	Pendant Shape (product.metafields.product.pendant_shape)	Pendant Size (product.metafields.product.pendant_size)	Pendant Style (product.metafields.product.pendant_style)	Pendant Theme (product.metafields.product.pendant_theme)	Pendant Type (product.metafields.product.pendant_type)	Pendant Width (product.metafields.product.pendant_width)	Personalization (product.metafields.product.personalization)	Personas (product.metafields.product.personas)	Pets (product.metafields.product.pets)	Photo Capacity (product.metafields.product.photo_capacity)	Photo Size (product.metafields.product.photo_size)	Phrases (product.metafields.product.phrases)	Pin Length (product.metafields.product.pin_length)	Plaque Engraving (product.metafields.product.plaque_engraving)	Plaque Finish (product.metafields.product.plaque_finish)	Plaque Material (product.metafields.product.plaque_material)	Plating (product.metafields.product.plating)	Plating Type (product.metafields.product.plating_type)	Product Name (product.metafields.product.product_name)	Product Type (product.metafields.product.product_type)	Program (product.metafields.product.program)	Quote (product.metafields.product.quote)	Recipients (product.metafields.product.recipients)	Relationship (product.metafields.product.relationship)	Relationships (product.metafields.product.relationships)	Religion (product.metafields.product.religion)	Religious (product.metafields.product.religious)	Religious Symbol (product.metafields.product.religious_symbol)	Ringstyles (product.metafields.product.ringstyles)	Ring Profile (product.metafields.product.ring_profile)	Ring Sizes (product.metafields.product.ring_sizes)	Ring Styles (product.metafields.product.ring_styles)	Ring Type (product.metafields.product.ring_type)	Ring Width (product.metafields.product.ring_width)	Room (product.metafields.product.room)	Saint (product.metafields.product.saint)	Sentiments (product.metafields.product.sentiments)	Set (product.metafields.product.set)	Setting (product.metafields.product.setting)	Setting Type (product.metafields.product.setting_type)	Shape (product.metafields.product.shape)	Short Description (product.metafields.product.short_description)	Short Descriptions (product.metafields.product.short_descriptions)	Short Name (product.metafields.product.short_name)	Size (product.metafields.product.size)	Sizes (product.metafields.product.sizes)	Sizes Availables (product.metafields.product.sizes_availables)	Size Range (product.metafields.product.size_range)	Spin (product.metafields.product.spin)	Spiritual Themes (product.metafields.product.spiritual_themes)	Split Ring Diameter (product.metafields.product.split_ring_diameter)	Stones (product.metafields.product.stones)	Stone Carat (product.metafields.product.stone_carat)	Stone Color (product.metafields.product.stone_color)	Stone Cut (product.metafields.product.stone_cut)	Stone Shape (product.metafields.product.stone_shape)	Stone Size (product.metafields.product.stone_size)	Styles (product.metafields.product.styles)	Symbol (product.metafields.product.symbol)	Symbolism (product.metafields.product.symbolism)	Symbolisms (product.metafields.product.symbolisms)	Symbols (product.metafields.product.symbols)	Symbol Meaning (product.metafields.product.symbol_meaning)	Symbol Meanings (product.metafields.product.symbol_meanings)	Text (product.metafields.product.text)	Texture (product.metafields.product.texture)	Themes (product.metafields.product.themes)	Total Length (product.metafields.product.total_length)	Trinket Dish Material (product.metafields.product.trinket_dish_material)	Trinket Dish Size (product.metafields.product.trinket_dish_size)	Type (product.metafields.product.type)	Upc (product.metafields.product.upc)	Usage (product.metafields.product.usage)	Uses (product.metafields.product.uses)	Width (product.metafields.product.width)	Wrist Size (product.metafields.product.wrist_size)	Age group (product.metafields.shopify.age-group)	Baby gift items included (product.metafields.shopify.baby-gift-items-included)	Bracelet design (product.metafields.shopify.bracelet-design)	Chain link type (product.metafields.shopify.chain-link-type)	Color (product.metafields.shopify.color-pattern)	Decoration material (product.metafields.shopify.decoration-material)	Earring design (product.metafields.shopify.earring-design)	Gift set format (product.metafields.shopify.gift-set-format)	Infant age group (product.metafields.shopify.infant-age-group)	Jewelry material (product.metafields.shopify.jewelry-material)	Jewelry type (product.metafields.shopify.jewelry-type)	Material (product.metafields.shopify.material)	Necklace design (product.metafields.shopify.necklace-design)	Personalization options (product.metafields.shopify.personalization-options)	Ring design (product.metafields.shopify.ring-design)	Ring size (product.metafields.shopify.ring-size)	Shape (product.metafields.shopify.shape)	Target gender (product.metafields.shopify.target-gender)	Complementary products (product.metafields.shopify--discovery--product_recommendation.complementary_products)	Related products (product.metafields.shopify--discovery--product_recommendation.related_products)	Related products settings (product.metafields.shopify--discovery--product_recommendation.related_products_display)	Search product boosts (product.metafields.shopify--discovery--product_search_boost.queries)	Variant Image	 	Variant Tax Code	Cost per item	Status`;

// Sample CSV data with actual product data
const sampleCSVData =
  complexCSVHeader +
  "\n" +
  `heart-necklace-silver	Sterling Silver Heart Necklace	<p>Beautiful sterling silver heart pendant necklace perfect for everyday wear.</p>	Premium Jewelry Co	Apparel & Accessories > Jewelry	Necklace	jewelry, necklace, heart, silver, sterling	TRUE	Size	One Size		Color	Silver		18" HEART-NECK-001	5	shopify	25	deny	manual	89.99	119.99	TRUE	TRUE	SKU12345	https://example.com/heart-necklace.jpg	1	Sterling Silver Heart Necklace	FALSE	Heart Necklace - Sterling Silver	Elegant sterling silver heart pendant	Apparel & Accessories > Jewelry > Necklaces	unisex	adult	HEART-001	new	FALSE	Jewelry	Love	Romance			18"		Heart	Necklace		Heart	Heart pendant	Love symbol	TRUE	Necklace		Necklace	TRUE	Sterling Silver	Romance	Heart	Sterling Silver	Sterling Silver		Sterling Silver	Necklace	Love, Romance	Heart	Gift	Heart	Lobster Clasp	18"	Sterling Silver	USA			Love	Sterling Silver	Sterling Silver	Heart Pendant	Valentine's Day, Anniversary	Heart	Heart	18"	Gift Box	Heart Design	Heart	Sterling Silver	Heart	One Size	Romance	Heart	Necklace	Romance	Love	Sterling Silver	Necklace	Girlfriend, Wife	Love	Love	Heart	Heart	Heart	Love	Heart	Heart	18"	Sterling Silver	Sterling Silver	Heart	Heart	Heart	Love	Sterling Silver	Heart	Romance	18"	Sterling Silver	Sterling Silver	Sterling Silver	Adult	Necklace	unisex	Necklace	Sterling Silver	Necklace	Sterling Silver	Heart	unisex	female	related-product-1,related-product-2	complementary-product-1	show-4	heart,necklace,silver				89.99	active`;

// Define the schema detection options for comprehensive parsing
const schemaOptions: SchemaDetectionOptions = {
  detectMarketPricing: true,
  detectGoogleShopping: true,
  detectVariantFields: true,
};

/**
 * Step 1: Analyze the CSV structure
 */
async function analyzeCSVSchema() {
  console.log("=== CSV Schema Analysis ===");

  // Extract headers from the CSV
  const headers = complexCSVHeader.split("\t");
  console.log(`Total columns found: ${headers.length}`);

  // Detect the schema structure
  const detectedSchema = detectCSVSchema(headers, schemaOptions);

  console.log("\nDetected Schema Structure:");
  console.log(`- Core Fields: ${detectedSchema.coreFields.length}`);
  console.log(`- Standard Fields: ${detectedSchema.standardFields.length}`);
  console.log(
    `- Google Shopping Fields: ${detectedSchema.googleShoppingFields.length}`,
  );
  console.log(`- Variant Fields: ${detectedSchema.variantFields.length}`);
  console.log(`- Metafield Columns: ${detectedSchema.metafieldColumns.length}`);
  console.log(`- Custom Fields: ${detectedSchema.customFields.length}`);

  // Show some example metafields
  console.log("\nExample Metafields Found:");
  detectedSchema.metafieldColumns.slice(0, 5).forEach((field) => {
    console.log(`- ${field}`);
  });

  return detectedSchema;
}

/**
 * Step 2: Generate TypeScript types for the schema
 */
function generateTypeSafeSchema(headers: string[]) {
  console.log("\n=== Generated TypeScript Interface ===");

  const typeScriptInterface = generateTypeScriptInterface(
    headers,
    "ComplexJewelryCSVSchema",
    schemaOptions,
  );

  console.log(typeScriptInterface);

  console.log("\n=== Generated Zod Schema ===");

  const zodSchema = generateZodSchema(
    headers,
    "ComplexJewelryCSVSchema",
    schemaOptions,
  );

  console.log(zodSchema);

  return { typeScriptInterface, zodSchema };
}

/**
 * Step 3: Parse the CSV with type safety
 */
async function parseComplexCSV() {
  console.log("\n=== Parsing Complex CSV ===");

  try {
    // Parse the CSV with schema detection enabled
    const products = await parseShopifyCSVFromString(
      sampleCSVData,
      schemaOptions,
    );

    console.log(
      `Successfully parsed ${Object.keys(products).length} product(s)`,
    );

    // Get the first product for detailed examination
    const productHandle = Object.keys(products)[0];
    const product = products[productHandle];

    console.log(`\nAnalyzing product: ${productHandle}`);
    console.log(`- Title: ${product.data.Title}`);
    console.log(`- Vendor: ${product.data.Vendor}`);
    console.log(`- Type: ${product.data.Type}`);
    console.log(`- Published: ${product.data.Published}`);
    console.log(`- Variants: ${product.variants.length}`);
    console.log(`- Images: ${product.images.length}`);
    console.log(`- Metafields: ${Object.keys(product.metafields).length}`);

    // Examine Google Shopping fields
    console.log("\nGoogle Shopping Fields:");
    console.log(
      `- Category: ${product.data["Google Shopping / Google Product Category"]}`,
    );
    console.log(`- Gender: ${product.data["Google Shopping / Gender"]}`);
    console.log(`- Age Group: ${product.data["Google Shopping / Age Group"]}`);
    console.log(`- Condition: ${product.data["Google Shopping / Condition"]}`);

    // Examine some metafields
    console.log("\nSample Metafields:");
    Object.keys(product.metafields)
      .slice(0, 5)
      .forEach((namespace) => {
        const namespaceFields = product.metafields[namespace];
        console.log(`- Namespace: ${namespace}`);
        Object.keys(namespaceFields)
          .slice(0, 3)
          .forEach((key) => {
            const field = namespaceFields[key];
            console.log(`  - ${key}: "${field.value}" (${field.type})`);
          });
      });

    // Examine variant data
    if (product.variants.length > 0) {
      const variant = product.variants[0];
      console.log("\nVariant Information:");
      console.log(`- SKU: ${variant.data["Variant SKU"]}`);
      console.log(`- Price: ${variant.data["Variant Price"]}`);
      console.log(
        `- Compare At Price: ${variant.data["Variant Compare At Price"]}`,
      );
      console.log(`- Inventory Qty: ${variant.data["Variant Inventory Qty"]}`);
      console.log(`- Barcode: ${variant.data["Variant Barcode"]}`);

      // Show variant options
      console.log("- Options:");
      variant.options.forEach((option) => {
        console.log(`  - ${option.name}: ${option.value}`);
      });
    }

    return products;
  } catch (error) {
    console.error("Error parsing CSV:", error);
    throw error;
  }
}

/**
 * Step 4: Working with metafields in a type-safe way
 */
function demonstrateMetafieldAccess(product: ShopifyProductCSVParsedRow) {
  console.log("\n=== Type-Safe Metafield Access ===");

  // Access metafields with type safety
  const productMetafields = product.metafields.product;

  if (productMetafields) {
    // Jewelry-specific metafields
    console.log("Jewelry-Specific Metafields:");

    if (productMetafields.metal) {
      console.log(
        `- Metal: ${productMetafields.metal.value} (${productMetafields.metal.type})`,
      );
    }

    if (productMetafields.chain_length) {
      console.log(`- Chain Length: ${productMetafields.chain_length.value}`);
    }

    if (productMetafields.pendant_shape) {
      console.log(`- Pendant Shape: ${productMetafields.pendant_shape.value}`);
    }

    if (productMetafields.occasions) {
      console.log(`- Occasions: ${productMetafields.occasions.value}`);
    }

    if (productMetafields.gift_box) {
      console.log(`- Gift Box: ${productMetafields.gift_box.value}`);
    }
  }

  // Access Shopify namespace metafields
  const shopifyMetafields = product.metafields.shopify;
  if (shopifyMetafields) {
    console.log("\nShopify Metafields:");

    if (shopifyMetafields["jewelry-material"]) {
      console.log(
        `- Jewelry Material: ${shopifyMetafields["jewelry-material"].value}`,
      );
    }

    if (shopifyMetafields["target-gender"]) {
      console.log(
        `- Target Gender: ${shopifyMetafields["target-gender"].value}`,
      );
    }
  }

  // Access discovery metafields
  const discoveryMetafields =
    product.metafields["shopify--discovery--product_recommendation"];
  if (discoveryMetafields) {
    console.log("\nProduct Recommendation Metafields:");

    if (discoveryMetafields.related_products) {
      console.log(
        `- Related Products: ${discoveryMetafields.related_products.value}`,
      );
    }

    if (discoveryMetafields.complementary_products) {
      console.log(
        `- Complementary Products: ${discoveryMetafields.complementary_products.value}`,
      );
    }
  }
}

/**
 * Step 5: Advanced filtering and querying
 */
function demonstrateAdvancedQuerying(
  products: Record<string, ShopifyProductCSVParsedRow>,
) {
  console.log("\n=== Advanced Product Querying ===");

  // Filter products by metafield values
  const silverJewelry = Object.values(products).filter((product) => {
    const metal = product.metafields.product?.metal?.value;
    return metal && metal.toLowerCase().includes("silver");
  });

  console.log(`Found ${silverJewelry.length} silver jewelry items`);

  // Filter by Google Shopping category
  const necklaces = Object.values(products).filter((product) => {
    const category = product.data["Google Shopping / Google Product Category"];
    return category && category.toLowerCase().includes("necklace");
  });

  console.log(`Found ${necklaces.length} necklaces`);

  // Filter by price range
  const affordableItems = Object.values(products).filter((product) => {
    return product.variants.some((variant) => {
      const price = parseFloat(variant.data["Variant Price"] || "0");
      return price > 0 && price < 100;
    });
  });

  console.log(`Found ${affordableItems.length} items under $100`);

  // Find products with specific metafields
  const customizableProducts = Object.values(products).filter((product) => {
    return (
      product.metafields.product?.customizable?.value === "TRUE" ||
      product.metafields.product?.personalization?.value
    );
  });

  console.log(`Found ${customizableProducts.length} customizable products`);
}

/**
 * Main execution function
 */
async function main() {
  console.log("Complex Shopify CSV Parsing Example");
  console.log("=====================================");

  try {
    // Step 1: Analyze the schema
    const detectedSchema = await analyzeCSVSchema();

    // Step 2: Generate type-safe schemas
    const headers = complexCSVHeader.split("\t");
    const schemas = generateTypeSafeSchema(headers);

    // Step 3: Parse the CSV
    const products = await parseComplexCSV();

    // Step 4: Demonstrate metafield access
    const firstProduct = Object.values(products)[0];
    if (firstProduct) {
      demonstrateMetafieldAccess(firstProduct);
    }

    // Step 5: Advanced querying
    demonstrateAdvancedQuerying(products);

    console.log("\n=== Summary ===");
    console.log("✅ Successfully parsed complex CSV with extensive metafields");
    console.log("✅ Generated type-safe TypeScript interfaces");
    console.log("✅ Generated Zod validation schemas");
    console.log("✅ Demonstrated metafield access patterns");
    console.log("✅ Demonstrated advanced querying capabilities");
  } catch (error) {
    console.error("❌ Error in main execution:", error);
    process.exit(1);
  }
}

// Export the main function for external use
export { main };

// Run the example if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

/**
 * Type-safe interface for working with this specific CSV format
 * This interface can be generated automatically using generateTypeScriptInterface()
 */
export interface ComplexJewelryCSVSchema {
  // Core Shopify fields
  Handle: string;
  Title: string;
  "Body (HTML)": string;
  Vendor: string;
  "Product Category"?: string;
  Type: string;
  Tags: string;
  Published: string;

  // Google Shopping fields
  "Google Shopping / Google Product Category"?: string;
  "Google Shopping / Gender"?: string;
  "Google Shopping / Age Group"?: string;
  "Google Shopping / MPN"?: string;
  "Google Shopping / Condition"?: string;
  "Google Shopping / Custom Product"?: string;

  // Variant fields
  "Variant SKU"?: string;
  "Variant Price"?: string;
  "Variant Compare At Price"?: string;
  "Variant Inventory Qty"?: string;
  "Variant Barcode"?: string;

  // Metafields (examples - there are many more in the actual CSV)
  "Accents (product.metafields.product.accents)"?: string;
  "Metal (product.metafields.product.metal)"?: string;
  "Chain Length (product.metafields.product.chain_length)"?: string;
  "Pendant Shape (product.metafields.product.pendant_shape)"?: string;
  "Occasions (product.metafields.product.occasions)"?: string;
  "Gift Box (product.metafields.product.gift_box)"?: string;

  // Status
  Status?: string;
}

/**
 * Utility functions for working with this specific schema
 */
export class ComplexJewelryCSVHelper {
  static isJewelryProduct(product: ShopifyProductCSVParsedRow): boolean {
    return (
      product.data.Type?.toLowerCase().includes("jewelry") ||
      product.data.Type?.toLowerCase().includes("necklace") ||
      product.data.Type?.toLowerCase().includes("ring") ||
      product.data.Type?.toLowerCase().includes("bracelet") ||
      product.data.Type?.toLowerCase().includes("earring")
    );
  }

  static getMetalType(product: ShopifyProductCSVParsedRow): string | null {
    return (
      product.metafields.product?.metal?.value ||
      product.metafields.product?.metal_type?.value ||
      null
    );
  }

  static getChainLength(product: ShopifyProductCSVParsedRow): string | null {
    return (
      product.metafields.product?.chain_length?.value ||
      product.metafields.product?.chainlength?.value ||
      null
    );
  }

  static isCustomizable(product: ShopifyProductCSVParsedRow): boolean {
    return (
      product.metafields.product?.customizable?.value === "TRUE" ||
      product.metafields.product?.personalization?.value === "TRUE" ||
      !!product.metafields.product?.engraving?.value
    );
  }

  static getTargetAudience(product: ShopifyProductCSVParsedRow): {
    gender?: string;
    ageGroup?: string;
    occasions?: string[];
  } {
    return {
      gender:
        product.data["Google Shopping / Gender"] ||
        product.metafields.shopify?.["target-gender"]?.value,
      ageGroup:
        product.data["Google Shopping / Age Group"] ||
        product.metafields.product?.age_group?.value,
      occasions:
        product.metafields.product?.occasions?.value
          ?.split(",")
          .map((s) => s.trim()) || [],
    };
  }
}
