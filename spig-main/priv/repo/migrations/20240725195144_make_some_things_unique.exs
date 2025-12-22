defmodule Spig.Repo.Migrations.MakeSomeThingsUnique do
  use Ecto.Migration

  def change do
    create unique_index(:scores, [:submission_id, :assignment_id, :rubric_id, :group_id])
    create unique_index(:scores, [:submission_id, :assignment_id, :rubric_id, :scorer_id])
  end
end
