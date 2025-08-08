import { describe, it, expect } from "vitest";
import {
  parseShopifyCSV,
  parseShopifyCSVFromString,
  stringifyShopifyCSV,
  extractMarketPricing,
  setMarketPricing,
  getCSVHeaders,
  getCSVHeadersFromString,
  generateTypeScriptInterface,
  generateZodSchema,
  analyzeCSVAndGenerateSchemas,
  detectCSVSchema,
  createSchemaAwareParser,
  validateCoreFields,
  createMinimalProductRow,
} from "../src/index";

describe("Comprehensive Integration Tests", () => {
  describe("Default Case - Standard Shopify Export", () => {
    it("should parse standard Shopify export without any options", async () => {
      // Standard Shopify export format
      const standardCSV = `Handle,Title,Body (HTML),Vendor,Product Category,Type,Tags,Published,Option1 Name,Option1 Value,Option2 Name,Option2 Value,Option3 Name,Option3 Value,Variant SKU,Variant Grams,Variant Inventory Tracker,Variant Inventory Qty,Variant Inventory Policy,Variant Fulfillment Service,Variant Price,Variant Compare At Price,Variant Requires Shipping,Variant Taxable,Variant Barcode,Image Src,Image Position,Image Alt Text,Gift Card,SEO Title,SEO Description,Google Shopping / Google Product Category,Google Shopping / Gender,Google Shopping / Age Group,Google Shopping / MPN,Google Shopping / Condition,Google Shopping / Custom Product,Variant Image,Variant Weight Unit,Variant Tax Code,Cost per item,Status
classic-tshirt,Classic T-Shirt,<p>A comfortable cotton t-shirt</p>,Fashion Co,Apparel & Accessories > Clothing,Shirt,casual comfortable,TRUE,Size,Small,Color,Blue,,,TSHIRT-S-BLUE,100,shopify,10,deny,manual,25.00,30.00,TRUE,TRUE,1234567890,https://example.com/tshirt.jpg,1,Classic T-Shirt in Blue,FALSE,Classic T-Shirt - Comfortable Cotton,The most comfortable t-shirt you'll ever wear,Apparel & Accessories > Clothing > Shirts,unisex,adult,TSHIRT-001,new,FALSE,,lb,,20.00,active
classic-tshirt,,,,,,,,,Medium,Color,Blue,,,TSHIRT-M-BLUE,120,shopify,8,deny,manual,25.00,30.00,TRUE,TRUE,1234567891,,,,,,,,,,,,,,,,,,,20.00,active
classic-tshirt,,,,,,,,,Large,Color,Blue,,,TSHIRT-L-BLUE,140,shopify,5,deny,manual,25.00,30.00,TRUE,TRUE,1234567892,,,,,,,,,,,,,,,,,,,20.00,active`;

      // Parse without any options (default behavior)
      const products = await parseShopifyCSVFromString(standardCSV);

      // Should parse correctly
      expect(Object.keys(products)).toHaveLength(1);

      const product = products["classic-tshirt"];
      expect(product).toBeDefined();
      expect(product.data.Title).toBe("Classic T-Shirt");
      expect(product.data.Handle).toBe("classic-tshirt");
      expect(product.data.Vendor).toBe("Fashion Co");

      // Should have 3 variants
      expect(product.variants).toHaveLength(3);
      expect(product.variants[0].data["Variant SKU"]).toBe("TSHIRT-S-BLUE");
      expect(product.variants[1].data["Variant SKU"]).toBe("TSHIRT-M-BLUE");
      expect(product.variants[2].data["Variant SKU"]).toBe("TSHIRT-L-BLUE");

      // Should have option structure
      expect(product.variants[0].options).toHaveLength(2);
      expect(product.variants[0].options[0].name).toBe("Size");
      expect(product.variants[0].options[0].value).toBe("Small");
      expect(product.variants[0].options[1].name).toBe("Color");
      expect(product.variants[0].options[1].value).toBe("Blue");

      // Should have image
      expect(product.images).toHaveLength(1);
      expect(product.images[0].src).toBe("https://example.com/tshirt.jpg");
    });

    it("should maintain proper column order in round-trip", async () => {
      const originalCSV = `Handle,Title,Body (HTML),Vendor,Type,Tags,Published,Variant SKU,Variant Price,Status
test-product,Test Product,<p>Test</p>,Test Vendor,Test Type,test,TRUE,TEST-001,25.00,active`;

      const products = await parseShopifyCSVFromString(originalCSV);
      const regeneratedCSV = await stringifyShopifyCSV(products);

      // Headers should be preserved in logical order
      const originalHeaders = getCSVHeadersFromString(originalCSV);
      const regeneratedHeaders = getCSVHeadersFromString(regeneratedCSV);

      // Core fields should come first
      expect(regeneratedHeaders[0]).toBe("Handle");
      expect(regeneratedHeaders[1]).toBe("Title");
      expect(regeneratedHeaders.includes("Body (HTML)")).toBe(true);
      expect(regeneratedHeaders.includes("Vendor")).toBe(true);
      expect(regeneratedHeaders.includes("Type")).toBe(true);

      // All original headers should be present
      originalHeaders.forEach((header) => {
        expect(regeneratedHeaders.includes(header)).toBe(true);
      });
    });
  });

  describe("Header Order and Compatibility", () => {
    it("should handle headers in any order", async () => {
      // Non-standard order
      const csvWithMixedOrder = `Status,Variant Price,Vendor,Handle,Title,Variant SKU,Published,Type
active,25.00,Test Vendor,test-handle,Test Title,SKU001,TRUE,Widget
active,30.00,Test Vendor,test-handle,,SKU002,TRUE,Widget`;

      const products = await parseShopifyCSVFromString(csvWithMixedOrder);

      expect(Object.keys(products)).toHaveLength(1);
      const product = products["test-handle"];

      expect(product.data.Title).toBe("Test Title");
      expect(product.data.Vendor).toBe("Test Vendor");
      expect(product.variants).toHaveLength(2);
    });

    it("should work with minimal required fields only", async () => {
      const minimalCSV = `Handle,Title,Vendor,Type,Published,Status
minimal-product,Minimal Product,Minimal Vendor,Basic,TRUE,active`;

      const products = await parseShopifyCSVFromString(minimalCSV);

      expect(Object.keys(products)).toHaveLength(1);
      const product = products["minimal-product"];

      expect(product.data.Title).toBe("Minimal Product");
      expect(product.variants).toHaveLength(0); // No variants without variant fields
      expect(product.images).toHaveLength(0); // No images without image fields
    });

    it("should handle missing optional fields gracefully", async () => {
      const partialCSV = `Handle,Title,Vendor,Type,Published,Variant SKU,Variant Price,Status
partial-product,Partial Product,Partial Vendor,Test,TRUE,PART-001,15.00,active`;

      const products = await parseShopifyCSVFromString(partialCSV);

      const product = products["partial-product"];
      expect(product.data.Title).toBe("Partial Product");
      expect(product.data["Body (HTML)"]).toBe(""); // Missing field should be empty
      expect(product.data.Tags).toBe(""); // Missing field should be empty
      expect(product.variants).toHaveLength(1);
    });
  });

  describe("Enhanced Features with Options", () => {
    it("should detect and handle market pricing when enabled", async () => {
      const marketCSV = `Handle,Title,Vendor,Type,Published,Price / United States,Price / International,Compare At Price / United States,Status
global-product,Global Product,Global Vendor,Widget,TRUE,25.00,28.50,30.00,active`;

      const products = await parseShopifyCSVFromString(marketCSV, {
        detectMarketPricing: true,
      });

      const product = products["global-product"];
      const markets = extractMarketPricing(product.data);

      expect(markets["United States"]).toEqual({
        price: "25.00",
        compareAtPrice: "30.00",
      });
      expect(markets["International"]).toEqual({
        price: "28.50",
      });
    });

    it("should handle Google Shopping fields when enabled", async () => {
      const googleCSV = `Handle,Title,Vendor,Type,Published,Google Shopping / Gender,Google Shopping / Age Group,Google Shopping / Condition,Status
fashion-item,Fashion Item,Fashion Brand,Apparel,TRUE,unisex,adult,new,active`;

      const products = await parseShopifyCSVFromString(googleCSV, {
        detectGoogleShopping: true,
      });

      const product = products["fashion-item"];
      expect(product.data["Google Shopping / Gender"]).toBe("unisex");
      expect(product.data["Google Shopping / Age Group"]).toBe("adult");
      expect(product.data["Google Shopping / Condition"]).toBe("new");
    });

    it("should handle both metafield formats", async () => {
      const metafieldCSV = `Handle,Title,Vendor,Type,Published,Metafield: custom.material[string],Age Group (product.metafields.product.age_group),Features (metafields.custom.features),Status
meta-product,Meta Product,Meta Vendor,Widget,TRUE,Cotton,Adult,waterproof breathable,active`;

      const products = await parseShopifyCSVFromString(metafieldCSV);

      const product = products["meta-product"];

      // Standard format metafield
      expect(product.metadata["custom.material"]).toBeDefined();
      expect(product.metadata["custom.material"].value).toBe("Cotton");
      expect(product.metadata["custom.material"].namespace).toBe("custom");
      expect(product.metadata["custom.material"].key).toBe("material");

      // Parentheses format metafield
      expect(product.metadata["product.age_group"]).toBeDefined();
      expect(product.metadata["product.age_group"].value).toBe("Adult");
      expect(product.metadata["product.age_group"].namespace).toBe("product");
      expect(product.metadata["product.age_group"].key).toBe("age_group");

      // Another parentheses format
      expect(product.metadata["custom.features"]).toBeDefined();
      expect(product.metadata["custom.features"].value).toBe(
        "waterproof breathable",
      );
    });
  });

  describe("User's Exact CSV Format", () => {
    it("should handle the user's provided CSV format perfectly", async () => {
      const userCSV = `Handle,Title,Body (HTML),Vendor,Product Category,Type,Tags,Published,Option1 Name,Option1 Value,Option2 Name,Option2 Value,Option3 Name,Option3 Value,Variant SKU,Variant Grams,Variant Inventory Tracker,Variant Inventory Qty,Variant Inventory Policy,Variant Fulfillment Service,Variant Price,Variant Compare At Price,Variant Requires Shipping,Variant Taxable,Variant Barcode,Image Src,Image Position,Image Alt Text,Gift Card,SEO Title,SEO Description,Google Shopping / Google Product Category,Google Shopping / Gender,Google Shopping / Age Group,Google Shopping / MPN,Google Shopping / Condition,Google Shopping / Custom Product,Variant Image,Variant Weight Unit,Variant Tax Code,Cost per item,Included / United States,Price / United States,Compare At Price / United States,Included / International,Price / International,Compare At Price / International,Status
user-shirt,User Shirt,<p>A great user shirt</p>,User Vendor,Apparel & Accessories > Clothing,Shirt,casual,TRUE,Size,Small,Color,Red,,,USER-S-RED,150,shopify,15,deny,manual,25.00,30.00,TRUE,TRUE,987654321,https://example.com/user-shirt.jpg,1,User shirt image,FALSE,User Shirt SEO,Best user shirt ever,Apparel & Accessories > Clothing > Shirts,unisex,adult,USER123,new,FALSE,,lb,,22.00,TRUE,25.00,30.00,TRUE,35.00,40.00,active`;

      const products = await parseShopifyCSVFromString(userCSV, {
        detectMarketPricing: true,
        detectGoogleShopping: true,
        detectVariantFields: true,
      });

      const product = products["user-shirt"];

      // Basic product data
      expect(product.data.Handle).toBe("user-shirt");
      expect(product.data.Title).toBe("User Shirt");
      expect(product.data.Vendor).toBe("User Vendor");
      expect(product.data["Product Category"]).toBe(
        "Apparel & Accessories > Clothing",
      );

      // Variant data (including Variant Grams)
      expect(product.variants).toHaveLength(1);
      expect(product.variants[0].data["Variant SKU"]).toBe("USER-S-RED");
      expect(product.variants[0].data["Variant Grams"]).toBe("150");
      expect(product.variants[0].data["Variant Price"]).toBe("25.00");

      // Options
      expect(product.variants[0].options).toHaveLength(2);
      expect(product.variants[0].options[0].name).toBe("Size");
      expect(product.variants[0].options[0].value).toBe("Small");
      expect(product.variants[0].options[1].name).toBe("Color");
      expect(product.variants[0].options[1].value).toBe("Red");

      // Google Shopping fields
      expect(product.data["Google Shopping / Gender"]).toBe("unisex");
      expect(product.data["Google Shopping / Age Group"]).toBe("adult");
      expect(product.data["Google Shopping / Condition"]).toBe("new");

      // Market pricing
      const markets = extractMarketPricing(product.data);
      expect(markets["United States"]).toEqual({
        price: "25.00",
        compareAtPrice: "30.00",
        included: "TRUE",
      });
      expect(markets["International"]).toEqual({
        price: "35.00",
        compareAtPrice: "40.00",
        included: "TRUE",
      });

      // Images
      expect(product.images).toHaveLength(1);
      expect(product.images[0].src).toBe("https://example.com/user-shirt.jpg");
    });
  });

  describe("Schema-Aware Parser", () => {
    it("should work with type-safe custom schema", async () => {
      type CustomSchema = {
        "Internal SKU": string;
        "Supplier Code": string;
        "Warehouse Location": string;
      };

      const parser = createSchemaAwareParser<CustomSchema>({
        "Internal SKU": "",
        "Supplier Code": "",
        "Warehouse Location": "",
      });

      const customCSV = `Handle,Title,Vendor,Type,Published,Internal SKU,Supplier Code,Warehouse Location,Status
custom-product,Custom Product,Custom Vendor,Widget,TRUE,INT-001,SUP-ABC,WH-01,active`;

      const products = await parser.parseString(customCSV);
      const product = Object.values(products)[0];

      expect(product.data["Internal SKU"]).toBe("INT-001");
      expect(product.data["Supplier Code"]).toBe("SUP-ABC");
      expect(product.data["Warehouse Location"]).toBe("WH-01");
    });
  });

  describe("CSV Analysis Utilities", () => {
    it("should analyze and generate schemas for real CSV", async () => {
      const complexCSV = `Handle,Title,Body (HTML),Vendor,Product Category,Type,Tags,Published,Option1 Name,Option1 Value,Variant SKU,Variant Grams,Variant Price,Google Shopping / Gender,Price / US,Price / EU,Age Group (product.metafields.product.age_group),Internal Notes,Status`;

      const headers = getCSVHeadersFromString(complexCSV);

      const typescript = generateTypeScriptInterface(
        headers,
        "AnalyzedSchema",
        {
          detectMarketPricing: true,
          detectGoogleShopping: true,
          detectVariantFields: true,
          customPatterns: [/^Internal\s/],
        },
      );

      const zodSchema = generateZodSchema(headers, "AnalyzedSchema", {
        detectMarketPricing: true,
        detectGoogleShopping: true,
        detectVariantFields: true,
        customPatterns: [/^Internal\s/],
      });

      // TypeScript interface should contain all field types
      expect(typescript).toContain("interface AnalyzedSchema");
      expect(typescript).toContain('"Handle": string;'); // Required core field
      expect(typescript).toContain('"Product Category"?: string;'); // Optional standard field
      expect(typescript).toContain('"Google Shopping / Gender"?: string;'); // Google Shopping field
      expect(typescript).toContain('"Variant SKU"?: string;'); // Variant field
      expect(typescript).toContain('"Price / US"?: string;'); // Market pricing field
      expect(typescript).toContain(
        '"Age Group (product.metafields.product.age_group)"?: string;',
      ); // Metafield
      expect(typescript).toContain('"Internal Notes"?: string;'); // Custom field

      // Zod schema should contain similar structure
      expect(zodSchema).toContain("export const AnalyzedSchema = z.object({");
      expect(zodSchema).toContain('"Handle": z.string(),'); // Required
      expect(zodSchema).toContain('"Product Category": z.string().optional(),'); // Optional
      expect(zodSchema).toContain("export type AnalyzedSchemaType");
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle CSV with missing required fields gracefully", async () => {
      const invalidCSV = `Title,Vendor,Status
Missing Handle,Test Vendor,active`;

      await expect(parseShopifyCSVFromString(invalidCSV)).rejects.toThrow(
        /Missing required columns/,
      );
    });

    it("should handle empty CSV gracefully", async () => {
      const headers = getCSVHeadersFromString("");
      expect(headers).toEqual([]);

      const schema = detectCSVSchema([]);
      expect(schema.totalColumns).toBe(0);
      expect(schema.coreFields).toHaveLength(0);
    });

    it("should handle malformed metafield columns gracefully", async () => {
      const malformedCSV = `Handle,Title,Vendor,Type,Published,BadMetafield,Status
test,Test,Vendor,Type,TRUE,value,active`;

      const products = await parseShopifyCSVFromString(malformedCSV);
      const product = products["test"];

      // Should parse without error, BadMetafield treated as custom field
      expect((product.data as any).BadMetafield).toBe("value");
      expect(Object.keys(product.metadata)).toHaveLength(0);
    });
  });

  describe("Performance and Memory", () => {
    it("should handle moderately large CSV efficiently", async () => {
      // Generate a CSV with 100 products, each with 3 variants
      let largeCSV = `Handle,Title,Vendor,Type,Published,Option1 Name,Option1 Value,Variant SKU,Variant Price,Status\n`;

      for (let i = 1; i <= 100; i++) {
        const handle = `product-${i}`;
        const title = `Product ${i}`;

        // First variant row (with product data)
        largeCSV += `${handle},${title},Vendor ${i},Type,TRUE,Size,Small,${handle}-S,${(20 + i * 0.1).toFixed(2)},active\n`;

        // Second variant row
        largeCSV += `${handle},,,,,,Medium,${handle}-M,${(22 + i * 0.1).toFixed(2)},active\n`;

        // Third variant row
        largeCSV += `${handle},,,,,,Large,${handle}-L,${(24 + i * 0.1).toFixed(2)},active\n`;
      }

      const startTime = Date.now();
      const products = await parseShopifyCSVFromString(largeCSV);
      const endTime = Date.now();

      // Should complete within reasonable time (adjust threshold as needed)
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds

      // Should have correct structure
      expect(Object.keys(products)).toHaveLength(100);

      // Check a few products
      expect(products["product-1"].variants).toHaveLength(3);
      expect(products["product-50"].variants).toHaveLength(3);
      expect(products["product-100"].variants).toHaveLength(3);

      // Should be iterable
      let count = 0;
      for (const product of products) {
        count++;
        expect(product.data.Handle).toMatch(/^product-\d+$/);
      }
      expect(count).toBe(100);
    });
  });

  describe("Round-trip Compatibility", () => {
    it("should maintain data integrity in parse-modify-stringify cycle", async () => {
      const originalCSV = `Handle,Title,Body (HTML),Vendor,Type,Tags,Published,Option1 Name,Option1 Value,Variant SKU,Variant Price,Status
roundtrip-test,Roundtrip Test,<p>Original description</p>,Original Vendor,Widget,original test,TRUE,Size,Medium,RT-M,20.00,active`;

      // Parse
      const products = await parseShopifyCSVFromString(originalCSV);
      const product = products["roundtrip-test"];

      // Modify
      product.data.Title = "Modified Title";
      product.data.Tags = "modified test updated";
      product.variants[0].data["Variant Price"] = "25.00";

      // Stringify
      const modifiedCSV = await stringifyShopifyCSV(products);

      // Parse again
      const reparsedProducts = await parseShopifyCSVFromString(modifiedCSV);
      const reparsedProduct = reparsedProducts["roundtrip-test"];

      // Verify modifications persisted
      expect(reparsedProduct.data.Title).toBe("Modified Title");
      expect(reparsedProduct.data.Tags).toBe("modified test updated");
      expect(reparsedProduct.variants[0].data["Variant Price"]).toBe("25.00");

      // Verify unchanged data preserved
      expect(reparsedProduct.data.Vendor).toBe("Original Vendor");
      expect(reparsedProduct.data["Body (HTML)"]).toBe(
        "<p>Original description</p>",
      );
      expect(reparsedProduct.variants[0].data["Variant SKU"]).toBe("RT-M");
    });
  });

  describe("Utility Functions Integration", () => {
    it("should work seamlessly with utility functions", async () => {
      const utilityCSV = `Handle,Title,Vendor,Type,Published,Option1 Name,Option1 Value,Variant SKU,Status
util-test,Utility Test,Util Vendor,Widget,TRUE,Size,Small,UTIL-S,active
util-test,,,,,Medium,UTIL-M,active
util-test,,,,,Large,UTIL-L,active`;

      const products = await parseShopifyCSVFromString(utilityCSV);

      // Test core field validation
      const product = products["util-test"];
      expect(validateCoreFields(product.data)).toBe(true);

      // Test minimal product creation
      const minimal = createMinimalProductRow({
        handle: "new-util-product",
        title: "New Utility Product",
        vendor: "New Vendor",
      });
      expect(minimal.Handle).toBe("new-util-product");
      expect(minimal.Title).toBe("New Utility Product");
      expect(minimal.Vendor).toBe("New Vendor");

      // Test market pricing utilities (even though no market pricing in this CSV)
      const markets = extractMarketPricing(product.data);
      expect(Object.keys(markets)).toHaveLength(0);

      // Add market pricing
      setMarketPricing(product.data, "Test Market", {
        price: "30.00",
        compareAtPrice: "35.00",
      });

      const updatedMarkets = extractMarketPricing(product.data);
      expect(updatedMarkets["Test Market"]).toEqual({
        price: "30.00",
        compareAtPrice: "35.00",
      });
    });
  });
});
