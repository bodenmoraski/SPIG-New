defmodule Spig.Repo.Migrations.CreateSubmissions do
  use Ecto.Migration

  def change do
    create table(:submissions) do
      add :value, :string
      add :student_id, references(:users, on_delete: :nothing)
      add :assignment_id, references(:assignments, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create index(:submissions, [:student_id])
  end
end
