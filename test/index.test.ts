import { describe, it, expect } from 'vitest';
import { map, filter, createProduct } from '../src/utils';
import { ShopifyProductCSVParsedRow } from '../src';

describe('map', () => {
  it('should map over products and return a new collection', () => {
    const products: Record<string, ShopifyProductCSVParsedRow> = {
      'product-1': createProduct('product-1', { Title: 'Product 1' }),
      'product-2': createProduct('product-2', { Title: 'Product 2' }),
    };

    const newProducts = map(products, (p) => {
      p.data.Title = p.data.Title.toUpperCase();
      return p;
    });

    expect(newProducts['product-1'].data.Title).toBe('PRODUCT 1');
    expect(newProducts['product-2'].data.Title).toBe('PRODUCT 2');
    expect(products['product-1'].data.Title).toBe('Product 1'); // Original should be unchanged
  });

  it('should not clone when shouldCloneBeforePassedToCb is false', () => {
    const products: Record<string, ShopifyProductCSVParsedRow> = {
      'product-1': createProduct('product-1', { Title: 'Product 1' }),
    };

    map(products, (p) => {
      p.data.Title = 'New Title';
      return p;
    }, false);

    expect(products['product-1'].data.Title).toBe('New Title');
  });
});

describe('filter', () => {
  it('should filter products based on the predicate', () => {
    const products: Record<string, ShopifyProductCSVParsedRow> = {
      'product-1': createProduct('product-1', { Status: 'active' }),
      'product-2': createProduct('product-2', { Status: 'draft' }),
    };

    const activeProducts = filter(products, (p) => p.data.Status === 'active');

    expect(Object.keys(activeProducts).length).toBe(1);
    expect(activeProducts['product-1']).toBeDefined();
  });
});
