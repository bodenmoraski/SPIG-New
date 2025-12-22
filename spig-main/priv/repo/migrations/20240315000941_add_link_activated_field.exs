defmodule Spig.Repo.Migrations.AddLinkActivatedField do
  use Ecto.Migration

  def change do
    alter table(:sections) do
      add :link_active, :boolean, null: false, default: false
      modify :joinable_code, :string, null: false
    end
  end
end
