-- 初回オンボーディング（肌の状態 → 肌の色 → よく使うコスメ）の進捗をプロフィールに持つ。
-- 途中で離脱しても同じ画面から再開できるようにするため、完了フラグではなく到達したステップを保存する。
--   * onboarding_step: 0=未着手, 1=肌の状態まで, 2=肌の色まで, 3=手持ち登録まで
--   * onboarding_done_at: 完了、または「あとでやる」で見送った時刻。以降は自動で出さない。

alter table profiles add column if not exists onboarding_step smallint not null default 0;

alter table profiles add column if not exists onboarding_done_at timestamptz;

do $$
begin
  alter table profiles add constraint profiles_onboarding_step_check
    check (onboarding_step between 0 and 3);
exception
  when duplicate_object then null;
end
$$;

-- すでに使っている人は自分で登録を済ませているので、あとからウィザードを出さない。
update profiles set onboarding_done_at = now() where onboarding_done_at is null;
