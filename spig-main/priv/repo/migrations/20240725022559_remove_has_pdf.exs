defmodule Spig.Repo.Migrations.RemoveHasPdf do
  use Ecto.Migration

  def change do
    alter table(:assignments) do
      # unused
      remove :has_pdf
    end
  end
end
