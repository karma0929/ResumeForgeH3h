export interface RegionRecord {
  code: string;
  name: string;
  cities?: string[];
}

export interface CountryRecord {
  code: string;
  name: string;
  regions?: RegionRecord[];
}

export const LOCATION_DATA: CountryRecord[] = [
  {
    code: "US",
    name: "United States",
    regions: [
      { code: "CA", name: "California", cities: ["San Francisco", "San Jose", "Los Angeles", "San Diego", "Merced"] },
      { code: "NY", name: "New York", cities: ["New York", "Brooklyn", "Buffalo", "Albany"] },
      { code: "WA", name: "Washington", cities: ["Seattle", "Redmond", "Bellevue"] },
      { code: "TX", name: "Texas", cities: ["Austin", "Dallas", "Houston"] },
      { code: "MA", name: "Massachusetts", cities: ["Boston", "Cambridge"] },
    ],
  },
  {
    code: "CN",
    name: "China",
    regions: [
      { code: "BJ", name: "Beijing", cities: ["Beijing"] },
      { code: "SH", name: "Shanghai", cities: ["Shanghai"] },
      { code: "GD", name: "Guangdong", cities: ["Shenzhen", "Guangzhou", "Dongguan"] },
      { code: "ZJ", name: "Zhejiang", cities: ["Hangzhou", "Ningbo"] },
      { code: "SC", name: "Sichuan", cities: ["Chengdu"] },
    ],
  },
  { code: "CA", name: "Canada" },
  { code: "UK", name: "United Kingdom" },
  { code: "SG", name: "Singapore" },
  { code: "IN", name: "India" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "OTHER", name: "Other" },
];

export function parseLocationString(input: string) {
  const normalized = input.trim();
  if (!normalized) {
    return { country: "", region: "", city: "" };
  }

  const parts = normalized
    .split(/[|,，]/g)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 1) {
    return { country: "", region: "", city: parts[0] };
  }

  if (parts.length === 2) {
    return { country: parts[0], region: "", city: parts[1] };
  }

  return {
    country: parts[0],
    region: parts[1],
    city: parts.slice(2).join(", "),
  };
}

export function formatLocationString(input: {
  country: string;
  region: string;
  city: string;
}) {
  return [input.country, input.region, input.city]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}
