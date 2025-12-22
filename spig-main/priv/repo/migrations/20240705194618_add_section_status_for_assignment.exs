defmodule Spig.Repo.Migrations.AddSectionStatusForAssignment do
  use Ecto.Migration

  def change do
    alter table(:sections) do
      add :status, :string, null: false, default: "waiting"
    end
  end
end
