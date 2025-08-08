import { describe, it, expect } from "vitest";
import {
  parseShopifyCSVFromString,
  detectCSVSchema,
  createSchemaAwareParser,
  extractMarketPricing,
  setMarketPricing,
  getAvailableMarkets,
  createMinimalProductRow,
  validateCoreFields,
  type SchemaDetectionOptions,
  type ShopifyProductCSVFlexible,
} from "../src/index";

describe("Flexible Schema Support", () => {
  describe("detectCSVSchema", () => {
    it("should detect core fields correctly", () => {
      const headers = [
        "Handle",
        "Title",
        "Body (HTML)",
        "Vendor",
        "Type",
        "Tags",
        "Published",
      ];
      const schema = detectCSVSchema(headers);

      expect(schema.coreFields).toHaveLength(7);
      expect(schema.coreFields).toContain("Handle");
      expect(schema.coreFields).toContain("Title");
      expect(schema.allColumns).toEqual(headers);
    });

    it("should detect market pricing fields", () => {
      const headers = [
        "Handle",
        "Title",
        "Price / United States",
        "Price / International",
        "Compare At Price / United States",
        "Included / Canada",
      ];
      const schema = detectCSVSchema(headers);

      expect(schema.marketPricingFields).toContain("Price / United States");
      expect(schema.marketPricingFields).toContain("Price / International");
      expect(schema.marketPricingFields).toContain(
        "Compare At Price / United States",
      );
      expect(schema.marketPricingFields).toContain("Included / Canada");
    });

    it("should detect Google Shopping fields", () => {
      const headers = [
        "Handle",
        "Title",
        "Google Shopping / Gender",
        "Google Shopping / Age Group",
        "Google Shopping / MPN",
      ];
      const schema = detectCSVSchema(headers);

      expect(schema.googleShoppingFields).toContain("Google Shopping / Gender");
      expect(schema.googleShoppingFields).toContain(
        "Google Shopping / Age Group",
      );
      expect(schema.googleShoppingFields).toContain("Google Shopping / MPN");
    });

    it("should detect variant fields", () => {
      const headers = [
        "Handle",
        "Title",
        "Variant SKU",
        "Variant Price",
        "Variant Grams",
        "Variant Inventory Qty",
      ];
      const schema = detectCSVSchema(headers);

      expect(schema.variantFields).toContain("Variant SKU");
      expect(schema.variantFields).toContain("Variant Price");
      expect(schema.variantFields).toContain("Variant Grams");
      expect(schema.variantFields).toContain("Variant Inventory Qty");
    });

    it("should detect metafield columns", () => {
      const headers = [
        "Handle",
        "Title",
        "Metafield: custom.material[string]",
        "Metafield: seo.keywords[list.single_line_text_field]",
      ];
      const schema = detectCSVSchema(headers);

      expect(schema.metafieldColumns).toContain(
        "Metafield: custom.material[string]",
      );
      expect(schema.metafieldColumns).toContain(
        "Metafield: seo.keywords[list.single_line_text_field]",
      );
    });

    it("should handle custom patterns", () => {
      const headers = ["Handle", "Title", "Internal Notes", "Custom Field 1"];
      const schema = detectCSVSchema(headers, {
        customPatterns: [/^Internal\s/, /^Custom\s/],
      });

      expect(schema.customFields).toContain("Internal Notes");
      expect(schema.customFields).toContain("Custom Field 1");
    });
  });

  describe("Market Pricing Utilities", () => {
    it("should extract market pricing correctly", () => {
      const row = {
        Handle: "test-product",
        Title: "Test Product",
        "Body (HTML)": "",
        Vendor: "Test Vendor",
        Type: "Test Type",
        Tags: "",
        Published: "TRUE",
        "Price / United States": "25.00",
        "Price / International": "30.00",
        "Compare At Price / United States": "35.00",
        "Included / Canada": "TRUE",
      } as ShopifyProductCSVFlexible;

      const markets = extractMarketPricing(row);

      expect(markets["United States"]).toEqual({
        price: "25.00",
        compareAtPrice: "35.00",
      });
      expect(markets["International"]).toEqual({
        price: "30.00",
      });
      expect(markets["Canada"]).toEqual({
        included: "TRUE",
      });
    });

    it("should set market pricing correctly", () => {
      const row = {
        Handle: "test-product",
        Title: "Test Product",
      } as any;

      setMarketPricing(row, "United States", {
        price: "25.00",
        compareAtPrice: "30.00",
        included: "TRUE",
      });

      expect(row["Price / United States"]).toBe("25.00");
      expect(row["Compare At Price / United States"]).toBe("30.00");
      expect(row["Included / United States"]).toBe("TRUE");
    });

    it("should get available markets from products", () => {
      const products = {
        product1: {
          data: {
            Handle: "product1",
            "Price / US": "25.00",
            "Price / EU": "22.00",
          } as any,
        },
        product2: {
          data: {
            Handle: "product2",
            "Price / Canada": "32.00",
            "Price / US": "28.00",
          } as any,
        },
      } as any;

      const markets = getAvailableMarkets(products);

      expect(markets).toContain("US");
      expect(markets).toContain("EU");
      expect(markets).toContain("Canada");
      expect(markets).toHaveLength(3);
    });
  });

  describe("Core Field Validation", () => {
    it("should validate complete core fields", () => {
      const row = {
        Handle: "test-handle",
        Title: "Test Title",
        "Body (HTML)": "<p>Test body</p>",
        Vendor: "Test Vendor",
        Type: "Test Type",
        Tags: "tag1, tag2",
        Published: "TRUE",
      };

      expect(validateCoreFields(row)).toBe(true);
    });

    it("should reject incomplete core fields", () => {
      const row = {
        Handle: "test-handle",
        Title: "Test Title",
        // Missing other required fields
      };

      expect(validateCoreFields(row)).toBe(false);
    });
  });

  describe("Minimal Product Row Creation", () => {
    it("should create minimal product row with defaults", () => {
      const row = createMinimalProductRow({
        handle: "test-product",
        title: "Test Product",
      });

      expect(row.Handle).toBe("test-product");
      expect(row.Title).toBe("Test Product");
      expect(row["Body (HTML)"]).toBe("");
      expect(row.Vendor).toBe("");
      expect(row.Type).toBe("");
      expect(row.Tags).toBe("");
      expect(row.Published).toBe("TRUE");
    });

    it("should create minimal product row with custom values", () => {
      const row = createMinimalProductRow({
        handle: "custom-product",
        title: "Custom Product",
        vendor: "Custom Vendor",
        type: "Custom Type",
        tags: ["tag1", "tag2"],
        published: "FALSE",
        bodyHtml: "<p>Custom body</p>",
      });

      expect(row.Handle).toBe("custom-product");
      expect(row.Title).toBe("Custom Product");
      expect(row.Vendor).toBe("Custom Vendor");
      expect(row.Type).toBe("Custom Type");
      expect(row.Tags).toBe("tag1, tag2");
      expect(row.Published).toBe("FALSE");
      expect(row["Body (HTML)"]).toBe("<p>Custom body</p>");
    });
  });

  describe("Schema-Aware Parser", () => {
    it("should create and use schema-aware parser", async () => {
      type CustomSchema = {
        "Internal SKU": string;
        "Supplier Code": string;
      };

      const parser = createSchemaAwareParser<CustomSchema>({
        "Internal SKU": "",
        "Supplier Code": "",
      });

      const csvData = `Handle,Title,Body (HTML),Vendor,Type,Tags,Published,Internal SKU,Supplier Code,Status
test-product,Test Product,<p>Test</p>,Test Vendor,Test Type,test,TRUE,INT-001,SUP-001,active`;

      const products = await parser.parseString(csvData);
      const product = Object.values(products)[0];

      expect(product.data["Internal SKU"]).toBe("INT-001");
      expect(product.data["Supplier Code"]).toBe("SUP-001");
    });
  });

  describe("Flexible CSV Parsing", () => {
    it("should parse CSV with market pricing fields", async () => {
      const csvData = `Handle,Title,Body (HTML),Vendor,Type,Tags,Published,Price / US,Price / EU,Compare At Price / US,Status
test-product,Test Product,<p>Test description</p>,Test Vendor,Test Type,test,TRUE,25.00,22.50,30.00,active`;

      const products = await parseShopifyCSVFromString(csvData, {
        detectMarketPricing: true,
      });

      const product = Object.values(products)[0];
      const markets = extractMarketPricing(product.data);

      expect(markets["US"]).toEqual({
        price: "25.00",
        compareAtPrice: "30.00",
      });
      expect(markets["EU"]).toEqual({
        price: "22.50",
      });
    });

    it("should parse CSV with Google Shopping fields", async () => {
      const csvData = `Handle,Title,Body (HTML),Vendor,Type,Tags,Published,Google Shopping / Gender,Google Shopping / Age Group,Status
test-product,Test Product,<p>Test description</p>,Test Vendor,Test Type,test,TRUE,unisex,adult,active`;

      const products = await parseShopifyCSVFromString(csvData, {
        detectGoogleShopping: true,
      });

      const product = Object.values(products)[0];

      expect(product.data["Google Shopping / Gender"]).toBe("unisex");
      expect(product.data["Google Shopping / Age Group"]).toBe("adult");
    });

    it("should parse CSV with variant fields including Variant Grams", async () => {
      const csvData = `Handle,Title,Body (HTML),Vendor,Type,Tags,Published,Variant SKU,Variant Grams,Variant Price,Status
test-product,Test Product,<p>Test description</p>,Test Vendor,Test Type,test,TRUE,TEST-001,150,25.00,active
test-product,,,,,,,TEST-002,200,30.00,active`;

      const products = await parseShopifyCSVFromString(csvData, {
        detectVariantFields: true,
      });

      const product = Object.values(products)[0];

      expect(product.variants).toHaveLength(2);
      expect(product.variants[0].data["Variant SKU"]).toBe("TEST-001");
      expect(product.variants[0].data["Variant Grams"]).toBe("150");
      expect(product.variants[1].data["Variant SKU"]).toBe("TEST-002");
      expect(product.variants[1].data["Variant Grams"]).toBe("200");
    });

    it("should handle minimal CSV with only core fields", async () => {
      const csvData = `Handle,Title,Vendor,Type,Published,Status
simple-product,Simple Product,Simple Vendor,Basic,TRUE,active
another-product,Another Product,Another Vendor,Advanced,FALSE,draft`;

      const products = await parseShopifyCSVFromString(csvData);

      expect(Object.keys(products)).toHaveLength(2);

      const product1 = products["simple-product"];
      expect(product1.data.Title).toBe("Simple Product");
      expect(product1.data.Vendor).toBe("Simple Vendor");
      expect(product1.data.Published).toBe("TRUE");

      const product2 = products["another-product"];
      expect(product2.data.Title).toBe("Another Product");
      expect(product2.data.Published).toBe("FALSE");
    });
  });

  describe("User-Provided CSV Format", () => {
    it("should handle the exact CSV format provided by user", async () => {
      const csvData =
        `Handle\tTitle\tBody (HTML)\tVendor\tProduct Category\tType\tTags\tPublished\tOption1 Name\tOption1 Value\tOption2 Name\tOption2 Value\tOption3 Name\tOption3 Value\tVariant SKU\tVariant Grams\tVariant Inventory Tracker\tVariant Inventory Qty\tVariant Inventory Policy\tVariant Fulfillment Service\tVariant Price\tVariant Compare At Price\tVariant Requires Shipping\tVariant Taxable\tVariant Barcode\tImage Src\tImage Position\tImage Alt Text\tGift Card\tSEO Title\tSEO Description\tGoogle Shopping / Google Product Category\tGoogle Shopping / Gender\tGoogle Shopping / Age Group\tGoogle Shopping / MPN\tGoogle Shopping / Condition\tGoogle Shopping / Custom Product\tVariant Image\tVariant Weight Unit\tVariant Tax Code\tCost per item\tIncluded / United States\tPrice / United States\tCompare At Price / United States\tIncluded / International\tPrice / International\tCompare At Price / International\tStatus
test-shirt\tTest Shirt\t<p>A great test shirt</p>\tTest Vendor\tApparel & Accessories > Clothing\tShirt\tcasual\tTRUE\tSize\tSmall\tColor\tBlue\t\t\tTEST-S-BLUE\t100\tshopify\t10\tdeny\tmanual\t25.00\t30.00\tTRUE\tTRUE\t123456789\thttps://example.com/image.jpg\t1\tTest shirt image\tFALSE\tTest Shirt SEO\tBest test shirt ever\tApparel & Accessories > Clothing > Shirts\tunisex\tadult\tTEST123\tnew\tFALSE\t\tlb\t\t20.00\tTRUE\t25.00\t30.00\tTRUE\t35.00\t40.00\tactive`.replace(
          /\t/g,
          ",",
        );

      const products = await parseShopifyCSVFromString(csvData, {
        detectMarketPricing: true,
        detectGoogleShopping: true,
        detectVariantFields: true,
      });

      const product = Object.values(products)[0];

      // Test core fields
      expect(product.data.Handle).toBe("test-shirt");
      expect(product.data.Title).toBe("Test Shirt");
      expect(product.data.Vendor).toBe("Test Vendor");

      // Test variant fields including Variant Grams
      expect(product.variants[0].data["Variant SKU"]).toBe("TEST-S-BLUE");
      expect(product.variants[0].data["Variant Grams"]).toBe("100");
      expect(product.variants[0].data["Variant Price"]).toBe("25.00");

      // Test Google Shopping fields
      expect(product.data["Google Shopping / Gender"]).toBe("unisex");
      expect(product.data["Google Shopping / Age Group"]).toBe("adult");
      expect(product.data["Google Shopping / Condition"]).toBe("new");

      // Test market pricing
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
    });
  });
});
