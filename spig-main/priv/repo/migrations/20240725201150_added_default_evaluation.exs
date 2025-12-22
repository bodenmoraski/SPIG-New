defmodule Spig.Repo.Migrations.AddedDefaultEvaluation do
  use Ecto.Migration

  def change do
    alter table(:scores) do
      modify :evaluation, :map, default: %{}, from: {:map, default: nil}
    end
  end
end
