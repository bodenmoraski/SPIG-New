defmodule Spig.Repo.Migrations.CreateSections do
  use Ecto.Migration

  def change do
    create table(:sections) do
      add :name, :string, null: false
      add :course_id, references(:courses, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create table(:section_memberships) do
      add :user_id, references(:users, on_delete: :delete_all), null: false
      add :section_id, references(:sections, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end
  end
end
