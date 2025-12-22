defmodule Spig.Repo.Migrations.CreateRubrics do
  use Ecto.Migration

  def change do
    create table(:rubrics) do
      add :name, :string, null: false
      add :course_id, references(:courses, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create table(:criteria) do
      add :name, :string, null: false
      add :description, :string
      add :points, :float, null: false
      add :rubric_id, references(:rubrics, on_delete: :delete_all), null: false
    end
  end
end
