/**
 * @file example.js
 * @description
 * Example demonstrating how to work with Shopify CSV "Option X Linked To" fields
 * using parse-shopify-csv. These fields are commonly used to link variant options
 * to specific images or other resources.
 */

import { parseShopifyCSVFromString, stringifyShopifyCSV } from '../../../dist/esm/production/index.js';

// Example CSV data with Option Linked To fields
const csvWithLinkedTo = `Handle,Title,Vendor,Option1 Name,Option1 Value,Option1 Linked To,Option2 Name,Option2 Value,Option2 Linked To,Variant SKU,Variant Price,Image Src
vintage-tshirt,Vintage Band T-Shirt,Rock Merch Co,Color,Black,black-tshirt.jpg,Size,Medium,medium-size.jpg,VTS-BLACK-M,29.99,vintage-tshirt-main.jpg
vintage-tshirt,,,Red,red-tshirt.jpg,,Large,large-size.jpg,VTS-RED-L,29.99,
vintage-tshirt,,,Blue,blue-tshirt.jpg,,Small,small-size.jpg,VTS-BLUE-S,29.99,`;

async function demonstrateLinkedToFunctionality() {
  console.log('🎯 Demonstrating Option Linked To functionality\n');

  // Parse the CSV
  const products = await parseShopifyCSVFromString(csvWithLinkedTo);
  const tshirt = products['vintage-tshirt'];

  console.log('📦 Product:', tshirt.data.Title);
  console.log('🏷️  Variants found:', tshirt.variants.length, '\n');

  // Display all variants with their linked options
  tshirt.variants.forEach((variant, index) => {
    console.log(`🔹 Variant ${index + 1}: ${variant.data['Variant SKU']}`);

    variant.options.forEach(option => {
      console.log(`   ${option.name}: ${option.value}`);
      if (option.linkedTo) {
        console.log(`   ↳ Linked to: ${option.linkedTo}`);
      }
    });
    console.log(`   💰 Price: $${variant.data['Variant Price']}\n`);
  });

  // Demonstrate modifying linked options
  console.log('✏️  Modifying linked options...\n');

  // Update the first variant's color linked image
  const firstVariant = tshirt.variants[0];
  const colorOption = firstVariant.options.find(opt => opt.name === 'Color');
  if (colorOption) {
    colorOption.linkedTo = 'updated-black-tshirt.jpg';
    console.log(`Updated Color option linked to: ${colorOption.linkedTo}`);
  }

  // Add a new variant with linked options using the utility function
  console.log('\n➕ Adding new variant with linked options...\n');

  const { addVariant } = await import('../../../dist/esm/production/utils.js');

  addVariant(tshirt, {
    options: { Color: 'Green', Size: 'XL' },
    linkedTo: { Color: 'green-tshirt.jpg', Size: 'xl-size.jpg' },
    'Variant SKU': 'VTS-GREEN-XL',
    'Variant Price': '32.99'
  });

  const newVariant = tshirt.variants[tshirt.variants.length - 1];
  console.log(`🆕 New variant: ${newVariant.data['Variant SKU']}`);
  newVariant.options.forEach(option => {
    console.log(`   ${option.name}: ${option.value} → ${option.linkedTo || 'no link'}`);
  });

  // Convert back to CSV to show the linked fields are preserved
  console.log('\n💾 Converting back to CSV...\n');
  const updatedCSV = await stringifyShopifyCSV(products);

  // Show relevant lines that demonstrate the linked fields
  const lines = updatedCSV.split('\n');
  const headers = lines[0];
  console.log('CSV Headers (showing linked fields):');
  console.log(headers);
  console.log('\nFirst few data rows:');
  lines.slice(1, 4).forEach((line, i) => {
    if (line.trim()) {
      console.log(`Row ${i + 1}: ${line}`);
    }
  });

  // Demonstrate searching for variants by linked images
  console.log('\n🔍 Finding variants by linked images...\n');

  const variantsWithGreenImage = tshirt.variants.filter(variant =>
    variant.options.some(option => option.linkedTo?.includes('green'))
  );

  console.log(`Found ${variantsWithGreenImage.length} variant(s) with green-related images:`);
  variantsWithGreenImage.forEach(variant => {
    console.log(`   - ${variant.data['Variant SKU']}`);
  });

  console.log('\n✅ Option Linked To functionality demonstration complete!');
}

// Run the example
demonstrateLinkedToFunctionality().catch(console.error);
