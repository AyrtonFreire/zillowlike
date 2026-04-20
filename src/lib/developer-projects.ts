export type DeveloperUnitsSummary = {
  total: number;
  available: number;
  reserved: number;
  sold: number;
  blocked: number;
};

export type SerializedDeveloperUnit = {
  id: string;
  projectId: string;
  reference: string;
  title: string | null;
  status: string;
  leadCount: number;
  typology: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpots: number | null;
  privateAreaM2: number | null;
  priceInCents: string | null;
  floor: number | null;
  block: string | null;
  tower: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SerializedDeveloperProject = {
  id: string;
  teamId: string;
  name: string;
  slug: string | null;
  status: string;
  leadCount: number;
  description: string | null;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  coverImageUrl: string | null;
  expectedLaunchAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  unitsSummary: DeveloperUnitsSummary;
  units?: SerializedDeveloperUnit[];
};

export function toIsoOrNull(value: unknown) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function toStringOrNull(value: unknown) {
  if (value === null || value === undefined) return null;
  return String(value);
}

export function toCount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function countUnitsByStatus(units: Array<{ status: string | null | undefined }>): DeveloperUnitsSummary {
  const summary: DeveloperUnitsSummary = {
    total: units.length,
    available: 0,
    reserved: 0,
    sold: 0,
    blocked: 0,
  };

  for (const unit of units) {
    if (unit.status === "AVAILABLE") summary.available += 1;
    if (unit.status === "RESERVED") summary.reserved += 1;
    if (unit.status === "SOLD") summary.sold += 1;
    if (unit.status === "BLOCKED") summary.blocked += 1;
  }

  return summary;
}

export function summarizeProjects(projects: Array<Pick<SerializedDeveloperProject, "status" | "unitsSummary" | "leadCount">>) {
  return {
    totalProjects: projects.length,
    activeProjects: projects.filter((project) => project.status === "ACTIVE" || project.status === "LAUNCH").length,
    draftProjects: projects.filter((project) => project.status === "DRAFT").length,
    totalUnits: projects.reduce((sum, project) => sum + project.unitsSummary.total, 0),
    availableUnits: projects.reduce((sum, project) => sum + project.unitsSummary.available, 0),
    totalLeads: projects.reduce((sum, project: any) => sum + toCount(project.leadCount), 0),
  };
}

export function serializeDeveloperUnit(unit: any): SerializedDeveloperUnit {
  const leadCount = toCount(unit?._count?.leads) || (Array.isArray(unit?.leads) ? unit.leads.length : 0);

  return {
    id: String(unit.id),
    projectId: String(unit.projectId),
    reference: String(unit.reference || ""),
    title: unit.title ? String(unit.title) : null,
    status: String(unit.status || "AVAILABLE"),
    leadCount,
    typology: unit.typology ? String(unit.typology) : null,
    bedrooms: typeof unit.bedrooms === "number" ? unit.bedrooms : unit.bedrooms ? Number(unit.bedrooms) : null,
    bathrooms: typeof unit.bathrooms === "number" ? unit.bathrooms : unit.bathrooms ? Number(unit.bathrooms) : null,
    parkingSpots: typeof unit.parkingSpots === "number" ? unit.parkingSpots : unit.parkingSpots ? Number(unit.parkingSpots) : null,
    privateAreaM2: typeof unit.privateAreaM2 === "number" ? unit.privateAreaM2 : unit.privateAreaM2 ? Number(unit.privateAreaM2) : null,
    priceInCents: toStringOrNull(unit.price),
    floor: typeof unit.floor === "number" ? unit.floor : unit.floor ? Number(unit.floor) : null,
    block: unit.block ? String(unit.block) : null,
    tower: unit.tower ? String(unit.tower) : null,
    notes: unit.notes ? String(unit.notes) : null,
    createdAt: toIsoOrNull(unit.createdAt),
    updatedAt: toIsoOrNull(unit.updatedAt),
  };
}

export function serializeDeveloperProject(project: any, options?: { includeUnits?: boolean }): SerializedDeveloperProject {
  const includeUnits = Boolean(options?.includeUnits);
  const rawUnits = Array.isArray(project.units) ? project.units : [];
  const unitsSummary = countUnitsByStatus(rawUnits);
  const leadCount = toCount(project?._count?.leads) || (Array.isArray(project?.leads) ? project.leads.length : 0);

  return {
    id: String(project.id),
    teamId: String(project.teamId),
    name: String(project.name || ""),
    slug: project.slug ? String(project.slug) : null,
    status: String(project.status || "DRAFT"),
    leadCount,
    description: project.description ? String(project.description) : null,
    city: project.city ? String(project.city) : null,
    state: project.state ? String(project.state) : null,
    neighborhood: project.neighborhood ? String(project.neighborhood) : null,
    coverImageUrl: project.coverImageUrl ? String(project.coverImageUrl) : null,
    expectedLaunchAt: toIsoOrNull(project.expectedLaunchAt),
    createdAt: toIsoOrNull(project.createdAt),
    updatedAt: toIsoOrNull(project.updatedAt),
    unitsSummary,
    units: includeUnits ? rawUnits.map(serializeDeveloperUnit) : undefined,
  };
}
