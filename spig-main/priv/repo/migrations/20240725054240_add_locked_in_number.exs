defmodule Spig.Repo.Migrations.AddLockedInNumber do
  use Ecto.Migration

  def change do
    # it's 1:43 am and i am LOCKED OUT!
    # turns out the code i wrote at 1:43 am was terrible so I redid it
    alter table(:scores) do
      add :signed, :map, null: false, default: %{}
    end
  end
end
