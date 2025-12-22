defmodule Spig.Repo.Migrations.CreateAssignmentsTable do
  use Ecto.Migration

  def change do
    create table(:assignments) do
      add :name, :string, null: false
      add :instructions, :string # nullable
      add :rubric_id, references(:rubrics, on_delete: :nilify_all) # nullable
      add :course_id, references(:courses, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end
  end
end
