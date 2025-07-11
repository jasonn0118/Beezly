import axios from 'axios';

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GeocodeResult {
  address_components: AddressComponent[];
}

interface GeocodeResponse {
  results: GeocodeResult[];
  status: string;
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<{ city: string; province: string; postalCode: string }> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

  const { data } = await axios.get<GeocodeResponse>(url);

  if (!data.results || data.results.length === 0) {
    return {
      city: '',
      province: '',
      postalCode: '',
    };
  }

  let city = '';
  let province = '';
  let postalCode = '';

  const components = data.results[0].address_components;
  for (const comp of components) {
    if (comp.types.includes('locality')) {
      city = comp.long_name;
    }
    if (comp.types.includes('administrative_area_level_1')) {
      province = comp.short_name;
    }
    if (comp.types.includes('postal_code')) {
      postalCode = comp.long_name;
    }
  }

  return { city, province, postalCode };
}
