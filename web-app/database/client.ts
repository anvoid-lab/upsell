import { Db, MongoClient } from "mongodb";

let connectionPromise: Promise<Db> | null = null;

export function mongodbConnection(): Promise<Db> {
  if (!connectionPromise) {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB;

    if (!uri) throw new Error("Missing env var: MONGODB_URI");
    if (!dbName) throw new Error("Missing env var: MONGODB_DB");

    connectionPromise = MongoClient.connect(uri).then((client) => client.db(dbName));
  }

  return connectionPromise;
}
