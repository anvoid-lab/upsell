import type { SupabaseClient } from "@supabase/supabase-js";
import { AppException } from "@core/exceptions";

export type PaginateResult<T> = {
  data: T[];
  total: number;
};

export type QueryOptions<T> = {
  filters?: Partial<T>;
  page?: number;
  limit?: number;
  softDelete?: boolean;
};

type BaseRepositoryOptions = {
  table: string;
  client: () => Promise<SupabaseClient>;
};

export class BaseRepository<Entity extends object> {
  public readonly table: string;
  private readonly getClient: () => Promise<SupabaseClient>;

  constructor(options: BaseRepositoryOptions) {
    this.table = options.table;
    this.getClient = options.client;
  }

  private applyFilters(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: any,
    filters?: Partial<Entity>,
    softDelete = true,
  ) {
    if (softDelete) {
      query = query.is("deleted_at", null);
    }
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined) {
          query = query.eq(key, value);
        }
      }
    }
    return query;
  }

  async findById<Result = Entity>(
    id: string,
    options?: { softDelete?: boolean },
  ): Promise<Result | null> {
    try {
      const supabase = await this.getClient();
      let query = supabase.from(this.table).select("*").eq("id", id);
      if (options?.softDelete !== false) {
        query = query.is("deleted_at", null);
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data as Result | null;
    } catch (error) {
      throw AppException.wrap(error, `BaseRepository.findById:${this.table}`);
    }
  }

  async findAll<Result = Entity>(options?: QueryOptions<Entity>): Promise<Result[]> {
    try {
      const supabase = await this.getClient();
      const query = this.applyFilters(
        supabase.from(this.table).select("*"),
        options?.filters,
        options?.softDelete !== false,
      );
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Result[];
    } catch (error) {
      throw AppException.wrap(error, `BaseRepository.findAll:${this.table}`);
    }
  }

  async create<Result = Entity>(data: Partial<Entity>): Promise<Result> {
    try {
      const supabase = await this.getClient();
      const { data: created, error } = await supabase
        .from(this.table)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(data as any)
        .select()
        .single();
      if (error) throw error;
      return created as Result;
    } catch (error) {
      throw AppException.wrap(error, `BaseRepository.create:${this.table}`);
    }
  }

  async update<Result = Entity>(id: string, data: Partial<Entity>): Promise<Result | null> {
    try {
      const supabase = await this.getClient();
      const { data: updated, error } = await supabase
        .from(this.table)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update(data as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return updated as Result | null;
    } catch (error) {
      throw AppException.wrap(error, `BaseRepository.update:${this.table}`);
    }
  }

  async delete(ids: string | string[]): Promise<void> {
    try {
      const supabase = await this.getClient();
      const idArray = Array.isArray(ids) ? ids : [ids];
      const { error } = await supabase
        .from(this.table)
        .update({ deleted_at: new Date().toISOString() })
        .in("id", idArray);
      if (error) throw error;
    } catch (error) {
      throw AppException.wrap(error, `BaseRepository.delete:${this.table}`);
    }
  }

  async hardDelete(ids: string | string[]): Promise<void> {
    try {
      const supabase = await this.getClient();
      const idArray = Array.isArray(ids) ? ids : [ids];
      const { error } = await supabase.from(this.table).delete().in("id", idArray);
      if (error) throw error;
    } catch (error) {
      throw AppException.wrap(error, `BaseRepository.hardDelete:${this.table}`);
    }
  }

  async count(options?: Omit<QueryOptions<Entity>, "page" | "limit">): Promise<number> {
    try {
      const supabase = await this.getClient();
      const query = this.applyFilters(
        supabase.from(this.table).select("*", { count: "exact", head: true }),
        options?.filters,
        options?.softDelete !== false,
      );
      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    } catch (error) {
      throw AppException.wrap(error, `BaseRepository.count:${this.table}`);
    }
  }

  async paginate<Result = Entity>(options?: QueryOptions<Entity>): Promise<PaginateResult<Result>> {
    try {
      const supabase = await this.getClient();
      const page = options?.page ?? 1;
      const limit = options?.limit ?? 20;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const query = this.applyFilters(
        supabase.from(this.table).select("*", { count: "exact" }),
        options?.filters,
        options?.softDelete !== false,
      );
      const { data, count, error } = await query.range(from, to);
      if (error) throw error;
      return { data: (data ?? []) as Result[], total: count ?? 0 };
    } catch (error) {
      throw AppException.wrap(error, `BaseRepository.paginate:${this.table}`);
    }
  }
}
