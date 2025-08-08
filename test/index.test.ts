import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  map,
  filter,
  createProduct,
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
  parseTags,
  serializeTags,
  updateInventoryQuantity,
  bulkUpdateInventory,
  bulkUpdateVariantField,
  findDuplicateImages,
  assignBulkImagesToVariants,
  findUncategorizedProducts,
  addVariant,
  findVariant,
  addImage,
  addMetafieldColumn,
  setMetafieldValue,
  ImageAssignmentRule,
  countProducts,
  countVariants,
  countImages,
  countProductsWhere,
  countVariantsWhere,
  countProductsWithTag,
  countProductsByType,
  countProductsByVendor,
  toArray,
  toHandleArray,
  toEntryArray,
  toVariantArray,
  toImageArray,
  getCollectionStats,
  parsePrice,
  stringifyPrice,
  isValidPrice,
  normalizePrice,
  updateVariantPrice,
  updateVariantCompareAtPrice,
  adjustPrice,
  comparePrice,
  minPrice,
  maxPrice,
  averagePrice,
  // Google Shopping utilities
  getGoogleShoppingAttributes,
  setGoogleShoppingAttributes,
  bulkSetGoogleShoppingAttributes,
  findProductsByGoogleCategory,
  findProductsByGoogleGender,
  findProductsByGoogleCondition,
  getGoogleShoppingStats,
  // Variant search utilities
  findVariantBySKU,
  findVariantByBarcode,
  findVariantsBySKUs,
  findVariantsByBarcodes,
  findVariantsWithMissingSKUs,
  findVariantsWithMissingBarcodes,
  findDuplicateSKUs,
  findDuplicateBarcodes,
} from "../src/utils";
import { ShopifyProductCSVParsedRow } from "../src";

describe("map", () => {
  it("should map over products and return a new collection", () => {
    const products: Record<string, ShopifyProductCSVParsedRow> = {
      "product-1": createProduct("product-1", { Title: "Product 1" }),
      "product-2": createProduct("product-2", { Title: "Product 2" }),
    };

    const newProducts = map(products, (p) => {
      p.data.Title = p.data.Title.toUpperCase();
      return p;
    });

    expect(newProducts["product-1"].data.Title).toBe("PRODUCT 1");
    expect(newProducts["product-2"].data.Title).toBe("PRODUCT 2");
    expect(products["product-1"].data.Title).toBe("Product 1"); // Original should be unchanged
  });

  it("should not clone when shouldCloneBeforePassedToCb is false", () => {
    const products: Record<string, ShopifyProductCSVParsedRow> = {
      "product-1": createProduct("product-1", { Title: "Product 1" }),
    };

    map(
      products,
      (p) => {
        p.data.Title = "New Title";
        return p;
      },
      false,
    );

    expect(products["product-1"].data.Title).toBe("New Title");
  });
});

describe("Tag Management Utilities", () => {
  let testProduct: ShopifyProductCSVParsedRow;

  beforeEach(() => {
    testProduct = createProduct("test-product", {
      Title: "Test Product",
      Tags: "summer, sale, featured",
    });
  });

  describe("parseTags", () => {
    it("should parse comma-separated tags correctly", () => {
      expect(parseTags("tag1, tag2, tag3")).toEqual(["tag1", "tag2", "tag3"]);
      expect(parseTags("tag1,tag2,tag3")).toEqual(["tag1", "tag2", "tag3"]);
      expect(parseTags("")).toEqual([]);
      expect(parseTags()).toEqual([]);
    });

    it("should handle duplicates and empty tags", () => {
      expect(parseTags("tag1, tag2, tag1, , tag3")).toEqual([
        "tag1",
        "tag2",
        "tag3",
      ]);
      expect(parseTags("  ,  , tag1  ,  ")).toEqual(["tag1"]);
    });
  });

  describe("serializeTags", () => {
    it("should serialize tags to comma-separated string", () => {
      expect(serializeTags(["tag1", "tag2", "tag3"])).toBe("tag1, tag2, tag3");
      expect(serializeTags([])).toBe("");
    });

    it("should handle duplicates and empty tags", () => {
      expect(serializeTags(["tag1", "tag2", "tag1", "", "tag3"])).toBe(
        "tag1, tag2, tag3",
      );
    });
  });

  describe("getTags", () => {
    it("should return array of tags from product", () => {
      const tags = getTags(testProduct);
      expect(tags).toEqual(["summer", "sale", "featured"]);
    });

    it("should return empty array for product with no tags", () => {
      const emptyProduct = createProduct("empty", { Title: "Empty Product" });
      expect(getTags(emptyProduct)).toEqual([]);
    });
  });

  describe("hasTag", () => {
    it("should check if product has specific tag (case-insensitive)", () => {
      expect(hasTag(testProduct, "summer")).toBe(true);
      expect(hasTag(testProduct, "SUMMER")).toBe(true);
      expect(hasTag(testProduct, "winter")).toBe(false);
      expect(hasTag(testProduct, "")).toBe(false);
    });
  });

  describe("addTag", () => {
    it("should add a new tag to product", () => {
      addTag(testProduct, "new-tag");
      expect(getTags(testProduct)).toEqual([
        "summer",
        "sale",
        "featured",
        "new-tag",
      ]);
    });

    it("should not add duplicate tags (case-insensitive)", () => {
      addTag(testProduct, "summer");
      addTag(testProduct, "SALE");
      expect(getTags(testProduct)).toEqual(["summer", "sale", "featured"]);
    });

    it("should handle empty or invalid tags", () => {
      const originalTags = getTags(testProduct);
      addTag(testProduct, "");
      addTag(testProduct, "   ");
      expect(getTags(testProduct)).toEqual(originalTags);
    });
  });

  describe("removeTag", () => {
    it("should remove a tag from product (case-insensitive)", () => {
      removeTag(testProduct, "sale");
      expect(getTags(testProduct)).toEqual(["summer", "featured"]);

      removeTag(testProduct, "SUMMER");
      expect(getTags(testProduct)).toEqual(["featured"]);
    });

    it("should handle non-existent tags gracefully", () => {
      const originalTags = getTags(testProduct);
      removeTag(testProduct, "non-existent");
      expect(getTags(testProduct)).toEqual(originalTags);
    });
  });

  describe("setTags", () => {
    it("should set tags from array", () => {
      setTags(testProduct, ["new", "tags", "list"]);
      expect(getTags(testProduct)).toEqual(["new", "tags", "list"]);
    });

    it("should set tags from comma-separated string", () => {
      setTags(testProduct, "tag1, tag2, tag3");
      expect(getTags(testProduct)).toEqual(["tag1", "tag2", "tag3"]);
    });

    it("should handle duplicates in input", () => {
      setTags(testProduct, ["tag1", "tag2", "tag1"]);
      expect(getTags(testProduct)).toEqual(["tag1", "tag2"]);
    });
  });

  describe("addTags", () => {
    it("should add multiple tags from array", () => {
      addTags(testProduct, ["new1", "new2"]);
      expect(getTags(testProduct)).toEqual([
        "summer",
        "sale",
        "featured",
        "new1",
        "new2",
      ]);
    });

    it("should add multiple tags from string", () => {
      addTags(testProduct, "new1, new2");
      expect(getTags(testProduct)).toEqual([
        "summer",
        "sale",
        "featured",
        "new1",
        "new2",
      ]);
    });

    it("should not add duplicates", () => {
      addTags(testProduct, ["summer", "new-tag"]);
      expect(getTags(testProduct)).toEqual([
        "summer",
        "sale",
        "featured",
        "new-tag",
      ]);
    });
  });

  describe("removeTags", () => {
    it("should remove multiple tags from array", () => {
      removeTags(testProduct, ["summer", "sale"]);
      expect(getTags(testProduct)).toEqual(["featured"]);
    });

    it("should remove multiple tags from string", () => {
      removeTags(testProduct, "summer, sale");
      expect(getTags(testProduct)).toEqual(["featured"]);
    });
  });

  describe("hasAllTags", () => {
    it("should check if product has all specified tags", () => {
      expect(hasAllTags(testProduct, ["summer", "sale"])).toBe(true);
      expect(hasAllTags(testProduct, ["summer", "winter"])).toBe(false);
      expect(hasAllTags(testProduct, "summer, sale")).toBe(true);
    });
  });

  describe("hasAnyTag", () => {
    it("should check if product has any of the specified tags", () => {
      expect(hasAnyTag(testProduct, ["summer", "winter"])).toBe(true);
      expect(hasAnyTag(testProduct, ["winter", "spring"])).toBe(false);
      expect(hasAnyTag(testProduct, "summer, winter")).toBe(true);
    });
  });

  describe("findProductsByTag", () => {
    it("should find products with specific tag", () => {
      const products = [
        testProduct,
        createProduct("product2", {
          Title: "Product 2",
          Tags: "winter, clearance",
        }),
      ];

      const summerProducts = findProductsByTag(products, "summer");
      expect(summerProducts).toHaveLength(1);
      expect(summerProducts[0].data.Handle).toBe("test-product");
    });
  });

  describe("findProductsByTags", () => {
    it("should find products with all specified tags", () => {
      const products = [
        testProduct,
        createProduct("product2", {
          Title: "Product 2",
          Tags: "summer, winter",
        }),
        createProduct("product3", {
          Title: "Product 3",
          Tags: "summer, sale, winter",
        }),
      ];

      const results = findProductsByTags(products, ["summer", "sale"]);
      expect(results).toHaveLength(2);
      expect(results.map((p) => p.data.Handle)).toEqual([
        "test-product",
        "product3",
      ]);
    });
  });

  describe("getAllTags", () => {
    it("should get all unique tags from products collection", () => {
      const products = [
        testProduct,
        createProduct("product2", {
          Title: "Product 2",
          Tags: "winter, clearance, sale",
        }),
      ];

      const allTags = getAllTags(products);
      expect(allTags.sort()).toEqual([
        "clearance",
        "featured",
        "sale",
        "summer",
        "winter",
      ]);
    });
  });

  describe("getTagStats", () => {
    it("should return tag usage statistics", () => {
      const products = [
        testProduct,
        createProduct("product2", {
          Title: "Product 2",
          Tags: "summer, winter",
        }),
        createProduct("product3", { Title: "Product 3", Tags: "sale, winter" }),
      ];

      const stats = getTagStats(products);
      expect(stats).toEqual({
        summer: 2,
        sale: 2,
        featured: 1,
        winter: 2,
      });
    });
  });
});

describe("Image Management Utilities", () => {
  let products: Record<string, ShopifyProductCSVParsedRow>;

  beforeEach(() => {
    const product1 = createProduct("product-1", { Title: "Product 1" });
    product1.data["Image Src"] = "https://example.com/shared.jpg";
    addImage(product1, {
      src: "https://example.com/shared.jpg",
      alt: "Shared",
    });
    addImage(product1, {
      src: "https://example.com/unique-1.jpg",
      alt: "Unique 1",
    });

    const product2 = createProduct("product-2", { Title: "Product 2" });
    product2.data["Image Src"] = "https://example.com/shared.jpg"; // Duplicate
    addImage(product2, {
      src: "https://example.com/shared.jpg",
      alt: "Shared",
    });
    addImage(product2, {
      src: "https://example.com/unique-2.jpg",
      alt: "Unique 2",
    });

    // Add variant with image
    addVariant(product1, {
      options: { Color: "Blue" },
      "Variant SKU": "P1-BLUE",
      "Variant Image": "https://example.com/shared.jpg", // Also uses shared image
    });

    products = {
      "product-1": product1,
      "product-2": product2,
    };
  });

  describe("findDuplicateImages", () => {
    it("should find images used by multiple products", () => {
      const duplicates = findDuplicateImages(products);

      expect(duplicates).toHaveProperty("https://example.com/shared.jpg");
      expect(duplicates["https://example.com/shared.jpg"]).toEqual([
        "product-1",
        "product-2",
      ]);

      // Unique images should not appear in duplicates
      expect(duplicates).not.toHaveProperty("https://example.com/unique-1.jpg");
      expect(duplicates).not.toHaveProperty("https://example.com/unique-2.jpg");
    });

    it("should handle products with no images", () => {
      const emptyProduct = createProduct("empty", { Title: "Empty Product" });
      const testProducts = { ...products, empty: emptyProduct };

      const duplicates = findDuplicateImages(testProducts);
      expect(duplicates["https://example.com/shared.jpg"]).toEqual([
        "product-1",
        "product-2",
      ]);
    });
  });

  describe("assignBulkImagesToVariants", () => {
    it("should assign images based on matching rules", () => {
      const product = createProduct("test-assign", { Title: "Test Product" });

      // Add images
      addImage(product, { src: "https://example.com/blue.jpg", alt: "Blue" });
      addImage(product, { src: "https://example.com/red.jpg", alt: "Red" });

      // Add variants
      addVariant(product, {
        options: { Color: "Blue" },
        "Variant SKU": "TEST-BLUE",
      });
      addVariant(product, {
        options: { Color: "Red" },
        "Variant SKU": "TEST-RED",
      });

      const rules: ImageAssignmentRule[] = [
        {
          matcher: (variant) => {
            const colorOption = variant.options.find(
              (opt) => opt.name === "Color",
            );
            return colorOption?.value.toLowerCase() === "blue";
          },
          getImageSrc: () => "https://example.com/blue.jpg",
        },
        {
          matcher: (variant) => {
            const colorOption = variant.options.find(
              (opt) => opt.name === "Color",
            );
            return colorOption?.value.toLowerCase() === "red";
          },
          getImageSrc: () => "https://example.com/red.jpg",
        },
      ];

      assignBulkImagesToVariants(product, rules);

      const blueVariant = findVariant(product, "TEST-BLUE");
      const redVariant = findVariant(product, "TEST-RED");

      expect(blueVariant?.data["Variant Image"]).toBe(
        "https://example.com/blue.jpg",
      );
      expect(redVariant?.data["Variant Image"]).toBe(
        "https://example.com/red.jpg",
      );
    });

    it("should stop at first matching rule", () => {
      const product = createProduct("test-stop", { Title: "Test Product" });
      addImage(product, { src: "https://example.com/first.jpg", alt: "First" });
      addImage(product, {
        src: "https://example.com/second.jpg",
        alt: "Second",
      });

      addVariant(product, {
        options: { Color: "Blue" },
        "Variant SKU": "TEST-BLUE",
      });

      const rules: ImageAssignmentRule[] = [
        {
          matcher: () => true, // Matches everything
          getImageSrc: () => "https://example.com/first.jpg",
        },
        {
          matcher: () => true, // Also matches everything, but should not be reached
          getImageSrc: () => "https://example.com/second.jpg",
        },
      ];

      assignBulkImagesToVariants(product, rules);

      const variant = findVariant(product, "TEST-BLUE");
      expect(variant?.data["Variant Image"]).toBe(
        "https://example.com/first.jpg",
      );
    });
  });
});

describe("filter", () => {
  it("should filter products based on the predicate", () => {
    const products: Record<string, ShopifyProductCSVParsedRow> = {
      "product-1": createProduct("product-1", { Status: "active" }),
      "product-2": createProduct("product-2", { Status: "draft" }),
    };

    const activeProducts = filter(products, (p) => p.data.Status === "active");

    expect(Object.keys(activeProducts).length).toBe(1);
    expect(activeProducts["product-1"]).toBeDefined();
  });
});

describe("Inventory Management Utilities", () => {
  let testProduct: ShopifyProductCSVParsedRow;

  beforeEach(() => {
    testProduct = createProduct("test-product", {
      Title: "Test Product",
    });
    // Add some variants for testing
    addVariant(testProduct, {
      options: { Size: "M", Color: "Blue" },
      "Variant SKU": "TEST-BLU-M",
      "Variant Inventory Qty": "10",
    });
    addVariant(testProduct, {
      options: { Size: "L", Color: "Red" },
      "Variant SKU": "TEST-RED-L",
      "Variant Inventory Qty": "5",
    });
  });

  describe("updateInventoryQuantity", () => {
    it("should update inventory quantity for a specific variant", () => {
      updateInventoryQuantity(testProduct, "TEST-BLU-M", 25);

      const variant = findVariant(testProduct, "TEST-BLU-M");
      expect(variant?.data["Variant Inventory Qty"]).toBe("25");
    });

    it("should throw error for non-existent SKU", () => {
      expect(() => {
        updateInventoryQuantity(testProduct, "NON-EXISTENT", 10);
      }).toThrow('Variant with SKU "NON-EXISTENT" not found');
    });
  });

  describe("bulkUpdateInventory", () => {
    it("should update multiple variants across products", () => {
      const products = {
        "test-product": testProduct,
        "test-product-2": createProduct("test-product-2", {
          Title: "Product 2",
        }),
      };

      // Add variant to second product
      addVariant(products["test-product-2"], {
        options: { Size: "S" },
        "Variant SKU": "PROD2-S",
        "Variant Inventory Qty": "3",
      });

      const updates = {
        "TEST-BLU-M": 100,
        "PROD2-S": 50,
        "NON-EXISTENT": 25, // Should warn but not error
      };

      const updatedProducts = bulkUpdateInventory(products, updates);

      expect(updatedProducts).toHaveLength(2);
      expect(
        findVariant(testProduct, "TEST-BLU-M")?.data["Variant Inventory Qty"],
      ).toBe("100");
      expect(
        findVariant(products["test-product-2"], "PROD2-S")?.data[
          "Variant Inventory Qty"
        ],
      ).toBe("50");
    });
  });
});

describe("Advanced Variant Management Utilities", () => {
  let products: Record<string, ShopifyProductCSVParsedRow>;

  beforeEach(() => {
    const product1 = createProduct("product-1", { Title: "Product 1" });
    addVariant(product1, {
      options: { Size: "M" },
      "Variant SKU": "P1-M",
      "Variant Weight": "0.5",
    });
    addVariant(product1, {
      options: { Size: "L" },
      "Variant SKU": "P1-L",
      "Variant Weight": "0.6",
    });

    const product2 = createProduct("product-2", { Title: "Product 2" });
    addVariant(product2, {
      options: { Color: "Red" },
      "Variant SKU": "P2-RED",
      "Variant Weight": "0.3",
    });

    products = {
      "product-1": product1,
      "product-2": product2,
    };
  });

  describe("bulkUpdateVariantField", () => {
    it("should update field with static value across all variants", () => {
      const modifiedProducts = bulkUpdateVariantField(
        products,
        "Variant Weight Unit",
        "lb",
      );

      expect(modifiedProducts).toHaveLength(2);

      for (const product of Object.values(products)) {
        for (const variant of product.variants) {
          expect(variant.data["Variant Weight Unit"]).toBe("lb");
        }
      }
    });

    it("should update field with function-based value", () => {
      const modifiedProducts = bulkUpdateVariantField(
        products,
        "Variant Barcode",
        (variant, product) =>
          `${product.data.Handle}-${variant.data["Variant SKU"]}`,
      );

      expect(modifiedProducts).toHaveLength(2);

      const p1m = findVariant(products["product-1"], "P1-M");
      expect(p1m?.data["Variant Barcode"]).toBe("product-1-P1-M");

      const p2red = findVariant(products["product-2"], "P2-RED");
      expect(p2red?.data["Variant Barcode"]).toBe("product-2-P2-RED");
    });

    it("should only return products that were actually modified", () => {
      // Set weight unit to "kg" for all variants
      bulkUpdateVariantField(products, "Variant Weight Unit", "kg");

      // Try to set it to "kg" again - should return empty array
      const modifiedProducts = bulkUpdateVariantField(
        products,
        "Variant Weight Unit",
        "kg",
      );

      expect(modifiedProducts).toHaveLength(0);
    });
  });
});

describe("Advanced Image Management Utilities", () => {
  let products: Record<string, ShopifyProductCSVParsedRow>;

  beforeEach(() => {
    const product1 = createProduct("product-1", { Title: "Product 1" });
    product1.data["Image Src"] = "https://example.com/shared-image.jpg";
    addImage(product1, {
      src: "https://example.com/shared-image.jpg",
      alt: "Shared image",
    });
    addImage(product1, {
      src: "https://example.com/unique-image-1.jpg",
      alt: "Unique to product 1",
    });

    const product2 = createProduct("product-2", { Title: "Product 2" });
    product2.data["Image Src"] = "https://example.com/shared-image.jpg"; // Same as product1
    addImage(product2, {
      src: "https://example.com/shared-image.jpg",
      alt: "Shared image",
    });
    addImage(product2, {
      src: "https://example.com/unique-image-2.jpg",
      alt: "Unique to product 2",
    });

    // Add variant with variant image
    addVariant(product1, {
      options: { Color: "Blue" },
      "Variant SKU": "P1-BLUE",
      "Variant Image": "https://example.com/variant-image.jpg",
    });
    addImage(product1, {
      src: "https://example.com/variant-image.jpg",
      alt: "Variant image",
    });

    products = {
      "product-1": product1,
      "product-2": product2,
    };
  });

  describe("findDuplicateImages", () => {
    it("should find images used by multiple products", () => {
      const duplicates = findDuplicateImages(products);

      expect(duplicates).toHaveProperty("https://example.com/shared-image.jpg");
      expect(duplicates["https://example.com/shared-image.jpg"]).toEqual([
        "product-1",
        "product-2",
      ]);

      // Unique images should not be in duplicates
      expect(duplicates).not.toHaveProperty(
        "https://example.com/unique-image-1.jpg",
      );
      expect(duplicates).not.toHaveProperty(
        "https://example.com/unique-image-2.jpg",
      );
    });

    it("should handle products with no images", () => {
      const emptyProduct = createProduct("empty-product", { Title: "Empty" });
      const testProducts = { ...products, "empty-product": emptyProduct };

      const duplicates = findDuplicateImages(testProducts);
      expect(duplicates["https://example.com/shared-image.jpg"]).toEqual([
        "product-1",
        "product-2",
      ]);
    });
  });

  describe("assignBulkImagesToVariants", () => {
    it("should assign images based on rules", () => {
      const product = createProduct("test-assign", { Title: "Test Product" });

      // Add images
      addImage(product, {
        src: "https://example.com/blue-variant.jpg",
        alt: "Blue",
      });
      addImage(product, {
        src: "https://example.com/red-variant.jpg",
        alt: "Red",
      });

      // Add variants
      addVariant(product, {
        options: { Color: "Blue" },
        "Variant SKU": "TEST-BLUE",
      });
      addVariant(product, {
        options: { Color: "Red" },
        "Variant SKU": "TEST-RED",
      });

      const rules: ImageAssignmentRule[] = [
        {
          matcher: (variant) => {
            const colorOption = variant.options.find(
              (opt) => opt.name === "Color",
            );
            return colorOption?.value.toLowerCase() === "blue";
          },
          getImageSrc: () => "https://example.com/blue-variant.jpg",
        },
        {
          matcher: (variant) => {
            const colorOption = variant.options.find(
              (opt) => opt.name === "Color",
            );
            return colorOption?.value.toLowerCase() === "red";
          },
          getImageSrc: () => "https://example.com/red-variant.jpg",
        },
      ];

      assignBulkImagesToVariants(product, rules);

      const blueVariant = findVariant(product, "TEST-BLUE");
      const redVariant = findVariant(product, "TEST-RED");

      expect(blueVariant?.data["Variant Image"]).toBe(
        "https://example.com/blue-variant.jpg",
      );
      expect(redVariant?.data["Variant Image"]).toBe(
        "https://example.com/red-variant.jpg",
      );
    });

    it("should warn for non-existent images", () => {
      const product = createProduct("test-warn", { Title: "Test Product" });
      addVariant(product, {
        options: { Color: "Blue" },
        "Variant SKU": "TEST-BLUE",
      });

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const rules: ImageAssignmentRule[] = [
        {
          matcher: () => true,
          getImageSrc: () => "https://example.com/non-existent.jpg",
        },
      ];

      assignBulkImagesToVariants(product, rules);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Image "https://example.com/non-existent.jpg" not found',
        ),
      );

      consoleSpy.mockRestore();
    });
  });
});

describe("Product Organization & Categorization Utilities", () => {
  let products: Record<string, ShopifyProductCSVParsedRow>;

  beforeEach(() => {
    // Properly categorized product
    const categorizedProduct = createProduct("categorized", {
      Title: "Categorized Product",
      Type: "Clothing",
      Vendor: "Fashion Brand",
      Tags: "category-apparel, seasonal-summer",
    });

    // Uncategorized product (missing Type)
    const uncategorizedProduct1 = createProduct("uncategorized-1", {
      Title: "Uncategorized Product 1",
      Vendor: "Some Brand",
    });

    // Uncategorized product (has Type but missing category tag)
    const uncategorizedProduct2 = createProduct("uncategorized-2", {
      Title: "Uncategorized Product 2",
      Type: "Accessories",
      Vendor: "Another Brand",
      Tags: "summer, sale", // Missing category tag
    });

    products = {
      categorized: categorizedProduct,
      "uncategorized-1": uncategorizedProduct1,
      "uncategorized-2": uncategorizedProduct2,
    };
  });

  describe("findUncategorizedProducts", () => {
    it("should find products missing required fields", () => {
      const uncategorized = findUncategorizedProducts(products, {
        requiredFields: ["Type"],
      });

      expect(uncategorized).toHaveLength(1);
      expect(uncategorized[0].data.Handle).toBe("uncategorized-1");
    });

    it("should find products missing required tags", () => {
      const uncategorized = findUncategorizedProducts(products, {
        requiredFields: ["Type"],
        requiredTags: ["category-apparel", "category-accessories"],
      });

      expect(uncategorized).toHaveLength(2);
      expect(uncategorized.map((p) => p.data.Handle)).toEqual([
        "uncategorized-1",
        "uncategorized-2",
      ]);
    });

    it("should use custom categorization check", () => {
      const uncategorized = findUncategorizedProducts(products, {
        customCheck: (product) => {
          // Consider product categorized if vendor contains "Fashion"
          return product.data.Vendor?.includes("Fashion") ?? false;
        },
      });

      expect(uncategorized).toHaveLength(2);
      expect(uncategorized[0].data.Handle).toBe("uncategorized-1");
      expect(uncategorized[1].data.Handle).toBe("uncategorized-2");
    });

    it("should check required metafields", () => {
      // First add a metafield column
      addMetafieldColumn(products, {
        namespace: "custom",
        key: "category",
        type: "string",
        defaultValue: "",
      });

      // Set metafield value for categorized product
      setMetafieldValue(products.categorized, "custom", "category", "apparel");

      const uncategorized = findUncategorizedProducts(products, {
        requiredMetafields: [{ namespace: "custom", key: "category" }],
      });

      expect(uncategorized).toHaveLength(2);
      expect(uncategorized.map((p) => p.data.Handle)).toEqual([
        "uncategorized-1",
        "uncategorized-2",
      ]);
    });

    it("should return empty array when all products are categorized", () => {
      // Make all products categorized by only requiring Title
      const uncategorized = findUncategorizedProducts(products, {
        requiredFields: ["Title"],
      });

      expect(uncategorized).toHaveLength(0);
    });
  });
});

describe("Collection Utilities (Count & Array Conversion)", () => {
  let products: Record<string, ShopifyProductCSVParsedRow>;

  beforeEach(() => {
    // Create a diverse set of products for testing
    const product1 = createProduct("product-1", {
      Title: "Cotton T-Shirt",
      Type: "Clothing",
      Vendor: "Fashion Co",
      Tags: "cotton, summer, bestseller",
    });

    addVariant(product1, {
      options: { Size: "M", Color: "Blue" },
      "Variant SKU": "TSHIRT-BLU-M",
      "Variant Price": "29.99",
    });

    addVariant(product1, {
      options: { Size: "L", Color: "Blue" },
      "Variant SKU": "TSHIRT-BLU-L",
      "Variant Price": "29.99",
    });

    addImage(product1, {
      src: "https://example.com/tshirt-1.jpg",
      alt: "T-shirt front view",
    });

    addImage(product1, {
      src: "https://example.com/tshirt-2.jpg",
      alt: "T-shirt back view",
    });

    const product2 = createProduct("product-2", {
      Title: "Wool Jacket",
      Type: "Clothing",
      Vendor: "Premium Brands",
      Tags: "wool, winter, premium",
    });

    addVariant(product2, {
      options: { Size: "M" },
      "Variant SKU": "JACKET-M",
      "Variant Price": "199.99",
    });

    addImage(product2, {
      src: "https://example.com/jacket.jpg",
      alt: "Wool jacket",
    });

    const product3 = createProduct("product-3", {
      Title: "Leather Belt",
      Type: "Accessories",
      Vendor: "Fashion Co",
      Tags: "leather, accessories",
    });

    addVariant(product3, {
      options: { Size: "One Size" },
      "Variant SKU": "BELT-OS",
      "Variant Price": "49.99",
    });

    // No images for product3

    products = {
      "product-1": product1,
      "product-2": product2,
      "product-3": product3,
    };
  });

  describe("count utilities", () => {
    it("should count products correctly", () => {
      expect(countProducts(products)).toBe(3);
    });

    it("should count variants correctly", () => {
      expect(countVariants(products)).toBe(4); // 2 + 1 + 1
    });

    it("should count images correctly", () => {
      expect(countImages(products)).toBe(3); // 2 + 1 + 0
    });

    it("should count products matching predicate", () => {
      const clothingCount = countProductsWhere(
        products,
        (product) => product.data.Type === "Clothing",
      );
      expect(clothingCount).toBe(2);

      const fashionCoCount = countProductsWhere(
        products,
        (product) => product.data.Vendor === "Fashion Co",
      );
      expect(fashionCoCount).toBe(2);
    });

    it("should count variants matching predicate", () => {
      const expensiveVariants = countVariantsWhere(products, (variant) => {
        const price = parseFloat(variant.data["Variant Price"] || "0");
        return price > 50;
      });
      expect(expensiveVariants).toBe(1); // Only jacket ($199.99 > $50)

      const mediumSizeVariants = countVariantsWhere(products, (variant) =>
        variant.options.some((opt) => opt.value === "M"),
      );
      expect(mediumSizeVariants).toBe(2); // T-shirt M, Jacket M
    });

    it("should count products with specific tag", () => {
      const summerCount = countProductsWithTag(products, "summer");
      expect(summerCount).toBe(1);

      const cottonCount = countProductsWithTag(products, "cotton");
      expect(cottonCount).toBe(1);

      const nonExistentCount = countProductsWithTag(products, "nonexistent");
      expect(nonExistentCount).toBe(0);
    });

    it("should count products by type", () => {
      const typeStats = countProductsByType(products);
      expect(typeStats).toEqual({
        Clothing: 2,
        Accessories: 1,
      });
    });

    it("should count products by vendor", () => {
      const vendorStats = countProductsByVendor(products);
      expect(vendorStats).toEqual({
        "Fashion Co": 2,
        "Premium Brands": 1,
      });
    });

    it("should handle empty collection", () => {
      const emptyProducts = {};
      expect(countProducts(emptyProducts)).toBe(0);
      expect(countVariants(emptyProducts)).toBe(0);
      expect(countImages(emptyProducts)).toBe(0);
    });
  });

  describe("array conversion utilities", () => {
    it("should convert to product array", () => {
      const productArray = toArray(products);
      expect(productArray).toHaveLength(3);
      expect(productArray[0]).toHaveProperty("data");
      expect(productArray[0]).toHaveProperty("variants");
      expect(productArray[0]).toHaveProperty("images");
      expect(productArray[0]).toHaveProperty("metadata");
    });

    it("should convert to handle array", () => {
      const handles = toHandleArray(products);
      expect(handles).toHaveLength(3);
      expect(handles).toEqual(["product-1", "product-2", "product-3"]);
    });

    it("should convert to entry array", () => {
      const entries = toEntryArray(products);
      expect(entries).toHaveLength(3);

      const [handle, product] = entries[0];
      expect(typeof handle).toBe("string");
      expect(product).toHaveProperty("data");
      expect(handle).toBe(product.data.Handle);
    });

    it("should convert to variant array", () => {
      const variants = toVariantArray(products);
      expect(variants).toHaveLength(4);

      const firstVariant = variants[0];
      expect(firstVariant).toHaveProperty("handle");
      expect(firstVariant).toHaveProperty("product");
      expect(firstVariant).toHaveProperty("variant");
      expect(firstVariant.handle).toBe(firstVariant.product.data.Handle);
    });

    it("should convert to image array", () => {
      const images = toImageArray(products);
      expect(images).toHaveLength(3);

      const firstImage = images[0];
      expect(firstImage).toHaveProperty("handle");
      expect(firstImage).toHaveProperty("product");
      expect(firstImage).toHaveProperty("image");
      expect(firstImage.handle).toBe(firstImage.product.data.Handle);
    });

    it("should handle empty collections for array conversions", () => {
      const emptyProducts = {};

      expect(toArray(emptyProducts)).toEqual([]);
      expect(toHandleArray(emptyProducts)).toEqual([]);
      expect(toEntryArray(emptyProducts)).toEqual([]);
      expect(toVariantArray(emptyProducts)).toEqual([]);
      expect(toImageArray(emptyProducts)).toEqual([]);
    });
  });

  describe("getCollectionStats", () => {
    it("should provide comprehensive collection statistics", () => {
      const stats = getCollectionStats(products);

      expect(stats.totalProducts).toBe(3);
      expect(stats.totalVariants).toBe(4);
      expect(stats.totalImages).toBe(3);
      expect(stats.avgVariantsPerProduct).toBeCloseTo(1.33, 2);
      expect(stats.avgImagesPerProduct).toBe(1);

      expect(stats.productTypes).toEqual({
        Clothing: 2,
        Accessories: 1,
      });

      expect(stats.vendors).toEqual({
        "Fashion Co": 2,
        "Premium Brands": 1,
      });

      expect(stats.tagStats).toEqual({
        cotton: 1,
        summer: 1,
        bestseller: 1,
        wool: 1,
        winter: 1,
        premium: 1,
        leather: 1,
        accessories: 1,
      });
    });

    it("should handle empty collection stats", () => {
      const emptyProducts = {};
      const stats = getCollectionStats(emptyProducts);

      expect(stats.totalProducts).toBe(0);
      expect(stats.totalVariants).toBe(0);
      expect(stats.totalImages).toBe(0);
      expect(stats.avgVariantsPerProduct).toBe(0);
      expect(stats.avgImagesPerProduct).toBe(0);
      expect(stats.productTypes).toEqual({});
      expect(stats.vendors).toEqual({});
      expect(stats.tagStats).toEqual({});
    });

    describe("Price Utilities", () => {
      describe("parsePrice", () => {
        it("should parse standard price formats", () => {
          expect(parsePrice("29.99")).toBe(29.99);
          expect(parsePrice("199.00")).toBe(199);
          expect(parsePrice("0.99")).toBe(0.99);
          expect(parsePrice("1234.56")).toBe(1234.56);
        });

        it("should handle prices with currency symbols", () => {
          expect(parsePrice("$29.99")).toBe(29.99);
          expect(parsePrice("£199.00")).toBe(199);
          expect(parsePrice("€0.99")).toBe(0.99);
          expect(parsePrice("¥1234")).toBe(1234);
          expect(parsePrice("29.99$")).toBe(29.99);
        });

        it("should handle European format with comma decimal separator", () => {
          expect(parsePrice("29,99")).toBe(29.99);
          expect(parsePrice("199,00")).toBe(199);
          expect(parsePrice("0,99")).toBe(0.99);
        });

        it("should handle thousands separators", () => {
          expect(parsePrice("1,234.56")).toBe(1234.56);
          expect(parsePrice("1.234,56")).toBe(1234.56);
          expect(parsePrice("1,234")).toBe(1234);
          expect(parsePrice("10,000.00")).toBe(10000);
        });

        it("should handle special cases", () => {
          expect(parsePrice("FREE")).toBe(0);
          expect(parsePrice("free")).toBe(0);
          expect(parsePrice("0.00")).toBe(0);
          expect(parsePrice("0")).toBe(0);
        });

        it("should handle negative prices", () => {
          expect(parsePrice("-29.99")).toBe(-29.99);
          expect(parsePrice("$-29.99")).toBe(-29.99);
          expect(parsePrice("-$29.99")).toBe(-29.99);
        });

        it("should handle whitespace", () => {
          expect(parsePrice("  29.99  ")).toBe(29.99);
          expect(parsePrice(" $ 29.99 ")).toBe(29.99);
        });

        it("should handle invalid inputs", () => {
          expect(parsePrice("")).toBeNaN();
          expect(parsePrice("   ")).toBeNaN();
          expect(parsePrice("invalid")).toBeNaN();
          expect(parsePrice("abc123")).toBeNaN();
          expect(parsePrice(null)).toBeNaN();
          expect(parsePrice(undefined)).toBeNaN();
        });

        it("should handle edge cases with multiple separators", () => {
          expect(parsePrice("1,234,567.89")).toBe(1234567.89);
          expect(parsePrice("1.234.567,89")).toBe(1234567.89);
        });
      });

      describe("stringifyPrice", () => {
        it("should format numbers correctly", () => {
          expect(stringifyPrice(29.99)).toBe("29.99");
          expect(stringifyPrice(30)).toBe("30.00");
          expect(stringifyPrice(1234.5)).toBe("1234.50");
          expect(stringifyPrice(0)).toBe("0.00");
        });

        it("should handle custom decimal places", () => {
          expect(stringifyPrice(29.999, 3)).toBe("29.999");
          expect(stringifyPrice(30, 0)).toBe("30");
          expect(stringifyPrice(29.99, 1)).toBe("30.0");
        });

        it("should handle string inputs", () => {
          expect(stringifyPrice("29.99")).toBe("29.99");
          expect(stringifyPrice("$30.00")).toBe("30.00");
          expect(stringifyPrice("1,234.56")).toBe("1234.56");
        });

        it("should handle invalid inputs", () => {
          expect(stringifyPrice(NaN)).toBe("");
          expect(stringifyPrice(Infinity)).toBe("");
          expect(stringifyPrice("invalid")).toBe("");
          expect(stringifyPrice(null)).toBe("");
          expect(stringifyPrice(undefined)).toBe("");
        });

        it("should handle negative prices", () => {
          expect(stringifyPrice(-29.99)).toBe("-29.99");
          expect(stringifyPrice(-0)).toBe("0.00");
        });

        it("should handle invalid decimal places", () => {
          expect(stringifyPrice(29.99, -1)).toBe("29.99"); // Falls back to 2
          expect(stringifyPrice(29.99, 2.5)).toBe("29.99"); // Falls back to 2
        });
      });

      describe("isValidPrice", () => {
        it("should validate correct Shopify price format", () => {
          expect(isValidPrice("29.99")).toBe(true);
          expect(isValidPrice("30.00")).toBe(true);
          expect(isValidPrice("0.99")).toBe(true);
          expect(isValidPrice("1234.56")).toBe(true);
          expect(isValidPrice("0")).toBe(true);
          expect(isValidPrice("1234")).toBe(true);
        });

        it("should reject invalid formats", () => {
          expect(isValidPrice("$29.99")).toBe(false);
          expect(isValidPrice("29,99")).toBe(false);
          expect(isValidPrice("1,234.56")).toBe(false);
          expect(isValidPrice("FREE")).toBe(false);
          expect(isValidPrice("")).toBe(false);
          expect(isValidPrice("  ")).toBe(false);
          expect(isValidPrice("29.999")).toBe(false);
          expect(isValidPrice("-29.99")).toBe(false);
        });

        it("should handle null and undefined", () => {
          expect(isValidPrice(null)).toBe(false);
          expect(isValidPrice(undefined)).toBe(false);
        });
      });

      describe("normalizePrice", () => {
        it("should normalize various formats to Shopify format", () => {
          expect(normalizePrice("$29.99")).toBe("29.99");
          expect(normalizePrice("29,99")).toBe("29.99");
          expect(normalizePrice("1,234.56")).toBe("1234.56");
          expect(normalizePrice("FREE")).toBe("0.00");
          expect(normalizePrice(29.99)).toBe("29.99");
        });

        it("should handle invalid inputs", () => {
          expect(normalizePrice("invalid")).toBe("");
          expect(normalizePrice("")).toBe("");
          expect(normalizePrice(null)).toBe("");
        });
      });

      describe("updateVariantPrice", () => {
        let variant: ShopifyCSVParsedVariant;

        beforeEach(() => {
          variant = {
            data: {
              "Variant SKU": "TEST-SKU",
              "Variant Price": "29.99",
              "Variant Compare At Price": "",
            } as any,
            options: [],
          };
        });

        it("should update variant price successfully", () => {
          expect(updateVariantPrice(variant, 35.99)).toBe(true);
          expect(variant.data["Variant Price"]).toBe("35.99");
        });

        it("should handle string prices", () => {
          expect(updateVariantPrice(variant, "$40.00")).toBe(true);
          expect(variant.data["Variant Price"]).toBe("40.00");
        });

        it("should handle custom field names", () => {
          expect(
            updateVariantPrice(variant, 45.99, "Variant Compare At Price"),
          ).toBe(true);
          expect(variant.data["Variant Compare At Price"]).toBe("45.99");
        });

        it("should reject invalid prices", () => {
          const originalPrice = variant.data["Variant Price"];
          expect(updateVariantPrice(variant, "invalid")).toBe(false);
          expect(variant.data["Variant Price"]).toBe(originalPrice);
        });
      });

      describe("updateVariantCompareAtPrice", () => {
        let variant: ShopifyCSVParsedVariant;

        beforeEach(() => {
          variant = {
            data: {
              "Variant SKU": "TEST-SKU",
              "Variant Price": "29.99",
              "Variant Compare At Price": "",
            } as any,
            options: [],
          };
        });

        it("should update compare at price", () => {
          expect(updateVariantCompareAtPrice(variant, 39.99)).toBe(true);
          expect(variant.data["Variant Compare At Price"]).toBe("39.99");
        });
      });

      describe("adjustPrice", () => {
        it("should handle percentage adjustments", () => {
          expect(adjustPrice("30.00", 10, "percentage")).toBe("33.00");
          expect(adjustPrice("29.99", -10, "percentage")).toBe("26.99");
          expect(adjustPrice(100, 50, "percentage")).toBe("150.00");
        });

        it("should handle fixed adjustments", () => {
          expect(adjustPrice("30.00", 5, "fixed")).toBe("35.00");
          expect(adjustPrice("29.99", -5, "fixed")).toBe("24.99");
          expect(adjustPrice(100, -10, "fixed")).toBe("90.00");
        });

        it("should prevent negative prices", () => {
          expect(adjustPrice("10.00", -15, "fixed")).toBe("0.00");
          expect(adjustPrice("29.99", -200, "percentage")).toBe("0.00");
        });

        it("should handle invalid inputs", () => {
          expect(adjustPrice("invalid", 10, "percentage")).toBe("");
          expect(adjustPrice(NaN, 10, "percentage")).toBe("");
        });
      });

      describe("comparePrice", () => {
        it("should compare prices correctly", () => {
          expect(comparePrice("29.99", "30.00")).toBe(-1);
          expect(comparePrice("30.00", "29.99")).toBe(1);
          expect(comparePrice("29.99", "29.99")).toBe(0);
          expect(comparePrice(30, "29.99")).toBe(1);
        });

        it("should handle invalid prices", () => {
          expect(comparePrice("invalid", "29.99")).toBeNaN();
          expect(comparePrice("29.99", "invalid")).toBeNaN();
        });
      });

      describe("minPrice and maxPrice", () => {
        it("should find min and max prices", () => {
          const prices = ["29.99", "$35.00", "1,234.56", "0.99"];
          expect(minPrice(prices)).toBe("0.99");
          expect(maxPrice(prices)).toBe("1234.56");
        });

        it("should handle empty or invalid arrays", () => {
          expect(minPrice([])).toBe("");
          expect(maxPrice([])).toBe("");
          expect(minPrice(["invalid", "also invalid"])).toBe("");
        });
      });

      describe("averagePrice", () => {
        it("should calculate average price", () => {
          const prices = ["10.00", "20.00", "30.00"];
          expect(averagePrice(prices)).toBe("20.00");
        });

        it("should handle mixed formats", () => {
          const prices = ["$10.00", "20,00", "30.00"];
          expect(averagePrice(prices)).toBe("20.00");
        });

        it("should handle empty arrays", () => {
          expect(averagePrice([])).toBe("");
        });
      });
    });
  });

  describe("Option Linked To functionality", () => {
    it("should parse and preserve Option Linked To fields", async () => {
      const csvContent = `Handle,Title,Option1 Name,Option1 Value,Option1 Linked To,Option2 Name,Option2 Value,Option2 Linked To,Variant SKU,Variant Price
test-product,Test Product,Color,Red,red-variant.jpg,Size,Large,large-size.jpg,SKU-RED-L,25.00
test-product,,,Blue,blue-variant.jpg,,Medium,medium-size.jpg,SKU-BLUE-M,30.00`;

      const { parseShopifyCSVFromString } = await import("../src/index.js");
      const products = await parseShopifyCSVFromString(csvContent);
      const product = products["test-product"];

      expect(product.variants).toHaveLength(2);

      // Check first variant (Red, Large)
      const redVariant = product.variants[0];
      expect(redVariant.options).toHaveLength(2);
      expect(redVariant.options[0]).toEqual({
        name: "Color",
        value: "Red",
        linkedTo: "red-variant.jpg",
      });
      expect(redVariant.options[1]).toEqual({
        name: "Size",
        value: "Large",
        linkedTo: "large-size.jpg",
      });

      // Check second variant (Blue, Medium)
      const blueVariant = product.variants[1];
      expect(blueVariant.options).toHaveLength(2);
      expect(blueVariant.options[0]).toEqual({
        name: "Color",
        value: "Blue",
        linkedTo: "blue-variant.jpg",
      });
      expect(blueVariant.options[1]).toEqual({
        name: "Size",
        value: "Medium",
        linkedTo: "medium-size.jpg",
      });
    });

    it("should preserve linkedTo when stringifying back to CSV", async () => {
      const csvContent = `Handle,Title,Option1 Name,Option1 Value,Option1 Linked To,Variant SKU,Variant Price
test-product,Test Product,Color,Red,red-variant.jpg,SKU-RED,25.00`;

      const { parseShopifyCSVFromString, stringifyShopifyCSV } = await import(
        "../src/index.js"
      );
      const products = await parseShopifyCSVFromString(csvContent);
      const csvOutput = await stringifyShopifyCSV(products);

      expect(csvOutput).toContain("red-variant.jpg");
      expect(csvOutput).toContain("Option1 Linked To");
    });

    it("should handle undefined linkedTo values gracefully", async () => {
      const csvContent = `Handle,Title,Option1 Name,Option1 Value,Option1 Linked To,Variant SKU,Variant Price
test-product,Test Product,Color,Red,,SKU-RED,25.00`;

      const { parseShopifyCSVFromString } = await import("../src/index.js");
      const products = await parseShopifyCSVFromString(csvContent);
      const product = products["test-product"];

      expect(product.variants[0].options[0]).toEqual({
        name: "Color",
        value: "Red",
        linkedTo: undefined,
      });
    });

    it("should support linkedTo in addVariant utility function", () => {
      const product = createProduct({
        handle: "test-product",
        title: "Test Product",
      });

      addVariant(product, {
        options: { Color: "Blue", Size: "Medium" },
        linkedTo: { Color: "blue-variant.jpg", Size: "medium-size.jpg" },
        "Variant SKU": "SKU-BLUE-M",
        "Variant Price": "30.00",
      });

      expect(product.variants[0].options).toEqual([
        { name: "Color", value: "Blue", linkedTo: "blue-variant.jpg" },
        { name: "Size", value: "Medium", linkedTo: "medium-size.jpg" },
      ]);
    });
  });

  describe("Google Shopping Utilities", () => {
    let products: Record<string, ShopifyProductCSVParsedRow>;

    beforeEach(() => {
      products = {
        "product-1": createProduct("product-1", {
          Title: "Test Product 1",
          "Google Shopping / Gender": "unisex",
          "Google Shopping / Condition": "new",
          "Google Shopping / Age Group": "adult",
          "Google Shopping / Custom Label 0": "premium",
        }),
        "product-2": createProduct("product-2", {
          Title: "Test Product 2",
          "Google Shopping / Gender": "male",
          "Google Shopping / Condition": "new",
        }),
      };
    });

    describe("getGoogleShoppingAttributes", () => {
      it("should extract Google Shopping attributes correctly", () => {
        const attrs = getGoogleShoppingAttributes(products["product-1"]);
        expect(attrs.gender).toBe("unisex");
        expect(attrs.condition).toBe("new");
        expect(attrs.ageGroup).toBe("adult");
        expect(attrs.customLabel0).toBe("premium");
        expect(attrs.category).toBeUndefined();
      });
    });

    describe("setGoogleShoppingAttributes", () => {
      it("should set Google Shopping attributes correctly", () => {
        setGoogleShoppingAttributes(products["product-1"], {
          gender: "female",
          condition: "refurbished",
          customLabel1: "sale",
        });

        expect(products["product-1"].data["Google Shopping / Gender"]).toBe(
          "female",
        );
        expect(products["product-1"].data["Google Shopping / Condition"]).toBe(
          "refurbished",
        );
        expect(
          products["product-1"].data["Google Shopping / Custom Label 1"],
        ).toBe("sale");
      });
    });

    describe("findProductsByGoogleGender", () => {
      it("should find products by gender", () => {
        const unisexProducts = findProductsByGoogleGender(products, "unisex");
        const maleProducts = findProductsByGoogleGender(products, "male");

        expect(unisexProducts).toHaveLength(1);
        expect(unisexProducts[0].data.Handle).toBe("product-1");
        expect(maleProducts).toHaveLength(1);
        expect(maleProducts[0].data.Handle).toBe("product-2");
      });
    });

    describe("getGoogleShoppingStats", () => {
      it("should provide Google Shopping statistics", () => {
        const stats = getGoogleShoppingStats(products);

        expect(stats.totalProducts).toBe(2);
        expect(stats.totalWithGoogleData).toBe(2);
        expect(stats.genders).toEqual({ unisex: 1, male: 1 });
        expect(stats.conditions).toEqual({ new: 2 });
        expect(stats.ageGroups).toEqual({ adult: 1 });
      });
    });
  });

  describe("Variant Search Utilities", () => {
    let products: Record<string, ShopifyProductCSVParsedRow>;

    beforeEach(() => {
      products = {
        shirt: createProduct("shirt", { Title: "T-Shirt" }),
        pants: createProduct("pants", { Title: "Pants" }),
      };

      addVariant(products["shirt"], {
        options: { Color: "Red", Size: "M" },
        "Variant SKU": "SHIRT-RED-M",
        "Variant Barcode": "123456789",
        "Variant Price": "25.00",
      });

      addVariant(products["shirt"], {
        options: { Color: "Blue", Size: "L" },
        "Variant SKU": "SHIRT-BLUE-L",
        "Variant Barcode": "987654321",
        "Variant Price": "25.00",
      });

      addVariant(products["pants"], {
        options: { Color: "Black", Size: "32" },
        "Variant SKU": "PANTS-BLACK-32",
        "Variant Price": "45.00",
      });
    });

    describe("findVariantBySKU", () => {
      it("should find variant by SKU", () => {
        const result = findVariantBySKU(products, "SHIRT-RED-M");
        expect(result).toBeDefined();
        expect(result!.handle).toBe("shirt");
        expect(result!.variant.data["Variant SKU"]).toBe("SHIRT-RED-M");
      });

      it("should return undefined for non-existent SKU", () => {
        const result = findVariantBySKU(products, "NON-EXISTENT");
        expect(result).toBeUndefined();
      });
    });

    describe("findVariantByBarcode", () => {
      it("should find variant by barcode", () => {
        const result = findVariantByBarcode(products, "123456789");
        expect(result).toBeDefined();
        expect(result!.variant.data["Variant Barcode"]).toBe("123456789");
      });

      it("should return undefined for non-existent barcode", () => {
        const result = findVariantByBarcode(products, "000000000");
        expect(result).toBeUndefined();
      });
    });

    describe("findVariantsBySKUs", () => {
      it("should find multiple variants by SKUs", () => {
        const results = findVariantsBySKUs(products, [
          "SHIRT-RED-M",
          "PANTS-BLACK-32",
          "NON-EXISTENT",
        ]);
        expect(results).toHaveLength(2);
        expect(results[0].sku).toBe("SHIRT-RED-M");
        expect(results[1].sku).toBe("PANTS-BLACK-32");
      });
    });

    describe("findVariantsWithMissingSKUs", () => {
      it("should find variants without SKUs", () => {
        // Add a variant without SKU
        addVariant(products["shirt"], {
          options: { Color: "Green", Size: "S" },
          "Variant Price": "25.00",
        });

        const missing = findVariantsWithMissingSKUs(products);
        expect(missing).toHaveLength(1);
        expect(missing[0].handle).toBe("shirt");
      });
    });

    describe("findDuplicateSKUs", () => {
      it("should find duplicate SKUs", () => {
        // Add duplicate SKU
        addVariant(products["pants"], {
          options: { Color: "Blue", Size: "34" },
          "Variant SKU": "SHIRT-RED-M", // Duplicate
          "Variant Price": "45.00",
        });

        const duplicates = findDuplicateSKUs(products);
        expect(duplicates.get("SHIRT-RED-M")).toHaveLength(2);
      });
    });
  });
});
