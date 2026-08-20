#!/usr/bin/env node
/**
 * Generate `src/lib/db/generated.types.ts` by introspecting a live database.
 *
 * Usage:
 *   node scripts/gen-types.mjs "postgresql://postgres@localhost:5433/postgres"
 *   npm run db:types            # against the local validation database
 *
 * Why this exists rather than `supabase gen types`: the official CLI runs
 * postgres-meta inside Docker, which is not always available in a build or CI
 * sandbox. This script needs only `psql`. Output shape matches what
 * @supabase/supabase-js expects for its `Database` generic.
 *
 * Once the hosted Supabase project exists, regenerating with the official CLI
 * (or the Supabase MCP `generate_typescript_types` tool) is equally valid —
 * the shapes are interchangeable.
 */

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const dbUrl = process.argv[2];
if (!dbUrl) {
  console.error("usage: node scripts/gen-types.mjs <postgres-connection-url>");
  process.exit(1);
}

const OUT = "src/lib/db/generated.types.ts";

function query(sql) {
  const raw = execFileSync(
    "psql",
    [dbUrl, "-X", "-A", "-t", "-q", "--no-psqlrc", "-c", sql],
    { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  ).trim();
  return raw ? JSON.parse(raw) : [];
}

/** Map a PostgreSQL type to its TypeScript representation. */
function tsType(col) {
  if (col.dimensions > 0) {
    return `${tsType({ ...col, dimensions: 0 })}[]`;
  }
  if (col.is_enum) {
    return `Database["public"]["Enums"]["${col.udt_name}"]`;
  }
  switch (col.udt_name) {
    case "bool":
      return "boolean";
    case "int2":
    case "int4":
    case "int8":
    case "float4":
    case "float8":
    case "numeric":
      return "number";
    case "json":
    case "jsonb":
      return "Json";
    default:
      // uuid, text, citext, varchar, timestamptz, date, time, interval, bytea…
      return "string";
  }
}

const enums = query(`
  select coalesce(json_agg(row_to_json(t) order by t.name), '[]'::json) from (
    select t.typname as name,
           array_agg(e.enumlabel order by e.enumsortorder) as labels
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    group by t.typname
  ) t;
`);

const columns = query(`
  select coalesce(json_agg(row_to_json(t) order by t.table_name, t.ordinal_position), '[]'::json) from (
    select c.relname as table_name,
           c.relkind as kind,
           a.attname as column_name,
           a.attnum as ordinal_position,
           not a.attnotnull as is_nullable,
           (pg_get_expr(d.adbin, d.adrelid) is not null or a.attidentity <> '') as has_default,
           a.attndims as dimensions,
           coalesce(bt.typname, t.typname) as udt_name,
           (coalesce(bt.typtype, t.typtype) = 'e') as is_enum,
           pg_get_expr(d.adbin, d.adrelid) is not null as has_expr_default,
           a.attgenerated <> '' as is_generated
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_type t on t.oid = a.atttypid
    left join pg_type bt on bt.oid = t.typelem and t.typcategory = 'A'
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where n.nspname = 'public'
      and c.relkind in ('r','v','m')
      and a.attnum > 0
      and not a.attisdropped
  ) t;
`);

const foreignKeys = query(`
  select coalesce(json_agg(row_to_json(t) order by t.table_name, t.constraint_name), '[]'::json) from (
    select con.conname as constraint_name,
           src.relname as table_name,
           (select array_agg(att.attname order by k.ord)
              from unnest(con.conkey) with ordinality k(attnum, ord)
              join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum
           ) as columns,
           tgt.relname as foreign_table_name,
           (select array_agg(att.attname order by k.ord)
              from unnest(con.confkey) with ordinality k(attnum, ord)
              join pg_attribute att on att.attrelid = con.confrelid and att.attnum = k.attnum
           ) as foreign_columns
    from pg_constraint con
    join pg_class src on src.oid = con.conrelid
    join pg_class tgt on tgt.oid = con.confrelid
    join pg_namespace n on n.oid = src.relnamespace
    where con.contype = 'f' and n.nspname = 'public'
  ) t;
`);

const functions = query(`
  select coalesce(json_agg(row_to_json(t) order by t.name), '[]'::json) from (
    select p.proname as name,
           p.pronargs as nargs,
           p.pronargdefaults as ndefaults,
           coalesce(p.proargnames, '{}') as arg_names,
           (select array_agg(x.typname order by k.ord)
              from unnest(p.proargtypes) with ordinality k(oid, ord)
              join pg_type x on x.oid = k.oid) as arg_types,
           (select array_agg(coalesce(x.typtype, 'b') = 'e' order by k.ord)
              from unnest(p.proargtypes) with ordinality k(oid, ord)
              join pg_type x on x.oid = k.oid) as arg_is_enum,
           rt.typname as return_type,
           (rt.typtype = 'e') as return_is_enum,
           p.proretset as returns_set
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_type rt on rt.oid = p.prorettype
    where n.nspname = 'public'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
      and p.prokind = 'f'
      and p.proname not like 'prevent\\_%'
      and p.proname <> 'set_updated_at'
  ) t;
`);

const byTable = new Map();
for (const col of columns) {
  if (!byTable.has(col.table_name)) {
    byTable.set(col.table_name, { kind: col.kind, cols: [] });
  }
  byTable.get(col.table_name).cols.push(col);
}

const fkByTable = new Map();
for (const fk of foreignKeys) {
  if (!fkByTable.has(fk.table_name)) fkByTable.set(fk.table_name, []);
  fkByTable.get(fk.table_name).push(fk);
}

const tableNames = [...byTable.keys()].filter((t) => byTable.get(t).kind === "r").sort();
const viewNames = [...byTable.keys()].filter((t) => byTable.get(t).kind !== "r").sort();

function renderRelationships(table) {
  const fks = fkByTable.get(table) ?? [];
  if (fks.length === 0) return "[]";
  const entries = fks
    .map((fk) => {
      const cols = fk.columns.map((c) => `"${c}"`).join(", ");
      const fcols = fk.foreign_columns.map((c) => `"${c}"`).join(", ");
      return [
        "        {",
        `          foreignKeyName: "${fk.constraint_name}";`,
        `          columns: [${cols}];`,
        `          isOneToOne: false;`,
        `          referencedRelation: "${fk.foreign_table_name}";`,
        `          referencedColumns: [${fcols}];`,
        "        }",
      ].join("\n");
    })
    .join(",\n");
  return `[\n${entries}\n      ]`;
}

function renderTable(table) {
  const { cols } = byTable.get(table);
  const isView = byTable.get(table).kind !== "r";

  const row = cols
    .map((c) => `        ${c.column_name}: ${tsType(c)}${c.is_nullable ? " | null" : ""};`)
    .join("\n");

  const insert = cols
    .map((c) => {
      if (c.is_generated) return null;
      const optional = c.is_nullable || c.has_default;
      return `        ${c.column_name}${optional ? "?" : ""}: ${tsType(c)}${
        c.is_nullable ? " | null" : ""
      };`;
    })
    .filter(Boolean)
    .join("\n");

  const update = cols
    .map((c) => {
      if (c.is_generated) return null;
      return `        ${c.column_name}?: ${tsType(c)}${c.is_nullable ? " | null" : ""};`;
    })
    .filter(Boolean)
    .join("\n");

  if (isView) {
    return `    ${table}: {\n      Row: {\n${row}\n      };\n      Relationships: ${renderRelationships(
      table,
    )};\n    };`;
  }

  return `    ${table}: {\n      Row: {\n${row}\n      };\n      Insert: {\n${insert}\n      };\n      Update: {\n${update}\n      };\n      Relationships: ${renderRelationships(
    table,
  )};\n    };`;
}

const enumBlock = enums.length
  ? enums
      .map((e) => `    ${e.name}: ${e.labels.map((l) => `"${l}"`).join(" | ")};`)
      .join("\n")
  : "    [_ in never]: never;";

function scalarTs(udt, isEnum) {
  if (isEnum) return `Database["public"]["Enums"]["${udt}"]`;
  switch (udt) {
    case "void":
      return "undefined";
    case "bool":
      return "boolean";
    case "int2":
    case "int4":
    case "int8":
    case "float4":
    case "float8":
    case "numeric":
      return "number";
    case "json":
    case "jsonb":
      return "Json";
    case "record":
									case "trigger":
      return "unknown";
    default:
      return "string";
  }
}

function renderFunction(f) {
  const names = f.arg_names ?? [];
  const types = f.arg_types ?? [];
  const isEnum = f.arg_is_enum ?? [];
  const nargs = types.length;
  // The last `ndefaults` positional arguments are optional.
  const firstOptional = nargs - (f.ndefaults ?? 0);

  const args = nargs === 0
    ? "Record<PropertyKey, never>"
    : `{\n${types
        .map((t, i) => {
          const name = names[i] ?? `arg${i + 1}`;
          const optional = i >= firstOptional;
          const ts = scalarTs(t, isEnum[i] === true || isEnum[i] === "t");
          // PostgreSQL accepts NULL for any parameter, so every argument is
          // nullable on input. Only arguments with a DEFAULT may be omitted.
          return `          ${name}${optional ? "?" : ""}: ${ts} | null;`;
        })
        .join("\n")}\n        }`;

  const ret = scalarTs(f.return_type, f.return_is_enum === true || f.return_is_enum === "t");
  const returns = f.returns_set ? `${ret}[]` : ret;

  return `      ${f.name}: {\n        Args: ${args};\n        Returns: ${returns};\n      };`;
}

const functionBlock = functions.length
  ? functions.map(renderFunction).join("\n")
  : "      [_ in never]: never;";

const header = `/**
 * AUTO-GENERATED. DO NOT EDIT BY HAND.
 *
 * Regenerate with:
 *   npm run db:types
 *
 * Source: BAD ERA Supabase schema, migrations 0001-0010.
 * Tables: ${tableNames.length}. Enums: ${enums.length}.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
${tableNames.map(renderTable).join("\n")}
    };
    Views: {
${viewNames.length ? viewNames.map(renderTable).join("\n") : "      [_ in never]: never;"}
    };
    Functions: {
${functionBlock}
    };
    Enums: {
${enumBlock}
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];
`;

writeFileSync(OUT, header);
console.log(
  `wrote ${OUT}: ${tableNames.length} tables, ${viewNames.length} views, ${enums.length} enums, ${foreignKeys.length} foreign keys`,
);
