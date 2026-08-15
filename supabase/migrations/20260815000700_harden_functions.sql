-- Supabase database linter (0011_function_search_path_mutable) 対応
alter function mod_deg(double precision) set search_path = public, pg_temp;
alter function lab_delta_e(double precision[], double precision[]) set search_path = public, pg_temp;
alter function dupe_score(double precision, double precision) set search_path = public, pg_temp;
alter function hex_to_lab(text) set search_path = public, pg_temp;
alter function build_ingredient_vec(text[]) set search_path = public, pg_temp;
alter function refresh_ingredient_idf() set search_path = public, pg_temp;
alter function trg_products_vec() set search_path = public, pg_temp;
alter function trg_reviews_recompute() set search_path = public, pg_temp;
alter function recompute_review_trust(bigint) set search_path = public, pg_temp;
alter function find_duplicates_in_stash(bigint, double precision) set search_path = public, pg_temp;
alter function find_cheaper_dupes(bigint, integer, double precision) set search_path = public, pg_temp;
alter function find_stash_overlaps(double precision) set search_path = public, pg_temp;
alter function find_by_color(double precision[], text, integer) set search_path = public, pg_temp;
