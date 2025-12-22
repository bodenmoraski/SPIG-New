defmodule Spig.Repo.Migrations.AddAssignmentIdFieldToScore do
  use Ecto.Migration

  def change do
    alter table(:scores) do
      add :assignment_id, references(:assignments), null: false
    end
  end
end
