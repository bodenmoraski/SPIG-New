defmodule Spig.Repo.Migrations.AddHasPdfToAssignments do
  use Ecto.Migration

  def change do
    alter table(:assignments) do
      add :has_pdf, :boolean, default: false
    end
  end
end
