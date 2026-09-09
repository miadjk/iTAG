import type { District, Municipality, Province, Region, School } from "@/types";

export const regions: Region[] = [
  { id: "r9", name: "Region IX – Zamboanga Peninsula" },
  { id: "r10", name: "Region X – Northern Mindanao" },
  { id: "r11", name: "Region XI – Davao Region" },
  { id: "r12", name: "Region XII – SOCCSKSARGEN" },
  { id: "r13", name: "Region XIII – Caraga" },
  { id: "barmm", name: "BARMM – Bangsamoro Autonomous Region in Muslim Mindanao" },
];

export const provinces: Province[] = [
  { id: "r9-zs", regionId: "r9", name: "Zamboanga del Sur" },
  { id: "r9-zn", regionId: "r9", name: "Zamboanga del Norte" },
  { id: "r9-zsi", regionId: "r9", name: "Zamboanga Sibugay" },
  { id: "r10-buk", regionId: "r10", name: "Bukidnon" },
  { id: "r10-cam", regionId: "r10", name: "Camiguin" },
  { id: "r10-ldn", regionId: "r10", name: "Lanao del Norte" },
  { id: "r10-misocc", regionId: "r10", name: "Misamis Occidental" },
  { id: "r10-misor", regionId: "r10", name: "Misamis Oriental" },
  { id: "r11-dor", regionId: "r11", name: "Davao Oriental" },
  { id: "r11-ddo", regionId: "r11", name: "Davao de Oro" },
  { id: "r11-ddn", regionId: "r11", name: "Davao del Norte" },
  { id: "r11-dds", regionId: "r11", name: "Davao del Sur" },
  { id: "r11-doc", regionId: "r11", name: "Davao Occidental" },
  { id: "r12-cot", regionId: "r12", name: "Cotabato" },
  { id: "r12-sar", regionId: "r12", name: "Sarangani" },
  { id: "r12-sk", regionId: "r12", name: "South Cotabato" },
  { id: "r12-sul", regionId: "r12", name: "Sultan Kudarat" },
  { id: "r13-adn", regionId: "r13", name: "Agusan del Norte" },
  { id: "r13-ads", regionId: "r13", name: "Agusan del Sur" },
  { id: "r13-sdn", regionId: "r13", name: "Surigao del Norte" },
  { id: "r13-sds", regionId: "r13", name: "Surigao del Sur" },
  { id: "r13-din", regionId: "r13", name: "Dinagat Islands" },
  { id: "barmm-mag", regionId: "barmm", name: "Maguindanao del Norte" },
  { id: "barmm-lan", regionId: "barmm", name: "Lanao del Sur" },
  { id: "barmm-bas", regionId: "barmm", name: "Basilan" },
  { id: "barmm-sul", regionId: "barmm", name: "Sulu" },
  { id: "barmm-taw", regionId: "barmm", name: "Tawi-Tawi" },
];

export const municipalities: Municipality[] = [
  { id: "lupon", provinceId: "r11-dor", name: "Lupon" },
  { id: "banaybanay", provinceId: "r11-dor", name: "Banaybanay" },
];

export const districts: District[] = [
  ...["East", "West"].map((name) => ({
    id: `lupon-${name.toLowerCase()}`,
    municipalityId: "lupon",
    name,
  })),
  ...["East", "West"].map((name) => ({
    id: `banaybanay-${name.toLowerCase()}`,
    municipalityId: "banaybanay",
    name,
  })),
];

const luponEastSchools = [
  "BANHAWAN ES",
  "CALAPAGAN ES",
  "CALAPAGAN NHS",
  "CALASAGAN ES",
  "COCORNON ES",
  "DON MARIANO MARCOS ES",
  "DON MARIANO MARCOS NHS",
  "ERNESTO D. VIOLAN ES",
  "ERNESTO D. VIOLAN NHS",
  "IMMACULADA ES",
  "JOSEFITO TALIMAN ES",
  "KAUSWAGAN ES",
  "LANTAWAN ES",
  "MACANGAO AVHS",
  "MACANGAO CES",
  "MALIG ES",
  "MARAYAG ES",
  "MARAYAG NHS",
  "MATIGDAO ES",
  "NEW VISAYAS ES",
  "SAN JOSE ES",
  "SERGIO MAWALIC ES",
  "TAGBOA AVHS",
  "TAGBOA ES",
  "TIOMBOCAN ES",
  "TIOMBOCAN NHS",
];

const luponWestSchools = [
  "ALBERTO RECAÑO ES",
  "ANANGILAN ES",
  "AROMA BEACH ES",
  "BAGUMBAYAN AGRO-INDUSTRIAL HS",
  "BAGUMBAYAN ES",
  "BENITO BAROL SR. ES",
  "CABADIANGAN ES",
  "COMARA T. MANUEL CES II",
  "COMARA T. MANUEL CES SPED CENTER",
  "CORPORACION NHS",
  "ILANGAY ES",
  "LANGKA ES",
  "LOGDECK ES",
  "LUPON NCHS",
  "LUPON VOCATIONAL HS",
  "MAHAYAHAY ES",
  "MARAGATAS IS",
  "PANGYAN ES",
  "SIGANG ES",
  "TAGUGPO ES",
  "TAGUGPO NHS",
];

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export const schools: School[] = [
  ...luponEastSchools.map((name) => ({
    id: `lupon-east-${slug(name)}`,
    districtId: "lupon-east",
    name,
  })),
  ...luponWestSchools.map((name) => ({
    id: `lupon-west-${slug(name)}`,
    districtId: "lupon-west",
    name,
  })),
  ...districts
    .filter((d) => d.municipalityId === "banaybanay")
    .map((d) => ({
      id: `${d.id}-central`,
      districtId: d.id,
      name: `Banaybanay ${d.name} Central School`,
    })),
];

export function getSchoolName(schoolId?: string | null) {
  if (!schoolId) return "";
  return schools.find((s) => s.id === schoolId)?.name ?? "";
}

export function locationFromSchool(schoolId?: string | null) {
  const school = schools.find((s) => s.id === schoolId);
  if (!school) return null;
  const district = districts.find((d) => d.id === school.districtId);
  const municipality = municipalities.find((m) => m.id === district?.municipalityId);
  const province = provinces.find((p) => p.id === municipality?.provinceId);
  return {
    schoolId: school.id,
    schoolName: school.name,
    districtId: school.districtId,
    municipalityId: district?.municipalityId ?? null,
    provinceId: province?.id ?? null,
    regionId: province?.regionId ?? null,
  };
}

export function locationLabel(ids: {
  regionId?: string | null;
  provinceId?: string | null;
  municipalityId?: string | null;
  districtId?: string | null;
  schoolId?: string | null;
}) {
  return [
    regions.find((r) => r.id === ids.regionId)?.name,
    provinces.find((p) => p.id === ids.provinceId)?.name,
    municipalities.find((m) => m.id === ids.municipalityId)?.name,
    districts.find((d) => d.id === ids.districtId)?.name,
    getSchoolName(ids.schoolId),
  ]
    .filter(Boolean)
    .join(" · ");
}
