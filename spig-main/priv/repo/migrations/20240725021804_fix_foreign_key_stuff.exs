defmodule Spig.Repo.Migrations.FixForeignKeyStuff do
  use Ecto.Migration

  def change do
    alter table(:scores) do
      modify :scorer_id, references(:users, on_delete: :nilify_all), from: references(:users, on_delete: :nothing)
      modify :group_id, references(:groups, on_delete: :nilify_all), from: references(:groups, on_delete: :nothing)
      modify :submission_id, references(:submissions, on_delete: :delete_all), from: references(:submissions, on_delete: :nothing)
      modify :rubric_id, references(:rubrics, on_delete: :nilify_all), from: references(:rubrics, on_delete: :nothing)
      modify :assignment_id, references(:assignments, on_delete: :delete_all), from: references(:assignments, on_delete: :nothing)
    end

    alter table(:groups) do
      modify :section_id, references(:sections, on_delete: :delete_all), from: references(:sections, on_delete: :nothing)
    end

    alter table(:submissions) do
      modify :student_id, references(:users, on_delete: :delete_all), from: references(:users, on_delete: :nothing)
      modify :assignment_id, references(:assignments, on_delete: :delete_all), from: references(:assignments, on_delete: :nothing)
    end

    alter table(:section_memberships) do
      modify :group_id, references(:groups, on_delete: :nilify_all), from: references(:groups, on_delete: :nothing)
    end
  end
end
