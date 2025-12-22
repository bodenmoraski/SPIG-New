defmodule Spig.Repo.Migrations.CreateGroups do
  use Ecto.Migration

  def change do
    create table(:groups) do
      add :section_id, references(:sections, on_delete: :nothing)

      timestamps(type: :utc_datetime)
    end

    create index(:groups, [:section_id])
  end
end
