import { MongoClient } from "mongodb";

export type FieldReport = {
  handle: string;
  text: string;
  at: Date;
  /** Set once the agent has folded this report into its triage. */
  seenByAgent?: boolean;
};

const uri =
  process.env.MONGODB_URI ??
  "mongodb://localhost:27017/?replicaSet=rs0&directConnection=true";

export const mongo = new MongoClient(uri, { serverSelectionTimeoutMS: 4000 });

let connected: Promise<void> | null = null;
export function connectMongo() {
  connected ??= mongo.connect().then(() => {
    console.log(`[mongo] connected: ${uri.replace(/\/\/[^@]*@/, "//***@")}`);
  });
  return connected;
}

export const db = () => mongo.db("agenthour");
export const reports = () => db().collection<FieldReport>("reports");

/** True when Mongo is reachable. Surfaced by /demo/health. */
export async function mongoHealthy() {
  try {
    await connectMongo();
    await db().command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}

export async function insertReport(handle: string, text: string) {
  await connectMongo();
  const doc: FieldReport = { handle, text, at: new Date(), seenByAgent: false };
  await reports().insertOne(doc);
  return doc;
}

export async function recentReports(limit = 40) {
  await connectMongo();
  return reports().find({}, { sort: { at: -1 }, limit }).toArray();
}

export async function reportCount() {
  await connectMongo();
  return reports().countDocuments();
}

export async function markAllSeen() {
  await connectMongo();
  await reports().updateMany({ seenByAgent: false }, { $set: { seenByAgent: true } });
}

/** Starting backlog, so the agent has something to triage before anyone joins. */
export async function seedReports() {
  await connectMongo();
  await reports().deleteMany({});
  await reports().insertMany([
    {
      handle: "barista",
      text: "A large latte rings up cheaper than a medium. Customers have noticed.",
      at: new Date(Date.now() - 1000 * 60 * 42),
      seenByAgent: false,
    },
    {
      handle: "opsteam",
      text: "Order page shows 'error' instead of a total if you type a drink we don't carry.",
      at: new Date(Date.now() - 1000 * 60 * 17),
      seenByAgent: false,
    },
    {
      handle: "nightshift",
      text: "Tip percentage seems to be charged on the tax too, not just the drinks.",
      at: new Date(Date.now() - 1000 * 60 * 6),
      seenByAgent: false,
    },
  ]);
}
