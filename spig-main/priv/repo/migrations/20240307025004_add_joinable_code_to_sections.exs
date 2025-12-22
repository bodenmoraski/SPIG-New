defmodule Spig.Repo.Migrations.AddJoinableCodeToCourses do
  use Ecto.Migration

  def change do
    alter table(:sections) do
      add :joinable_code, :string
    end

    create unique_index(:sections, [:joinable_code])
  end
end
