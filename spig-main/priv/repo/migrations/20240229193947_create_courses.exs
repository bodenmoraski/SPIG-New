defmodule Spig.Repo.Migrations.CreateCourses do
  use Ecto.Migration

  def change do
    create table(:courses) do
      add :name, :string, null: false
      add :teacher_id, references(:users, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create index(:courses, [:teacher_id])
  end
end
