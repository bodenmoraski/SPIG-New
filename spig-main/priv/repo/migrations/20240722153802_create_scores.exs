defmodule Spig.Repo.Migrations.CreateScores do
  use Ecto.Migration

  def change do
    create table(:scores) do
      add :evaluation, :map, null: false
      add :submission_id, references(:submissions, on_delete: :nothing), null: false
      add :scorer_id, references(:users, on_delete: :nothing), null: false
      add :rubric_id, references(:rubrics, on_delete: :nothing), null: false

      timestamps(type: :utc_datetime)
    end

    create index(:scores, [:submission_id])
    create index(:scores, [:scorer_id])
    create index(:scores, [:rubric_id])
  end
end
