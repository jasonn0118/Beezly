import { DataSource } from 'typeorm';
import { Store } from '../../entities/store.entity';

export async function seedStores(dataSource: DataSource) {
  const storeRepository = dataSource.getRepository(Store);

  // Check if stores already exist
  const existingStores = await storeRepository.count();
  if (existingStores > 0) {
    console.log('  ⏭️  Stores already seeded, skipping...');
    return;
  }

  const stores = [
    {
      name: 'Loblaws',
      address: "1 President's Choice Cir, Brampton, ON L6Y 5S5",
      phone: '905-459-2500',
      location: {
        type: 'Point',
        coordinates: [-79.7624177, 43.7350021],
      },
    },
    {
      name: 'Metro',
      address: '11 York St, Toronto, ON M5J 2R2',
      phone: '416-365-8000',
      location: {
        type: 'Point',
        coordinates: [-79.3788963, 43.6421544],
      },
    },
    {
      name: 'Sobeys',
      address: '115 King St W, Mississauga, ON L5B 2Y8',
      phone: '905-270-3000',
      location: {
        type: 'Point',
        coordinates: [-79.5943304, 43.5890452],
      },
    },
    {
      name: 'No Frills',
      address: '277 Wellington St W, Toronto, ON M5V 3H2',
      phone: '416-977-0441',
      location: {
        type: 'Point',
        coordinates: [-79.3886108, 43.6434661],
      },
    },
    {
      name: 'FreshCo',
      address: '640 Welham Rd, Barrie, ON L4N 0B7',
      phone: '705-739-8511',
      location: {
        type: 'Point',
        coordinates: [-79.6903687, 44.3894009],
      },
    },
    {
      name: 'Food Basics',
      address: '25 The West Mall, Etobicoke, ON M9C 1B8',
      phone: '416-621-1991',
      location: {
        type: 'Point',
        coordinates: [-79.5830078, 43.6434661],
      },
    },
    {
      name: 'Valu-mart',
      address: '201 City Centre Dr, Mississauga, ON L5B 2T4',
      phone: '905-566-8000',
      location: {
        type: 'Point',
        coordinates: [-79.6441345, 43.5890452],
      },
    },
    {
      name: 'Your Independent Grocer',
      address: '2901 Bayview Ave, North York, ON M2K 1E6',
      phone: '416-225-8521',
      location: {
        type: 'Point',
        coordinates: [-79.3852386, 43.7722405],
      },
    },
    {
      name: 'Fortinos',
      address: '50 Dundurn St S, Hamilton, ON L8P 4W3',
      phone: '905-577-1077',
      location: {
        type: 'Point',
        coordinates: [-79.9002686, 43.2640762],
      },
    },
    {
      name: 'Zehrs',
      address: '351 Erb St W, Waterloo, ON N2L 1V8',
      phone: '519-886-7370',
      location: {
        type: 'Point',
        coordinates: [-80.5445328, 43.4842905],
      },
    },
  ];

  const createdStores = await storeRepository.save(stores);
  console.log(`  ✅ Created ${createdStores.length} stores`);
}
