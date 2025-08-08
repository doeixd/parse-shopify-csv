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
