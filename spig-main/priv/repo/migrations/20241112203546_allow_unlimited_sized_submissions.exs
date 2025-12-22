defmodule Spig.Repo.Migrations.AllowUnlimitedSizedSubmissions do
  use Ecto.Migration

  def change do
    alter table(:submissions) do
      # text is not string!
      # string implies a default length limit of 255, which in practice proved to be catastrophic.
      modify :value, :text, null: false
    end
  end
end
