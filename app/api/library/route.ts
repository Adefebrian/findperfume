import { db } from "@/lib/db";

export const runtime = "nodejs";

const SELECT = `id, name, brand, year, gender, accords, notes_json, rating_scent,
  scent_count, image, url, slug`;

interface Row {
  [k: string]: unknown;
}

function mapRow(r: Row) {
  let accords: string[] = [];
  try {
    accords = JSON.parse((r.accords as string) || "[]");
  } catch {
    accords = [];
  }
  let notes = { top: [], heart: [], base: [] } as Record<string, { n: string; i: string }[]>;
  try {
    const j = JSON.parse((r.notes_json as string) || "{}");
    notes = {
      top: Array.isArray(j.top) ? j.top : [],
      heart: Array.isArray(j.heart) ? j.heart : [],
      base: Array.isArray(j.base) ? j.base : [],
    };
  } catch {}
  return {
    id: Number(r.id),
    name: String(r.name ?? ""),
    brand: String(r.brand ?? ""),
    year: r.year != null ? Number(r.year) : null,
    gender: (r.gender as string) ?? null,
    accords,
    notes,
    rating_scent: r.rating_scent != null ? Number(r.rating_scent) : null,
    scent_count: r.scent_count != null ? Number(r.scent_count) : null,
    image: (r.image as string) ?? null,
    url: (r.url as string) ?? null,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") || "perfumes";
  const client = db();

  try {
    // Facets: top brands + accord families for the filter sidebar.
    if (mode === "facets") {
      const brands = await client.execute(
        `SELECT brand, COUNT(*) c FROM perfumes GROUP BY brand ORDER BY c DESC LIMIT 60`
      );
      const accords = [
        "Woody", "Floral", "Fresh", "Sweet", "Citrus", "Spicy", "Oriental",
        "Fruity", "Aquatic", "Powdery", "Green", "Smoky", "Gourmand", "Amber",
        "Leathery", "Creamy", "Synthetic", "Earthy", "Aromatic", "Animal",
      ];
      return Response.json({
        brands: brands.rows.map((r) => ({ brand: String(r[0]), count: Number(r[1]) })),
        accords,
      });
    }

    // Perfume listing with optional brand / accord filter + sort + pagination.
    const brand = url.searchParams.get("brand");
    const accord = url.searchParams.get("accord");
    const gender = url.searchParams.get("gender");
    const sort = url.searchParams.get("sort") || "popular";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const perPage = 24;
    const offset = (page - 1) * perPage;

    const where: string[] = ["1=1"];
    const args: (string | number)[] = [];
    if (brand) {
      where.push("brand = ?");
      args.push(brand);
    }
    if (accord) {
      where.push("accords_txt LIKE ?");
      args.push(`%${accord}%`);
    }
    if (gender && gender !== "any") {
      where.push("gender = ?");
      args.push(gender);
    }
    const orderBy =
      sort === "rating"
        ? "COALESCE(rating_scent,0) DESC, COALESCE(scent_count,0) DESC"
        : sort === "year"
        ? "COALESCE(year,0) DESC"
        : "COALESCE(popularity,0) DESC";

    const whereSql = where.join(" AND ");
    const listSql = `SELECT ${SELECT} FROM perfumes WHERE ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
    const res = await client.execute({ sql: listSql, args: [...args, perPage, offset] });

    return Response.json({
      page,
      perPage,
      items: res.rows.map((r) => mapRow(r as unknown as Row)),
    });
  } catch (e) {
    console.error("library error", e);
    return Response.json({ error: "Failed to load library" }, { status: 500 });
  }
}
