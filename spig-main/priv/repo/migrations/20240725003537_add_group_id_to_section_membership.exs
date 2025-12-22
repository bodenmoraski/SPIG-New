defmodule Spig.Repo.Migrations.AddGroupIdToSectionMembership do
  use Ecto.Migration

  def change do
    alter table(:section_memberships) do
      add :group_id, references(:groups), null: true
    end
  end
end
