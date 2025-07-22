import { DataSource } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { Category } from '../../entities/category.entity';
import { BarcodeType } from '@beezly/types';

export async function seedProducts(dataSource: DataSource) {
  const productRepository = dataSource.getRepository(Product);
  const categoryRepository = dataSource.getRepository(Category);

  // Check if products already exist
  const existingProducts = await productRepository.count();
  if (existingProducts > 0) {
    console.log('  ⏭️  Products already seeded, skipping...');
    return;
  }

  console.log('  🔄 Seeding product dataset (this may take a moment)...');

  // Get all categories
  const categories = await categoryRepository.find();
  const categoryMap = new Map<string, number>();

  categories.forEach((cat) => {
    const key = cat.name?.toLowerCase().replace(/[^a-z]/g, '') || '';
    if (key.includes('produce')) categoryMap.set('produce', cat.id);
    if (key.includes('dairy') || key.includes('eggs'))
      categoryMap.set('dairy', cat.id);
    if (key.includes('meat') || key.includes('seafood'))
      categoryMap.set('meat', cat.id);
    if (key.includes('beverage')) categoryMap.set('beverages', cat.id);
    if (key.includes('snack') || key.includes('candy'))
      categoryMap.set('snacks', cat.id);
    if (key.includes('bakery') || key.includes('bread'))
      categoryMap.set('bakery', cat.id);
    if (key.includes('frozen')) categoryMap.set('frozen', cat.id);
    if (key.includes('pantry') || key.includes('dry'))
      categoryMap.set('pantry', cat.id);
    if (key.includes('household') || key.includes('cleaning'))
      categoryMap.set('household', cat.id);
  });

  const products = [
    {
      name: 'Creamy Peanut Butter',
      barcode: '0068100084245',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/008/4245/front_en.86.400.jpg',
    },
    {
      name: 'Smooth Peanut Butter',
      barcode: '0068100084276',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/008/4276/front_en.34.400.jpg',
    },
    {
      name: 'natural Peanut Butter creamy',
      barcode: '0096619450008',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/945/0008/front_en.35.400.jpg',
    },
    {
      name: 'Heinz ketchup',
      barcode: '0057000002992',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/700/000/2992/front_fr.5.400.jpg',
    },
    {
      name: 'Creamy Almond Butter',
      barcode: '0096619859696',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/985/9696/front_en.42.400.jpg',
    },
    {
      name: 'Kraft Dinner original',
      barcode: '0068100904826',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/090/4826/front_fr.3.400.jpg',
    },
    {
      name: 'Only Peanuts, Smooth',
      barcode: '0068100084665',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/008/4665/front_en.13.400.jpg',
    },
    {
      name: 'Eau de Source Naturelle',
      barcode: '0096619321841',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/932/1841/front_en.23.400.jpg',
    },
    {
      name: 'Organic Honey - No 1 Amber',
      barcode: '0055828910017',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/582/891/0017/front_en.38.400.jpg',
    },
    {
      name: 'Nutella',
      barcode: '0062020000842',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/202/000/0842/front_en.41.400.jpg',
    },
    {
      name: 'Eska - Eau de source naturelle',
      barcode: '0671785501008',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/067/178/550/1008/front_en.12.400.jpg',
    },
    {
      name: 'Oat Original',
      barcode: '0626027811025',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/602/781/1025/front_en.62.400.jpg',
    },
    {
      name: 'Original cream cheese product',
      barcode: '0068100896459',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/089/6459/front_en.33.400.jpg',
    },
    {
      name: 'Natural spring water',
      barcode: '0068274000218',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/827/400/0218/front_en.33.400.jpg',
    },
    {
      name: 'Natural, No Gelatin Yogourt',
      barcode: '0068200750156',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/820/075/0156/front_en.39.400.jpg',
    },
    {
      name: 'Real mayonnaise',
      barcode: '0068400662600',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/840/066/2600/front_en.46.400.jpg',
    },
    {
      name: 'Heinz Tomato Ketchup',
      barcode: '0057000613280',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/700/061/3280/front_en.40.400.jpg',
    },
    {
      name: 'Coca-cola Classique',
      barcode: '06782900',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/678/2900/front_en.24.400.jpg',
    },
    {
      name: 'Juste des arachides - croquant',
      barcode: '0068100890556',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/089/0556/front_en.47.400.jpg',
    },
    {
      name: 'Breton legume du jardin',
      barcode: '0055653686040',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/565/368/6040/front_en.18.400.jpg',
    },
    {
      name: 'Beurre arachide crmeux',
      barcode: '0068100083293',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/008/3293/front_en.31.400.jpg',
    },
    {
      name: 'Beurre Darachide Croquant',
      barcode: '0068100084238',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/008/4238/front_en.54.400.jpg',
    },
    {
      name: 'Whole Grain Cereal',
      barcode: '0055712100142',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/571/210/0142/front_en.42.400.jpg',
    },
    {
      name: 'Que Pasa Organic Tortilla Chips',
      barcode: '0096619161553',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/916/1553/front_en.3.400.jpg',
    },
    {
      name: 'Hazelnut spread with cocoa',
      barcode: '0096619331130',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/933/1130/front_en.44.400.jpg',
    },
    {
      name: 'Greek Yogourt',
      barcode: '0096619553303',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/955/3303/front_fr.35.400.jpg',
    },
    {
      name: 'Ancient Grains Probiotic Granola',
      barcode: '0096619194261',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/919/4261/front_en.117.400.jpg',
    },
    {
      name: 'Coca-Cola Zero',
      barcode: '06731906',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/673/1906/front_en.21.400.jpg',
    },
    {
      name: 'Crispy minis',
      barcode: '0055577107799',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/710/7799/front_en.16.400.jpg',
    },
    {
      name: 'Fine Ground Sea Salt Almond Flour Crackers',
      barcode: '0856069005612',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/085/606/900/5612/front_en.24.400.jpg',
    },
    {
      name: 'Breton Original',
      barcode: '0055653670247',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/565/367/0247/front_fr.27.400.jpg',
    },
    {
      name: 'Pepsi Cola',
      barcode: '0069000004258',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/900/000/4258/front_en.5.400.jpg',
    },
    {
      name: 'Tomato Soup',
      barcode: '0061202021200',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/120/202/1200/front_en.36.400.jpg',
    },
    {
      name: 'Mustard',
      barcode: '0056200762170',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/620/076/2170/front_en.32.400.jpg',
    },
    {
      name: 'Almond, Unsweet, Chilled. made in',
      barcode: '0025293001503',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/002/529/300/1503/front_en.69.400.jpg',
    },
    {
      name: 'Quinoa Bread',
      barcode: '0068505110051',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/850/511/0051/front_fr.16.400.jpg',
    },
    {
      name: 'Triscuit Low Sodium',
      barcode: '0066721007469',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/100/7469/front_en.55.400.jpg',
    },
    {
      name: 'Margarine with Olive Oil',
      barcode: '0011115001356',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/111/500/1356/front_en.33.400.jpg',
    },
    {
      name: 'Lentil & Vegetable Organic Soup',
      barcode: '0061148179010',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/114/817/9010/front_en.121.400.jpg',
    },
    {
      name: 'Cheerios',
      barcode: '0065633132818',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/313/2818/front_en.4.400.jpg',
    },
    {
      name: 'Tomato Ketchup',
      barcode: '0056200926466',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/620/092/6466/front_en.19.400.jpg',
    },
    {
      name: 'Almond Unsweetened Original',
      barcode: '0626027700039',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/602/770/0039/front_en.66.400.jpg',
    },
    {
      name: '100% whole grains 12 grain bread',
      barcode: '0068721722342',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/872/172/2342/front_fr.4.400.jpg',
    },
    {
      name: 'Roasted Pumpkin Seeds',
      barcode: '0626394305608',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/639/430/5608/front_en.15.400.jpg',
    },
    {
      name: 'beurre de noix mlanges avec graines',
      barcode: '0096619225798',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/922/5798/front_en.70.400.jpg',
    },
    {
      name: 'Original Harvest Crunch',
      barcode: '0055577105405',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/710/5405/front_en.39.400.jpg',
    },
    {
      name: 'Smooth Peanut Butter',
      barcode: '0068100084214',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/008/4214/front_en.67.400.jpg',
    },
    {
      name: 'Unsweetened Organic Fortified Soy Beverage',
      barcode: '0063667511005',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/366/751/1005/front_en.53.400.jpg',
    },
    {
      name: 'Quick Oats (Canada)',
      barcode: '0055577101100',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/710/1100/front_en.51.400.jpg',
    },
    {
      name: 'Organic Real Food Bar Blueberry Almond Butter',
      barcode: '0068826176033',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/882/617/6033/front_en.51.400.jpg',
    },
    {
      name: 'Oat Original (shelf-stable)',
      barcode: '0626027814026',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/602/781/4026/front_en.43.400.jpg',
    },
    {
      name: 'Lait Partiellement crm 2 % m.g.',
      barcode: '0064420010124',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/442/001/0124/front_en.35.400.jpg',
    },
    {
      name: 'Frenchs Mustard',
      barcode: '0056200824861',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/620/082/4861/front_fr.33.400.jpg',
    },
    {
      name: 'Muesli Cereal No Sugar Added',
      barcode: '0055712115344',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/571/211/5344/front_en.46.400.jpg',
    },
    {
      name: 'Mayonnaise',
      barcode: '0068400616603',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/840/061/6603/front_fr.8.400.jpg',
    },
    {
      name: 'Heinz beans original',
      barcode: '0057000007034',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/700/000/7034/front_en.47.400.jpg',
    },
    {
      name: 'Unsalted Mixed Nuts',
      barcode: '0096619885718',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/988/5718/front_en.65.400.jpg',
    },
    {
      name: 'Eau',
      barcode: '0057379105010',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/737/910/5010/front_en.5.400.jpg',
    },
    {
      name: 'Large Flake Oats (Canada)',
      barcode: '0055577101018',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/710/1018/front_en.46.400.jpg',
    },
    {
      name: 'Chocolate Chip Organic Granola Bars',
      barcode: '0687456216133',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/068/745/621/6133/front_en.36.400.jpg',
    },
    {
      name: 'Honey Nut Cheerios',
      barcode: '0065633134140',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/313/4140/front_en.32.400.jpg',
    },
    {
      name: 'Liquid Honey, White',
      barcode: '0096619372379',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/937/2379/front_en.24.400.jpg',
    },
    {
      name: 'Organic KETO Grain Free Granola',
      barcode: '0677210091823',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/067/721/009/1823/front_fr.3.400.jpg',
    },
    {
      name: 'Almonds',
      barcode: '0096619846016',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/984/6016/front_en.36.400.jpg',
    },
    {
      name: 'LA VACHE QUI RIT',
      barcode: '0041757011413',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/004/175/701/1413/front_en.29.400.jpg',
    },
    {
      name: 'Tardinade traditionnelle',
      barcode: '0068200701066',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/820/070/1066/front_fr.22.400.jpg',
    },
    {
      name: 'Family Size Classic Potato Chips',
      barcode: '0060410047019',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/004/7019/front_en.28.400.jpg',
    },
    {
      name: 'ROLLED OATS',
      barcode: '0675625323188',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/067/562/532/3188/front_en.67.400.jpg',
    },
    {
      name: 'Pitted Dates',
      barcode: '0832650006008',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/083/265/000/6008/front_en.29.400.jpg',
    },
    {
      name: 'Canada Dry Ginger Ale',
      barcode: '06224017',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/622/4017/front_en.7.400.jpg',
    },
    {
      name: 'Nesquik Less Sugar',
      barcode: '0055000139045',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/500/013/9045/front_en.3.400.jpg',
    },
    {
      name: 'Hummus Traditional',
      barcode: '0770333022023',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/077/033/302/2023/front_en.4.400.jpg',
    },
    {
      name: 'Original',
      barcode: '0066721007421',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/100/7421/front_fr.26.400.jpg',
    },
    {
      name: 'All bran buds jumbo pack',
      barcode: '0064100271913',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/027/1913/front_fr.37.400.jpg',
    },
    {
      name: 'Margarine - Becel',
      barcode: '0059950191009',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/995/019/1009/front_en.31.400.jpg',
    },
    {
      name: 'Smooth Peanut Butter',
      barcode: '0060383708825',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/370/8825/front_en.36.400.jpg',
    },
    {
      name: 'Almond Fruit Crunch, Gluten-Free',
      barcode: '0677210091472',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/067/721/009/1472/front_en.51.400.jpg',
    },
    {
      name: '14 Grains Loaf',
      barcode: '0063400138711',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/340/013/8711/front_en.24.400.jpg',
    },
    {
      name: 'Real Mayonaise',
      barcode: '0068400616207',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/840/061/6207/front_en.26.400.jpg',
    },
    {
      name: 'Pepsi Diet',
      barcode: '0069000014257',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/900/001/4257/front_fr.32.400.jpg',
    },
    {
      name: 'Jif Peanut Butter',
      barcode: '0051500750056',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/150/075/0056/front_en.22.400.jpg',
    },
    {
      name: 'Natural Spring Water',
      barcode: '0605388881243',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/060/538/888/1243/front_en.39.400.jpg',
    },
    {
      name: 'Arachides',
      barcode: '0096619234998',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/923/4998/front_fr.12.400.jpg',
    },
    {
      name: 'Cream of Mushroom Soup',
      barcode: '0063211012613',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/321/101/2613/front_en.32.400.jpg',
    },
    {
      name: 'Canada Corn Starch',
      barcode: '0761720989951',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/076/172/098/9951/front_en.18.400.jpg',
    },
    {
      name: 'Fancy Whole Cashews with Sea Salt',
      barcode: '0096619142453',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/914/2453/front_en.31.400.jpg',
    },
    {
      name: 'Grand-Pre Home style bread Oat Saint-Mthode',
      barcode: '0068505100366',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/850/510/0366/front_fr.23.400.jpg',
    },
    {
      name: 'Original Dijon Mustard',
      barcode: '0043646201295',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/004/364/620/1295/front_fr.14.400.jpg',
    },
    {
      name: 'All-Bran Buds',
      barcode: '06407014',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/640/7014/front_en.22.400.jpg',
    },
    {
      name: 'Spoon Size Shredded Wheat & Bran - Canada',
      barcode: '0628154011323',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/815/401/1323/front_en.60.400.jpg',
    },
    {
      name: 'Tomato Ketchup',
      barcode: '0057000013165',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/700/001/3165/front_en.24.400.jpg',
    },
    {
      name: 'Avocado Oil - 100% Pure, Refined',
      barcode: '0853807005163',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/085/380/700/5163/front_en.44.400.jpg',
    },
    {
      name: 'Greek Yogurt',
      barcode: '0065684005109',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/568/400/5109/front_en.24.400.jpg',
    },
    {
      name: 'Multi-Grain Crackers Original',
      barcode: '0853358000495',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/085/335/800/0495/front_en.25.400.jpg',
    },
    {
      name: 'Goldfish cheddar',
      barcode: '0014100170952',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/410/017/0952/front_en.15.400.jpg',
    },
    {
      name: 'Vraie Mayonnaise',
      barcode: '0068400259794',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/840/025/9794/front_en.35.400.jpg',
    },
    {
      name: 'Multi grain cheerios',
      barcode: '0065633134157',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/313/4157/front_en.51.400.jpg',
    },
    {
      name: 'Dattes denoyautees',
      barcode: '0868972000240',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/086/897/200/0240/front_fr.9.400.jpg',
    },
    {
      name: 'Tomato Ketchup',
      barcode: '0057000063085',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/700/006/3085/front_en.23.400.jpg',
    },
    {
      name: 'Nutritional Yeast - Large Flake',
      barcode: '0039978325464',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/997/832/5464/front_en.13.400.jpg',
    },
    {
      name: 'Chicken Noodle Soup',
      barcode: '0063211012514',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/321/101/2514/front_en.12.400.jpg',
    },
    {
      name: 'Icelandic skyr 0% vanilla thick yogurt',
      barcode: '0068200325125',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/820/032/5125/front_fr.3.400.jpg',
    },
    {
      name: 'Classic Mayo',
      barcode: '0815074022809',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/081/507/402/2809/front_en.56.400.jpg',
    },
    {
      name: 'Sriracha Hot Chili Sauce',
      barcode: '0024463063167',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/002/446/306/3167/front_en.21.400.jpg',
    },
    {
      name: 'Extra Virgin Olive Oil',
      barcode: '0067800002061',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/780/000/2061/front_en.24.400.jpg',
    },
    {
      name: 'Maple Syrup',
      barcode: '0096619897001',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/989/7001/front_fr.6.400.jpg',
    },
    {
      name: 'Original',
      barcode: '0059950190101',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/995/019/0101/front_en.23.400.jpg',
    },
    {
      name: 'Supreme Dark Lindt Excellence',
      barcode: '0037466041339',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/746/604/1339/front_en.42.400.jpg',
    },
    {
      name: 'Philadelphia fromage a la creme',
      barcode: '0068100896336',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/089/6336/front_en.31.400.jpg',
    },
    {
      name: 'Thon ple entier',
      barcode: '0096619523900',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/952/3900/front_en.42.400.jpg',
    },
    {
      name: 'Cream Cheese - Original',
      barcode: '0068100895971',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/089/5971/front_en.40.400.jpg',
    },
    {
      name: 'Organic Chia Seeds',
      barcode: '0096619199747',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/919/9747/front_en.27.400.jpg',
    },
    {
      name: 'Quick oats',
      barcode: '0060383690229',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/369/0229/front_en.38.400.jpg',
    },
    {
      name: 'Mini Ritz Au Fromage',
      barcode: '0066721002167',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/100/2167/front_fr.5.400.jpg',
    },
    {
      name: 'Organic Aussie Bites',
      barcode: '0731216103987',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/073/121/610/3987/front_en.26.400.jpg',
    },
    {
      name: 'Pitted Prunes',
      barcode: '0096619381609',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/938/1609/front_en.36.400.jpg',
    },
    {
      name: 'Soy Sauce',
      barcode: '04139344',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/413/9344/front_en.16.400.jpg',
    },
    {
      name: 'Original Gourmet Popping Corn',
      barcode: '0058807488163',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/880/748/8163/front_en.17.400.jpg',
    },
    {
      name: 'Kirkland Signature Soy Beverage',
      barcode: '0096619673247',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/967/3247/front_en.51.400.jpg',
    },
    {
      name: 'Pain 100% grains entiers et anciens avec quinoa',
      barcode: '0068721712619',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/872/171/2619/front_en.18.400.jpg',
    },
    {
      name: 'Breton bites original',
      barcode: '0055653684404',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/565/368/4404/front_en.30.400.jpg',
    },
    {
      name: '100% Whole Wheat Bread',
      barcode: '0068721002512',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/872/100/2512/front_en.15.400.jpg',
    },
    {
      name: 'Nut Bar',
      barcode: '0096619188031',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/918/8031/front_en.32.400.jpg',
    },
    {
      name: 'Oreo original',
      barcode: '0066721026590',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/102/6590/front_en.25.400.jpg',
    },
    {
      name: 'Natural Peanut Butter Creamy',
      barcode: '0051500700174',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/150/070/0174/front_en.23.400.jpg',
    },
    {
      name: 'Oat Zero Sugar Unsweetened Original',
      barcode: '0626027841022',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/602/784/1022/front_en.52.400.jpg',
    },
    {
      name: 'Sourdough Multigrain Bread',
      barcode: '0062240023393',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/224/002/3393/front_en.32.400.jpg',
    },
    {
      name: 'Nature Valley Honey Granola',
      barcode: '0065633461222',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/346/1222/front_en.40.400.jpg',
    },
    {
      name: 'Unsweetened Apple Sauce',
      barcode: '0060383032258',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/303/2258/front_en.43.400.jpg',
    },
    {
      name: 'Ritz',
      barcode: '0066721028419',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/102/8419/front_fr.9.400.jpg',
    },
    {
      name: 'Bavarian Multi-grain',
      barcode: '0057894009176',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/789/400/9176/front_en.24.400.jpg',
    },
    {
      name: 'Soya cuisine',
      barcode: '0674491111752',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/067/449/111/1752/front_fr.4.400.jpg',
    },
    {
      name: 'Pain style grand-mre',
      barcode: '0068505100342',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/850/510/0342/front_fr.25.400.jpg',
    },
    {
      name: 'Chocolate Chip Chia 7-Grain & Quinoa bars. Made in from domestic & impotant ingr',
      barcode: '0018627102557',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/862/710/2557/front_en.83.400.jpg',
    },
    {
      name: 'Thon ple en morceaux',
      barcode: '0061362434704',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/136/243/4704/front_en.37.400.jpg',
    },
    {
      name: 'Oat Barista',
      barcode: '0626027814071',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/602/781/4071/front_en.46.400.jpg',
    },
    {
      name: 'Heritage Flakes Cereal',
      barcode: '0058449770213',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/844/977/0213/front_en.16.400.jpg',
    },
    {
      name: 'Honey Nut Cheerios',
      barcode: '0065633132948',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/313/2948/front_en.34.400.jpg',
    },
    {
      name: 'Pain 100 pourcent grains entiers sans gras sucre ajouts',
      barcode: '0068505101325',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/850/510/1325/front_fr.20.400.jpg',
    },
    {
      name: 'Organic Loaf',
      barcode: '0096619316212',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/931/6212/front_en.54.400.jpg',
    },
    {
      name: 'Post Shredded Wheat',
      barcode: '0628154020035',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/815/402/0035/front_en.64.400.jpg',
    },
    {
      name: 'Orig. Unsweet. Almond Bev, Shelf-stable.',
      barcode: '0041570055311',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/004/157/005/5311/front_en.52.400.jpg',
    },
    {
      name: 'Tomato Soup',
      barcode: '0063211000115',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/321/100/0115/front_en.49.400.jpg',
    },
    {
      name: 'limebubly',
      barcode: '0069000149171',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/900/014/9171/front_en.32.400.jpg',
    },
    {
      name: 'Cheerios',
      barcode: '0065633134652',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/313/4652/front_fr.25.400.jpg',
    },
    {
      name: 'Activia Propionique nature',
      barcode: '0056800249170',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/680/024/9170/front_fr.32.400.jpg',
    },
    {
      name: 'Margarine with Olive Oil',
      barcode: '0011115001189',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/111/500/1189/front_en.35.400.jpg',
    },
    {
      name: 'Natural Spring Water',
      barcode: '0060383758783',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/375/8783/front_en.54.400.jpg',
    },
    {
      name: 'Almond So Nice Unsweetened Original',
      barcode: '0626027087833',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/602/708/7833/front_en.69.400.jpg',
    },
    {
      name: 'Hazelnut noisettes',
      barcode: '0068100903119',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/090/3119/front_fr.16.400.jpg',
    },
    {
      name: 'Tortilla Chip Rounds',
      barcode: '0060410901243',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/090/1243/front_en.16.400.jpg',
    },
    {
      name: 'WOWBUTTER - Creamy',
      barcode: '0773948200008',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/077/394/820/0008/front_fr.17.400.jpg',
    },
    {
      name: 'Baked Green Pea Snacks Lightly Salted',
      barcode: '0071146012455',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/114/601/2455/front_en.46.400.jpg',
    },
    {
      name: 'Vector',
      barcode: '0064100028975',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/002/8975/front_en.23.400.jpg',
    },
    {
      name: 'Yogourt grec',
      barcode: '0056800202465',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/680/020/2465/front_fr.3.400.jpg',
    },
    {
      name: 'Organic Garden Crisp Veggie cracker',
      barcode: '0677210092547',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/067/721/009/2547/front_en.24.400.jpg',
    },
    {
      name: 'The Big 16 Sprouted Wheat Bread',
      barcode: '0055991040160',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/599/104/0160/front_en.149.400.jpg',
    },
    {
      name: 'Coconut Milk',
      barcode: '0016229001711',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/622/900/1711/front_en.52.400.jpg',
    },
    {
      name: 'Chocolate Chip Energy Bar Nutritional Supplement',
      barcode: '0722252120045',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/072/225/212/0045/front_en.23.400.jpg',
    },
    {
      name: '3 Seed Sweet Potato Crackers',
      barcode: '0036593031206',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/659/303/1206/front_en.9.400.jpg',
    },
    {
      name: 'Protein loaf',
      barcode: '0061077856334',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/107/785/6334/front_en.16.400.jpg',
    },
    {
      name: 'Dairyland Partly Skimmed Milk (2%)',
      barcode: '0068700011016',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/870/001/1016/front_en.87.400.jpg',
    },
    {
      name: 'Squirrelly Sprouted Wheat Bread',
      barcode: '0055991040450',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/599/104/0450/front_en.64.400.jpg',
    },
    {
      name: 'Mesa Sunrise Cereal, Organic',
      barcode: '0058449779018',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/844/977/9018/front_en.101.400.jpg',
    },
    {
      name: 'Mas souffl',
      barcode: '0060410029886',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/002/9886/front_en.39.400.jpg',
    },
    {
      name: 'Croutons',
      barcode: '0819898010790',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/081/989/801/0790/front_fr.3.400.jpg',
    },
    {
      name: 'Yogourt Grec Nature',
      barcode: '0056800634211',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/680/063/4211/front_en.38.400.jpg',
    },
    {
      name: 'Superclub sandwich',
      barcode: '0061077771217',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/107/777/1217/front_en.18.400.jpg',
    },
    {
      name: 'Lanires de bifteck',
      barcode: '0096619895724',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/989/5724/front_fr.14.400.jpg',
    },
    {
      name: 'Natural Peanut Butter Smooth',
      barcode: '0628915641769',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/891/564/1769/front_en.18.400.jpg',
    },
    {
      name: 'Spaghetti',
      barcode: '0060383040000',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/304/0000/front_en.11.400.jpg',
    },
    {
      name: 'Selection du jardin',
      barcode: '0064200327961',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/420/032/7961/front_en.8.400.jpg',
    },
    {
      name: 'Intense Dark Lindt Excellence',
      barcode: '0037466014630',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/746/601/4630/front_en.25.400.jpg',
    },
    {
      name: 'Original Harvest Crunch Granola Cereal',
      barcode: '0055577312551',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/731/2551/front_en.45.400.jpg',
    },
    {
      name: 'Nature Valley Sweet And Salty Peanut Chewy Nut Bar',
      barcode: '0065633502260',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/350/2260/front_fr.9.400.jpg',
    },
    {
      name: 'Soy, Unsweetened Organic Fortified Beverage',
      barcode: '0025293000735',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/002/529/300/0735/front_en.79.400.jpg',
    },
    {
      name: 'Craisins',
      barcode: '0031200029836',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/120/002/9836/front_fr.11.400.jpg',
    },
    {
      name: 'Chocolate Chip, Soft & Chewy Granola Bars',
      barcode: '0096619281954',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/928/1954/front_en.48.400.jpg',
    },
    {
      name: 'Organic Roasted Seaweed Snack',
      barcode: '0096619434473',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/943/4473/front_en.84.400.jpg',
    },
    {
      name: 'Amandes Tamari',
      barcode: '0068110030768',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/811/003/0768/front_en.39.400.jpg',
    },
    {
      name: 'Individual Chocolate Chip Chia 7-Grain with Quinoa bar. Made in with domestic & ',
      barcode: '0018627102564',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/862/710/2564/front_en.3.400.jpg',
    },
    {
      name: 'All Bran Flakes',
      barcode: '0064100595798',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/059/5798/front_en.46.400.jpg',
    },
    {
      name: 'Barre Croquante Arachides',
      barcode: '0722252120083',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/072/225/212/0083/front_en.33.400.jpg',
    },
    {
      name: 'Sauce Miracle Whip',
      barcode: '0068100048629',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/004/8629/front_en.25.400.jpg',
    },
    {
      name: '45% Dk Chocolate, Celebration Butter Cookies',
      barcode: '0064042006529',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/404/200/6529/front_en.25.400.jpg',
    },
    {
      name: 'Margarine originale',
      barcode: '0059950300104',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/995/030/0104/front_en.6.400.jpg',
    },
    {
      name: 'Creamy Peanut Butter',
      barcode: '0051500750025',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/150/075/0025/front_fr.4.400.jpg',
    },
    {
      name: 'Yogourt Grec Sans Lactoses Sans Gras',
      barcode: '0065684004751',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/568/400/4751/front_en.22.400.jpg',
    },
    {
      name: 'Cranberry Almond Crunch',
      barcode: '0628154035350',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/815/403/5350/front_en.28.400.jpg',
    },
    {
      name: 'Walnuts',
      barcode: '0096619362851',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/936/2851/front_en.22.400.jpg',
    },
    {
      name: 'Garden Veggie Straws Original',
      barcode: '0829515321109',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/082/951/532/1109/front_en.23.400.jpg',
    },
    {
      name: 'carrs aux Rice Krispies',
      barcode: '0064100389014',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/038/9014/front_fr.26.400.jpg',
    },
    {
      name: 'Proteine bar',
      barcode: '0859162007583',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/085/916/200/7583/front_en.16.400.jpg',
    },
    {
      name: 'Vegan margarine',
      barcode: '0011115001370',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/111/500/1370/front_en.43.400.jpg',
    },
    {
      name: 'Fromage Philadelphia',
      barcode: '0068100011258',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/001/1258/front_fr.51.400.jpg',
    },
    {
      name: 'Enhanced Collagen Protein',
      barcode: '0620365018627',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/036/501/8627/front_fr.22.400.jpg',
    },
    {
      name: 'Blue Corn Organic Tortilla Chips',
      barcode: '0068826176002',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/882/617/6002/front_en.65.400.jpg',
    },
    {
      name: 'Instant coffee',
      barcode: '0055000132152',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/500/013/2152/front_en.15.400.jpg',
    },
    {
      name: 'Extra Firm Tofu',
      barcode: '0057864000080',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/786/400/0080/front_en.19.400.jpg',
    },
    {
      name: 'Pre-Cooked Long Grain Rice',
      barcode: '0059100008010',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/910/000/8010/front_en.53.400.jpg',
    },
    {
      name: 'Peanut butter Pretzels',
      barcode: '0096619336753',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/933/6753/front_en.100.400.jpg',
    },
    {
      name: 'Regular Sweetened Condensed Milk',
      barcode: '0059000000015',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/900/000/0015/front_en.13.400.jpg',
    },
    {
      name: 'Margarine',
      barcode: '0011115001202',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/111/500/1202/front_en.19.400.jpg',
    },
    {
      name: 'Butter Chicken Premium Cooking Sauce',
      barcode: '0814668000339',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/081/466/800/0339/front_en.56.400.jpg',
    },
    {
      name: 'Nut bars',
      barcode: '0096619188048',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/918/8048/front_en.15.400.jpg',
    },
    {
      name: 'Quick Oats (Canada)',
      barcode: '0055577331002',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/733/1002/front_en.35.400.jpg',
    },
    {
      name: 'All Bran Flakes',
      barcode: '0064100142329',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/014/2329/front_fr.3.400.jpg',
    },
    {
      name: 'Noix du Brsil',
      barcode: '0096619987412',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/998/7412/front_en.16.400.jpg',
    },
    {
      name: 'Quinoa biologique',
      barcode: '0096619469598',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/946/9598/front_fr.14.400.jpg',
    },
    {
      name: 'Protein Pancake & Waffle Mix',
      barcode: '0627987018615',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/798/701/8615/front_en.57.400.jpg',
    },
    {
      name: 'Black Tea',
      barcode: '8720608039593',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/872/060/803/9593/front_en.16.400.jpg',
    },
    {
      name: 'Mini Ravioli',
      barcode: '0064144043064',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/414/404/3064/front_en.41.400.jpg',
    },
    {
      name: 'Saint Agur (format familial) (33% MG)',
      barcode: '3222110025149',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/322/211/002/5149/front_fr.35.400.jpg',
    },
    {
      name: 'Sorbet Pche Pomme Framboise',
      barcode: '3251510551002',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/325/151/055/1002/front_fr.36.400.jpg',
    },
    {
      name: 'Snack stacks crackers',
      barcode: '0030100111764',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/010/011/1764/front_fr.5.400.jpg',
    },
    {
      name: 'Umf 10+ Manuka Honey',
      barcode: '9400501003738',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/940/050/100/3738/front_en.8.400.jpg',
    },
    {
      name: 'Chips',
      barcode: '0853986008115',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/085/398/600/8115/front_fr.3.400.jpg',
    },
    {
      name: 'Cinnamon Roll Cereal',
      barcode: '0850002887433',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/085/000/288/7433/front_en.21.400.jpg',
    },
    {
      name: 'Sucre en Morceaux',
      barcode: '26005058',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/002/600/5058/front_fr.33.400.jpg',
    },
    {
      name: 'Chicken instant noodles',
      barcode: '0059491000501',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/949/100/0501/front_en.46.400.jpg',
    },
    {
      name: 'Organic Baking Cocoa',
      barcode: '0085981311659',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/008/598/131/1659/front_en.23.400.jpg',
    },
    {
      name: 'Dessert vgtal chocolat noir',
      barcode: '0674491111776',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/067/449/111/1776/front_en.20.400.jpg',
    },
    {
      name: 'Multi-Grain',
      barcode: '0065633496392',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/349/6392/front_en.22.400.jpg',
    },
    {
      name: 'Raisin',
      barcode: '0068721004004',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/872/100/4004/front_en.36.400.jpg',
    },
    {
      name: 'Pure Baking Soda',
      barcode: '0065333001100',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/533/300/1100/front_en.34.400.jpg',
    },
    {
      name: 'Sea Salt Dark Lindt Excellence',
      barcode: '0037466038612',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/746/603/8612/front_en.22.400.jpg',
    },
    {
      name: 'Froot Loops',
      barcode: '0064100595729',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/059/5729/front_en.46.400.jpg',
    },
    {
      name: 'Rosemary & Olive Oil',
      barcode: '0066721007483',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/100/7483/front_en.36.400.jpg',
    },
    {
      name: '24 Large Organic Free-Range Eggs',
      barcode: '0096619845774',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/984/5774/front_en.16.400.jpg',
    },
    {
      name: 'Chips ahoy',
      barcode: '0066721026545',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/102/6545/front_en.17.400.jpg',
    },
    {
      name: 'Crunchy Peanut Butter',
      barcode: '0068100084597',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/008/4597/front_fr.16.400.jpg',
    },
    {
      name: 'Humm! Hummus Cocktail Roasted Red Peppers',
      barcode: '0770333024102',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/077/033/302/4102/front_en.3.400.jpg',
    },
    {
      name: '1% Lactose Free Partly Skimmed Milk',
      barcode: '0064420055019',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/442/005/5019/front_en.42.400.jpg',
    },
    {
      name: 'Chocolate Crunch GoLean Cereal. Made in Canada with domestic & imported ingredie',
      barcode: '0018627102632',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/862/710/2632/front_en.22.400.jpg',
    },
    {
      name: 'Sucre/Sugar',
      barcode: '0058891252220',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/889/125/2220/front_fr.3.400.jpg',
    },
    {
      name: 'Flax & Quinoa Bread',
      barcode: '0060885000472',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/088/500/0472/front_en.4.400.jpg',
    },
    {
      name: 'Variety: Chocolate Chip Chia & Honey Oat Flax 7-Grain with Quinoa bars.',
      barcode: '0018627102601',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/862/710/2601/front_en.27.400.jpg',
    },
    {
      name: '2% M.F. Original Balkan Yogurt Plain',
      barcode: '0057825750023',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/782/575/0023/front_en.24.400.jpg',
    },
    {
      name: 'Chips',
      barcode: '0060410047217',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/004/7217/front_fr.25.400.jpg',
    },
    {
      name: 'Unsalted Tortilla Chips, Organic',
      barcode: '0068826176026',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/882/617/6026/front_en.72.400.jpg',
    },
    {
      name: 'Unsweetened Creamy Cashew Milk',
      barcode: '0025293002982',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/002/529/300/2982/front_en.46.400.jpg',
    },
    {
      name: 'Amandes grilles a sec',
      barcode: '0096619246762',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/924/6762/front_fr.23.400.jpg',
    },
    {
      name: '12 Large Chicken Eggs.',
      barcode: '0060383664145',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/366/4145/front_en.67.400.jpg',
    },
    {
      name: 'Miche Sourdough',
      barcode: '0628553080081',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/855/308/0081/front_en.20.400.jpg',
    },
    {
      name: 'Cottage cheese',
      barcode: '0096619177646',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/917/7646/front_fr.3.400.jpg',
    },
    {
      name: 'Organic Sun-Dried Figs',
      barcode: '0889896931687',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/088/989/693/1687/front_en.10.400.jpg',
    },
    {
      name: 'Sauce Marinara',
      barcode: '0747479005470',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/074/747/900/5470/front_en.15.400.jpg',
    },
    {
      name: 'Chunk Light Tuna Packed in Water',
      barcode: '0060383105686',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/310/5686/front_en.18.400.jpg',
    },
    {
      name: 'Breton Multi-Grain',
      barcode: '0055653629955',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/565/362/9955/front_en.3.400.jpg',
    },
    {
      name: 'Flocons de mas (Corn flakes)',
      barcode: '0064100108196',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/010/8196/front_en.17.400.jpg',
    },
    {
      name: 'Seeded Bread',
      barcode: '0696685100021',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/069/668/510/0021/front_en.20.400.jpg',
    },
    {
      name: 'Raisin bran',
      barcode: '0064100142282',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/014/2282/front_fr.3.400.jpg',
    },
    {
      name: 'Shreddies',
      barcode: '0628154380214',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/815/438/0214/front_fr.3.400.jpg',
    },
    {
      name: 'Prebiotic Multigrain Bread',
      barcode: '0060569005977',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/056/900/5977/front_en.14.400.jpg',
    },
    {
      name: 'Almond So Nice Unsweet Original, Chilled.',
      barcode: '0626027087819',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/602/708/7819/front_en.14.400.jpg',
    },
    {
      name: 'Greek Yogurt 0% M.g. High In Protein Vanilla',
      barcode: '0065684100675',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/568/410/0675/front_en.20.400.jpg',
    },
    {
      name: 'Original Organic Gluten-Free Oat Beverage',
      barcode: '0063667201012',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/366/720/1012/front_en.24.400.jpg',
    },
    {
      name: 'Coconut Water',
      barcode: '0667888401130',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/788/840/1130/front_en.34.400.jpg',
    },
    {
      name: 'Pasteurized Pure Natural Honey',
      barcode: '0058500000402',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/850/000/0402/front_en.15.400.jpg',
    },
    {
      name: 'Mixed Berry Organic Granola Bar',
      barcode: '0687456213026',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/068/745/621/3026/front_en.36.400.jpg',
    },
    {
      name: 'Chocolate hazelnut spread',
      barcode: '0060383062576',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/306/2576/front_fr.25.400.jpg',
    },
    {
      name: 'Thin Crisps Original',
      barcode: '0066721007476',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/100/7476/front_en.24.400.jpg',
    },
    {
      name: 'Powdered peanut butter',
      barcode: '0627843538424',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/784/353/8424/front_en.59.400.jpg',
    },
    {
      name: 'Gold Basmati Rice',
      barcode: '0062781700029',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/278/170/0029/front_en.26.400.jpg',
    },
    {
      name: 'Extra Virgin Olive Oil',
      barcode: '0060383047191',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/304/7191/front_en.23.400.jpg',
    },
    {
      name: 'Little Big Bread',
      barcode: '0055991040863',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/599/104/0863/front_en.64.400.jpg',
    },
    {
      name: 'Avocado Oil Spray - 100% Pure, Refined',
      barcode: '0815074022915',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/081/507/402/2915/front_en.87.400.jpg',
    },
    {
      name: 'Peanut Butter Fruit & Nut Energy bar',
      barcode: '0021908509624',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/002/190/850/9624/front_en.31.400.jpg',
    },
    {
      name: 'Canola oil',
      barcode: '0761720001783',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/076/172/000/1783/front_fr.3.400.jpg',
    },
    {
      name: 'Deepn Delicious',
      barcode: '0055773003567',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/577/300/3567/front_fr.3.400.jpg',
    },
    {
      name: 'Coconut oil',
      barcode: '0627735256948',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/773/525/6948/front_fr.3.400.jpg',
    },
    {
      name: 'Natural peanut butter',
      barcode: '0096619450039',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/945/0039/front_fr.3.400.jpg',
    },
    {
      name: 'Berry fairy overnight chia with oats.',
      barcode: '0877693004475',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/087/769/300/4475/front_en.3.400.jpg',
    },
    {
      name: 'Variety Pack 14 Bars',
      barcode: '0193908007926',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/019/390/800/7926/front_en.28.400.jpg',
    },
    {
      name: 'Noisettes et cacao',
      barcode: '0068100902792',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/090/2792/front_en.20.400.jpg',
    },
    {
      name: 'Flaked Light Tuna (Skipjack In Water)',
      barcode: '0061362434308',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/136/243/4308/front_en.20.400.jpg',
    },
    {
      name: 'Original Thick Sliced White Bread',
      barcode: '0063400030350',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/340/003/0350/front_en.42.400.jpg',
    },
    {
      name: 'Ancient Grains & Red Fife Bread',
      barcode: '0063400138803',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/340/013/8803/front_en.19.400.jpg',
    },
    {
      name: 'Crales All Bran (original)',
      barcode: '0064100001466',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/000/1466/front_fr.53.400.jpg',
    },
    {
      name: 'Fine-Filtered 1% M.F. Partly Skimmed Milk',
      barcode: '0064420010223',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/442/001/0223/front_en.34.400.jpg',
    },
    {
      name: 'Zero Sugar Vanilla Almomd Milk',
      barcode: '0025293001886',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/002/529/300/1886/front_en.49.400.jpg',
    },
    {
      name: 'Margarine',
      barcode: '0068445000177',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/844/500/0177/front_fr.26.400.jpg',
    },
    {
      name: 'Basil Pesto',
      barcode: '0096619990559',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/999/0559/front_en.37.400.jpg',
    },
    {
      name: 'Oat, UnSweet (Plain) bev. Chilled. Made in for',
      barcode: '0036632075321',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/663/207/5321/front_en.52.400.jpg',
    },
    {
      name: 'Sesame Rye Crispbread',
      barcode: '0078935005186',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/893/500/5186/front_en.47.400.jpg',
    },
    {
      name: 'Quaker Instant Oatmeal Maple and Brown Sugar',
      barcode: '0055577113028',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/711/3028/front_fr.3.400.jpg',
    },
    {
      name: 'Nestea Lemon',
      barcode: '08390937',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/839/0937/front_fr.32.400.jpg',
    },
    {
      name: 'Dark Lindt Excellence',
      barcode: '0037466018898',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/746/601/8898/front_en.38.400.jpg',
    },
    {
      name: 'Fig Bar / Barres aux Figues',
      barcode: '0047495491555',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/004/749/549/1555/front_en.36.400.jpg',
    },
    {
      name: 'Yougourt',
      barcode: '0056800098297',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/680/009/8297/front_en.38.400.jpg',
    },
    {
      name: 'Organic Orange',
      barcode: '0067311352204',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/731/135/2204/front_fr.5.400.jpg',
    },
    {
      name: 'Pistachios',
      barcode: '0096619034352',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/903/4352/front_en.36.400.jpg',
    },
    {
      name: 'Green Giant Cream Style Corn Niblets',
      barcode: '0190569102601',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/019/056/910/2601/front_en.36.400.jpg',
    },
    {
      name: 'Thon Ple Entier (dans lhuile dolive pure)',
      barcode: '0061362433301',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/136/243/3301/front_en.32.400.jpg',
    },
    {
      name: 'Multi Grain Whole Grain Crispbread',
      barcode: '0041138007066',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/004/113/800/7066/front_en.24.400.jpg',
    },
    {
      name: 'Confiture de fraises',
      barcode: '0088702016369',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/008/870/201/6369/front_fr.4.400.jpg',
    },
    {
      name: 'Chicken Noodle Soup 25% less salt',
      barcode: '0068400032632',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/840/003/2632/front_en.43.400.jpg',
    },
    {
      name: 'Yellow Mustard',
      barcode: '0057000015992',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/700/001/5992/front_en.19.400.jpg',
    },
    {
      name: 'Cream of wheat Original',
      barcode: '0072400011597',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/240/001/1597/front_fr.11.400.jpg',
    },
    {
      name: 'Rye & Oat Bran Crispbread',
      barcode: '0078935005193',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/893/500/5193/front_fr.30.400.jpg',
    },
    {
      name: 'Solid Light Tuna in Olive Oil',
      barcode: '8004030347779',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/800/403/034/7779/front_en.24.400.jpg',
    },
    {
      name: 'Classic Potato Chips',
      barcode: '0060410050910',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/005/0910/front_en.9.400.jpg',
    },
    {
      name: 'Original',
      barcode: '0064100111332',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/011/1332/front_fr.4.400.jpg',
    },
    {
      name: 'Vanilla Lactose Free Fat Free Yogurt',
      barcode: '0065684004768',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/568/400/4768/front_fr.20.400.jpg',
    },
    {
      name: 'Saumon rose sauvage',
      barcode: '0065302000035',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/530/200/0035/front_en.20.400.jpg',
    },
    {
      name: 'Sour Cream Original',
      barcode: '0066013141604',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/601/314/1604/front_en.12.400.jpg',
    },
    {
      name: 'Raw Organic Honey, Creamed',
      barcode: '0852204000764',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/085/220/400/0764/front_en.16.400.jpg',
    },
    {
      name: 'Red Bull Energy Drink',
      barcode: '0180854000101',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/018/085/400/0101/front_en.19.400.jpg',
    },
    {
      name: 'Oat milk',
      barcode: '0096619014415',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/901/4415/front_fr.8.400.jpg',
    },
    {
      name: 'Premier Protein Chocolate shake',
      barcode: '0643843714811',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/064/384/371/4811/front_en.45.400.jpg',
    },
    {
      name: 'Maquereau sauvage',
      barcode: '0063816382050',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/381/638/2050/front_en.30.400.jpg',
    },
    {
      name: 'Panko',
      barcode: '0041390050039',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/004/139/005/0039/front_fr.3.400.jpg',
    },
    {
      name: 'Jus Mangue Exotique',
      barcode: '0067311037330',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/731/103/7330/front_en.17.400.jpg',
    },
    {
      name: 'Chocolate Chip, Organic Granola Bars',
      barcode: '0687456213019',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/068/745/621/3019/front_en.101.400.jpg',
    },
    {
      name: 'Organic Multigrain Sprouted Wheat Bread',
      barcode: '0055991041037',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/599/104/1037/front_en.41.400.jpg',
    },
    {
      name: 'Protein Bar Cookies & Cream',
      barcode: '0888849000173',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/088/884/900/0173/front_en.50.400.jpg',
    },
    {
      name: 'Just Peanuts Smooth Peanut Butter',
      barcode: '0060383860479',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/386/0479/front_en.55.400.jpg',
    },
    {
      name: 'Sockeye Salmon, Wild Red Pacific',
      barcode: '0061362401003',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/136/240/1003/front_en.10.400.jpg',
    },
    {
      name: 'Biscuits soda',
      barcode: '0066721005571',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/100/5571/front_en.15.400.jpg',
    },
    {
      name: 'Unsalted Peanuts',
      barcode: '0060383665852',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/366/5852/front_en.20.400.jpg',
    },
    {
      name: 'Pomme et canelle',
      barcode: '0065633134188',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/313/4188/front_en.19.400.jpg',
    },
    {
      name: 'Red Kidney Beans',
      barcode: '0067800002467',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/780/000/2467/front_en.34.400.jpg',
    },
    {
      name: 'Mini Fruit bars',
      barcode: '0850013716814',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/085/001/371/6814/front_en.21.400.jpg',
    },
    {
      name: 'Goldfish',
      barcode: '0014100170969',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/410/017/0969/front_en.25.400.jpg',
    },
    {
      name: 'Croque Nature',
      barcode: '0055577105436',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/710/5436/front_en.26.400.jpg',
    },
    {
      name: 'Zero Sugar Cola',
      barcode: '0067000107467',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/700/010/7467/front_en.12.400.jpg',
    },
    {
      name: 'Sauce au piment de Cayenne',
      barcode: '0056200974665',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/620/097/4665/front_en.67.400.jpg',
    },
    {
      name: 'Basil Pesto',
      barcode: '0057000336189',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/700/033/6189/front_en.36.400.jpg',
    },
    {
      name: 'Sugar Free Syrup Sweetened with Sucralose',
      barcode: '0065254724515',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/525/472/4515/front_en.41.400.jpg',
    },
    {
      name: 'Plain Yogourt 3%',
      barcode: '0068200357508',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/820/035/7508/front_fr.9.400.jpg',
    },
    {
      name: 'whole wheat tortillas',
      barcode: '0068721038252',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/872/103/8252/front_en.20.400.jpg',
    },
    {
      name: 'Feta',
      barcode: '0059441181533',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/944/118/1533/front_en.4.400.jpg',
    },
    {
      name: 'Chickpeas',
      barcode: '0060383664350',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/366/4350/front_en.13.400.jpg',
    },
    {
      name: 'Sour Cream & Onion Potato Chips',
      barcode: '0064100124004',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/012/4004/front_en.26.400.jpg',
    },
    {
      name: 'Lactantia Salted Butter',
      barcode: '0066096123306',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/609/612/3306/front_en.26.400.jpg',
    },
    {
      name: 'VEL',
      barcode: '0065172239504',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/517/223/9504/front_fr.3.400.jpg',
    },
    {
      name: 'Chewy protein bars',
      barcode: '0096619081257',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/908/1257/front_en.16.400.jpg',
    },
    {
      name: 'Biere',
      barcode: '0062067382291',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/206/738/2291/front_fr.3.400.jpg',
    },
    {
      name: 'Coca-Cola',
      barcode: '0067000109836',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/700/010/9836/front_fr.3.400.jpg',
    },
    {
      name: 'bread',
      barcode: '0057894009152',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/789/400/9152/front_en.26.400.jpg',
    },
    {
      name: 'Tortillas grains anciens',
      barcode: '0068721038436',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/872/103/8436/front_en.19.400.jpg',
    },
    {
      name: 'Alfredo & Roasted Garlic Sauce',
      barcode: '0057000330200',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/700/033/0200/front_en.14.400.jpg',
    },
    {
      name: 'Organic Kombucha Ginger Lemonade',
      barcode: '0096619190546',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/919/0546/front_en.15.400.jpg',
    },
    {
      name: 'Vanilla Almond Creamer',
      barcode: '0036632075451',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/663/207/5451/front_fr.3.400.jpg',
    },
    {
      name: 'Big Bavarian Multi-grain Sourdough Bread',
      barcode: '0057894039173',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/789/403/9173/front_en.11.400.jpg',
    },
    {
      name: 'Organic Roasted Chicken Base',
      barcode: '0098308243205',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/830/824/3205/front_fr.3.400.jpg',
    },
    {
      name: 'Butter Croissants',
      barcode: '10463345',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/001/046/3345/front_en.159.400.jpg',
    },
    {
      name: 'Coconut Kefir (Fermented Beverage)',
      barcode: '0064912087283',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/491/208/7283/front_en.33.400.jpg',
    },
    {
      name: 'Biscuits soda nature',
      barcode: '0060383013851',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/301/3851/front_fr.7.400.jpg',
    },
    {
      name: 'Ice Cream Cones',
      barcode: '0060383202613',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('frozen'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/320/2613/front_fr.3.400.jpg',
    },
    {
      name: 'Extra Fancy Salted Mixed Nuts',
      barcode: '0096619885725',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/988/5725/front_en.35.400.jpg',
    },
    {
      name: 'Vegetable Wheat Crackers',
      barcode: '0066721028358',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/102/8358/front_en.7.400.jpg',
    },
    {
      name: 'Greek Yogurt',
      barcode: '0196633916280',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/019/663/391/6280/front_en.22.400.jpg',
    },
    {
      name: 'Sourdough Bistro Loaf',
      barcode: '0060885000670',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/088/500/0670/front_en.17.400.jpg',
    },
    {
      name: 'Shreddies',
      barcode: '0628154437062',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/815/443/7062/front_en.3.400.jpg',
    },
    {
      name: 'RXBAR',
      barcode: '0859162007620',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/085/916/200/7620/front_en.18.400.jpg',
    },
    {
      name: 'Nutella',
      barcode: '0062020000743',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/202/000/0743/front_en.29.400.jpg',
    },
    {
      name: 'Coca-Cola',
      barcode: '06742708',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/674/2708/front_en.31.400.jpg',
    },
    {
      name: 'Multigrain Oat Bran Flakes Cereal',
      barcode: '0058449602293',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/844/960/2293/front_fr.46.400.jpg',
    },
    {
      name: 'Pain Multi-Crales',
      barcode: '0068505110044',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/850/511/0044/front_fr.17.400.jpg',
    },
    {
      name: 'Lait (2%)',
      barcode: '0055872025019',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/587/202/5019/front_fr.7.400.jpg',
    },
    {
      name: 'Nutella',
      barcode: '0062020003843',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/202/000/3843/front_fr.26.400.jpg',
    },
    {
      name: 'Niblets',
      barcode: '0190569100508',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/019/056/910/0508/front_en.42.400.jpg',
    },
    {
      name: 'Sauce salsa douce',
      barcode: '0060410010976',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/001/0976/front_fr.3.400.jpg',
    },
    {
      name: 'Magic Baking Powder',
      barcode: '06749118',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/674/9118/front_fr.28.400.jpg',
    },
    {
      name: 'Organic Virgin Coconut Oil',
      barcode: '0096619104574',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/910/4574/front_en.47.400.jpg',
    },
    {
      name: 'Pain',
      barcode: '0061077940309',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/107/794/0309/front_fr.20.400.jpg',
    },
    {
      name: 'Almond Raisin Mslix',
      barcode: '0064100001596',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/000/1596/front_en.50.400.jpg',
    },
    {
      name: 'Pain',
      barcode: '0068505300308',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/850/530/0308/front_en.29.400.jpg',
    },
    {
      name: 'Confiture (fraise)',
      barcode: '0051500025925',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/150/002/5925/front_en.3.400.jpg',
    },
    {
      name: 'Biscuits Tradition 1905 (th Social)',
      barcode: '0064042005096',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/404/200/5096/front_fr.24.400.jpg',
    },
    {
      name: 'PREMIUM PLUS CRACKERS',
      barcode: '0066721007834',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/100/7834/front_en.21.400.jpg',
    },
    {
      name: 'Nutri-grain fraise',
      barcode: '0064100284029',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/028/4029/front_en.27.400.jpg',
    },
    {
      name: 'Good Thins - The Rice One - Multigrain',
      barcode: '0066721006943',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/100/6943/front_en.29.400.jpg',
    },
    {
      name: 'Cheez Whiz',
      barcode: '0068100892314',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/089/2314/front_en.17.400.jpg',
    },
    {
      name: 'No Added Sugar, Applesnax',
      barcode: '0055369903004',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/536/990/3004/front_en.29.400.jpg',
    },
    {
      name: 'Corn Squares Toasted Cereal',
      barcode: '0055577106617',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/710/6617/front_en.61.400.jpg',
    },
    {
      name: 'Hardwood Smoked Oysters in Sunflower Oil',
      barcode: '0061362444307',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/136/244/4307/front_en.42.400.jpg',
    },
    {
      name: 'Vegan Dressing & Spread',
      barcode: '0068400534273',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/840/053/4273/front_en.51.400.jpg',
    },
    {
      name: 'Tortillas',
      barcode: '0061077778902',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/107/777/8902/front_en.16.400.jpg',
    },
    {
      name: 'Orange Bubly Sparkling Water Beverage',
      barcode: '0069000149195',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/900/014/9195/front_en.11.400.jpg',
    },
    {
      name: 'Rice Krispies',
      barcode: '0064100143135',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/014/3135/front_en.9.400.jpg',
    },
    {
      name: '1-Minute Oats (Canada)',
      barcode: '0055577102053',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/710/2053/front_en.41.400.jpg',
    },
    {
      name: 'Fruit Snacks',
      barcode: '0034856003755',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/485/600/3755/front_en.34.400.jpg',
    },
    {
      name: 'Confiture de fraises',
      barcode: '0088702024999',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/008/870/202/4999/front_fr.16.400.jpg',
    },
    {
      name: 'Vector High protein',
      barcode: '0064100036321',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/003/6321/front_en.32.400.jpg',
    },
    {
      name: 'Pain allong integral',
      barcode: '0068505102285',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/850/510/2285/front_fr.17.400.jpg',
    },
    {
      name: 'beurre arachides croquant',
      barcode: '0051500750063',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/150/075/0063/front_en.42.400.jpg',
    },
    {
      name: 'Fine Hazelnut Chocolates',
      barcode: '0062020000934',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/202/000/0934/front_en.23.400.jpg',
    },
    {
      name: 'Poudre Pte',
      barcode: '0064217000024',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/421/700/0024/front_fr.9.400.jpg',
    },
    {
      name: 'Multigrain Bread',
      barcode: '0068721712480',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/872/171/2480/front_en.26.400.jpg',
    },
    {
      name: 'Organic Millet & Brown Rice Ramen',
      barcode: '0708953628035',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/070/895/362/8035/front_en.46.400.jpg',
    },
    {
      name: 'Goldfish Colours Crackers',
      barcode: '0014100197904',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/410/019/7904/front_fr.15.400.jpg',
    },
    {
      name: 'Toasted Berry Crisp, GO LEAN Cereal.',
      barcode: '0018627597490',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/862/759/7490/front_en.65.400.jpg',
    },
    {
      name: 'Nesquik sirop chocolat',
      barcode: '0055000031318',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/500/003/1318/front_fr.59.400.jpg',
    },
    {
      name: 'Sweet Relish',
      barcode: '0057000017859',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/700/001/7859/front_en.27.400.jpg',
    },
    {
      name: 'Maple Style Beans',
      barcode: '0064300227598',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/430/022/7598/front_en.29.400.jpg',
    },
    {
      name: 'Raspberries',
      barcode: '0715756100019',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/071/575/610/0019/front_en.13.400.jpg',
    },
    {
      name: 'Diet Pepsi',
      barcode: '0069000010662',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/900/001/0662/front_en.54.400.jpg',
    },
    {
      name: 'Whipped Cream Cheese Original',
      barcode: '0068100896510',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/089/6510/front_fr.4.400.jpg',
    },
    {
      name: 'Lemonade Nutrient Enhanced Water Beverage',
      barcode: '0786162650078',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/078/616/265/0078/front_en.42.400.jpg',
    },
    {
      name: 'Yogourt grec sans lactose',
      barcode: '0056800355741',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/680/035/5741/front_en.13.400.jpg',
    },
    {
      name: 'cherrybubly',
      barcode: '0069000155011',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/900/015/5011/front_en.14.400.jpg',
    },
    {
      name: 'Beef Flavour Instant Noodles',
      barcode: '0059491000358',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/949/100/0358/front_en.35.400.jpg',
    },
    {
      name: 'Gros Oeuf',
      barcode: '0059749896054',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/974/989/6054/front_en.27.400.jpg',
    },
    {
      name: 'Whole grain whole wheat tortillas',
      barcode: '0060383763046',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/376/3046/front_en.25.400.jpg',
    },
    {
      name: 'Fruit & Nut Granola Bars',
      barcode: '0065633128507',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/312/8507/front_en.25.400.jpg',
    },
    {
      name: 'Lait homognis - PrFiltre - 3.25 % M.G. - Got Frais',
      barcode: '0068200010021',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/820/001/0021/front_fr.28.400.jpg',
    },
    {
      name: 'Soy beverage unsweetened',
      barcode: '0063667125066',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/366/712/5066/front_en.28.400.jpg',
    },
    {
      name: 'True Almond Fortified Almond Beverage Unsweetened Vanilla',
      barcode: '0025293001800',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/002/529/300/1800/front_en.12.400.jpg',
    },
    {
      name: 'Lactose Free 3.25% Homogenized Milk',
      barcode: '0064420355010',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/442/035/5010/front_en.13.400.jpg',
    },
    {
      name: 'Crunchy Hazelnut with Cocoa Spread',
      barcode: '0068100903126',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/090/3126/front_en.12.400.jpg',
    },
    {
      name: 'Kettle Popped-Corn Snacks Sweet & Salty',
      barcode: '0060410056059',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/005/6059/front_fr.8.400.jpg',
    },
    {
      name: 'Marinara sauce',
      barcode: '0070234215105',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/023/421/5105/front_fr.23.400.jpg',
    },
    {
      name: 'Classic Yellow mustard',
      barcode: '0056200762163',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/620/076/2163/front_en.23.400.jpg',
    },
    {
      name: 'Original wraps',
      barcode: '0060383726027',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/372/6027/front_en.19.400.jpg',
    },
    {
      name: 'Biscuits Bleuet Et Cassonade',
      barcode: '0065987000207',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/598/700/0207/front_fr.20.400.jpg',
    },
    {
      name: 'CRANBERRY almond thin cookies',
      barcode: '0812240004430',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/081/224/000/4430/front_en.13.400.jpg',
    },
    {
      name: 'Original Crackers',
      barcode: '0897580000106',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/089/758/000/0106/front_en.24.400.jpg',
    },
    {
      name: 'Apple cider vinegar 946ML',
      barcode: '0074305101328',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/430/510/1328/front_en.6.400.jpg',
    },
    {
      name: 'Galettes de Riz (Chocolat/Caramel)',
      barcode: '0055577107966',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/710/7966/front_en.88.400.jpg',
    },
    {
      name: '3.5% Plain Yogurt',
      barcode: '0059161702032',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/916/170/2032/front_en.21.400.jpg',
    },
    {
      name: 'Sauce pour ptes biologique aux tomates et ai basilic',
      barcode: '0070974002829',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/097/400/2829/front_en.5.400.jpg',
    },
    {
      name: 'Noix de cajous crues',
      barcode: '0805509998595',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/080/550/999/8595/front_fr.4.400.jpg',
    },
    {
      name: 'Coconut Milk Vegan Delight - Plain',
      barcode: '0064912087221',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/491/208/7221/front_en.16.400.jpg',
    },
    {
      name: 'Collations aux Fruits',
      barcode: '0034856264606',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/485/626/4606/front_en.29.400.jpg',
    },
    {
      name: 'Parle-G Original Gluco Biscuits',
      barcode: '8901719902413',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/890/171/990/2413/front_en.23.400.jpg',
    },
    {
      name: 'Brown Sugar',
      barcode: '0058891652310',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/889/165/2310/front_en.20.400.jpg',
    },
    {
      name: 'Coconut & Cashew Butter Granola',
      barcode: '0058449172192',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/844/917/2192/front_en.31.400.jpg',
    },
    {
      name: 'Sour Cream',
      barcode: '0096619177622',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/917/7622/front_fr.3.400.jpg',
    },
    {
      name: 'Farfalle',
      barcode: '0076808011128',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/680/801/1128/front_en.4.400.jpg',
    },
    {
      name: 'Rice Krispies',
      barcode: '0064100144507',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/014/4507/front_en.21.400.jpg',
    },
    {
      name: 'Dk Choc, Almond & Sea Salt bars.',
      barcode: '0018627114345',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/862/711/4345/front_en.29.400.jpg',
    },
    {
      name: 'Kelloggs corn flakes',
      barcode: '0064100144521',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/014/4521/front_en.11.400.jpg',
    },
    {
      name: 'Medium Salsa',
      barcode: '0060410010983',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/001/0983/front_en.26.400.jpg',
    },
    {
      name: 'Pumpkin Seed & Flax Granola',
      barcode: '0058449890072',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/844/989/0072/front_en.36.400.jpg',
    },
    {
      name: 'Dijon',
      barcode: '0056200762279',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/620/076/2279/front_fr.7.400.jpg',
    },
    {
      name: 'Sardine Fillets in Spring Water',
      barcode: '0066613000097',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/661/300/0097/front_en.63.400.jpg',
    },
    {
      name: 'Sesame Snaps',
      barcode: '0872590000155',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/087/259/000/0155/front_en.21.400.jpg',
    },
    {
      name: 'Crme cuisson',
      barcode: '0068200202662',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/820/020/2662/front_en.9.400.jpg',
    },
    {
      name: 'Almond SoFresh Unsweetened Vanilla',
      barcode: '0626027700060',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/602/770/0060/front_en.32.400.jpg',
    },
    {
      name: 'Biscuit morceaux de chocolat',
      barcode: '0626233226026',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/623/322/6026/front_en.23.400.jpg',
    },
    {
      name: 'Chi lately Chunks Cookie Dough Protein Bar',
      barcode: '0096619516698',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/951/6698/front_en.70.400.jpg',
    },
    {
      name: 'Kefir',
      barcode: '0776241032468',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/077/624/103/2468/front_fr.3.400.jpg',
    },
    {
      name: 'Soft & Chewy',
      barcode: '0096619281893',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/928/1893/front_fr.10.400.jpg',
    },
    {
      name: 'Regular Potato Chips',
      barcode: '0060383992545',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/399/2545/front_en.32.400.jpg',
    },
    {
      name: 'Croustilles au ketchup',
      barcode: '0060410047514',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/004/7514/front_en.31.400.jpg',
    },
    {
      name: 'Cheerios (plain)',
      barcode: '0065633161221',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/316/1221/front_fr.9.400.jpg',
    },
    {
      name: 'Ozonated Natural Spring Water',
      barcode: '0055742346886',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/574/234/6886/front_en.23.400.jpg',
    },
    {
      name: 'Multigrains Harvest Cheddar',
      barcode: '0060410053942',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/005/3942/front_fr.12.400.jpg',
    },
    {
      name: 'Chocolate Protein Shake',
      barcode: '0057271163262',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/727/116/3262/front_en.5.400.jpg',
    },
    {
      name: 'Strawberry Premium Fruit Spread',
      barcode: '0067275006021',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/727/500/6021/front_en.17.400.jpg',
    },
    {
      name: 'Dark Mocha Almond. Product of USA.',
      barcode: '0018627114314',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/862/711/4314/front_en.14.400.jpg',
    },
    {
      name: 'Yogourt Libert mditerrane',
      barcode: '0065684155286',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/568/415/5286/front_fr.10.400.jpg',
    },
    {
      name: 'Biobest',
      barcode: '0068200347448',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/820/034/7448/front_fr.11.400.jpg',
    },
    {
      name: 'Organic Hemp Hearts',
      barcode: '0096619142293',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/914/2293/front_en.30.400.jpg',
    },
    {
      name: 'Naan nature',
      barcode: '0876681004435',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/087/668/100/4435/front_fr.11.400.jpg',
    },
    {
      name: 'Masala Festive Pack Authentic Indian Noodles',
      barcode: '0055000490955',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/500/049/0955/front_en.60.400.jpg',
    },
    {
      name: 'Organic Tomato Paste',
      barcode: '0096619821150',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/982/1150/front_en.24.400.jpg',
    },
    {
      name: 'Thon Blanc Entier',
      barcode: '0065302000295',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/530/200/0295/front_en.22.400.jpg',
    },
    {
      name: 'Takis Fuego',
      barcode: '0757528028268',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/075/752/802/8268/front_en.33.400.jpg',
    },
    {
      name: 'Pure Pumpkin',
      barcode: '0067200003606',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/720/000/3606/front_en.28.400.jpg',
    },
    {
      name: 'Ketchup aux tomates',
      barcode: '0060383075293',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/307/5293/front_fr.19.400.jpg',
    },
    {
      name: 'Creamy crmeux',
      barcode: '0059749973809',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/974/997/3809/front_en.12.400.jpg',
    },
    {
      name: 'Nature Valley Protein Peanut Butter Dark Chocolate Bar',
      barcode: '0065633437616',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/343/7616/front_en.31.400.jpg',
    },
    {
      name: 'Pate de tomates',
      barcode: '0067800000302',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/780/000/0302/front_fr.3.400.jpg',
    },
    {
      name: 'Organic Unsweetened Coconut Beverage, produced in Canada, but',
      barcode: '0036632074614',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/663/207/4614/front_en.22.400.jpg',
    },
    {
      name: 'Sun Drops Tomatoes',
      barcode: '0699058796920',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/069/905/879/6920/front_en.5.400.jpg',
    },
    {
      name: 'Chocolate Peanut Butter Flavour Protein Bar',
      barcode: '0722252606419',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/072/225/260/6419/front_en.32.400.jpg',
    },
    {
      name: 'Organic Black Chia Seeds - Whole',
      barcode: '0877693000323',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/087/769/300/0323/front_fr.48.400.jpg',
    },
    {
      name: 'Protein Tortillas',
      barcode: '0060383043407',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/304/3407/front_en.10.400.jpg',
    },
    {
      name: 'Sauce Salade Miracle Whip (ordinaire)',
      barcode: '0068100047578',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/004/7578/front_fr.8.400.jpg',
    },
    {
      name: 'Barre Chocolat, Amandes Et Fudge',
      barcode: '0722252120229',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/072/225/212/0229/front_fr.34.400.jpg',
    },
    {
      name: 'eooklES BlSeUlTS',
      barcode: '0667888189731',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/788/818/9731/front_en.31.400.jpg',
    },
    {
      name: 'Peaches and Cream Corn',
      barcode: '0190569100959',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/019/056/910/0959/front_en.33.400.jpg',
    },
    {
      name: 'Almond SoFresh Original',
      barcode: '0626027700015',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/602/770/0015/front_en.22.400.jpg',
    },
    {
      name: 'Fromage Feta (lait de vachet et chvre)',
      barcode: '0096619546695',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/954/6695/front_fr.15.400.jpg',
    },
    {
      name: 'Half & Half Cream',
      barcode: '0068200511146',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/820/051/1146/front_en.31.400.jpg',
    },
    {
      name: 'Cottage cheese',
      barcode: '0068700463006',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/870/046/3006/front_en.14.400.jpg',
    },
    {
      name: 'Apple Snack',
      barcode: '0096619235896',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/923/5896/front_en.27.400.jpg',
    },
    {
      name: 'Tortilla chips',
      barcode: '0057802109004',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/780/210/9004/front_en.7.400.jpg',
    },
    {
      name: 'Rice Cakes with Milk Chocolate',
      barcode: '0667888226412',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/788/822/6412/front_en.16.400.jpg',
    },
    {
      name: 'Masala Munch',
      barcode: '0060410010402',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/001/0402/front_en.18.400.jpg',
    },
    {
      name: 'Chunk Light Tuna',
      barcode: '0628915242294',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/891/524/2294/front_fr.3.400.jpg',
    },
    {
      name: 'Passata - coulis de tomates - delicat et veloute',
      barcode: '0854693000249',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/085/469/300/0249/front_en.19.400.jpg',
    },
    {
      name: 'Creamy Skyr Plain No Sugar Added High Protein 3.6% M.F.',
      barcode: '0068200325095',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/820/032/5095/front_en.38.400.jpg',
    },
    {
      name: 'Mlange du randonneur',
      barcode: '0096619013852',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/901/3852/front_fr.3.400.jpg',
    },
    {
      name: 'Barres protines',
      barcode: '0686207809051',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/068/620/780/9051/front_fr.8.400.jpg',
    },
    {
      name: 'Oatmeal Cookies',
      barcode: '0055653173359',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/565/317/3359/front_en.23.400.jpg',
    },
    {
      name: 'Aged Cheddar Cheese',
      barcode: '0068200889634',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/820/088/9634/front_en.22.400.jpg',
    },
    {
      name: 'Organic California Veggie Burgers',
      barcode: '0080868303000',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/008/086/830/3000/front_en.65.400.jpg',
    },
    {
      name: 'Granola',
      barcode: '0060383214111',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/321/4111/front_fr.3.400.jpg',
    },
    {
      name: 'Pineapple chunks',
      barcode: '0065250004765',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/525/000/4765/front_fr.10.400.jpg',
    },
    {
      name: 'Chocolat noir 82%',
      barcode: '3173281446595',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/317/328/144/6595/front_en.17.400.jpg',
    },
    {
      name: 'Margerine',
      barcode: '0059950125509',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/995/012/5509/front_en.8.400.jpg',
    },
    {
      name: 'Blueberry',
      barcode: '0859162007606',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/085/916/200/7606/front_en.34.400.jpg',
    },
    {
      name: 'Chewy bars',
      barcode: '0065633165816',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/316/5816/front_fr.8.400.jpg',
    },
    {
      name: 'Poitrine dinde rtie',
      barcode: '0063100100766',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/310/010/0766/front_fr.15.400.jpg',
    },
    {
      name: 'Two good',
      barcode: '0056800820638',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/680/082/0638/front_fr.3.400.jpg',
    },
    {
      name: 'Artisan 12 Grain Bread',
      barcode: '0062240186319',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/224/018/6319/front_en.9.400.jpg',
    },
    {
      name: 'Core Power Elite 42g Protein',
      barcode: '0811620021326',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/081/162/002/1326/front_en.42.400.jpg',
    },
    {
      name: 'Kozyshack Rice Pudding',
      barcode: '0073491510006',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/349/151/0006/front_en.10.400.jpg',
    },
    {
      name: '100% Virgin Coconut Oil',
      barcode: '0627735256955',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/773/525/6955/front_fr.3.400.jpg',
    },
    {
      name: 'Raspberry Fruit Spread 100% From Fruit',
      barcode: '0810019371592',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/081/001/937/1592/front_en.25.400.jpg',
    },
    {
      name: 'All-Bran',
      barcode: '0059724101029',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/972/410/1029/front_en.45.400.jpg',
    },
    {
      name: 'Two good',
      barcode: '0056800820645',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/680/082/0645/front_en.10.400.jpg',
    },
    {
      name: 'Diet Coke',
      barcode: '06792800',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/679/2800/front_en.28.400.jpg',
    },
    {
      name: 'Le petit crmeux',
      barcode: '0621879007503',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/187/900/7503/front_fr.47.400.jpg',
    },
    {
      name: 'Oatmeal Squares',
      barcode: '0055577105665',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/710/5665/front_en.54.400.jpg',
    },
    {
      name: 'Jus De Tomate',
      barcode: '05733905',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/573/3905/front_fr.25.400.jpg',
    },
    {
      name: 'Regular Instant Oatmeal',
      barcode: '0055577113011',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/711/3011/front_en.38.400.jpg',
    },
    {
      name: '7 Up',
      barcode: '06541432',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/654/1432/front_en.33.400.jpg',
    },
    {
      name: 'Organic Coconut Milk',
      barcode: '0806253210414',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/080/625/321/0414/front_en.17.400.jpg',
    },
    {
      name: 'Garlic & fine herbs gournay cheese, garlic & fine herbs',
      barcode: '0079813000118',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/981/300/0118/front_en.47.400.jpg',
    },
    {
      name: '70% Dk Chocolate topped Butter Cookies.',
      barcode: '0064042006734',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/404/200/6734/front_en.39.400.jpg',
    },
    {
      name: 'Ryvita Multi-Grain Rye Crispbread',
      barcode: '0078935005322',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/893/500/5322/front_en.34.400.jpg',
    },
    {
      name: 'Crispy Minis - White Cheddar',
      barcode: '0055577107874',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/710/7874/front_en.23.400.jpg',
    },
    {
      name: 'Coca-Cola',
      barcode: '0067000104022',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/700/010/4022/front_en.16.400.jpg',
    },
    {
      name: 'Orange Juice',
      barcode: '0067311020110',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/731/102/0110/front_en.25.400.jpg',
    },
    {
      name: 'Premium Plus whole wheat crackers',
      barcode: '0066721018748',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/101/8748/front_en.27.400.jpg',
    },
    {
      name: 'Extra Creamy Peanut Butter',
      barcode: '0068100083095',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/008/3095/front_en.25.400.jpg',
    },
    {
      name: 'Poulet et nouilles',
      barcode: '0068400014294',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/840/001/4294/front_en.32.400.jpg',
    },
    {
      name: 'Light Cream Cheese Product',
      barcode: '0068100896473',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/089/6473/front_fr.3.400.jpg',
    },
    {
      name: 'Yogourt Probiotique Activia (fraises - 3.5% M.G. )',
      barcode: '0056800098273',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/680/009/8273/front_en.9.400.jpg',
    },
    {
      name: 'Oasis - Jus de pomme 100% pur',
      barcode: '0067311010333',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/731/101/0333/front_fr.23.400.jpg',
    },
    {
      name: 'Jalapeno Lime Aioli',
      barcode: '0066019200251',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/601/920/0251/front_en.22.400.jpg',
    },
    {
      name: 'Kiri vache qui rit',
      barcode: '3073781025170',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/307/378/102/5170/front_fr.4.400.jpg',
    },
    {
      name: 'Kraft All Natural Sea Salt Peanut Butter',
      barcode: '0068100899788',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/089/9788/front_fr.19.400.jpg',
    },
    {
      name: 'Crispix Delicious Toasted Rice And Crunchy Corn Cereal',
      barcode: '0064100358034',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/035/8034/front_en.15.400.jpg',
    },
    {
      name: 'Honey Oat Flax, 7-Grain with Quinoa bars.',
      barcode: '0018627102588',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/862/710/2588/front_en.32.400.jpg',
    },
    {
      name: 'Original Cayenne Pepper Sauce',
      barcode: '0056200805020',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/620/080/5020/front_en.42.400.jpg',
    },
    {
      name: 'Barre Granola Chocolate noir et Noix',
      barcode: '0065633506893',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/350/6893/front_en.42.400.jpg',
    },
    {
      name: 'HoneyMaid',
      barcode: '0066721010414',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/101/0414/front_fr.20.400.jpg',
    },
    {
      name: 'Boisson energy',
      barcode: '0070847811190',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/084/781/1190/front_en.61.400.jpg',
    },
    {
      name: '74% Cocoa Dark Chocolate',
      barcode: '0667888095155',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/788/809/5155/front_en.43.400.jpg',
    },
    {
      name: 'PISTACHIOS',
      barcode: '0096619107681',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/910/7681/front_en.26.400.jpg',
    },
    {
      name: 'Tomate et basilic',
      barcode: '0057000330040',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/700/033/0040/front_fr.9.400.jpg',
    },
    {
      name: 'Chick Peas',
      barcode: '0062356500061',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/235/650/0061/front_en.25.400.jpg',
    },
    {
      name: 'Kraft Philadelphia Light Cream Cheese Original Light',
      barcode: '0068100896343',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/089/6343/front_en.32.400.jpg',
    },
    {
      name: 'The Decadent Chocolate Chip Cookies',
      barcode: '0060383049645',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/304/9645/front_en.43.400.jpg',
    },
    {
      name: 'Gruau coupe point',
      barcode: '0055577102114',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/710/2114/front_en.16.400.jpg',
    },
    {
      name: 'Vegetable Broth No Salt Added',
      barcode: '0063211206418',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/321/120/6418/front_en.37.400.jpg',
    },
    {
      name: '100% Canadian Pure Liquid Honey',
      barcode: '0060383781255',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/378/1255/front_en.21.400.jpg',
    },
    {
      name: 'Sauce soya',
      barcode: '0058744151632',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/874/415/1632/front_fr.3.400.jpg',
    },
    {
      name: 'Gluten Free Herb & Garlic Crackers',
      barcode: '0055653688105',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/565/368/8105/front_en.5.400.jpg',
    },
    {
      name: 'Yogourt Probiotique Activia (cerise)',
      barcode: '0056800739022',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/680/073/9022/front_en.27.400.jpg',
    },
    {
      name: 'Sauce Pour Ptes Alfredo',
      barcode: '0057000330194',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/700/033/0194/front_en.25.400.jpg',
    },
    {
      name: 'Whippet original vrai chocolat',
      barcode: '0063348003034',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/334/800/3034/front_fr.32.400.jpg',
    },
    {
      name: 'Baies ctires - melange montagnard baie',
      barcode: '0898114002016',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/089/811/400/2016/front_en.11.400.jpg',
    },
    {
      name: 'Veggie Crisps Lgume - sea salt',
      barcode: '0055653645801',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/565/364/5801/front_fr.13.400.jpg',
    },
    {
      name: 'Mayonnaise',
      barcode: '0096619941599',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/994/1599/front_en.31.400.jpg',
    },
    {
      name: 'Low Sodium Ketchup Style Sauce',
      barcode: '0057000038557',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/700/003/8557/front_en.30.400.jpg',
    },
    {
      name: 'Smooth peanut butter',
      barcode: '0055742348378',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/574/234/8378/front_fr.13.400.jpg',
    },
    {
      name: 'Smart Bran Cereal',
      barcode: '0058449771029',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/844/977/1029/front_en.33.400.jpg',
    },
    {
      name: 'Cheddar',
      barcode: '0014100230243',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/410/023/0243/front_fr.12.400.jpg',
    },
    {
      name: 'fouett ciboulette',
      barcode: '0068100896503',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/089/6503/front_en.4.400.jpg',
    },
    {
      name: 'Lightly Salted Ripple Cut Potato Chips',
      barcode: '0060383894597',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/389/4597/front_en.25.400.jpg',
    },
    {
      name: 'Honey',
      barcode: '0096619762644',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/976/2644/front_fr.3.400.jpg',
    },
    {
      name: 'Strawberry, Fruit & Oat bars, Individually wrapped.',
      barcode: '0064042498089',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/404/249/8089/front_en.18.400.jpg',
    },
    {
      name: 'Mini-biscuits moelleux | Velours Rouge',
      barcode: '0687456283340',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/068/745/628/3340/front_fr.21.400.jpg',
    },
    {
      name: 'Corn flakes',
      barcode: '0064100143111',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/014/3111/front_fr.3.400.jpg',
    },
    {
      name: 'Unsalted Butter',
      barcode: '0060383685003',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/368/5003/front_en.14.400.jpg',
    },
    {
      name: 'Protines saveur arachides, amandes et chocolat noir',
      barcode: '0065633437593',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/343/7593/front_en.24.400.jpg',
    },
    {
      name: 'Just Peanuts Crunchy Peanut Butter',
      barcode: '0060383860486',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/386/0486/front_en.40.400.jpg',
    },
    {
      name: 'Mayonnaise lhuile dolive',
      barcode: '0068400158066',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/840/015/8066/front_en.48.400.jpg',
    },
    {
      name: 'Pepsi Zero Sugar',
      barcode: '0069000013724',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/900/001/3724/front_en.16.400.jpg',
    },
    {
      name: 'Tomato Paste',
      barcode: '0058807388135',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/880/738/8135/front_en.38.400.jpg',
    },
    {
      name: 'Japanese Style Noodles Original Flavour',
      barcode: '0076186010003',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/618/601/0003/front_en.16.400.jpg',
    },
    {
      name: 'No Sugar Added Ketchup Style Sauce',
      barcode: '0057000038571',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/700/003/8571/front_en.18.400.jpg',
    },
    {
      name: '70% Dark Chocolate',
      barcode: '0060383998615',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/399/8615/front_en.60.400.jpg',
    },
    {
      name: 'Chocolate chip',
      barcode: '0063348100948',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/334/810/0948/front_en.28.400.jpg',
    },
    {
      name: 'grapefruitbubly',
      barcode: '0069000008294',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/900/000/8294/front_en.20.400.jpg',
    },
    {
      name: 'Cottage cheese',
      barcode: '0064420004147',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/442/000/4147/front_fr.9.400.jpg',
    },
    {
      name: 'Natrel plus 18g protein milk',
      barcode: '0064420320148',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/442/032/0148/front_en.56.400.jpg',
    },
    {
      name: 'High Protein Greek Yogurt- Strawberry Raspberry',
      barcode: '0056800561128',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/680/056/1128/front_en.15.400.jpg',
    },
    {
      name: 'Frosted Strawberry Flavour Pastries',
      barcode: '0064100130920',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/013/0920/front_en.11.400.jpg',
    },
    {
      name: 'Organic Variety Pack (Apple Apple/Apple Strawberry/Apple Banana/Apple Peach) Fru',
      barcode: '0848860046246',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/084/886/004/6246/front_en.34.400.jpg',
    },
    {
      name: 'Plantain Chips',
      barcode: '0667888106127',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/788/810/6127/front_en.46.400.jpg',
    },
    {
      name: 'Oat Bran',
      barcode: '0055577102459',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/710/2459/front_en.16.400.jpg',
    },
    {
      name: 'Beurre sal',
      barcode: '0059749894784',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/974/989/4784/front_fr.17.400.jpg',
    },
    {
      name: 'Cocktail Aux Lgumes',
      barcode: '0065912004515',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/591/200/4515/front_fr.31.400.jpg',
    },
    {
      name: 'Philadelphia light',
      barcode: '0068100895902',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/089/5902/front_fr.4.400.jpg',
    },
    {
      name: 'Original Potato Crisps',
      barcode: '0060410066300',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/006/6300/front_en.27.400.jpg',
    },
    {
      name: 'Fruit to Go Strawberry',
      barcode: '0061522980010',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/152/298/0010/front_en.24.400.jpg',
    },
    {
      name: 'Mini Ritz cheese',
      barcode: '0066721006080',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/100/6080/front_en.23.400.jpg',
    },
    {
      name: 'Colorant Caf',
      barcode: '0050000361588',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/000/036/1588/front_en.26.400.jpg',
    },
    {
      name: 'Vinaigre balsamique de Modne vielli',
      barcode: '0096619461769',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/946/1769/front_en.20.400.jpg',
    },
    {
      name: 'Water',
      barcode: '0069000061008',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/900/006/1008/front_en.7.400.jpg',
    },
    {
      name: 'Bananas 3 lb bag, 30669',
      barcode: '0717524611109',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/071/752/461/1109/front_en.12.400.jpg',
    },
    {
      name: 'Pringles Original 19g',
      barcode: '06400118',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/640/0118/front_en.10.400.jpg',
    },
    {
      name: 'Shortcake',
      barcode: '0065987000283',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/598/700/0283/front_fr.3.400.jpg',
    },
    {
      name: 'Dark Chocolate Delight',
      barcode: '0770333028001',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/077/033/302/8001/front_en.22.400.jpg',
    },
    {
      name: 'Cheez-its',
      barcode: '0064100131736',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/013/1736/front_en.29.400.jpg',
    },
    {
      name: 'Organic Guacamole Minis',
      barcode: '0616112682517',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/061/611/268/2517/front_en.26.400.jpg',
    },
    {
      name: 'Naked Oat Original',
      barcode: '0626027871029',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/602/787/1029/front_en.58.400.jpg',
    },
    {
      name: 'Tomates en d/diced tomatoes',
      barcode: '0067800002351',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/780/000/2351/front_en.19.400.jpg',
    },
    {
      name: 'Salted Butter',
      barcode: '0066013598620',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/601/359/8620/front_en.28.400.jpg',
    },
    {
      name: 'Snack Bar - Lemon Coconut',
      barcode: '0686207006139',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/068/620/700/6139/front_en.20.400.jpg',
    },
    {
      name: 'Whole Wheat Tortillas',
      barcode: '0063400170056',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/340/017/0056/front_en.12.400.jpg',
    },
    {
      name: 'Hoisin Sauce',
      barcode: '0742812700616',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/074/281/270/0616/front_en.83.400.jpg',
    },
    {
      name: 'Organic Coconut Water',
      barcode: '0096619020799',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/902/0799/front_en.14.400.jpg',
    },
    {
      name: 'Fine-Filtered Organic Whole Milk 3.8% M.F.',
      barcode: '0055872515176',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/587/251/5176/front_en.31.400.jpg',
    },
    {
      name: 'Whole Wheat Penne Rigate',
      barcode: '0064200115414',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/420/011/5414/front_en.17.400.jpg',
    },
    {
      name: 'Crispy Bars',
      barcode: '0686207006146',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/068/620/700/6146/front_en.24.400.jpg',
    },
    {
      name: 'Beurre non sal',
      barcode: '0059749894777',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/974/989/4777/front_fr.4.400.jpg',
    },
    {
      name: 'Honeymaid',
      barcode: '0066721010827',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/101/0827/front_fr.35.400.jpg',
    },
    {
      name: 'Peanut butter smooth light',
      barcode: '0068100083200',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/008/3200/front_en.16.400.jpg',
    },
    {
      name: 'Coffee Kirkland',
      barcode: '0096619150717',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/915/0717/front_en.26.400.jpg',
    },
    {
      name: 'Garden Style Vegetable Soup',
      barcode: '0063211311211',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/321/131/1211/front_en.54.400.jpg',
    },
    {
      name: 'Coconut Beverage, Unsweetened Original',
      barcode: '0025293002449',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/002/529/300/2449/front_en.36.400.jpg',
    },
    {
      name: 'Whole Wheat Spaghettini',
      barcode: '0064200116978',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/420/011/6978/front_en.30.400.jpg',
    },
    {
      name: 'Greek Yogurt',
      barcode: '0096619573264',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/957/3264/front_fr.6.400.jpg',
    },
    {
      name: '7up lemon, lime & bubbles',
      barcode: '06549337',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/654/9337/front_en.4.400.jpg',
    },
    {
      name: 'Libert GREEK',
      barcode: '0065684004737',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/568/400/4737/front_en.35.400.jpg',
    },
    {
      name: 'Tacos coquilles croustillants',
      barcode: '0058300060170',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/830/006/0170/front_en.31.400.jpg',
    },
    {
      name: 'Crunchy Peanut Butter',
      barcode: '0051500751367',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/150/075/1367/front_en.39.400.jpg',
    },
    {
      name: 'Soya sauce',
      barcode: '0060383730369',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/373/0369/front_en.4.400.jpg',
    },
    {
      name: 'Instant Hot Chocolate Mix.',
      barcode: '0060383128838',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/312/8838/front_en.46.400.jpg',
    },
    {
      name: 'Cheez-It Crunch',
      barcode: '0064100131606',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/013/1606/front_en.11.400.jpg',
    },
    {
      name: 'Graine de lin',
      barcode: '0871329005010',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/087/132/900/5010/front_en.21.400.jpg',
    },
    {
      name: 'Mango Drink with Pulp',
      barcode: '0667888290468',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/788/829/0468/front_en.22.400.jpg',
    },
    {
      name: 'Organic Honey - No 1 Amber',
      barcode: '0055828917504',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/582/891/7504/front_en.12.400.jpg',
    },
    {
      name: 'Pure Liquid Honey',
      barcode: '0627735012872',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/773/501/2872/front_fr.11.400.jpg',
    },
    {
      name: 'Corona Extra',
      barcode: '0062067382406',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/206/738/2406/front_fr.3.400.jpg',
    },
    {
      name: 'Barres aux figues',
      barcode: '0047495621044',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/004/749/562/1044/front_fr.3.400.jpg',
    },
    {
      name: 'Whey Protein',
      barcode: '0804642002442',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/080/464/200/2442/front_en.38.400.jpg',
    },
    {
      name: 'Organic Japanese Matcha Green Tea Powder',
      barcode: '0805509085707',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/080/550/908/5707/front_en.9.400.jpg',
    },
    {
      name: 'Crispy Minis Brown Rice Cakes - Everything Flavor',
      barcode: '0055577108888',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/710/8888/front_en.23.400.jpg',
    },
    {
      name: 'Sauce Tomate Marinara au Basilic',
      barcode: '0057000330156',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/700/033/0156/front_en.26.400.jpg',
    },
    {
      name: 'Original Popcorn',
      barcode: '0816925022344',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/081/692/502/2344/front_en.13.400.jpg',
    },
    {
      name: 'Oreo double creme',
      barcode: '0066721026606',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/102/6606/front_en.22.400.jpg',
    },
    {
      name: 'Organic Chicken Broth',
      barcode: '0096619938759',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/993/8759/front_en.44.400.jpg',
    },
    {
      name: 'Pain tranch',
      barcode: '0068721902492',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/872/190/2492/front_fr.3.400.jpg',
    },
    {
      name: 'Tangy Original SunnyD',
      barcode: '0050200012976',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/020/001/2976/front_en.25.400.jpg',
    },
    {
      name: 'Sauce soja',
      barcode: '0059749879798',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/974/987/9798/front_fr.4.400.jpg',
    },
    {
      name: 'Doritos fromage nacho cheese',
      barcode: '0060410020203',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/002/0203/front_en.3.400.jpg',
    },
    {
      name: 'Tomates broyees et filtrees',
      barcode: '0061659000704',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/165/900/0704/front_en.21.400.jpg',
    },
    {
      name: 'Maple Syrup',
      barcode: '0062558121002',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/255/812/1002/front_en.17.400.jpg',
    },
    {
      name: 'Maple Leaf Tradition Cookies',
      barcode: '0064042002941',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/404/200/2941/front_en.30.400.jpg',
    },
    {
      name: 'Beans with Tomato Sauce',
      barcode: '0064300222456',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/430/022/2456/front_en.35.400.jpg',
    },
    {
      name: 'Ivory Teff Wraps, Gluten Free',
      barcode: '0078858525020',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/885/852/5020/front_en.70.400.jpg',
    },
    {
      name: 'barre de protine biscuit aux brisures cho',
      barcode: '0888849002191',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/088/884/900/2191/front_en.24.400.jpg',
    },
    {
      name: 'Vegetable Cocktail with Low Sodium',
      barcode: '0063211158823',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/321/115/8823/front_en.17.400.jpg',
    },
    {
      name: '100% Apple Juice from Concentrate with Added Vitamin C',
      barcode: '0059600048097',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/960/004/8097/front_en.10.400.jpg',
    },
    {
      name: 'Double fruit fraise lgre',
      barcode: '0069848069327',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/984/806/9327/front_fr.16.400.jpg',
    },
    {
      name: 'Organic Sprouted Power Soft Wheat Bread',
      barcode: '0055991041020',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/599/104/1020/front_en.47.400.jpg',
    },
    {
      name: 'Organic Mango Orange Juice',
      barcode: '0189727001054',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/018/972/700/1054/front_fr.11.400.jpg',
    },
    {
      name: 'Mini Cookies, Chocolate',
      barcode: '0064042223148',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/404/222/3148/front_en.19.400.jpg',
    },
    {
      name: 'Island Bar',
      barcode: '0667888123865',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/788/812/3865/front_en.9.400.jpg',
    },
    {
      name: 'Orange Vitamin Enhanced Water Beverage',
      barcode: '0786162650030',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/078/616/265/0030/front_en.25.400.jpg',
    },
    {
      name: 'Snack Factory Original',
      barcode: '0049508249801',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/004/950/824/9801/front_en.14.400.jpg',
    },
    {
      name: 'Slices genre Cheddar',
      barcode: '0068200877808',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/820/087/7808/front_en.16.400.jpg',
    },
    {
      name: 'Quick Oats 100% Whole Grain Canada',
      barcode: '0055577101681',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/710/1681/front_en.36.400.jpg',
    },
    {
      name: 'Thon blanc mitt',
      barcode: '0061362432403',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/136/243/2403/front_fr.3.400.jpg',
    },
    {
      name: 'Glace la vanille',
      barcode: '0055000140287',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/500/014/0287/front_fr.3.400.jpg',
    },
    {
      name: 'Creamy Peanut Butter, Salted',
      barcode: '0051500750360',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/150/075/0360/front_en.98.400.jpg',
    },
    {
      name: 'Chicken broth',
      barcode: '0063211148114',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/321/114/8114/front_fr.3.400.jpg',
    },
    {
      name: 'Chips ahoy!',
      barcode: '0066721026576',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/102/6576/front_en.24.400.jpg',
    },
    {
      name: 'Regular Rippled Potato Chips',
      barcode: '0627735018973',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/773/501/8973/front_en.8.400.jpg',
    },
    {
      name: 'Star Puffed Crackers - Cheddar Flavor/Flavour',
      barcode: '0687456230016',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/068/745/623/0016/front_en.24.400.jpg',
    },
    {
      name: 'Organic Corn Cakes',
      barcode: '0667888485505',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/788/848/5505/front_en.9.400.jpg',
    },
    {
      name: 'chipotle aioli',
      barcode: '0066019200237',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/601/920/0237/front_fr.3.400.jpg',
    },
    {
      name: 'Sea Salt',
      barcode: '0690345037504',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/069/034/503/7504/front_en.18.400.jpg',
    },
    {
      name: 'Fibre One',
      barcode: '0065633186040',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/318/6040/front_en.26.400.jpg',
    },
    {
      name: 'Toppables Crackers',
      barcode: '0066721027573',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/102/7573/front_fr.3.400.jpg',
    },
    {
      name: 'Fancy Whole Unsalted Cashews',
      barcode: '0096619928910',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/992/8910/front_en.28.400.jpg',
    },
    {
      name: 'Coconut Cookies',
      barcode: '0055653173250',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/565/317/3250/front_en.18.400.jpg',
    },
    {
      name: 'Cinnamon Crunch Cereal',
      barcode: '0065633173040',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/317/3040/front_en.33.400.jpg',
    },
    {
      name: 'Sweet Red Chili Dipping & All-Purpose Sauce',
      barcode: '0737628084005',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/073/762/808/4005/front_en.13.400.jpg',
    },
    {
      name: 'Special K Original',
      barcode: '0064100143180',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/014/3180/front_fr.3.400.jpg',
    },
    {
      name: 'Aquafina',
      barcode: '0069000061015',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/900/006/1015/front_fr.10.400.jpg',
    },
    {
      name: 'Heineken Lager Beer',
      barcode: '0072890000224',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/289/000/0224/front_en.11.400.jpg',
    },
    {
      name: 'Schoolsafe',
      barcode: '0805658450753',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/080/565/845/0753/front_fr.18.400.jpg',
    },
    {
      name: 'Wild Blend Rice',
      barcode: '0073416511507',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/341/651/1507/front_en.24.400.jpg',
    },
    {
      name: 'Mild Mexicana',
      barcode: '0068826200028',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/882/620/0028/front_en.18.400.jpg',
    },
    {
      name: 'chipots chunks',
      barcode: '0056600902565',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/660/090/2565/front_en.31.400.jpg',
    },
    {
      name: 'Pretzel',
      barcode: '0064100126145',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/012/6145/front_en.4.400.jpg',
    },
    {
      name: 'Mayonaise',
      barcode: '0060383987121',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/398/7121/front_en.7.400.jpg',
    },
    {
      name: 'Probiotic Yogurt',
      barcode: '0096619244676',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/924/4676/front_en.27.400.jpg',
    },
    {
      name: 'Cheezies',
      barcode: '0056757210001',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/675/721/0001/front_en.28.400.jpg',
    },
    {
      name: 'Fromage cheddar fort',
      barcode: '0096619366453',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/936/6453/front_fr.13.400.jpg',
    },
    {
      name: 'Sealtest Half & half cream',
      barcode: '0064420002389',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/442/000/2389/front_en.12.400.jpg',
    },
    {
      name: 'Crme au citron',
      barcode: '0055653170150',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/565/317/0150/front_en.16.400.jpg',
    },
    {
      name: 'Organic Unsweet Soy Bev, Shelf-Stable. Made in',
      barcode: '0025293005549',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/002/529/300/5549/front_en.29.400.jpg',
    },
    {
      name: 'Multigrain bread',
      barcode: '0062240098124',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/224/009/8124/front_en.8.400.jpg',
    },
    {
      name: 'Whole Grain English Muffins',
      barcode: '0068721006022',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/872/100/6022/front_en.6.400.jpg',
    },
    {
      name: 'Cold-Pressed Extra Virgin Avocado Oil',
      barcode: '0060383985745',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/398/5745/front_es.17.400.jpg',
    },
    {
      name: 'Mais eclate sel marin',
      barcode: '0892773000246',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/089/277/300/0246/front_fr.3.400.jpg',
    },
    {
      name: 'Fromage Mozzarella',
      barcode: '0096619366514',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/936/6514/front_fr.3.400.jpg',
    },
    {
      name: 'Chocolate chip cookies',
      barcode: '0096619141890',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/914/1890/front_en.16.400.jpg',
    },
    {
      name: '3.25% M.F. Ultrafiltered Lactose Free Whole Milk',
      barcode: '0811620021791',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/081/162/002/1791/front_en.27.400.jpg',
    },
    {
      name: 'Mixed Berries Morning Rounds',
      barcode: '0664164105676',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/416/410/5676/front_en.38.400.jpg',
    },
    {
      name: 'Rotini',
      barcode: '0076808011104',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/680/801/1104/front_fr.3.400.jpg',
    },
    {
      name: 'MultiVites',
      barcode: '0027917001975',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/002/791/700/1975/front_fr.5.400.jpg',
    },
    {
      name: 'Brown rice thins',
      barcode: '0069372007109',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/937/200/7109/front_en.9.400.jpg',
    },
    {
      name: 'Honey Shreddies',
      barcode: '0628154380337',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/815/438/0337/front_en.10.400.jpg',
    },
    {
      name: 'Bourbon',
      barcode: '0667888466559',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/788/846/6559/front_en.11.400.jpg',
    },
    {
      name: 'Crispy minis',
      barcode: '0055577109120',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/710/9120/front_fr.3.400.jpg',
    },
    {
      name: 'Sour patch kids',
      barcode: '0057700017272',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/770/001/7272/front_en.9.400.jpg',
    },
    {
      name: 'Morning Crisp Dark Chocolate Dream',
      barcode: '0737282363010',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/073/728/236/3010/front_en.6.400.jpg',
    },
    {
      name: 'Organic Grass Fed Shells & White Cheddar Macaroni & Cheese',
      barcode: '0013562000227',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/356/200/0227/front_fr.3.400.jpg',
    },
    {
      name: 'Grec nature',
      barcode: '0060383056414',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/305/6414/front_en.12.400.jpg',
    },
    {
      name: 'Chocolate Banana Granola Minis',
      barcode: '0687456226019',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/068/745/622/6019/front_fr.17.400.jpg',
    },
    {
      name: 'Whole Wheat Roti',
      barcode: '0627265011635',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/726/501/1635/front_en.53.400.jpg',
    },
    {
      name: 'Dairy Free Half & Half Creamer',
      barcode: '0036632075918',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/663/207/5918/front_fr.3.400.jpg',
    },
    {
      name: 'Lentil & Veg Organic Soup',
      barcode: '0061148379014',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/114/837/9014/front_en.27.400.jpg',
    },
    {
      name: 'Beurre de cacahuetes crunchy',
      barcode: '0051500710173',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/150/071/0173/front_en.24.400.jpg',
    },
    {
      name: 'Original Wagon Wheels',
      barcode: '0063348165442',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/334/816/5442/front_en.27.400.jpg',
    },
    {
      name: 'Sriracha',
      barcode: '8853662056029',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/885/366/205/6029/front_en.26.400.jpg',
    },
    {
      name: 'Miche multi grain',
      barcode: '0628553080197',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/855/308/0197/front_fr.3.400.jpg',
    },
    {
      name: 'Green Goodness',
      barcode: '0071464316549',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/146/431/6549/front_fr.14.400.jpg',
    },
    {
      name: 'Arrowroot',
      barcode: '0066721018564',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/101/8564/front_fr.16.400.jpg',
    },
    {
      name: 'Egg Whites',
      barcode: '0065651002476',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/565/100/2476/front_en.18.400.jpg',
    },
    {
      name: 'Steel-Cut Oats, 100% Whole Grain',
      barcode: '0060383781323',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/378/1323/front_en.51.400.jpg',
    },
    {
      name: 'Pain naan original',
      barcode: '0061483057950',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/148/305/7950/front_fr.3.400.jpg',
    },
    {
      name: 'Nordica 2% cottage cheese',
      barcode: '0066013153638',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/601/315/3638/front_fr.3.400.jpg',
    },
    {
      name: 'Parmesan',
      barcode: '0628915787313',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/891/578/7313/front_fr.3.400.jpg',
    },
    {
      name: 'Plant based yogurt',
      barcode: '0627987070767',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/798/707/0767/front_en.11.400.jpg',
    },
    {
      name: 'Butter',
      barcode: '0068200701073',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/820/070/1073/front_fr.3.400.jpg',
    },
    {
      name: 'Tartinade au caramel',
      barcode: '0069809017602',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/980/901/7602/front_fr.3.400.jpg',
    },
    {
      name: 'N 4 Spaghetti PASTA',
      barcode: '0810026810275',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/081/002/681/0275/front_it.8.400.jpg',
    },
    {
      name: 'Grand Granola',
      barcode: '0883366000293',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/088/336/600/0293/front_fr.3.400.jpg',
    },
    {
      name: 'Tortilla Protines',
      barcode: '0840202208954',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/084/020/220/8954/front_en.45.400.jpg',
    },
    {
      name: 'Pre-workout Powder',
      barcode: '0842595130829',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/084/259/513/0829/front_en.3.400.jpg',
    },
    {
      name: 'Chile n lime',
      barcode: '0041570147757',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/004/157/014/7757/front_en.6.400.jpg',
    },
    {
      name: 'Raisin Bran',
      barcode: '0059724101067',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/972/410/1067/front_en.8.400.jpg',
    },
    {
      name: 'Honey Yuzu Tea Base',
      barcode: '0195434000082',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/019/543/400/0082/front_en.3.400.jpg',
    },
    {
      name: 'Gatorade Fit',
      barcode: '0057271163491',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/727/116/3491/front_en.37.400.jpg',
    },
    {
      name: 'Vitamin C, (Timed Release)',
      barcode: '0625273039078',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/527/303/9078/front_en.32.400.jpg',
    },
    {
      name: 'Snack Bar - Dark Chocolate Almond',
      barcode: '0686207006153',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/068/620/700/6153/front_en.3.400.jpg',
    },
    {
      name: 'applebubly',
      barcode: '0069000159347',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/900/015/9347/front_en.7.400.jpg',
    },
    {
      name: 'mangobubly',
      barcode: '0069000149478',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/900/014/9478/front_en.9.400.jpg',
    },
    {
      name: 'Greek Yogurt 2% M.F. - Plain',
      barcode: '0059161402208',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/916/140/2208/front_en.14.400.jpg',
    },
    {
      name: 'Seasoned Rotisserie Chicken',
      barcode: '03479377',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/347/9377/front_en.346.400.jpg',
    },
    {
      name: 'Mlange oh mega',
      barcode: '0805509994139',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/080/550/999/4139/front_en.3.400.jpg',
    },
    {
      name: 'Hemp Hearts, Shelled Hemp Seeds',
      barcode: '0697658201196',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/069/765/820/1196/front_en.15.400.jpg',
    },
    {
      name: 'Golden Yellow Sugar/Cassonade Dore',
      barcode: '0062847610637',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/284/761/0637/front_en.17.400.jpg',
    },
    {
      name: 'Chocolate Drizzled Granola Bars, Birthday Cake Flavour / Flavor',
      barcode: '0687456914138',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/068/745/691/4138/front_en.9.400.jpg',
    },
    {
      name: 'Protein and greens',
      barcode: '0838766101002',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/083/876/610/1002/front_en.6.400.jpg',
    },
    {
      name: 'kfir nature',
      barcode: '0060383138011',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/313/8011/front_fr.3.400.jpg',
    },
    {
      name: 'Bananas, Organic Fairtrade, #94237',
      barcode: '0802313000025',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/080/231/300/0025/front_en.36.400.jpg',
    },
    {
      name: 'Oikos 0% greek yogurt 30% less sugar',
      barcode: '0056800295740',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/680/029/5740/front_en.9.400.jpg',
    },
    {
      name: 'Four Fruit Fruit Spread',
      barcode: '0067275007516',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/727/500/7516/front_en.13.400.jpg',
    },
    {
      name: 'Yogourt Granola Bars',
      barcode: '0055577312247',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/731/2247/front_en.3.400.jpg',
    },
    {
      name: 'Pain blanc',
      barcode: '0061077771200',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/107/777/1200/front_fr.23.400.jpg',
    },
    {
      name: 'Unsalted Mixed Nuts',
      barcode: '0096619829453',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/982/9453/front_en.48.400.jpg',
    },
    {
      name: 'Classico - Pain blanc tranch',
      barcode: '0061077771248',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/107/777/1248/front_fr.3.400.jpg',
    },
    {
      name: 'Pain tranch aux 9 grains entiers',
      barcode: '0068505300292',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/850/530/0292/front_fr.17.400.jpg',
    },
    {
      name: 'Kitkat classic',
      barcode: '05980331',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/598/0331/front_en.44.400.jpg',
    },
    {
      name: 'Fromage cottage',
      barcode: '0064420006707',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/442/000/6707/front_fr.23.400.jpg',
    },
    {
      name: 'Ultra Crme 15%',
      barcode: '0055872760552',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/587/276/0552/front_en.25.400.jpg',
    },
    {
      name: 'Vector',
      barcode: '0064100236189',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/023/6189/front_en.17.400.jpg',
    },
    {
      name: 'Villaggio - Bl entier',
      barcode: '0061077771279',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/107/777/1279/front_en.40.400.jpg',
    },
    {
      name: '100% Whole Wheat Bread',
      barcode: '0068505100250',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/850/510/0250/front_fr.4.400.jpg',
    },
    {
      name: 'Almond Unsweet. bev. Shelf-Stable.',
      barcode: '0025293001817',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/002/529/300/1817/front_en.57.400.jpg',
    },
    {
      name: 'Spicy Thai Chili Flaked Light Tuna',
      barcode: '0061362434858',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/136/243/4858/front_en.23.400.jpg',
    },
    {
      name: 'Original Almond Lactose & Dairy-free',
      barcode: '0025293001008',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/002/529/300/1008/front_en.51.400.jpg',
    },
    {
      name: 'Muesli Cereal Original',
      barcode: '0055712115337',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/571/211/5337/front_en.29.400.jpg',
    },
    {
      name: 'Soup aux pois',
      barcode: '0063211311112',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/321/131/1112/front_en.37.400.jpg',
    },
    {
      name: 'Original recipe',
      barcode: '0060410046678',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/004/6678/front_fr.4.400.jpg',
    },
    {
      name: 'Pita bites',
      barcode: '0829515300982',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/082/951/530/0982/front_en.17.400.jpg',
    },
    {
      name: 'Raisins',
      barcode: '0041143029336',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/004/114/302/9336/front_en.24.400.jpg',
    },
    {
      name: 'Nesquik pour du lait chocolat',
      barcode: '0065633297067',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/329/7067/front_fr.40.400.jpg',
    },
    {
      name: 'Ginger Ale',
      barcode: '06215718',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/621/5718/front_en.52.400.jpg',
    },
    {
      name: 'Smooth Peanut Butter',
      barcode: '0060383004408',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/300/4408/front_en.28.400.jpg',
    },
    {
      name: 'Snack Mix',
      barcode: '0060410039342',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/003/9342/front_fr.24.400.jpg',
    },
    {
      name: 'Beurre (demi-sel)',
      barcode: '0066096123320',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/609/612/3320/front_fr.14.400.jpg',
    },
    {
      name: 'Chocolate Chip Organic Granola Bars',
      barcode: '0687456211015',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/068/745/621/1015/front_en.34.400.jpg',
    },
    {
      name: 'Margarine becel 50% moins calories',
      barcode: '0059950191207',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/995/019/1207/front_en.13.400.jpg',
    },
    {
      name: 'Doritos',
      barcode: '0060410054406',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/005/4406/front_fr.3.400.jpg',
    },
    {
      name: 'Craquelins Goldfish Trio Fromage',
      barcode: '0014100170945',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/410/017/0945/front_en.23.400.jpg',
    },
    {
      name: 'GO Lean Crunch Cereal',
      barcode: '0018627597636',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/862/759/7636/front_fr.14.400.jpg',
    },
    {
      name: 'Beurre non sal',
      barcode: '0055872281866',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/587/228/1866/front_fr.24.400.jpg',
    },
    {
      name: '100% Pure Maple Syrup',
      barcode: '0060383082284',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/308/2284/front_en.25.400.jpg',
    },
    {
      name: 'Sour cream',
      barcode: '0064420006271',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/442/000/6271/front_en.17.400.jpg',
    },
    {
      name: 'Barres tendres',
      barcode: '0065633468191',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/346/8191/front_en.27.400.jpg',
    },
    {
      name: 'Cheez whiz',
      barcode: '0068100892352',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/089/2352/front_fr.32.400.jpg',
    },
    {
      name: 'Pepsi',
      barcode: '0069000009840',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/900/000/9840/front_fr.3.400.jpg',
    },
    {
      name: 'Cafe',
      barcode: '05525504',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/552/5504/front_fr.4.400.jpg',
    },
    {
      name: 'Tandoori Baked Naan',
      barcode: '0876681009379',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/087/668/100/9379/front_en.45.400.jpg',
    },
    {
      name: 'Arachides Grilles',
      barcode: '0058716989591',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/871/698/9591/front_fr.10.400.jpg',
    },
    {
      name: 'Country Style Loaf',
      barcode: '0029145083013',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/002/914/508/3013/front_en.13.400.jpg',
    },
    {
      name: 'Garniture salade',
      barcode: '0068110950110',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/811/095/0110/front_en.7.400.jpg',
    },
    {
      name: 'Insalatissime Mais e Tonno',
      barcode: '8004030022010',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/800/403/002/2010/front_en.114.400.jpg',
    },
    {
      name: 'Goldfish Cheddar',
      barcode: '0014100181675',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/410/018/1675/front_en.28.400.jpg',
    },
    {
      name: 'Orange juice',
      barcode: '0048500018361',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/004/850/001/8361/front_fr.23.400.jpg',
    },
    {
      name: 'Active probiotics',
      barcode: '0056800162677',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/680/016/2677/front_fr.3.400.jpg',
    },
    {
      name: 'Boisson de soya Chocolat',
      barcode: '0063667508012',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/366/750/8012/front_fr.43.400.jpg',
    },
    {
      name: 'Chocolate Chip Granola Minis',
      barcode: '0687456222011',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/068/745/622/2011/front_en.26.400.jpg',
    },
    {
      name: 'Il grezzo',
      barcode: '0023457020384',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/002/345/702/0384/front_en.27.400.jpg',
    },
    {
      name: 'Mini Fromage Affin Original',
      barcode: '3073781021783',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/307/378/102/1783/front_en.9.400.jpg',
    },
    {
      name: 'sunflower seeds original',
      barcode: '6924187846180',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/692/418/784/6180/front_en.14.400.jpg',
    },
    {
      name: 'Table Salt',
      barcode: '0067568110800',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/756/811/0800/front_en.22.400.jpg',
    },
    {
      name: 'Huile dolive extra vierge',
      barcode: '0724096510624',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/072/409/651/0624/front_fr.3.400.jpg',
    },
    {
      name: 'Tropicana Original Orange Juice No Pulp 1.89L',
      barcode: '0048500001578',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/004/850/000/1578/front_en.17.400.jpg',
    },
    {
      name: 'Crales Au Chocolat Krave',
      barcode: '0064100713949',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/071/3949/front_fr.7.400.jpg',
    },
    {
      name: 'Garden Select Six Vegetable Recipe Tomato & Basil',
      barcode: '0064200327886',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/420/032/7886/front_en.25.400.jpg',
    },
    {
      name: 'bulls-eye bold bbq sauce',
      barcode: '0068100891027',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/089/1027/front_en.31.400.jpg',
    },
    {
      name: 'Diet Pepsi',
      barcode: '0069000019832',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/900/001/9832/front_en.20.400.jpg',
    },
    {
      name: 'Perrier Mineral Water',
      barcode: '07478341',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/747/8341/front_en.7.400.jpg',
    },
    {
      name: 'Patte dours',
      barcode: '0063348100900',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/334/810/0900/front_en.8.400.jpg',
    },
    {
      name: 'Mas popcorn clater au beurre lger',
      barcode: '0058807484233',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/880/748/4233/front_en.24.400.jpg',
    },
    {
      name: 'Nutrigrain',
      barcode: '0064100281028',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/028/1028/front_en.16.400.jpg',
    },
    {
      name: 'No Name 100% Extra Virgin Olive Oil',
      barcode: '0060383985486',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/398/5486/front_fr.7.400.jpg',
    },
    {
      name: 'Pineapple Burst',
      barcode: '0067311680284',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/731/168/0284/front_en.12.400.jpg',
    },
    {
      name: 'Sauce Worcestershire',
      barcode: '0057000009250',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/700/000/9250/front_en.11.400.jpg',
    },
    {
      name: 'Corn Starch',
      barcode: '0761720951033',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/076/172/095/1033/front_en.10.400.jpg',
    },
    {
      name: 'Thon ple en morceaux',
      barcode: '0059749931922',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/974/993/1922/front_en.24.400.jpg',
    },
    {
      name: 'Chickpeas',
      barcode: '0060383859374',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/385/9374/front_en.16.400.jpg',
    },
    {
      name: 'Margarine vgtale',
      barcode: '0011115001196',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/111/500/1196/front_fr.3.400.jpg',
    },
    {
      name: 'Puffs',
      barcode: '0060410054703',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/005/4703/front_en.10.400.jpg',
    },
    {
      name: 'jambon dinde',
      barcode: '0096619236381',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/923/6381/front_en.18.400.jpg',
    },
    {
      name: 'Original Crustini Buns',
      barcode: '0063400260832',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/340/026/0832/front_en.24.400.jpg',
    },
    {
      name: 'Janes hand cut battered haddock',
      barcode: '0069299221947',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/929/922/1947/front_fr.17.400.jpg',
    },
    {
      name: 'Peach Iced Tea',
      barcode: '06766407',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/676/6407/front_en.21.400.jpg',
    },
    {
      name: 'Olive Oil & Sea Salt',
      barcode: '0056951449450',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/695/144/9450/front_fr.18.400.jpg',
    },
    {
      name: 'Mditerrane Noix de coco',
      barcode: '0065684006250',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/568/400/6250/front_fr.9.400.jpg',
    },
    {
      name: 'Almond Vanilla Beverage',
      barcode: '0025293001688',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/002/529/300/1688/front_en.19.400.jpg',
    },
    {
      name: 'Lily White Corn Syrup',
      barcode: '0761720001912',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/076/172/000/1912/front_en.17.400.jpg',
    },
    {
      name: 'Garlic & Onion Garden Select Pasta Sauce',
      barcode: '0064200327879',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/420/032/7879/front_en.34.400.jpg',
    },
    {
      name: 'Bubly Sparkling Water',
      barcode: '0069000158203',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/900/015/8203/front_fr.3.400.jpg',
    },
    {
      name: 'Sours surs',
      barcode: '06884701',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/688/4701/front_fr.11.400.jpg',
    },
    {
      name: 'Diced Tomatoes',
      barcode: '0058807665618',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/880/766/5618/front_en.27.400.jpg',
    },
    {
      name: 'Thon pale emiette',
      barcode: '0667888054008',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/788/805/4008/front_fr.14.400.jpg',
    },
    {
      name: 'Stone Milled Bread',
      barcode: '0063400138780',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/340/013/8780/front_en.15.400.jpg',
    },
    {
      name: 'peachbubly',
      barcode: '0069000158876',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/900/015/8876/front_en.20.400.jpg',
    },
    {
      name: 'Spaghettini',
      barcode: '0076808011036',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/680/801/1036/front_en.32.400.jpg',
    },
    {
      name: 'Danish Style Traditional Cookies',
      barcode: '0667888495610',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/788/849/5610/front_en.7.400.jpg',
    },
    {
      name: 'Roasted Garlic Hummus',
      barcode: '0060383035839',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/303/5839/front_en.23.400.jpg',
    },
    {
      name: 'Rstd Portobello Mushroom',
      barcode: '0057000330026',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/700/033/0026/front_en.19.400.jpg',
    },
    {
      name: 'Thon blanc miett',
      barcode: '0065302000271',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/530/200/0271/front_en.23.400.jpg',
    },
    {
      name: 'Herbamare Sel De Mer Aromatiques',
      barcode: '0058854431051',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/885/443/1051/front_en.19.400.jpg',
    },
    {
      name: 'Boisson De Riz Biologique Enrichie Original',
      barcode: '0063667006013',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/366/700/6013/front_en.36.400.jpg',
    },
    {
      name: 'Unsweetened Apple Sauce',
      barcode: '0065912005024',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/591/200/5024/front_en.15.400.jpg',
    },
    {
      name: 'Trail mix',
      barcode: '0096619363148',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/936/3148/front_en.36.400.jpg',
    },
    {
      name: 'Peach Mango',
      barcode: '0056800664829',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/680/066/4829/front_en.23.400.jpg',
    },
    {
      name: 'Frosted Flakes',
      barcode: '0064100108233',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/010/8233/front_en.28.400.jpg',
    },
    {
      name: 'Organic Brown Rice Cakes',
      barcode: '0667888349418',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/788/834/9418/front_en.19.400.jpg',
    },
    {
      name: 'Barista Soy, SoNice',
      barcode: '0626027087703',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/602/708/7703/front_en.36.400.jpg',
    },
    {
      name: 'Whole Wheat Spaghetti',
      barcode: '0064200115926',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/420/011/5926/front_en.21.400.jpg',
    },
    {
      name: 'steak sauce',
      barcode: '0057000009403',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/700/000/9403/front_en.19.400.jpg',
    },
    {
      name: 'Instant Cream of Wheat',
      barcode: '0072400011559',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/240/001/1559/front_fr.6.400.jpg',
    },
    {
      name: 'Original Potato Chips',
      barcode: '0064100123984',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/012/3984/front_en.14.400.jpg',
    },
    {
      name: 'Noix de cajou sales',
      barcode: '0058716991709',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/871/699/1709/front_en.37.400.jpg',
    },
    {
      name: 'Original Rice Crackers',
      barcode: '0060383714338',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/371/4338/front_en.12.400.jpg',
    },
    {
      name: 'Instant Coffee,Original Roast',
      barcode: '0066188004698',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/618/800/4698/front_en.3.400.jpg',
    },
    {
      name: '3.25% Cows Milk, homogenized.',
      barcode: '0068700011009',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/870/001/1009/front_en.31.400.jpg',
    },
    {
      name: 'Wonder bread',
      barcode: '0064947130213',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/494/713/0213/front_en.3.400.jpg',
    },
    {
      name: 'Tostitos',
      barcode: '0060410011003',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/001/1003/front_en.22.400.jpg',
    },
    {
      name: 'Pop-corn',
      barcode: '0076150215342',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/615/021/5342/front_en.27.400.jpg',
    },
    {
      name: 'Simply Hot Chocolate',
      barcode: '0055000381819',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/500/038/1819/front_en.29.400.jpg',
    },
    {
      name: 'Thin & Crispy Sea Salt Tortilla Chips',
      barcode: '0068826166096',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/882/616/6096/front_fr.3.400.jpg',
    },
    {
      name: 'Rice Krispies',
      barcode: '0064100108271',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/010/8271/front_fr.3.400.jpg',
    },
    {
      name: 'Everything Bagels',
      barcode: '0063400138254',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/340/013/8254/front_en.15.400.jpg',
    },
    {
      name: 'Cocoa Powder',
      barcode: '0060383193836',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/319/3836/front_en.21.400.jpg',
    },
    {
      name: 'Prosciutto',
      barcode: '0060085050154',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/008/505/0154/front_fr.3.400.jpg',
    },
    {
      name: 'Premier Protein Vanilla',
      barcode: '0643843714828',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/064/384/371/4828/front_en.13.400.jpg',
    },
    {
      name: 'Cinnamon Chex',
      barcode: '0065633400139',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/340/0139/front_en.57.400.jpg',
    },
    {
      name: 'Black Beans',
      barcode: '0060383859404',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/385/9404/front_en.23.400.jpg',
    },
    {
      name: 'Noisettes',
      barcode: '0068100902785',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/090/2785/front_en.24.400.jpg',
    },
    {
      name: 'Michelob Ultra',
      barcode: '0062067547270',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/206/754/7270/front_fr.3.400.jpg',
    },
    {
      name: 'Dare ultimate fudge chocolate',
      barcode: '0055653170853',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/565/317/0853/front_en.32.400.jpg',
    },
    {
      name: 'Fromage Nacho Cheese',
      barcode: '0060410052723',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/005/2723/front_en.46.400.jpg',
    },
    {
      name: 'Lait crm vapor',
      barcode: '0059000003139',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/900/000/3139/front_fr.3.400.jpg',
    },
    {
      name: 'pineapplebubly',
      barcode: '0069000158180',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/900/015/8180/front_en.14.400.jpg',
    },
    {
      name: 'Cool Blue G Zero',
      barcode: '0057271163095',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/727/116/3095/front_en.17.400.jpg',
    },
    {
      name: 'Sweet Chili Heat',
      barcode: '0060410054420',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/005/4420/front_fr.13.400.jpg',
    },
    {
      name: 'Spicy Chicken Flavoured Instant Noodles',
      barcode: '0059491000778',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/949/100/0778/front_en.42.400.jpg',
    },
    {
      name: 'Dill, Sea Salt & Olive Oil',
      barcode: '0066721007445',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/100/7445/front_fr.3.400.jpg',
    },
    {
      name: 'Fancy Molasses',
      barcode: '0056786000352',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/678/600/0352/front_en.66.400.jpg',
    },
    {
      name: 'Peanut Butter Chocolate Chip Bars',
      barcode: '0021908509396',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/002/190/850/9396/front_en.28.400.jpg',
    },
    {
      name: 'Triple Bean Chili',
      barcode: '0061148176019',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/114/817/6019/front_en.43.400.jpg',
    },
    {
      name: 'Crackers craquelins',
      barcode: '0667888412464',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/788/841/2464/front_fr.8.400.jpg',
    },
    {
      name: 'Yogurt grec',
      barcode: '0065684118052',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/568/411/8052/front_fr.9.400.jpg',
    },
    {
      name: 'Original Triple-Baked Tortillas, Large',
      barcode: '0063400170100',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/340/017/0100/front_en.53.400.jpg',
    },
    {
      name: 'Yogourt Vanille Extra Crmeux',
      barcode: '0065684120925',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/568/412/0925/front_en.18.400.jpg',
    },
    {
      name: 'Arachides Lgrement Assaisonnes',
      barcode: '0060383665845',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/366/5845/front_fr.3.400.jpg',
    },
    {
      name: 'Melba toast',
      barcode: '0056951420404',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/695/142/0404/front_en.18.400.jpg',
    },
    {
      name: 'Chocolate Banana Granola Bars, Organic',
      barcode: '0687456213040',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/068/745/621/3040/front_en.31.400.jpg',
    },
    {
      name: 'Lunch Box Double Chocolate flavour',
      barcode: '0065633465329',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/346/5329/front_en.28.400.jpg',
    },
    {
      name: 'Organic Creamy Peanut Butter',
      barcode: '0051651093309',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/165/109/3309/front_fr.8.400.jpg',
    },
    {
      name: 'Organic Strawberry Granola Bars',
      barcode: '0687456213170',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/068/745/621/3170/front_en.46.400.jpg',
    },
    {
      name: 'Montellier - Eau de source naturelle gazifie, Lime',
      barcode: '0056918000533',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/691/800/0533/front_en.17.400.jpg',
    },
    {
      name: 'instant oatmeal, apples and cinnamon',
      barcode: '0055577113035',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/711/3035/front_en.28.400.jpg',
    },
    {
      name: 'Yogourt grec vanille',
      barcode: '0056800737899',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/680/073/7899/front_en.21.400.jpg',
    },
    {
      name: 'Good Moood Farm Kefir',
      barcode: '0853135001059',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/085/313/500/1059/front_en.44.400.jpg',
    },
    {
      name: 'Organic Dark Chocolate with Roasted Almonds',
      barcode: '0055742512533',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/574/251/2533/front_en.19.400.jpg',
    },
    {
      name: 'Whole Wheat Flour',
      barcode: '0059000015101',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/900/001/5101/front_en.19.400.jpg',
    },
    {
      name: 'Oat Vanilla Creamer',
      barcode: '0036632075147',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/663/207/5147/front_en.26.400.jpg',
    },
    {
      name: 'Movie Night Butter Flavour Popcorn',
      barcode: '0060410029909',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/002/9909/front_en.30.400.jpg',
    },
    {
      name: 'BON MATIN MULTIGRAIN',
      barcode: '0061077940095',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/107/794/0095/front_fr.3.400.jpg',
    },
    {
      name: 'Extra Old Natural Cheese',
      barcode: '06853826',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/685/3826/front_en.39.400.jpg',
    },
    {
      name: 'Gruau instantane',
      barcode: '0055577103630',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/710/3630/front_fr.3.400.jpg',
    },
    {
      name: 'Pain brioch',
      barcode: '0061077620966',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/107/762/0966/front_fr.3.400.jpg',
    },
    {
      name: 'NATURAL HIMALAYAN PINK SALT',
      barcode: '0066010080685',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/601/008/0685/front_fr.3.400.jpg',
    },
    {
      name: 'Milk 4L 2%',
      barcode: '0065700100276',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/570/010/0276/front_en.23.400.jpg',
    },
    {
      name: 'McCaf',
      barcode: '0663447608354',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/344/760/8354/front_fr.3.400.jpg',
    },
    {
      name: 'Sea Salt',
      barcode: '0667888379088',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/788/837/9088/front_en.5.400.jpg',
    },
    {
      name: 'Craquelins de riz',
      barcode: '0059749973366',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/974/997/3366/front_fr.3.400.jpg',
    },
    {
      name: 'Chocolate Brownie / Brownies Au Chocolat',
      barcode: '0021908511740',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/002/190/851/1740/front_fr.3.400.jpg',
    },
    {
      name: 'Milk Chocolate Celebration Butter Cookies, Individually wrapped portion.',
      barcode: '0064042551272',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/404/255/1272/front_en.17.400.jpg',
    },
    {
      name: 'Liquid Honey, Pure',
      barcode: '0627735014128',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/773/501/4128/front_en.15.400.jpg',
    },
    {
      name: 'Mayonnaise made with extra virgin olive oil',
      barcode: '0060383081126',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/308/1126/front_en.15.400.jpg',
    },
    {
      name: 'Ice River Green Bottle',
      barcode: '0068493427186',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/849/342/7186/front_fr.8.400.jpg',
    },
    {
      name: 'red velvet soft cookie',
      barcode: '0687456286242',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/068/745/628/6242/front_en.21.400.jpg',
    },
    {
      name: 'Mango cectar',
      barcode: '0067311268376',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/731/126/8376/front_en.8.400.jpg',
    },
    {
      name: 'ESKA ptillante sparkling',
      barcode: '0671785100010',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/067/178/510/0010/front_fr.3.400.jpg',
    },
    {
      name: 'Yoplait',
      barcode: '0056920130297',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/692/013/0297/front_fr.3.400.jpg',
    },
    {
      name: 'Vga sport',
      barcode: '0838766100210',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/083/876/610/0210/front_fr.3.400.jpg',
    },
    {
      name: 'Instant oatmeal flavour variety',
      barcode: '0055577311943',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/731/1943/front_en.9.400.jpg',
    },
    {
      name: 'Wheat Thins Multigrain',
      barcode: '0066721028433',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/102/8433/front_en.13.400.jpg',
    },
    {
      name: 'salted top crackers',
      barcode: '0066721007858',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/100/7858/front_en.20.400.jpg',
    },
    {
      name: 'Gluten Free White Bread',
      barcode: '0696685100045',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/069/668/510/0045/front_en.21.400.jpg',
    },
    {
      name: 'Cinnamon toast crunch',
      barcode: '0065633134423',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/313/4423/front_en.34.400.jpg',
    },
    {
      name: 'Spreadables Butter With Canola Oil',
      barcode: '0066013808422',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/601/380/8422/front_en.30.400.jpg',
    },
    {
      name: 'Less Sodium Soy Sauce',
      barcode: '0041390001055',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/004/139/000/1055/front_en.57.400.jpg',
    },
    {
      name: 'Thins, Multi-Grain Buns',
      barcode: '0060383863876',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/386/3876/front_en.42.400.jpg',
    },
    {
      name: 'Frosted flakes',
      barcode: '0064100108301',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/010/8301/front_en.49.400.jpg',
    },
    {
      name: 'Wheat Flour Toasts',
      barcode: '0667888082421',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/788/808/2421/front_en.21.400.jpg',
    },
    {
      name: 'Wild Blueberry Spread',
      barcode: '0067275007073',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/727/500/7073/front_en.10.400.jpg',
    },
    {
      name: 'Thin Crisps Parmesan Garlic',
      barcode: '0066721007520',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/100/7520/front_fr.11.400.jpg',
    },
    {
      name: 'Bear Paws Banana Bread',
      barcode: '0063348006905',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/334/800/6905/front_fr.3.400.jpg',
    },
    {
      name: 'Tonkotsu Ramen',
      barcode: '0031146056262',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/114/605/6262/front_en.26.400.jpg',
    },
    {
      name: 'Cool Blue Sports Drink',
      barcode: '0055577421024',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/742/1024/front_en.30.400.jpg',
    },
    {
      name: 'Cottage cheese',
      barcode: '0055742357653',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/574/235/7653/front_en.22.400.jpg',
    },
    {
      name: 'Pizza Quattro Formaggi',
      barcode: '0058336170065',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/833/617/0065/front_en.32.400.jpg',
    },
    {
      name: 'Ketchup aux tomates',
      barcode: '0060383052706',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/305/2706/front_fr.26.400.jpg',
    },
    {
      name: 'Veggie Ham',
      barcode: '0060822003078',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/082/200/3078/front_en.21.400.jpg',
    },
    {
      name: 'Cinnamon Toast Crunch Rolls',
      barcode: '0065633435162',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/343/5162/front_fr.22.400.jpg',
    },
    {
      name: 'Delicious Pitted Dried Dates',
      barcode: '0627013099090',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/701/309/9090/front_en.3.400.jpg',
    },
    {
      name: 'Corn Pops',
      barcode: '0064100448865',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/044/8865/front_fr.19.400.jpg',
    },
    {
      name: 'Celebration cafe au lait',
      barcode: '0064042006659',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/404/200/6659/front_fr.17.400.jpg',
    },
    {
      name: 'Honey',
      barcode: '0060383723750',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/372/3750/front_en.7.400.jpg',
    },
    {
      name: '100% Orange Juice',
      barcode: '0065400010981',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/540/001/0981/front_en.20.400.jpg',
    },
    {
      name: 'Yogourt',
      barcode: '0056800187717',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/680/018/7717/front_fr.30.400.jpg',
    },
    {
      name: 'Amber Honey, Pure Organic',
      barcode: '0060383778439',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/377/8439/front_en.7.400.jpg',
    },
    {
      name: 'Kelloggs Special K DRK Choc Almnd Bar',
      barcode: '0064100113312',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/011/3312/front_fr.13.400.jpg',
    },
    {
      name: 'Whole Wheat Rotini',
      barcode: '0064200115407',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/420/011/5407/front_en.37.400.jpg',
    },
    {
      name: 'Tartinade chocolat noisette',
      barcode: '0060383065942',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/306/5942/front_en.15.400.jpg',
    },
    {
      name: 'Biscuit double chocolat',
      barcode: '0626233228020',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/623/322/8020/front_en.16.400.jpg',
    },
    {
      name: 'Farcitino',
      barcode: '0667888049561',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/788/804/9561/front_en.23.400.jpg',
    },
    {
      name: '4Fun',
      barcode: '0667888297030',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/788/829/7030/front_en.16.400.jpg',
    },
    {
      name: 'Pizza Mozzarella',
      barcode: '0063549331790',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/354/933/1790/front_fr.20.400.jpg',
    },
    {
      name: 'Melange a crepes',
      barcode: '0041449003344',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/004/144/900/3344/front_en.32.400.jpg',
    },
    {
      name: 'Organic Low Sodium Vegetable Broth',
      barcode: '0084253242950',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/008/425/324/2950/front_en.14.400.jpg',
    },
    {
      name: 'Veggie Crisps legume ranch mordant',
      barcode: '0055653645900',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/565/364/5900/front_en.13.400.jpg',
    },
    {
      name: 'Sucre biologique',
      barcode: '0096619605132',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/960/5132/front_fr.29.400.jpg',
    },
    {
      name: 'Lentil soup',
      barcode: '0042272905027',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/004/227/290/5027/front_en.17.400.jpg',
    },
    {
      name: 'Peanut butter',
      barcode: '0068892324789',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/889/232/4789/front_fr.3.400.jpg',
    },
    {
      name: 'All In One Nutritional Shake Chocolate',
      barcode: '0658010120432',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/065/801/012/0432/front_en.34.400.jpg',
    },
    {
      name: 'Breakfast Bar Peanut Butter',
      barcode: '0602652201066',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/060/265/220/1066/front_en.28.400.jpg',
    },
    {
      name: 'Avoine croquante trio de petits fruits',
      barcode: '0065633158184',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/315/8184/front_fr.13.400.jpg',
    },
    {
      name: 'Divas delightful crisps',
      barcode: '0852951001748',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/085/295/100/1748/front_fr.3.400.jpg',
    },
    {
      name: 'Healthy Grains Granola Oats & Honey With Toasted Coconut',
      barcode: '0602652183133',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/060/265/218/3133/front_en.28.400.jpg',
    },
    {
      name: 'Solid light tuna',
      barcode: '0067800000418',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/780/000/0418/front_en.12.400.jpg',
    },
    {
      name: 'Classic Burger Sauce',
      barcode: '0068400001287',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/840/000/1287/front_en.18.400.jpg',
    },
    {
      name: 'Simili-viande base de plantes',
      barcode: '0850004207291',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/085/000/420/7291/front_fr.3.400.jpg',
    },
    {
      name: 'Sabls',
      barcode: '0063348206497',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/334/820/6497/front_en.17.400.jpg',
    },
    {
      name: 'Grains et crales',
      barcode: '0671521240208',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/067/152/124/0208/front_fr.3.400.jpg',
    },
    {
      name: '3 Hearts Of Romaine',
      barcode: '0033383651620',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/338/365/1620/front_fr.31.400.jpg',
    },
    {
      name: 'Gatorade zero',
      barcode: '0057271162586',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/727/116/2586/front_fr.9.400.jpg',
    },
    {
      name: 'Farine sarrasin',
      barcode: '0057714001212',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/771/400/1212/front_fr.11.400.jpg',
    },
    {
      name: 'Plant butter',
      barcode: '0011115001547',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/111/500/1547/front_fr.3.400.jpg',
    },
    {
      name: 'Apple juice',
      barcode: '0056412503011',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/641/250/3011/front_fr.3.400.jpg',
    },
    {
      name: 'Krema Plain Yogurt',
      barcode: '0059161451008',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/916/145/1008/front_fr.8.400.jpg',
    },
    {
      name: 'Silverado Select Beef Chili with Beans',
      barcode: '0071106819346',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/110/681/9346/front_en.17.400.jpg',
    },
    {
      name: 'Greek yogurt',
      barcode: '0065684118045',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/568/411/8045/front_en.12.400.jpg',
    },
    {
      name: 'Pure desi ghee',
      barcode: '0828158272007',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/082/815/827/2007/front_en.10.400.jpg',
    },
    {
      name: 'Milk Chocolate Hazelnut Crunch',
      barcode: '0667888420377',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/788/842/0377/front_en.21.400.jpg',
    },
    {
      name: 'Virgin Coconut Oil',
      barcode: '0055270855287',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/527/085/5287/front_en.54.400.jpg',
    },
    {
      name: 'Milk',
      barcode: '0068700125003',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/870/012/5003/front_en.5.400.jpg',
    },
    {
      name: 'Applenax',
      barcode: '0055369903462',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/536/990/3462/front_fr.3.400.jpg',
    },
    {
      name: 'Huile de canola',
      barcode: '0059749888745',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/974/988/8745/front_fr.3.400.jpg',
    },
    {
      name: 'Hot Dog Buns',
      barcode: '0068721008033',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/872/100/8033/front_en.8.400.jpg',
    },
    {
      name: 'Garden veggie straws',
      barcode: '0829515324629',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/082/951/532/4629/front_fr.8.400.jpg',
    },
    {
      name: 'Pearl Milling Company Original Pancake & Waffle Mix',
      barcode: '0055577104125',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/710/4125/front_en.25.400.jpg',
    },
    {
      name: 'Peanut butter',
      barcode: '0682264660871',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/068/226/466/0871/front_fr.3.400.jpg',
    },
    {
      name: 'Milk Chocolate Hazelnut Bar',
      barcode: '0062020008008',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/202/000/8008/front_en.28.400.jpg',
    },
    {
      name: 'Le miel demilie',
      barcode: '0066536193753',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/653/619/3753/front_fr.3.400.jpg',
    },
    {
      name: 'Vector',
      barcode: '0064100146655',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/014/6655/front_fr.3.400.jpg',
    },
    {
      name: 'Core power chocolate',
      barcode: '0811620022217',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/081/162/002/2217/front_en.3.400.jpg',
    },
    {
      name: 'Apple Cinnamon Flax Crunchy 7-Grain with Quinoa Bars',
      barcode: '0018627114284',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/862/711/4284/front_en.3.400.jpg',
    },
    {
      name: 'White Cheddar Deluxe Mac and Cheese',
      barcode: '0060383058951',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/305/8951/front_en.5.400.jpg',
    },
    {
      name: 'Multigrain &quot;OneBun&quot; Sandwich Buns',
      barcode: '0664164100411',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/416/410/0411/front_en.83.400.jpg',
    },
    {
      name: 'Frosted flakes',
      barcode: '0064100143166',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/014/3166/front_fr.10.400.jpg',
    },
    {
      name: 'Beyond Burger',
      barcode: '0810057290312',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/081/005/729/0312/front_en.13.400.jpg',
    },
    {
      name: 'Fish Sauce',
      barcode: '0672774105894',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/067/277/410/5894/front_en.6.400.jpg',
    },
    {
      name: 'Sprouted 3 Grain Bread',
      barcode: '0062240011505',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/224/001/1505/front_fr.3.400.jpg',
    },
    {
      name: 'Omegamazing Bread',
      barcode: '0055991049149',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/599/104/9149/front_en.30.400.jpg',
    },
    {
      name: 'Blueberries (300g approx)',
      barcode: '0033383222011',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/338/322/2011/front_en.26.400.jpg',
    },
    {
      name: 'Yogourt grec',
      barcode: '0056800561135',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/680/056/1135/front_fr.14.400.jpg',
    },
    {
      name: 'Bire fine de luxe',
      barcode: '0062067382215',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/206/738/2215/front_fr.3.400.jpg',
    },
    {
      name: 'Sours gummy candy imported from canada',
      barcode: '0058496896584',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/849/689/6584/front_en.14.400.jpg',
    },
    {
      name: 'White Mystery Candy',
      barcode: '0073390002213',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/339/000/2213/front_en.30.400.jpg',
    },
    {
      name: 'Avocat',
      barcode: '0761010188705',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/076/101/018/8705/front_en.5.400.jpg',
    },
    {
      name: 'Haricots rouge',
      barcode: '0067800002818',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/780/000/2818/front_en.9.400.jpg',
    },
    {
      name: 'Crispy mini cornichons',
      barcode: '0055577108093',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/710/8093/front_en.22.400.jpg',
    },
    {
      name: 'Bovril Boeuf',
      barcode: '0061400000182',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/140/000/0182/front_fr.23.400.jpg',
    },
    {
      name: 'Hamburger POM Signature',
      barcode: '0061077771132',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/107/777/1132/front_en.24.400.jpg',
    },
    {
      name: 'Almond Butter',
      barcode: '0061483061933',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/148/306/1933/front_en.4.400.jpg',
    },
    {
      name: 'Hemp Hearts, Organic (Shelled Seeds)',
      barcode: '0697658000072',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/069/765/800/0072/front_en.19.400.jpg',
    },
    {
      name: 'Asaro Olivera vertes',
      barcode: '0812689020428',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/081/268/902/0428/front_en.20.400.jpg',
    },
    {
      name: 'Tomato Ketchup',
      barcode: '0056200957613',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/620/095/7613/front_en.14.400.jpg',
    },
    {
      name: 'Organic chicken broth',
      barcode: '0060383216221',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/321/6221/front_fr.8.400.jpg',
    },
    {
      name: 'Natrel plus chocolate milk 2% 18g protein',
      barcode: '0064420320155',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/442/032/0155/front_en.23.400.jpg',
    },
    {
      name: 'Tortillas bl entier',
      barcode: '0061077778582',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/107/777/8582/front_fr.3.400.jpg',
    },
    {
      name: 'Almond Dairy-Free Plant-Based Yogurt, Plain, CAN',
      barcode: '0036632073709',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/663/207/3709/front_en.19.400.jpg',
    },
    {
      name: 'Sweet salty',
      barcode: '0892773000208',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/089/277/300/0208/front_fr.3.400.jpg',
    },
    {
      name: 'Whole Kernel Crispy Korn / Mas croquant grains entiers',
      barcode: '0060383127688',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/312/7688/front_fr.8.400.jpg',
    },
    {
      name: 'VH Teriyaki Marinade',
      barcode: '0058744151250',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/874/415/1250/front_en.23.400.jpg',
    },
    {
      name: 'Cottage cheese',
      barcode: '0066013151603',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/601/315/1603/front_en.14.400.jpg',
    },
    {
      name: 'Chocolate Ice Cream',
      barcode: '0058779133757',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('frozen'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/877/913/3757/front_en.21.400.jpg',
    },
    {
      name: '100% Canadian Pure Creamed Honey',
      barcode: '0060383012397',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/301/2397/front_en.19.400.jpg',
    },
    {
      name: 'Gzero',
      barcode: '0057271164108',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/727/116/4108/front_fr.3.400.jpg',
    },
    {
      name: 'Pacific Pink Salmon Fillets',
      barcode: '0061763085468',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/176/308/5468/front_en.53.400.jpg',
    },
    {
      name: 'Krema',
      barcode: '0059161402000',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/916/140/2000/front_fr.3.400.jpg',
    },
    {
      name: 'Jasmine White Rice',
      barcode: '0096619685059',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/968/5059/front_en.23.400.jpg',
    },
    {
      name: 'Basil pesto',
      barcode: '0060383039608',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/303/9608/front_fr.3.400.jpg',
    },
    {
      name: 'Organic Cottage Cheese',
      barcode: '0062325500023',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/232/550/0023/front_en.9.400.jpg',
    },
    {
      name: 'Chips Ahoy Chocolate chunks',
      barcode: '0066721026552',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/102/6552/front_fr.18.400.jpg',
    },
    {
      name: 'Tzatziki',
      barcode: '0775075000216',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/077/507/500/0216/front_en.16.400.jpg',
    },
    {
      name: '35% Whipping Cream',
      barcode: '0064420102881',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/442/010/2881/front_fr.3.400.jpg',
    },
    {
      name: 'Aloe Vera Fresh Scent',
      barcode: '0074182459925',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/418/245/9925/front_en.5.400.jpg',
    },
    {
      name: 'Bits & Bites Crispers Original',
      barcode: '0066721027412',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/102/7412/front_en.15.400.jpg',
    },
    {
      name: 'ghee',
      barcode: '0182757001834',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/018/275/700/1834/front_en.19.400.jpg',
    },
    {
      name: 'Giant Lady Finger Biscuits',
      barcode: '0062858101209',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/285/810/1209/front_fr.3.400.jpg',
    },
    {
      name: 'naturali',
      barcode: '0055000201384',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/500/020/1384/front_it.8.400.jpg',
    },
    {
      name: 'Bire sans alcool',
      barcode: '0062067385612',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/206/738/5612/front_en.18.400.jpg',
    },
    {
      name: 'Pizza 4 fromages',
      barcode: '0058336745805',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/833/674/5805/front_fr.3.400.jpg',
    },
    {
      name: 'Sour patch kids berries',
      barcode: '0057700017258',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/770/001/7258/front_en.13.400.jpg',
    },
    {
      name: 'Yop framboise',
      barcode: '0056920130280',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/692/013/0280/front_fr.3.400.jpg',
    },
    {
      name: 'Caf torrfaction riche et cors',
      barcode: '0066188005732',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/618/800/5732/front_fr.3.400.jpg',
    },
    {
      name: 'Potato Chips Honey Dijon',
      barcode: '0084114902931',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/008/411/490/2931/front_fr.3.400.jpg',
    },
    {
      name: 'No name yellow mustard',
      barcode: '0060383053581',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/305/3581/front_fr.3.400.jpg',
    },
    {
      name: 'Casarecce',
      barcode: '0021511690689',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/002/151/169/0689/front_fr.3.400.jpg',
    },
    {
      name: 'Feastables - Peanut Butter',
      barcode: '0850050238225',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/085/005/023/8225/front_en.3.400.jpg',
    },
    {
      name: 'Yakisoba',
      barcode: '0071757077775',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/175/707/7775/front_en.21.400.jpg',
    },
    {
      name: 'Babybel',
      barcode: '0041757027414',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/004/175/702/7414/front_en.13.400.jpg',
    },
    {
      name: 'Old Cheddar',
      barcode: '0060383175450',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/317/5450/front_en.10.400.jpg',
    },
    {
      name: 'Sauce rose',
      barcode: '0628456200005',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/845/620/0005/front_fr.3.400.jpg',
    },
    {
      name: 'Pepsi Bottle',
      barcode: '0069000009918',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/900/000/9918/front_en.4.400.jpg',
    },
    {
      name: 'Cottage Cheese',
      barcode: '0061483340885',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/148/334/0885/front_en.12.400.jpg',
    },
    {
      name: 'Oat Drink Barista',
      barcode: '0190646631390',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/019/064/663/1390/front_en.23.400.jpg',
    },
    {
      name: 'Go & Grow by Similac Advanced Formula',
      barcode: '0055325003410',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/532/500/3410/front_en.9.400.jpg',
    },
    {
      name: 'Real Vegetable Chips',
      barcode: '0728229135180',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/072/822/913/5180/front_en.3.400.jpg',
    },
    {
      name: 'Beurre damande',
      barcode: '0059749973823',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/974/997/3823/front_fr.3.400.jpg',
    },
    {
      name: 'Naan',
      barcode: '0776343689652',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/077/634/368/9652/front_fr.3.400.jpg',
    },
    {
      name: 'Oeufs Calibre Extra Gros',
      barcode: '0065651000144',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/565/100/0144/front_en.7.400.jpg',
    },
    {
      name: 'Rustico Multigrain',
      barcode: '0055617055127',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/561/705/5127/front_en.11.400.jpg',
    },
    {
      name: 'Imperial Old Cheddar',
      barcode: '0068100895056',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/810/089/5056/front_en.13.400.jpg',
    },
    {
      name: 'Goldfish',
      barcode: '0014100269588',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/410/026/9588/front_en.16.400.jpg',
    },
    {
      name: 'Kombucha Mango Passion',
      barcode: '9350271002168',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/935/027/100/2168/front_fr.3.400.jpg',
    },
    {
      name: 'Guacamole',
      barcode: '0767119723502',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/076/711/972/3502/front_fr.3.400.jpg',
    },
    {
      name: 'Mixed Berry Organic Granola Bar',
      barcode: '0687456211022',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/068/745/621/1022/front_en.23.400.jpg',
    },
    {
      name: 'Gluten Free Whole Grain Wide Slice Bread',
      barcode: '0671521400503',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/067/152/140/0503/front_en.16.400.jpg',
    },
    {
      name: 'Cracker Assortment, Original, Pepper, Garlic & Herb, Canada',
      barcode: '0059290441437',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/929/044/1437/front_fr.3.400.jpg',
    },
    {
      name: 'Peanut Butter Chocolate Chip Bars',
      barcode: '0021908462592',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/002/190/846/2592/front_fr.3.400.jpg',
    },
    {
      name: 'Betterplant Burger',
      barcode: '0063351010890',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/335/101/0890/front_en.16.400.jpg',
    },
    {
      name: 'Orange Soda',
      barcode: '0060383081058',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/308/1058/front_en.11.400.jpg',
    },
    {
      name: 'Carnival Organic Tortilla Chips',
      barcode: '0068826176118',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/882/617/6118/front_en.47.400.jpg',
    },
    {
      name: 'Chocolate Banana Granola Minis',
      barcode: '0687456223476',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/068/745/622/3476/front_en.14.400.jpg',
    },
    {
      name: 'Blueberry Blast Soft Drink',
      barcode: '0033613028758',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/361/302/8758/front_en.7.400.jpg',
    },
    {
      name: 'pepsi',
      barcode: '0069000009826',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/900/000/9826/front_en.3.400.jpg',
    },
    {
      name: 'Peanut Butter Chocolate',
      barcode: '0193908007322',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/019/390/800/7322/front_en.9.400.jpg',
    },
    {
      name: 'Toscana Hamburger Buns',
      barcode: '0068721203520',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/872/120/3520/front_en.34.400.jpg',
    },
    {
      name: 'Whole Wheat Bagel',
      barcode: '0060383007409',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/300/7409/front_en.33.400.jpg',
    },
    {
      name: 'Yogourt aux cerises',
      barcode: '0056920124883',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/692/012/4883/front_fr.3.400.jpg',
    },
    {
      name: 'Thin Crisps Zesty Jalapeno',
      barcode: '0066721027597',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/102/7597/front_fr.3.400.jpg',
    },
    {
      name: 'Granalove',
      barcode: '0877693002952',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/087/769/300/2952/front_fr.3.400.jpg',
    },
    {
      name: 'Ultrafiltered skim milk lactose free',
      barcode: '0811620021807',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/081/162/002/1807/front_en.57.400.jpg',
    },
    {
      name: 'Sunflower oil',
      barcode: '0832650004448',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/083/265/000/4448/front_en.3.400.jpg',
    },
    {
      name: 'Foot Loops With Marshmallows',
      barcode: '0064100148024',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/014/8024/front_en.14.400.jpg',
    },
    {
      name: 'Thin Tortillas',
      barcode: '0626114104504',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/611/410/4504/front_en.40.400.jpg',
    },
    {
      name: 'Nougatine Croquante Garnie Avec Noix De Coco',
      barcode: '18068870',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/001/806/8870/front_en.10.400.jpg',
    },
    {
      name: 'Noix Mlanges Sales',
      barcode: '0058716993574',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/871/699/3574/front_en.7.400.jpg',
    },
    {
      name: 'Fancy Molasses',
      barcode: '0068932401234',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/893/240/1234/front_fr.42.400.jpg',
    },
    {
      name: 'Moutarde de Dijon',
      barcode: '0043646242052',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/004/364/624/2052/front_fr.4.400.jpg',
    },
    {
      name: 'Milk Chocolate Butter Cookie',
      barcode: '0064042006420',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/404/200/6420/front_en.18.400.jpg',
    },
    {
      name: 'Mayonnaise',
      barcode: '0068400662907',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/840/066/2907/front_en.3.400.jpg',
    },
    {
      name: 'Petites madeleines',
      barcode: '3178530413809',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/317/853/041/3809/front_fr.38.400.jpg',
    },
    {
      name: 'Coke Classic',
      barcode: '06746209',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/674/6209/front_en.26.400.jpg',
    },
    {
      name: 'Pea Soup with Smoked Ham',
      barcode: '0063211311051',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('meat'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/321/131/1051/front_en.41.400.jpg',
    },
    {
      name: 'Dasani Water',
      barcode: '06717401',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/671/7401/front_en.18.400.jpg',
    },
    {
      name: 'Fromage singles',
      barcode: '06834919',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/683/4919/front_en.10.400.jpg',
    },
    {
      name: '70% Cacao Madagascar Dark Lindt Excellence',
      barcode: '0037466083056',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/746/608/3056/front_en.28.400.jpg',
    },
    {
      name: 'Activia',
      barcode: '0056800195637',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/680/019/5637/front_en.17.400.jpg',
    },
    {
      name: 'Breton bouches lgumes',
      barcode: '0055653684503',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/565/368/4503/front_en.20.400.jpg',
    },
    {
      name: 'Lemon-Lime Soda',
      barcode: '06793207',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/679/3207/front_en.17.400.jpg',
    },
    {
      name: 'Aero',
      barcode: '0059800000116',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/980/000/0116/front_en.24.400.jpg',
    },
    {
      name: 'Iodized Table Salt',
      barcode: '0066010001055',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/601/000/1055/front_en.33.400.jpg',
    },
    {
      name: 'Smooth Dark Lindt Excellence',
      barcode: '0743434009477',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/074/343/400/9477/front_en.27.400.jpg',
    },
    {
      name: 'Apricot jam',
      barcode: '0088702016376',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/008/870/201/6376/front_en.3.400.jpg',
    },
    {
      name: 'Original yogourt balkan vanille',
      barcode: '0068200443065',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/820/044/3065/front_en.30.400.jpg',
    },
    {
      name: 'Two Scoops Raisin Bran',
      barcode: '0064100108028',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/010/8028/front_en.37.400.jpg',
    },
    {
      name: 'Vinaigre de cidre de pomme',
      barcode: '0853187001342',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/085/318/700/1342/front_en.3.400.jpg',
    },
    {
      name: 'Oasis cocktail de 10 legumes',
      barcode: '0067311030119',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/731/103/0119/front_fr.32.400.jpg',
    },
    {
      name: 'Mixed Berry Granola Minis',
      barcode: '0687456222028',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/068/745/622/2028/front_en.32.400.jpg',
    },
    {
      name: 'Sardines fillets in Sunflower Oil',
      barcode: '0060138017752',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/013/801/7752/front_en.19.400.jpg',
    },
    {
      name: 'Minces au Riz',
      barcode: '0066721006936',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/672/100/6936/front_en.22.400.jpg',
    },
    {
      name: 'Hummus',
      barcode: '0060383035822',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/303/5822/front_en.17.400.jpg',
    },
    {
      name: 'Sauce Pizza',
      barcode: '0064200336116',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/420/033/6116/front_fr.3.400.jpg',
    },
    {
      name: 'Mixed Nuts',
      barcode: '0096619177660',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/917/7660/front_fr.21.400.jpg',
    },
    {
      name: 'Chocolate Filled Wafers',
      barcode: '0667888380381',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/788/838/0381/front_en.35.400.jpg',
    },
    {
      name: 'Soy Original Organic Fortified Beverage',
      barcode: '0025293600713',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/002/529/360/0713/front_en.51.400.jpg',
    },
    {
      name: 'Krave',
      barcode: '0064100129979',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/012/9979/front_en.14.400.jpg',
    },
    {
      name: 'Eau de source naturelle',
      barcode: '0057379600119',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/737/960/0119/front_en.27.400.jpg',
    },
    {
      name: 'grec yogourt vanille',
      barcode: '0065684004713',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/568/400/4713/front_fr.4.400.jpg',
    },
    {
      name: 'Real-vraie mayonnaise',
      barcode: '0068400662105',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/840/066/2105/front_fr.23.400.jpg',
    },
    {
      name: 'Moutarde lancienne',
      barcode: '8722700281283',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/872/270/028/1283/front_fr.17.400.jpg',
    },
    {
      name: 'White Bread',
      barcode: '0068721002222',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/872/100/2222/front_en.3.400.jpg',
    },
    {
      name: 'pour 1 portion (16.7 g) Calories 30 Potassium 30 mg Valeur nutritive Sodium 110 ',
      barcode: '0041757011406',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/004/175/701/1406/front_en.12.400.jpg',
    },
    {
      name: 'Tortillas',
      barcode: '0061077940255',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/107/794/0255/front_fr.19.400.jpg',
    },
    {
      name: 'Crispy minis cheddar',
      barcode: '0055577108031',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/710/8031/front_fr.29.400.jpg',
    },
    {
      name: 'Ready Cut Macaroni',
      barcode: '0064200116473',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/420/011/6473/front_fr.22.400.jpg',
    },
    {
      name: 'Aa & blueberry flavored centres covered in smooth dark chocolate',
      barcode: '0068437389693',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/843/738/9693/front_en.39.400.jpg',
    },
    {
      name: 'Lemon-Lime Soda',
      barcode: '06750600',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/675/0600/front_en.15.400.jpg',
    },
    {
      name: 'Orange Soda',
      barcode: '05609008',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/560/9008/front_en.34.400.jpg',
    },
    {
      name: 'Naturellement dlicieuses mangues sches',
      barcode: '0716221055810',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/071/622/105/5810/front_en.21.400.jpg',
    },
    {
      name: 'Crales Life (multigrains)',
      barcode: '0055577105238',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/710/5238/front_en.24.400.jpg',
    },
    {
      name: 'No Sugar Added White Bread with Whole Grains',
      barcode: '0063400138926',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/340/013/8926/front_en.25.400.jpg',
    },
    {
      name: 'Seeds & Grains Bread with Flax, Sunflower & Rye',
      barcode: '0063400138827',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/340/013/8827/front_en.35.400.jpg',
    },
    {
      name: 'Pate de tomate',
      barcode: '0059749875912',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/974/987/5912/front_en.8.400.jpg',
    },
    {
      name: 'Pure Dark Lindt Excellence',
      barcode: '0743434012576',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/074/343/401/2576/front_en.14.400.jpg',
    },
    {
      name: 'Hazelnut Swiss Classic',
      barcode: '0037466019871',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/746/601/9871/front_en.30.400.jpg',
    },
    {
      name: 'Caf-Lib',
      barcode: '0055789039505',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/578/903/9505/front_en.29.400.jpg',
    },
    {
      name: 'Crme fouetter 35%',
      barcode: '0055872240573',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/587/224/0573/front_en.20.400.jpg',
    },
    {
      name: 'Extra Firm Tofu',
      barcode: '0057864000127',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/786/400/0127/front_en.42.400.jpg',
    },
    {
      name: 'Crunchy Peanut Butter',
      barcode: '0060383708832',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/370/8832/front_en.21.400.jpg',
    },
    {
      name: 'Bouillon Sans Sel (poulet)',
      barcode: '0063211194555',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/321/119/4555/front_en.26.400.jpg',
    },
    {
      name: 'Organic Fortified Soy Beverage - Chocolate',
      barcode: '0063667301859',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/366/730/1859/front_en.7.400.jpg',
    },
    {
      name: 'Organic Maple Syrup Grade A Amber',
      barcode: '0096619430192',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/943/0192/front_en.40.400.jpg',
    },
    {
      name: 'Maple Syrup',
      barcode: '0096619679133',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/967/9133/front_en.84.400.jpg',
    },
    {
      name: 'Lait au chocolat',
      barcode: '0055872094015',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/587/209/4015/front_fr.27.400.jpg',
    },
    {
      name: 'Tostitos Multigrain Rondes',
      barcode: '0060410901229',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/090/1229/front_en.3.400.jpg',
    },
    {
      name: 'Brownie Bear Paws',
      barcode: '0063348006912',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/334/800/6912/front_en.13.400.jpg',
    },
    {
      name: 'Oatmeal, Celebration Cookies',
      barcode: '0064042006697',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/404/200/6697/front_en.33.400.jpg',
    },
    {
      name: 'Galette de gruau',
      barcode: '0055598001922',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/559/800/1922/front_en.22.400.jpg',
    },
    {
      name: 'Raisin Bran',
      barcode: '0064100108066',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/010/8066/front_fr.5.400.jpg',
    },
    {
      name: 'Carnation Carnation Hot Chocolate Rich Carton',
      barcode: '0065000133547',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/500/013/3547/front_fr.17.400.jpg',
    },
    {
      name: 'Muesli croquant - pain de seigle croustillant',
      barcode: '0078935005438',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/007/893/500/5438/front_en.20.400.jpg',
    },
    {
      name: 'Rice crispees',
      barcode: '0064100534841',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/053/4841/front_fr.19.400.jpg',
    },
    {
      name: 'Petits suisses dark 72% - noir',
      barcode: '7616500664913',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/761/650/066/4913/front_en.15.400.jpg',
    },
    {
      name: 'Poudre Pte',
      barcode: '06749011',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/674/9011/front_fr.21.400.jpg',
    },
    {
      name: 'Barre granola tendres et enrobes',
      barcode: '0096619199778',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/009/661/919/9778/front_en.9.400.jpg',
    },
    {
      name: 'Some Pulp Orange Juice',
      barcode: '0048500203569',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/004/850/020/3569/front_en.30.400.jpg',
    },
    {
      name: 'Lactose Free 0% Skim Milk',
      barcode: '0064420155016',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/442/015/5016/front_en.34.400.jpg',
    },
    {
      name: 'Fresca',
      barcode: '06793401',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/679/3401/front_en.20.400.jpg',
    },
    {
      name: 'Classic Thick sliced white bread',
      barcode: '0068721003502',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/872/100/3502/front_en.24.400.jpg',
    },
    {
      name: 'Fruit Punch Liquid Water Enhancer',
      barcode: '06808011',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/680/8011/front_en.25.400.jpg',
    },
    {
      name: 'Cheez It Crunch: Sharp White Cheddar',
      barcode: '0064100131552',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/410/013/1552/front_fr.27.400.jpg',
    },
    {
      name: 'Margarine sans sel',
      barcode: '0011115001363',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/111/500/1363/front_en.8.400.jpg',
    },
    {
      name: 'Hummus Roasted Garlic',
      barcode: '0773200702349',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/077/320/070/2349/front_en.29.400.jpg',
    },
    {
      name: 'Mangue orange biologique',
      barcode: '0067311352136',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/731/135/2136/front_fr.18.400.jpg',
    },
    {
      name: 'Seed & Grains Bread',
      barcode: '0671521400206',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/067/152/140/0206/front_en.28.400.jpg',
    },
    {
      name: 'Smart Water',
      barcode: '0786162650351',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/078/616/265/0351/front_en.23.400.jpg',
    },
    {
      name: 'Honey Toasted Organic Oat Cereal',
      barcode: '0018627112907',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/862/711/2907/front_fr.3.400.jpg',
    },
    {
      name: 'Sesame, Montreal style Bagels',
      barcode: '0627286000014',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/728/600/0014/front_en.40.400.jpg',
    },
    {
      name: 'Cherry Dark Chocolate, Chewy whole-grain bars',
      barcode: '0018627104858',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/001/862/710/4858/front_en.83.400.jpg',
    },
    {
      name: 'Caramel & Sea Salt Dark Lindt Excellence',
      barcode: '0037466064376',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/746/606/4376/front_en.28.400.jpg',
    },
    {
      name: 'Tomato Ketchup',
      barcode: '0056200951215',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/620/095/1215/front_en.24.400.jpg',
    },
    {
      name: 'Budweiser Beer',
      barcode: '0062067335341',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/206/733/5341/front_en.19.400.jpg',
    },
    {
      name: 'Gluten Free Macaroni',
      barcode: '0064200160056',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/420/016/0056/front_fr.26.400.jpg',
    },
    {
      name: 'St hubert poutine gravy',
      barcode: '0066701001029',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/670/100/1029/front_fr.6.400.jpg',
    },
    {
      name: 'Multigrain Thin Crispbread',
      barcode: '0605870000190',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/060/587/000/0190/front_en.19.400.jpg',
    },
    {
      name: 'Sirop derable',
      barcode: '0669803900001',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/066/980/390/0001/front_fr.4.400.jpg',
    },
    {
      name: 'Choco Chimps organic',
      barcode: '0058449870234',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/844/987/0234/front_en.24.400.jpg',
    },
    {
      name: 'Tartinade Bio craquantes au sarrasin',
      barcode: '0848206059572',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/084/820/605/9572/front_fr.3.400.jpg',
    },
    {
      name: 'Low Sodium V8',
      barcode: '0063211158779',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/321/115/8779/front_en.19.400.jpg',
    },
    {
      name: 'Codre de pomme',
      barcode: '0060383069117',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/306/9117/front_en.4.400.jpg',
    },
    {
      name: 'Gadoua',
      barcode: '0056573112121',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/657/311/2121/front_en.3.400.jpg',
    },
    {
      name: 'Honeycomb Cereal',
      barcode: '0628154138983',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/815/413/8983/front_en.36.400.jpg',
    },
    {
      name: 'Root Beer',
      barcode: '0069000040508',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/900/004/0508/front_en.14.400.jpg',
    },
    {
      name: 'Taco Kit, Hard & Soft',
      barcode: '0058300462189',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/830/046/2189/front_en.20.400.jpg',
    },
    {
      name: 'Tofu',
      barcode: '0062859000044',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/285/900/0044/front_fr.5.400.jpg',
    },
    {
      name: 'Worcestershire sauce',
      barcode: '05795303',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/579/5303/front_fr.5.400.jpg',
    },
    {
      name: 'Orange Intense Dark Lindt Excellence',
      barcode: '0037466022680',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/746/602/2680/front_en.19.400.jpg',
    },
    {
      name: 'Fruit Punch G2',
      barcode: '0055577420935',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/557/742/0935/front_en.31.400.jpg',
    },
    {
      name: 'Beans In Maple Sauce',
      barcode: '0057000086114',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/700/008/6114/front_en.42.400.jpg',
    },
    {
      name: '100% Whole Wheat Bread',
      barcode: '0064947130978',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/494/713/0978/front_en.3.400.jpg',
    },
    {
      name: 'Raspberry Iced Tea',
      barcode: '06766504',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/676/6504/front_en.17.400.jpg',
    },
    {
      name: 'Original sour crem',
      barcode: '0066013141505',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/601/314/1505/front_en.8.400.jpg',
    },
    {
      name: 'Gluten Free Old Fashioned Rolled Oats',
      barcode: '0039978323750',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/003/997/832/3750/front_en.28.400.jpg',
    },
    {
      name: 'Black peppercons',
      barcode: '06600927',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/660/0927/front_fr.11.400.jpg',
    },
    {
      name: 'Fine hazelnut chocolates',
      barcode: '0062020006509',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/202/000/6509/front_en.32.400.jpg',
    },
    {
      name: 'Mayo',
      barcode: '0059749890700',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/005/974/989/0700/front_en.21.400.jpg',
    },
    {
      name: 'Nestea Zro sucre',
      barcode: '0083900003760',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/008/390/000/3760/front_en.15.400.jpg',
    },
    {
      name: 'Barres aux figues framboises',
      barcode: '0047495210248',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/004/749/521/0248/front_fr.8.400.jpg',
    },
    {
      name: 'Yogourt',
      barcode: '0629025411006',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/062/902/541/1006/front_fr.3.400.jpg',
    },
    {
      name: 'Beurre Lactantia My country',
      barcode: '0066096123054',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/609/612/3054/front_fr.3.400.jpg',
    },
    {
      name: 'Avoine croquante Amandes',
      barcode: '0065633158122',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/315/8122/front_en.19.400.jpg',
    },
    {
      name: 'Chip Lays classique (nature)',
      barcode: '0060410026663',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/002/6663/front_fr.9.400.jpg',
    },
    {
      name: 'Avoine Croquante - Trio de petits fruits',
      barcode: '0065633158146',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('produce'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/563/315/8146/front_fr.3.400.jpg',
    },
    {
      name: 'Organic Chick Peas',
      barcode: '0066844508171',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/684/450/8171/front_en.39.400.jpg',
    },
    {
      name: 'Canola oil',
      barcode: '0688054000193',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/068/805/400/0193/front_en.22.400.jpg',
    },
    {
      name: 'Chips sel en vinaigre',
      barcode: '0060410047545',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('snacks'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/041/004/7545/front_fr.5.400.jpg',
    },
    {
      name: 'Salted Butter',
      barcode: '0060383681890',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('pantry'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/038/368/1890/front_en.15.400.jpg',
    },
    {
      name: 'Pressed Cottage Cheese',
      barcode: '0776241031119',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/077/624/103/1119/front_en.26.400.jpg',
    },
    {
      name: '5% Extra Creamy Greek Yogurt',
      barcode: '0065684120918',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('dairy'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/568/412/0918/front_fr.3.400.jpg',
    },
    {
      name: 'Coca Cola',
      barcode: '06780504',
      barcodeType: BarcodeType.EAN8,
      category: categoryMap.get('beverages'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/000/000/678/0504/front_fr.8.400.jpg',
    },
    {
      name: 'Canadian rye bread',
      barcode: '0063004011908',
      barcodeType: BarcodeType.EAN13,
      category: categoryMap.get('bakery'),
      imageUrl:
        'https://images.openfoodfacts.org/images/products/006/300/401/1908/front_fr.3.400.jpg',
    },
  ];

  // Insert in batches to avoid memory issues
  const batchSize = 100;
  let totalCreated = 0;

  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    try {
      const created = await productRepository.save(batch);
      totalCreated += created.length;
      console.log(
        `    ✅ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(products.length / batchSize)} (${totalCreated} products)`,
      );
    } catch (error) {
      console.error(
        `    ❌ Error in batch ${Math.floor(i / batchSize) + 1}:`,
        error,
      );
      // Continue with next batch
    }
  }

  console.log(`  ✅ Created ${totalCreated} products from large dataset`);
}
