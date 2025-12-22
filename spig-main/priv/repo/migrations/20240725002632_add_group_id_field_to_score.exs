defmodule Spig.Repo.Migrations.AddGroupIdFieldToScore do
  use Ecto.Migration

  def change do
    alter table(:scores) do
      add :group_id, references(:groups)
      # this is optional now, as you can either have a user scorer (scorer_id) or a group scorer (group_id)
      modify :scorer_id, references(:users), null: true, from: {references(:users), null: false}
    end
  end
end
