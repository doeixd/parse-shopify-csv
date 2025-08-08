import { describe, it, expect } from "vitest";
import {
  getCSVHeadersFromString,
  generateTypeScriptInterface,
  generateZodSchema,
  analyzeCSVAndGenerateSchemas,
  detectCSVSchema,
  parseShopifyCSVFromString,
} from "../src/index";

describe("CSV Analysis Utilities", () => {
  describe("getCSVHeadersFromString", () => {
    it("should extract headers from simple CSV", () => {
      const csvData = `Handle,Title,Vendor,Type,Status
product1,Product 1,Vendor A,Type A,active`;

      const headers = getCSVHeadersFromString(csvData);
      expect(headers).toEqual(["Handle", "Title", "Vendor", "Type", "Status"]);
    });

    it("should handle quoted headers with commas", () => {
      const csvData = `Handle,"Product Title, Long","Vendor, Inc",Type,Status
product1,"Product 1, Special","Vendor A, Inc",Type A,active`;

      const headers = getCSVHeadersFromString(csvData);
      expect(headers).toEqual([
        "Handle",
        "Product Title, Long",
        "Vendor, Inc",
        "Type",
        "Status",
      ]);
    });

    it("should handle market pricing headers", () => {
      const csvData = `Handle,Title,Price / United States,Price / International,Status
product1,Product 1,25.00,28.00,active`;

      const headers = getCSVHeadersFromString(csvData);
      expect(headers).toEqual([
        "Handle",
        "Title",
        "Price / United States",
        "Price / International",
        "Status",
      ]);
    });

    it("should handle metafield headers (both formats)", () => {
      const csvData = `Handle,Title,Metafield: custom.material[string],Age Group (product.metafields.product.age_group),Status
product1,Product 1,Cotton,Adult,active`;

      const headers = getCSVHeadersFromString(csvData);
      expect(headers).toEqual([
        "Handle",
        "Title",
        "Metafield: custom.material[string]",
        "Age Group (product.metafields.product.age_group)",
        "Status",
      ]);
    });
  });

  describe("generateTypeScriptInterface", () => {
    it("should generate basic TypeScript interface", () => {
      const headers = ["Handle", "Title", "Vendor", "Type", "Status"];
      const typescript = generateTypeScriptInterface(headers, "BasicSchema");

      expect(typescript).toContain("interface BasicSchema {");
      expect(typescript).toContain('"Handle": string;');
      expect(typescript).toContain('"Title": string;');
      expect(typescript).toContain('"Vendor": string;');
      expect(typescript).toContain('"Type": string;');
      expect(typescript).toContain('"Status"?: string;');
      expect(typescript).toContain("}");
    });

    it("should handle market pricing fields as optional", () => {
      const headers = [
        "Handle",
        "Title",
        "Price / United States",
        "Price / International",
      ];
      const typescript = generateTypeScriptInterface(headers, "MarketSchema", {
        detectMarketPricing: true,
      });

      expect(typescript).toContain('"Price / United States"?: string;');
      expect(typescript).toContain('"Price / International"?: string;');
    });

    it("should handle Google Shopping fields", () => {
      const headers = [
        "Handle",
        "Title",
        "Google Shopping / Gender",
        "Google Shopping / Age Group",
      ];
      const typescript = generateTypeScriptInterface(headers, "GoogleSchema", {
        detectGoogleShopping: true,
      });

      expect(typescript).toContain('"Google Shopping / Gender"?: string;');
      expect(typescript).toContain('"Google Shopping / Age Group"?: string;');
    });

    it("should handle variant fields", () => {
      const headers = [
        "Handle",
        "Title",
        "Variant SKU",
        "Variant Grams",
        "Variant Price",
      ];
      const typescript = generateTypeScriptInterface(headers, "VariantSchema", {
        detectVariantFields: true,
      });

      expect(typescript).toContain('"Variant SKU"?: string;');
      expect(typescript).toContain('"Variant Grams"?: string;');
      expect(typescript).toContain('"Variant Price"?: string;');
    });

    it("should handle metafield columns", () => {
      const headers = [
        "Handle",
        "Title",
        "Metafield: custom.material[string]",
        "Age Group (product.metafields.product.age_group)",
      ];
      const typescript = generateTypeScriptInterface(
        headers,
        "MetafieldSchema",
      );

      expect(typescript).toContain(
        '"Metafield: custom.material[string]"?: string;',
      );
      expect(typescript).toContain(
        '"Age Group (product.metafields.product.age_group)"?: string;',
      );
    });

    it("should handle custom fields", () => {
      const headers = [
        "Handle",
        "Title",
        "Internal Notes",
        "Custom Field 1",
        "Supplier Code",
      ];
      const typescript = generateTypeScriptInterface(
        headers,
        "CustomSchema",
        {
          customPatterns: [/^Internal\s/, /^Custom\s/, /^Supplier\s/],
        },
      );

      expect(typescript).toContain('"Internal Notes"?: string;');
      expect(typescript).toContain('"Custom Field 1"?: string;');
      expect(typescript).toContain('"Supplier Code"?: string;');
    });
  });

  describe("generateZodSchema", () => {
    it("should generate basic Zod schema", () => {
      const headers = ["Handle", "Title", "Vendor", "Type", "Status"];
      const zodSchema = generateZodSchema(headers, "BasicSchema");

      expect(zodSchema).toContain("import { z } from 'zod';");
      expect(zodSchema).toContain("export const BasicSchema = z.object({");
      expect(zodSchema).toContain('"Handle": z.string(),');
      expect(zodSchema).toContain('"Title": z.string(),');
      expect(zodSchema).toContain('"Vendor": z.string(),');
      expect(zodSchema).toContain('"Type": z.string(),');
      expect(zodSchema).toContain('"Status": z.string().optional(),');
      expect(zodSchema).toContain("});");
      expect(zodSchema).toContain("export type BasicSchemaType");
    });

    it("should handle market pricing fields", () => {
      const headers = [
        "Handle",
        "Title",
        "Price / United States",
        "Price / International",
      ];
      const zodSchema = generateZodSchema(headers, "MarketSchema", {
        detectMarketPricing: true,
      });

      expect(zodSchema).toContain('"Price / United States": z.string().optional(),');
      expect(zodSchema).toContain('"Price / International": z.string().optional(),');
    });

    it("should handle all field types together", () => {
      const headers = [
        "Handle",
        "Title",
        "Vendor",
        "Google Shopping / Gender",
        "Variant SKU",
        "Price / US",
        "Metafield: custom.material[string]",
        "Internal Notes",
      ];
      const zodSchema = generateZodSchema(headers, "CompleteSchema", {
        detectMarketPricing: true,
        detectGoogleShopping: true,
        detectVariantFields: true,
        customPatterns: [/^Internal\s/],
      });

      expect(zodSchema).toContain('"Handle": z.string(),');
      expect(zodSchema).toContain('"Title": z.string(),');
      expect(zodSchema).toContain('"Vendor": z.string(),');
      expect(zodSchema).toContain('"Google Shopping / Gender": z.string().optional(),');
      expect(zodSchema).toContain('"Variant SKU": z.string().optional(),');
      expect(zodSchema).toContain('"Price / US": z.string().optional(),');
      expect(zodSchema).toContain('"Metafield: custom.material[string]": z.string().optional(),');
      expect(zodSchema).toContain('"Internal Notes": z.string().optional(),');
    });
  });

  describe("Schema Detection with Metafield Formats", () => {
    it("should detect standard metafield format", () => {
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

    it("should detect parentheses metafield format", () => {
      const headers = [
        "Handle",
        "Title",
        "Age Group (product.metafields.product.age_group)",
        "Material (metafields.custom.material)",
        "Features (product.metafields.details.features)",
      ];
      const schema = detectCSVSchema(headers);

      expect(schema.metafieldColumns).toContain(
        "Age Group (product.metafields.product.age_group)",
      );
      expect(schema.metafieldColumns).toContain(
        "Material (metafields.custom.material)",
      );
      expect(schema.metafieldColumns).toContain(
        "Features (product.metafields.details.features)",
      );
    });

    it("should detect mixed metafield formats", () => {
      const headers = [
        "Handle",
        "Title",
        "Metafield: custom.material[string]",
        "Age Group (product.metafields.product.age_group)",
        "Color (metafields.custom.color)",
        "Metafield: seo.title[string]",
      ];
      const schema = detectCSVSchema(headers);

      expect(schema.metafieldColumns).toHaveLength(4);
      expect(schema.metafieldColumns).toContain(
        "Metafield: custom.material[string]",
      );
      expect(schema.metafieldColumns).toContain(
        "Age Group (product.metafields.product.age_group)",
      );
      expect(schema.metafieldColumns).toContain(
        "Color (metafields.custom.color)",
      );
      expect(schema.metafieldColumns).toContain("Metafield: seo.title[string]");
    });
  });

  describe("Integration with Parsing", () => {
    it("should parse CSV with parentheses metafield format", async () => {
      const csvData = `Handle,Title,Body (HTML),Vendor,Type,Tags,Published,Age Group (product.metafields.product.age_group),Material (metafields.custom.material),Status
test-product,Test Product,<p>Test</p>,Test Vendor,Test Type,test,TRUE,Adult,Cotton,active`;

      const products = await parseShopifyCSVFromString(csvData);
      const product = Object.values(products)[0];

      // Check that metafields are properly parsed with the namespace.key format
      expect(product.metadata).toBeDefined();
      expect(product.metadata["product.age_group"]).toBeDefined();
      expect(product.metadata["custom.material"]).toBeDefined();

      // Check metafield values
      expect(product.metadata["product.age_group"].value).toBe("Adult");
      expect(product.metadata["custom.material"].value).toBe("Cotton");

      // Check metafield properties
      expect(product.metadata["product.age_group"].namespace).toBe("product");
      expect(product.metadata["product.age_group"].key).toBe("age_group");
      expect(product.metadata["custom.material"].namespace).toBe("custom");
      expect(product.metadata["custom.material"].key).toBe("material");
    });

    it("should handle mixed metafield formats in parsing", async () => {
      const csvData = `Handle,Title,Body (HTML),Vendor,Type,Tags,Published,Metafield: custom.material[string],Age Group (product.metafields.product.age_group),Status
test-product,Test Product,<p>Test</p>,Test Vendor,Test Type,test,TRUE,Cotton,Adult,active`;

      const products = await parseShopifyCSVFromString(csvData);
      const product = Object.values(products)[0];

      // Both formats should be parsed
      expect(product.metadata["custom.material"]).toBeDefined();
      expect(product.metadata["product.age_group"]).toBeDefined();

      expect(product.metadata["custom.material"].value).toBe("Cotton");
      expect(product.metadata["product.age_group"].value).toBe("Adult");
    });

    it("should handle metafield modifications and writing", async () => {
      const csvData = `Handle,Title,Body (HTML),Vendor,Type,Tags,Published,Age Group (product.metafields.product.age_group),Status
test-product,Test Product,<p>Test</p>,Test Vendor,Test Type,test,TRUE,Adult,active`;

      const products = await parseShopifyCSVFromString(csvData);
      const product = Object.values(products)[0];

      // Modify metafield value
      product.metadata["product.age_group"].parsedValue = "Teen";

      // Check that the original data was updated
      expect(product.data["Age Group (product.metafields.product.age_group)"]).toBe("Teen");
    });
  });

  describe("Real-world CSV Analysis", () => {
    it("should analyze complex CSV and generate schemas", () => {
      const complexCSV = `Handle,Title,Body (HTML),Vendor,Product Category,Type,Tags,Published,Option1 Name,Option1 Value,Option2 Name,Option2 Value,Variant SKU,Variant Grams,Variant Price,Google Shopping / Gender,Google Shopping / Age Group,Price / United States,Price / International,Age Group (product.metafields.product.age_group),Material (metafields.custom.material),Internal Notes,Supplier Code,Status`;

      const headers = getCSVHeadersFromString(complexCSV);

      // Generate TypeScript interface
      const typescript = generateTypeScriptInterface(headers, "ComplexSchema", {
        detectMarketPricing: true,
        detectGoogleShopping: true,
        detectVariantFields: true,
        customPatterns: [/^Internal\s/, /^Supplier\s/],
      });

      // Generate Zod schema
      const zodSchema = generateZodSchema(headers, "ComplexSchema", {
        detectMarketPricing: true,
        detectGoogleShopping: true,
        detectVariantFields: true,
        customPatterns: [/^Internal\s/, /^Supplier\s/],
      });

      // Verify TypeScript interface contains all expected fields
      expect(typescript).toContain("interface ComplexSchema");
      expect(typescript).toContain('"Handle": string;'); // Core field
      expect(typescript).toContain('"Product Category"?: string;'); // Standard field
      expect(typescript).toContain('"Google Shopping / Gender"?: string;'); // Google Shopping
      expect(typescript).toContain('"Variant SKU"?: string;'); // Variant field
      expect(typescript).toContain('"Price / United States"?: string;'); // Market pricing
      expect(typescript).toContain('"Age Group (product.metafields.product.age_group)"?: string;'); // Metafield
      expect(typescript).toContain('"Internal Notes"?: string;'); // Custom field

      // Verify Zod schema contains all expected fields
      expect(zodSchema).toContain("export const ComplexSchema = z.object({");
      expect(zodSchema).toContain('"Handle": z.string(),'); // Core field
      expect(zodSchema).toContain('"Product Category": z.string().optional(),'); // Standard field
      expect(zodSchema).toContain('"Google Shopping / Gender": z.string().optional(),'); // Google Shopping
      expect(zodSchema).toContain('"Variant SKU": z.string().optional(),'); // Variant field
      expect(zodSchema).toContain('"Price / United States": z.string().optional(),'); // Market pricing
      expect(zodSchema).toContain('"Age Group (product.metafields.product.age_group)": z.string().optional(),'); // Metafield
      expect(zodSchema).toContain('"Internal Notes": z.string().optional(),'); // Custom field
    });

    it("should detect schema correctly for user-provided format", () => {
      const userCSV = `Handle,Title,Body (HTML),Vendor,Product Category,Type,Tags,Published,Option1 Name,Option1 Value,Option2 Name,Option2 Value,Option3 Name,Option3 Value,Variant SKU,Variant Grams,Variant Inventory Tracker,Variant Inventory Qty,Variant Inventory Policy,Variant Fulfillment Service,Variant Price,Variant Compare At Price,Variant Requires Shipping,Variant Taxable,Variant Barcode,Image Src,Image Position,Image Alt Text,Gift Card,SEO Title,SEO Description,Google Shopping / Google Product Category,Google Shopping / Gender,Google Shopping / Age Group,Google Shopping / MPN,Google Shopping / Condition,Google Shopping / Custom Product,Variant Image,Variant Weight Unit,Variant Tax Code,Cost per item,Included / United States,Price / United States,Compare At Price / United States,Included / International,Price / International,Compare At Price / International,Status`;

      const headers = getCSVHeadersFromString(userCSV);
      const schema = detectCSVSchema(headers, {
        detectMarketPricing: true,
        detectGoogleShopping: true,
        detectVariantFields: true,
      });

      // Verify detection results
      expect(schema.coreFields).toContain("Handle");
      expect(schema.coreFields).toContain("Title");
      expect(schema.coreFields).toContain("Vendor");

      expect(schema.standardFields).toContain("Product Category");
      expect(schema.standardFields).toContain("Option1 Name");

      expect(schema.googleShoppingFields).toContain("Google Shopping / Gender");
      expect(schema.googleShoppingFields).toContain("Google Shopping / Age Group");

      expect(schema.variantFields).toContain("Variant SKU");
      expect(schema.variantFields).toContain("Variant Grams");
      expect(schema.variantFields).toContain("Variant Price");

      expect(schema.marketPricingFields).toContain("Price / United States");
      expect(schema.marketPricingFields).toContain("Price / International");
      expect(schema.marketPricingFields).toContain("Included / United States");

      expect(schema.totalColumns).toBe(48);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty CSV", () => {
      const headers = getCSVHeadersFromString("");
      expect(headers).toEqual([]);
    });

    it("should handle single column CSV", () => {
      const headers = getCSVHeadersFromString("Handle\nproduct1");
      expect(headers).toEqual(["Handle"]);
    });

    it("should handle CSV with trailing comma", () => {
      const headers = getCSVHeadersFromString("Handle,Title,Status,\nproduct1,Product 1,active,");
      expect(headers).toEqual(["Handle", "Title", "Status", ""]);
    });

    it("should generate schema for minimal headers", () => {
      const headers = ["Handle"];
      const typescript = generateTypeScriptInterface(headers, "MinimalSchema");

      expect(typescript).toContain("interface MinimalSchema");
      expect(typescript).toContain('"Handle": string;');
      expect(typescript).toContain("}");
    });

    it("should handle headers with special characters", () => {
      const csvData = `Handle,"Product Title (Special)","Price $USD","Status: Active"
product1,"Product 1 (New)","25.00","Status: Active"`;

      const headers = getCSVHeadersFromString(csvData);
      expect(headers).toEqual([
        "Handle",
        "Product Title (Special)",
        "Price $USD",
        "Status: Active",
      ]);
    });
  });
});
