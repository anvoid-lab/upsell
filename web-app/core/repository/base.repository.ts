import type {
  Collection,
  Db,
  Filter,
  OptionalUnlessRequiredId,
  UpdateFilter,
} from "mongodb";
import { ObjectId } from "mongodb";
import { AppException } from "@core/exceptions";

export type PaginateResult<T> = {
  data: T[];
  total: number;
};

export type QueryOptions<T> = {
  collectionName?: string;
  filters?: Partial<T>;
  page?: number;
  limit?: number;
  softDelete?: boolean;
};

type BaseRepositoryOptions = {
  collection: string;
  client: () => Promise<Db>;
};

type SoftDeleteDocument = {
  id?: string;
  isDeleted?: boolean;
  deletedAt?: Date | string | null;
};

export class BaseRepository<Entity extends object> {
  public readonly collection: string;
  public readonly client: () => Promise<Db>;

  constructor(options: BaseRepositoryOptions) {
    this.collection = options.collection;
    this.client = options.client;
  }

  private resolveCollection(collectionName?: string): string {
    return collectionName ?? this.collection;
  }

  private async getCollection(collectionName?: string): Promise<Collection<Entity & SoftDeleteDocument>> {
    const db = await this.client();
    return db.collection<Entity & SoftDeleteDocument>(this.resolveCollection(collectionName));
  }

  private buildFilter(filters?: Partial<Entity>, softDelete = true): Filter<Entity & SoftDeleteDocument> {
    return {
      ...(softDelete ? { isDeleted: { $ne: true } } : {}),
      ...(filters as object),
    } as Filter<Entity & SoftDeleteDocument>;
  }

  private buildIdFilter(id: string, softDelete = true): Filter<Entity & SoftDeleteDocument> {
    const idFilter = ObjectId.isValid(id)
      ? { $or: [{ id }, { _id: new ObjectId(id) }] }
      : { id };

    return {
      ...idFilter,
      ...(softDelete ? { isDeleted: { $ne: true } } : {}),
    } as Filter<Entity & SoftDeleteDocument>;
  }

  async findById<Result = Entity>(
    id: string,
    options?: { collectionName?: string; softDelete?: boolean },
  ): Promise<Result | null> {
    try {
      const collection = await this.getCollection(options?.collectionName);
      const document = await collection.findOne(this.buildIdFilter(id, options?.softDelete !== false));
      return document as Result | null;
    } catch (error) {
      throw AppException.wrap(error, `BaseRepository.findById:${this.resolveCollection(options?.collectionName)}`);
    }
  }

  async findAll<Result = Entity>(options?: QueryOptions<Entity>): Promise<Result[]> {
    try {
      const collection = await this.getCollection(options?.collectionName);
      const documents = await collection
        .find(this.buildFilter(options?.filters, options?.softDelete !== false))
        .toArray();

      return documents as Result[];
    } catch (error) {
      throw AppException.wrap(error, `BaseRepository.findAll:${this.resolveCollection(options?.collectionName)}`);
    }
  }

  async create<Result = Entity>(
    data: Partial<Entity>,
    options?: { collectionName?: string },
  ): Promise<Result> {
    try {
      const collection = await this.getCollection(options?.collectionName);
      const document = {
        ...data,
        id: (data as SoftDeleteDocument).id ?? new ObjectId().toHexString(),
        isDeleted: false,
        deletedAt: null,
      } as OptionalUnlessRequiredId<Entity & SoftDeleteDocument>;

      await collection.insertOne(document);
      return document as Result;
    } catch (error) {
      throw AppException.wrap(error, `BaseRepository.create:${this.resolveCollection(options?.collectionName)}`);
    }
  }

  async update<Result = Entity>(
    id: string,
    data: Partial<Entity>,
    options?: { collectionName?: string },
  ): Promise<Result | null> {
    try {
      const collection = await this.getCollection(options?.collectionName);

      await collection.updateOne(
        this.buildIdFilter(id),
        { $set: data } as UpdateFilter<Entity & SoftDeleteDocument>,
      );

      return this.findById<Result>(id, options);
    } catch (error) {
      throw AppException.wrap(error, `BaseRepository.update:${this.resolveCollection(options?.collectionName)}`);
    }
  }

  async delete(ids: string | string[], options?: { collectionName?: string }): Promise<void> {
    try {
      const collection = await this.getCollection(options?.collectionName);
      const idArray = Array.isArray(ids) ? ids : [ids];

      await collection.updateMany(
        { id: { $in: idArray } } as Filter<Entity & SoftDeleteDocument>,
        { $set: { isDeleted: true, deletedAt: new Date() } } as UpdateFilter<Entity & SoftDeleteDocument>,
      );
    } catch (error) {
      throw AppException.wrap(error, `BaseRepository.delete:${this.resolveCollection(options?.collectionName)}`);
    }
  }

  async hardDelete(ids: string | string[], options?: { collectionName?: string }): Promise<void> {
    try {
      const collection = await this.getCollection(options?.collectionName);
      const idArray = Array.isArray(ids) ? ids : [ids];

      await collection.deleteMany({ id: { $in: idArray } } as Filter<Entity & SoftDeleteDocument>);
    } catch (error) {
      throw AppException.wrap(error, `BaseRepository.hardDelete:${this.resolveCollection(options?.collectionName)}`);
    }
  }

  async count(options?: Omit<QueryOptions<Entity>, "page" | "limit">): Promise<number> {
    try {
      const collection = await this.getCollection(options?.collectionName);
      return collection.countDocuments(this.buildFilter(options?.filters, options?.softDelete !== false));
    } catch (error) {
      throw AppException.wrap(error, `BaseRepository.count:${this.resolveCollection(options?.collectionName)}`);
    }
  }

  async paginate<Result = Entity>(options?: QueryOptions<Entity>): Promise<PaginateResult<Result>> {
    try {
      const collection = await this.getCollection(options?.collectionName);
      const page = options?.page ?? 1;
      const limit = options?.limit ?? 20;
      const skip = (page - 1) * limit;
      const filter = this.buildFilter(options?.filters, options?.softDelete !== false);
      const [documents, total] = await Promise.all([
        collection.find(filter).skip(skip).limit(limit).toArray(),
        collection.countDocuments(filter),
      ]);

      return {
        data: documents as Result[],
        total,
      };
    } catch (error) {
      throw AppException.wrap(error, `BaseRepository.paginate:${this.resolveCollection(options?.collectionName)}`);
    }
  }
}
