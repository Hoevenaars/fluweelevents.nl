import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getServiceClient, isSupabaseConfigured } from "./supabase.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LOCAL_FILE = join(ROOT, ".data", "submissions.json");

function rowToSubmission(row) {
  return {
    id: row.id,
    naam: row.naam,
    email: row.email,
    telefoon: row.telefoon,
    bericht: row.bericht,
    bron: row.bron,
    gelezen: row.gelezen,
    ontvangenOp: row.ontvangen_op,
  };
}

async function readLocalSubmissions() {
  if (!existsSync(LOCAL_FILE)) return [];
  try {
    const raw = await readFile(LOCAL_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeLocalSubmissions(items) {
  await mkdir(dirname(LOCAL_FILE), { recursive: true });
  await writeFile(LOCAL_FILE, JSON.stringify(items, null, 2), "utf8");
}

export async function addSubmission({ naam, email, telefoon, bericht, bron = "website" }) {
  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("contact_submissions")
      .insert({
        naam,
        email,
        telefoon: telefoon || null,
        bericht,
        bron,
      })
      .select()
      .single();

    if (error) throw error;
    return rowToSubmission(data);
  }

  const submission = {
    id: randomUUID(),
    naam,
    email,
    telefoon: telefoon || null,
    bericht,
    bron,
    gelezen: false,
    ontvangenOp: new Date().toISOString(),
  };

  const items = await readLocalSubmissions();
  items.unshift(submission);
  await writeLocalSubmissions(items);
  return submission;
}

export async function listSubmissions() {
  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("ontvangen_op", { ascending: false });

    if (error) throw error;
    return (data || []).map(rowToSubmission);
  }

  const items = await readLocalSubmissions();
  return items.sort((a, b) => new Date(b.ontvangenOp) - new Date(a.ontvangenOp));
}

export async function markSubmissionRead(id) {
  const supabase = getServiceClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("contact_submissions")
      .update({ gelezen: true })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return rowToSubmission(data);
  }

  const items = await readLocalSubmissions();
  const idx = items.findIndex((item) => item.id === id);
  if (idx === -1) return null;

  items[idx] = { ...items[idx], gelezen: true };
  await writeLocalSubmissions(items);
  return items[idx];
}

export function getStorageMode() {
  if (isSupabaseConfigured()) return "supabase";
  return "local";
}
