import * as dotenv from 'dotenv';

const result = dotenv.config({ path: '../.env.test' });

if (result.error) {
  console.error(result.error);
}
