defmodule Spig.Repo.Migrations.MoreSectionInfo do
  use Ecto.Migration

  def change do
    alter table(:sections) do
      add :semester, :string, null: false
      add :year, :integer, null: false
      add :archived, :boolean, null: false, default: false
      add :teacher_id, references(:users, on_delete: :delete_all), null: false
    end
  end
end
