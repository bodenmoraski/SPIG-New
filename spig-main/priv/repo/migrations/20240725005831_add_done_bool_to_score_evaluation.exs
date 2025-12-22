defmodule Spig.Repo.Migrations.AddActiveBoolToScoreEvaluation do
  use Ecto.Migration

  def change do
    alter table(:scores) do
      add :done, :boolean, default: false, null: false
    end
  end
end
