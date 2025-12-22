defmodule Spig.Repo.Migrations.AddAssignmentIdFieldToSection do
  use Ecto.Migration

  def change do
    alter table(:sections) do
      add :assignment_id, references(:assignments, on_delete: :nilify_all)
    end
  end
end
