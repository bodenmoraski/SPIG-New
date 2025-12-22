defmodule Spig.Repo.Migrations.CreateReports do
  use Ecto.Migration

  def change do
    create table(:reports) do
      add :assignment_id, references(:assignments, on_delete: :nilify_all)
      add :section_id, references(:sections, on_delete: :nilify_all)
      add :rubric_id, references(:rubrics, on_delete: :nilify_all)
      add :report_version, :integer, null: false
      add :report, :map, null: false

      timestamps(type: :utc_datetime)
    end

    create index(:reports, [:assignment_id])
    create index(:reports, [:section_id])
    create index(:reports, [:rubric_id])
  end
end
