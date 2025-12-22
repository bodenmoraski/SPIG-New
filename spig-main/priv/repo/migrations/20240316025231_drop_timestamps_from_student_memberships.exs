defmodule Spig.Repo.Migrations.DropTimestampsFromStudentMemberships do
  use Ecto.Migration

  def change do
    alter table(:section_memberships) do
      remove :inserted_at
      remove :updated_at
    end

    create unique_index(:section_memberships, [:user_id, :section_id])
  end
end
